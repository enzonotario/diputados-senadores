/**
 * Acta SEO/OG per `?vista=` — pure, shared by the acta pages (SSR) and the
 * Nitro plugin that patches og:image on prerendered (static) acta HTML.
 */
import type { ChamberId } from "./chamber";
import {
  buildActaChamberOg,
  buildDiputadosActaChamberOg,
  type ChamberOgInput,
} from "./og";
import { normalizeVotoTipo } from "../utils/votoTipo";
import { provinciaKey } from "../utils/provinciaKey";

/** Chamber-neutral OG view (URL values stay per chamber). */
export type OgActaVista = "" | "resultados" | "grupos" | "provincias";

/** Map `?vista=` (per chamber) → OG view. Default view → "". */
export function normalizeOgActaVista(
  chamber: ChamberId,
  raw: unknown,
): OgActaVista {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  if (v === "resultados") return "resultados";
  if (v === "provincias") return "provincias";
  if (chamber === "diputados" && v === "bloques") return "grupos";
  if (chamber === "senadores" && v === "partidos") return "grupos";
  return "";
}

const VISTA_EYEBROW: Record<ChamberId, Record<OgActaVista, string>> = {
  diputados: {
    "": "votación",
    resultados: "votación · por tipo de voto",
    grupos: "votación · por bloque",
    provincias: "por provincia",
  },
  senadores: {
    "": "votación",
    resultados: "votación · por tipo de voto",
    grupos: "votación · por partido",
    provincias: "por provincia",
  },
};

type VoteCounts = [number, number, number, number];

function countIndex(tipo?: string | null): number {
  const t = normalizeVotoTipo(tipo);
  if (t === "afirmativo") return 0;
  if (t === "negativo") return 1;
  if (t === "abstencion") return 2;
  if (t === "ausente") return 3;
  return -1;
}

/** Abbreviation + tile-map position (col,row), roughly Argentina's shape. */
export const OG_PROVINCIAS: Record<
  string,
  { abbr: string; col: number; row: number }
> = {
  jujuy: { abbr: "JUJ", col: 1, row: 0 },
  salta: { abbr: "SAL", col: 2, row: 0 },
  formosa: { abbr: "FOR", col: 3, row: 0 },
  misiones: { abbr: "MIS", col: 4, row: 0 },
  catamarca: { abbr: "CAT", col: 1, row: 1 },
  tucuman: { abbr: "TUC", col: 2, row: 1 },
  chaco: { abbr: "CHA", col: 3, row: 1 },
  corrientes: { abbr: "COR", col: 4, row: 1 },
  "san juan": { abbr: "SJU", col: 0, row: 2 },
  "la rioja": { abbr: "LRJ", col: 1, row: 2 },
  "santiago del estero": { abbr: "SDE", col: 2, row: 2 },
  "santa fe": { abbr: "SFE", col: 3, row: 2 },
  "entre rios": { abbr: "ERI", col: 4, row: 2 },
  mendoza: { abbr: "MZA", col: 0, row: 3 },
  "san luis": { abbr: "SLU", col: 1, row: 3 },
  cordoba: { abbr: "CBA", col: 2, row: 3 },
  "buenos aires": { abbr: "BUE", col: 3, row: 3 },
  caba: { abbr: "CABA", col: 4, row: 3 },
  neuquen: { abbr: "NQN", col: 0, row: 4 },
  "la pampa": { abbr: "LPA", col: 1, row: 4 },
  "rio negro": { abbr: "RNE", col: 1, row: 5 },
  chubut: { abbr: "CHU", col: 1, row: 6 },
  "santa cruz": { abbr: "SCR", col: 1, row: 7 },
  "tierra del fuego": { abbr: "TDF", col: 2, row: 8 },
};

type VotoRow = { group: string; provincia: string; tipoVoto: string };

/** `JUJ:a:n:b:u,SAL:…` — one entry per province with votes. */
export function encodeOgProvincias(votos: VotoRow[]): string {
  const by = new Map<string, VoteCounts>();
  for (const v of votos) {
    const meta = OG_PROVINCIAS[provinciaKey(v.provincia)];
    const i = countIndex(v.tipoVoto);
    if (!meta || i < 0) continue;
    const c = by.get(meta.abbr) || [0, 0, 0, 0];
    c[i] = (c[i] ?? 0) + 1;
    by.set(meta.abbr, c);
  }
  return [...by.entries()].map(([k, c]) => `${k}:${c.join(":")}`).join(",");
}

export function decodeOgProvincias(raw?: string | null) {
  const out = new Map<string, VoteCounts>();
  for (const part of String(raw || "").split(",")) {
    const [abbr, ...nums] = part.split(":");
    const c = nums.map(Number);
    if (!abbr || c.length !== 4 || c.some((n) => !Number.isFinite(n))) {
      continue;
    }
    out.set(abbr, c as VoteCounts);
  }
  return out;
}

const OG_GROUPS_MAX = 6;
const OTROS_COLOR = "#9ca3af";

/** `name|hex|a|n|b|u;…` — biggest groups first, tail folded into "Otros". */
export function encodeOgGrupos(
  votos: VotoRow[],
  colors: Record<string, string>,
): string {
  const by = new Map<string, VoteCounts>();
  for (const v of votos) {
    const i = countIndex(v.tipoVoto);
    if (i < 0) continue;
    const key = v.group.trim() || "Sin bloque";
    const c = by.get(key) || [0, 0, 0, 0];
    c[i] = (c[i] ?? 0) + 1;
    by.set(key, c);
  }
  const total = (c: VoteCounts) => c[0] + c[1] + c[2] + c[3];
  const sorted = [...by.entries()].sort(
    (a, b) => total(b[1]) - total(a[1]) || a[0].localeCompare(b[0], "es"),
  );
  const head = sorted.slice(0, OG_GROUPS_MAX);
  const tail = sorted.slice(OG_GROUPS_MAX);
  const rows = head.map(([name, c]) => ({
    name,
    color: colors[name] || OTROS_COLOR,
    c,
  }));
  if (tail.length) {
    const c: VoteCounts = [0, 0, 0, 0];
    for (const [, t] of tail) {
      for (let i = 0; i < 4; i++) c[i] = (c[i] ?? 0) + (t[i] ?? 0);
    }
    rows.push({ name: `Otros (${tail.length})`, color: OTROS_COLOR, c });
  }
  return rows
    .map(
      (r) =>
        `${r.name.replace(/[|;]/g, " ")}|${r.color.replace("#", "")}|${r.c.join("|")}`,
    )
    .join(";");
}

export function decodeOgGrupos(raw?: string | null) {
  const out: { name: string; color: string; counts: VoteCounts }[] = [];
  for (const part of String(raw || "").split(";")) {
    const [name, hex, ...nums] = part.split("|");
    const c = nums.map(Number);
    if (!name || c.length !== 4 || c.some((n) => !Number.isFinite(n))) {
      continue;
    }
    out.push({
      name,
      color: /^[0-9a-fA-F]{3,8}$/.test(hex || "") ? `#${hex}` : OTROS_COLOR,
      counts: c as VoteCounts,
    });
  }
  return out;
}

type ActaLike = {
  titulo?: string | null;
  resultado?: string | null;
  fecha?: string | null;
  numeroActa?: string | null;
  presidente?: string | null;
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
  sinVotar?: number | null;
  votos?: Array<{
    tipoVoto?: string | null;
    diputadoObj?: {
      banca?: number | null;
      bloque?: string | null;
      provincia?: string | null;
    } | null;
    senadorObj?: {
      partido?: string | null;
      provincia?: string | null;
    } | null;
  }>;
};

function votoRows(chamber: ChamberId, acta: ActaLike): VotoRow[] {
  return (acta.votos || []).map((v) => {
    const m = chamber === "diputados" ? v.diputadoObj : v.senadorObj;
    const group =
      chamber === "diputados"
        ? (v.diputadoObj?.bloque ?? "")
        : (v.senadorObj?.partido ?? "");
    return {
      group: String(group || ""),
      provincia: String(m?.provincia || ""),
      tipoVoto: String(v.tipoVoto || ""),
    };
  });
}

const CHAMBER_LABEL: Record<ChamberId, string> = {
  diputados: "la Cámara de Diputados",
  senadores: "el Senado",
};

/** Title, description and OG card for an acta (optionally per vista). */
export function buildActaSeo(
  chamber: ChamberId,
  acta: ActaLike | null | undefined,
  rawVista: unknown,
  formatDate: (fecha: string) => string,
  /** Chamber's own palette (`getBloqueColores` / `getPartidoColores`). */
  groupColors: (names: string[]) => Record<string, string>,
): { title: string; description: string; og: ChamberOgInput } {
  const vista = normalizeOgActaVista(chamber, rawVista);
  const fallback = `Cómo se votó esta iniciativa en ${CHAMBER_LABEL[chamber]}.`;
  if (!acta) {
    return {
      title: "Votación",
      description: fallback,
      og: { kind: "acta", eyebrow: VISTA_EYEBROW[chamber][vista] },
    };
  }

  const fecha = acta.fecha ? formatDate(acta.fecha) : null;
  const parts = [
    acta.resultado ? `Resultado: ${acta.resultado}` : null,
    fecha ? `Votación del ${fecha}` : null,
    `A favor ${acta.votosAfirmativos}, en contra ${acta.votosNegativos}, abstenciones ${acta.abstenciones}`,
  ].filter(Boolean);

  const base =
    chamber === "diputados"
      ? buildDiputadosActaChamberOg(acta, formatDate)
      : buildActaChamberOg(acta, formatDate);

  const og: ChamberOgInput = {
    ...base,
    eyebrow: VISTA_EYEBROW[chamber][vista],
  };
  if (vista) {
    og.vista = vista;
    // The default hemiciclo is replaced by the vista chart.
    og.hemiciclo = undefined;
    if (vista === "provincias") {
      og.breakdown = encodeOgProvincias(votoRows(chamber, acta));
    } else if (vista === "grupos") {
      const rows = votoRows(chamber, acta);
      const names = [...new Set(rows.map((r) => r.group).filter(Boolean))];
      og.breakdown = encodeOgGrupos(rows, groupColors(names.sort()));
    }
  }

  return {
    title: acta.titulo || "Votación",
    description: parts.length ? `${parts.join(". ")}.` : fallback,
    og,
  };
}
