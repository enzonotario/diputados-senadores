import type { ChamberId } from "../../app/lib/chamber";
import {
  getBloqueBySlug,
  getDiputadosPorBloques,
  getActas as getDiputadosActas,
} from "../../app/lib/diputados-data";
import {
  getPartidoBySlug,
  getSenadoresPorPartidos,
} from "../../app/lib/senadores-data";
import { layoutOgHemiciclo } from "../../app/lib/hemiciclo-layout";
import { RECINTO_SEATS } from "../../app/lib/diputados-recinto-layout";
import {
  matchMemberByPresidenteNombre,
  modePresidenteNombre,
} from "../../app/utils/actaPresidente";

/**
 * OG hemiciclo with each legislator's photo (current composition), for the
 * chamber home or one bloque/partido, pre-rendered once as a single PNG and
 * kept in RAM (bounded LRU of group composites).
 *
 * Why a composite: the OG renderer would otherwise fetch ~257 remote photos
 * on every render. Here photos are fetched once (bounded concurrency, short
 * timeouts), drawn by a dedicated Takumi renderer (native, async → off the
 * event loop) and then dropped; only the final PNG stays cached.
 *
 * Until photos are ready (first request after boot / revalidate), callers
 * get a dots-only composite and the photo build runs in the background.
 */

/** Logical size inside the OG card (rendered at 2x). */
export const OG_HEMICICLO_PHOTOS_SIZE = { width: 600, height: 316 } as const;
const DPR = 2;

const PHOTO_FETCH_TIMEOUT_MS = 4000;
const PHOTO_FETCH_CONCURRENCY = 8;
const PHOTO_MAX_BYTES = 512 * 1024;
/** Prerender waits for photos; runtime never does. */
/** Must stay below `ogImage.security.imageFetchTimeout` (nuxt.config). */
const PRERENDER_WAIT_MS = 10_000;

type SeatMember = { photo: string; color: string; banca?: number | null };

type CompositeState = {
  photos?: Buffer;
  dots?: Buffer;
  building?: Promise<Buffer | null>;
};

/** Max cached composites (2 chamber homes + recently shared groups). */
const MAX_ENTRIES = 48;
/** Cap seat size so tiny groups do not blow a single photo up. */
const MAX_SEAT_DIAMETER = 110 * DPR;

let state = new Map<string, CompositeState>();

export function clearOgHemicicloPhotosCache() {
  state = new Map();
}

function stateFor(key: string): CompositeState {
  let s = state.get(key);
  if (s) {
    // Refresh LRU position.
    state.delete(key);
  } else {
    s = {};
  }
  state.set(key, s);
  while (state.size > MAX_ENTRIES) {
    state.delete(state.keys().next().value!);
  }
  return s;
}

async function loadGroupMembers(
  chamber: ChamberId,
  slug: string,
): Promise<SeatMember[]> {
  const group =
    chamber === "diputados"
      ? await getBloqueBySlug(slug).then(
          (b) =>
            b && {
              color: b.color,
              members: b.activos.map((d) => ({
                sortKey: `${d.apellido} ${d.nombre}`,
                photo: d.foto || "",
              })),
            },
        )
      : await getPartidoBySlug(slug).then(
          (p) =>
            p && {
              color: p.color,
              members: p.activos.map((s) => ({
                sortKey: s.nombreCompleto || s.nombre || "",
                photo: s.foto || "",
              })),
            },
        );
  if (!group) return [];
  return group.members
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, "es"))
    .map((m) => ({ photo: m.photo, color: group.color || "#6b7280" }));
}

async function loadSeatMembers(
  chamber: ChamberId,
  groupSlug?: string,
): Promise<SeatMember[]> {
  if (groupSlug) return loadGroupMembers(chamber, groupSlug);
  if (chamber === "diputados") {
    const recinto = await loadRecintoMembers();
    if (useRecinto(recinto)) return recinto;
  }
  const rows =
    chamber === "diputados"
      ? await getDiputadosPorBloques().then(({ diputados, bloqueColores }) =>
          diputados.map((d) => ({
            group: d.bloque || "",
            sortKey: `${d.apellido} ${d.nombre}`,
            photo: d.foto || "",
            banca: d.banca ?? null,
            colors: bloqueColores,
          })),
        )
      : await getSenadoresPorPartidos().then(({ senadores, partidoColores }) =>
          senadores.map((s) => ({
            group: s.partido || "",
            sortKey: s.nombreCompleto || s.nombre || "",
            photo: s.foto || "",
            colors: partidoColores,
          })),
        );

  const colors = rows[0]?.colors || {};
  // Same group order as the hemiciclo prop (size desc, name asc).
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.group.trim() || "Sin grupo";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const groupKey = (g: string) => g.trim() || "Sin grupo";
  return [...rows]
    .sort((a, b) => {
      const ga = groupKey(a.group);
      const gb = groupKey(b.group);
      if (ga !== gb) {
        return (
          (counts.get(gb) || 0) - (counts.get(ga) || 0) ||
          ga.localeCompare(gb, "es")
        );
      }
      return a.sortKey.localeCompare(b.sortKey, "es");
    })
    .map((r) => ({
      photo: r.photo,
      color: colors[groupKey(r.group)] || colors[r.group] || "#6b7280",
      banca: "banca" in r ? (r.banca as number | null) : null,
    }));
}

/**
 * Diputados home: members placed on their real HCDN seat (`banca`), plus the
 * chamber president on the podium (banca 0), resolved like the site's home
 * (most frequent `acta.presidente` of the latest periodo).
 */
async function loadRecintoMembers(): Promise<SeatMember[]> {
  const [{ diputados, bloqueColores }, actas] = await Promise.all([
    getDiputadosPorBloques(),
    getDiputadosActas(),
  ]);
  const color = (bloque?: string | null) =>
    bloqueColores[String(bloque || "").trim()] ||
    bloqueColores[String(bloque || "")] ||
    "#6b7280";
  const members: SeatMember[] = diputados.map((d) => ({
    photo: d.foto || "",
    color: color(d.bloque),
    banca: d.banca ?? null,
  }));

  if (!diputados.some((d) => d.banca === 0)) {
    const latest = actas.reduce(
      (max, a) => Math.max(max, Number(a.periodo) || 0),
      0,
    );
    const nombre = modePresidenteNombre(
      actas.filter((a) => (Number(a.periodo) || 0) === latest),
    );
    const pres = matchMemberByPresidenteNombre(diputados, nombre);
    if (pres) {
      members.push({
        photo: pres.foto || "",
        color: color(pres.bloque),
        banca: 0,
      });
    }
  }
  return members;
}

const VACANT_SEAT_COLOR = "#e5e7eb";

/**
 * Real HCDN seat coordinates, fitted into `W×H`. Returns seats and the
 * member drawn on each (vacant seats → gray dot, no photo).
 */
function recintoSeats(
  members: SeatMember[],
  W: number,
  H: number,
): { seats: PixelSeat[]; members: SeatMember[] } {
  const byBanca = new Map<number, SeatMember>();
  for (const m of members) {
    if (m.banca == null || !Number.isFinite(Number(m.banca))) continue;
    if (!byBanca.has(Number(m.banca))) byBanca.set(Number(m.banca), m);
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of RECINTO_SEATS) {
    minX = Math.min(minX, s.x - s.r);
    minY = Math.min(minY, s.y - s.r);
    maxX = Math.max(maxX, s.x + s.r);
    maxY = Math.max(maxY, s.y + s.r);
  }
  const k = Math.min(W / (maxX - minX), H / (maxY - minY));
  const offsetX = (W - (maxX - minX) * k) / 2 - minX * k;
  const offsetY = H - (maxY - minY) * k - minY * k;
  const seats: PixelSeat[] = [];
  const out: SeatMember[] = [];
  for (const s of RECINTO_SEATS) {
    const m = byBanca.get(s.banca) || {
      photo: "",
      color: VACANT_SEAT_COLOR,
    };
    seats.push({
      x: offsetX + s.x * k,
      y: offsetY + s.y * k,
      r: s.r * k * 0.92,
      color: m.color,
    });
    out.push(m);
  }
  return { seats, members: out };
}

/** Enough seated members to trust the official layout (same as the site). */
function useRecinto(members: SeatMember[]): boolean {
  return members.filter((m) => m.banca != null).length >= 20;
}

async function fetchPhoto(url: string): Promise<Uint8Array | null> {
  if (!/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.byteLength || buf.byteLength > PHOTO_MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

async function fetchPhotos(urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  const out = new Map<string, Uint8Array>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++]!;
      const data = await fetchPhoto(url);
      if (data) out.set(url, data);
    }
  };
  await Promise.all(
    Array.from({ length: PHOTO_FETCH_CONCURRENCY }, () => worker()),
  );
  return out;
}

type PixelSeat = { x: number; y: number; r: number; color: string };

/** Hemiciclo seats scaled into `W×H` px (bbox-fit, bottom-aligned). */
function hemicicloSeats(
  members: SeatMember[],
  W: number,
  H: number,
): PixelSeat[] {
  // One group per seat keeps the member order (already grouped by politics).
  const layout = layoutOgHemiciclo(
    members.map((m) => ({ count: 1, color: m.color })),
  );
  if (!layout) return [];
  // Fit the seats' bounding box (the geometry viewBox has slack on top).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of layout.seats) {
    minX = Math.min(minX, s.x - s.r);
    minY = Math.min(minY, s.y - s.r);
    maxX = Math.max(maxX, s.x + s.r);
    maxY = Math.max(maxY, s.y + s.r);
  }
  const k = Math.min(W / (maxX - minX), H / (maxY - minY));
  const offsetX = (W - (maxX - minX) * k) / 2 - minX * k;
  const offsetY = H - (maxY - minY) * k - minY * k;
  return layout.seats.map((seat) => ({
    x: offsetX + seat.x * k,
    y: offsetY + seat.y * k,
    r: seat.r * k,
    color: seat.color,
  }));
}

/**
 * Small groups: a packed grid reads better than a sparse arc. Picks the
 * column count that maximizes the circle size; centered, bottom-aligned.
 */
function gridSeats(members: SeatMember[], W: number, H: number): PixelSeat[] {
  const n = members.length;
  if (!n) return [];
  let best = { cols: 1, d: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const d = Math.min(W / cols, H / rows, MAX_SEAT_DIAMETER / 0.88);
    if (d > best.d) best = { cols, d };
  }
  const { cols, d } = best;
  const rows = Math.ceil(n / cols);
  const r = (d * 0.88) / 2;
  const top = H - rows * d;
  return members.map((m, i) => {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? n - row * cols : cols;
    const left = (W - inRow * d) / 2;
    return {
      x: left + (i % cols) * d + d / 2,
      y: top + row * d + d / 2,
      r,
      color: m.color,
    };
  });
}

/** Groups up to this size use the grid instead of the hemiciclo. */
const GRID_MAX_MEMBERS = 40;

async function renderComposite(
  members: SeatMember[],
  photos: Map<string, Uint8Array> | null,
  grid = false,
): Promise<Buffer | null> {
  const W = OG_HEMICICLO_PHOTOS_SIZE.width * DPR;
  const H = OG_HEMICICLO_PHOTOS_SIZE.height * DPR;
  let pixelSeats: PixelSeat[];
  if (!grid && useRecinto(members)) {
    const placed = recintoSeats(members, W, H);
    pixelSeats = placed.seats;
    members = placed.members;
  } else {
    pixelSeats =
      grid && members.length <= GRID_MAX_MEMBERS
        ? gridSeats(members, W, H)
        : hemicicloSeats(members, W, H);
  }
  if (!pixelSeats.length) return null;

  const images: { src: string; data: Uint8Array; cache: "none" }[] = [];
  const seats = pixelSeats.map((seat, i) => {
    const member = members[i];
    const r = seat.r;
    const size = Math.round(r * 2 * 10) / 10;
    const ring = Math.max(2, Math.round(r * 0.22));
    const photo = member?.photo ? photos?.get(member.photo) : undefined;
    const base = {
      position: "absolute" as const,
      left: seat.x - r,
      top: seat.y - r,
      width: size,
      height: size,
      borderRadius: "50%",
    };
    if (photo && member) {
      if (!images.some((img) => img.src === member.photo)) {
        images.push({ src: member.photo, data: photo, cache: "none" });
      }
      return {
        type: "container" as const,
        style: {
          ...base,
          display: "flex",
          padding: ring,
          backgroundColor: seat.color,
        },
        children: [
          {
            type: "image" as const,
            src: member.photo,
            style: {
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover" as const,
              objectPosition: "50% 20%",
              backgroundColor: "#e5e7eb",
            },
          },
        ],
      };
    }
    return {
      type: "container" as const,
      style: { ...base, backgroundColor: seat.color },
    };
  });

  const { Renderer } = await import("@takumi-rs/core");
  const renderer = new Renderer();
  return renderer.render(
    {
      type: "container",
      style: { position: "relative", width: W, height: H, display: "flex" },
      children: seats,
    },
    { width: W, height: H, format: "png", images },
  );
}

async function buildPhotos(
  chamber: ChamberId,
  groupSlug?: string,
): Promise<Buffer | null> {
  const members = await loadSeatMembers(chamber, groupSlug);
  const photos = await fetchPhotos(members.map((m) => m.photo));
  return renderComposite(members, photos, Boolean(groupSlug));
}

function startPhotoBuild(
  s: CompositeState,
  chamber: ChamberId,
  groupSlug?: string,
): Promise<Buffer | null> {
  if (s.building) return s.building;
  const building = buildPhotos(chamber, groupSlug)
    .then((buf) => {
      if (buf) s.photos = buf;
      return buf;
    })
    .catch((err) => {
      console.warn(
        `[og] hemiciclo photos build failed (${chamber}${groupSlug ? `/${groupSlug}` : ""}):`,
        err?.message || err,
      );
      return null;
    })
    .finally(() => {
      // Allow retry on failure; success is memoized in `photos`.
      if (!s.photos) s.building = undefined;
    });
  s.building = building;
  return building;
}

async function getDots(
  s: CompositeState,
  chamber: ChamberId,
  groupSlug?: string,
): Promise<Buffer | null> {
  if (s.dots) return s.dots;
  const members = await loadSeatMembers(chamber, groupSlug);
  const buf = await renderComposite(members, null, Boolean(groupSlug));
  if (buf) s.dots = buf;
  return buf;
}

/**
 * PNG for the home (or one group's) OG hemiciclo. Photos when ready; dots
 * otherwise. During prerender, waits for photos (bounded).
 */
export async function getOgHemicicloPhotosPng(
  chamber: ChamberId,
  groupSlug?: string,
): Promise<Buffer | null> {
  const s = stateFor(`${chamber}:${groupSlug || ""}`);
  if (s.photos) return s.photos;

  const building = startPhotoBuild(s, chamber, groupSlug);
  if (import.meta.prerender) {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), PRERENDER_WAIT_MS),
    );
    const photos = await Promise.race([building, timeout]);
    if (photos) return photos;
  }
  return getDots(s, chamber, groupSlug);
}
