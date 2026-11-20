import type { ChamberId } from "../../app/lib/chamber";
import { getDiputadosPorBloques } from "../../app/lib/diputados-data";
import { getSenadoresPorPartidos } from "../../app/lib/senadores-data";
import { layoutOgHemiciclo } from "../../app/lib/hemiciclo-layout";

/**
 * Home OG hemiciclo with each legislator's photo (current composition),
 * pre-rendered once per chamber as a single PNG and kept in RAM.
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
const PRERENDER_WAIT_MS = 60_000;

type SeatMember = { photo: string; color: string };

type ChamberState = {
  photos?: Buffer;
  dots?: Buffer;
  building?: Promise<Buffer | null>;
};

const state: Record<ChamberId, ChamberState> = {
  diputados: {},
  senadores: {},
};

export function clearOgHemicicloPhotosCache() {
  state.diputados = {};
  state.senadores = {};
}

async function loadSeatMembers(chamber: ChamberId): Promise<SeatMember[]> {
  const rows =
    chamber === "diputados"
      ? await getDiputadosPorBloques().then(({ diputados, bloqueColores }) =>
          diputados.map((d) => ({
            group: d.bloque || "",
            sortKey: `${d.apellido} ${d.nombre}`,
            photo: d.foto || "",
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
    }));
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

async function renderComposite(
  members: SeatMember[],
  photos: Map<string, Uint8Array> | null,
): Promise<Buffer | null> {
  // One group per seat keeps the member order (already grouped by politics).
  const layout = layoutOgHemiciclo(
    members.map((m) => ({ count: 1, color: m.color })),
  );
  if (!layout) return null;

  const W = OG_HEMICICLO_PHOTOS_SIZE.width * DPR;
  const H = OG_HEMICICLO_PHOTOS_SIZE.height * DPR;
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

  const images: { src: string; data: Uint8Array; cache: "none" }[] = [];
  const seats = layout.seats.map((seat, i) => {
    const member = members[i];
    const r = seat.r * k;
    const size = Math.round(r * 2 * 10) / 10;
    const ring = Math.max(2, Math.round(r * 0.22));
    const photo = member?.photo ? photos?.get(member.photo) : undefined;
    const base = {
      position: "absolute" as const,
      left: offsetX + seat.x * k - r,
      top: offsetY + seat.y * k - r,
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

async function buildPhotos(chamber: ChamberId): Promise<Buffer | null> {
  const members = await loadSeatMembers(chamber);
  const photos = await fetchPhotos(members.map((m) => m.photo));
  return renderComposite(members, photos);
}

function startPhotoBuild(chamber: ChamberId): Promise<Buffer | null> {
  const s = state[chamber];
  if (s.building) return s.building;
  const building = buildPhotos(chamber)
    .then((buf) => {
      if (buf && state[chamber] === s) s.photos = buf;
      return buf;
    })
    .catch((err) => {
      console.warn(
        `[og] hemiciclo photos build failed (${chamber}):`,
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

async function getDots(chamber: ChamberId): Promise<Buffer | null> {
  const s = state[chamber];
  if (s.dots) return s.dots;
  const members = await loadSeatMembers(chamber);
  const buf = await renderComposite(members, null);
  if (buf) s.dots = buf;
  return buf;
}

/**
 * PNG for the home OG hemiciclo. Photos when ready; dots otherwise.
 * During prerender, waits for photos (bounded).
 */
export async function getOgHemicicloPhotosPng(
  chamber: ChamberId,
): Promise<Buffer | null> {
  const s = state[chamber];
  if (s.photos) return s.photos;

  const building = startPhotoBuild(chamber);
  if (import.meta.prerender) {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), PRERENDER_WAIT_MS),
    );
    const photos = await Promise.race([building, timeout]);
    if (photos) return photos;
  }
  return getDots(chamber);
}
