import {
  RECINTO_SEATS,
  RECINTO_VIEWBOX,
} from "./diputados-recinto-layout";
import type { OgHemicicloLayout, OgHemicicloSeat } from "./hemiciclo-layout";
import { getVotoTipoConfig, normalizeVotoTipo } from "../utils/votoTipo";

export const OG_RECINTO_PREFIX = "r:";

const VACANT_COLOR = "#e5e7eb";

const TIPO_TO_CHAR: Record<string, string> = {
  afirmativo: "a",
  negativo: "n",
  abstencion: "b",
  ausente: "u",
  presidente: "p",
  indeciso: "i",
};

const CHAR_TO_COLOR: Record<string, string> = {
  a: getVotoTipoConfig("afirmativo").color,
  n: getVotoTipoConfig("negativo").color,
  b: getVotoTipoConfig("abstencion").color,
  u: getVotoTipoConfig("ausente").color,
  p: getVotoTipoConfig("presidente").color,
  i: getVotoTipoConfig("indeciso").color,
  v: VACANT_COLOR,
};

export function isOgRecintoHemiciclo(raw?: string | null): boolean {
  return String(raw || "").trim().startsWith(OG_RECINTO_PREFIX);
}

/** Un carácter por banca del recinto (orden de `RECINTO_SEATS`). */
export function encodeOgRecintoActa(input: {
  votos: Array<{ banca?: number | null; tipoVoto?: string | null }>;
  hasPresidente?: boolean;
}): string {
  const byBanca = new Map<number, string>();

  for (const v of input.votos) {
    if (v.banca == null || !Number.isFinite(Number(v.banca))) continue;
    const banca = Number(v.banca);
    const tipo = normalizeVotoTipo(String(v.tipoVoto || ""));
    const char = TIPO_TO_CHAR[tipo] || "u";
    const prev = byBanca.get(banca);
    if (!prev || (prev === "u" && char !== "u")) {
      byBanca.set(banca, char);
    }
  }

  if (input.hasPresidente) {
    byBanca.set(0, "p");
  }

  const chars = RECINTO_SEATS.map((seat) => byBanca.get(seat.banca) || "v");
  return `${OG_RECINTO_PREFIX}${chars.join("")}`;
}

/** Layout del recinto HCDN escalado para la tarjeta OG. */
export function layoutOgRecintoHemiciclo(
  raw?: string | null,
  targetHeight = 250,
): OgHemicicloLayout | null {
  const s = String(raw || "").trim();
  if (!s.startsWith(OG_RECINTO_PREFIX)) return null;

  const payload = s.slice(OG_RECINTO_PREFIX.length);
  if (payload.length !== RECINTO_SEATS.length) return null;

  const scale = targetHeight / RECINTO_VIEWBOX.height;
  const width = Math.round(RECINTO_VIEWBOX.width * scale);

  const seats: OgHemicicloSeat[] = RECINTO_SEATS.map((seat, i) => {
    const char = payload[i] || "v";
    const r = Math.max(2.8, seat.r * scale * 0.88);
    return {
      x: Math.round(seat.x * scale * 10) / 10,
      y: Math.round(seat.y * scale * 10) / 10,
      r: Math.round(r * 10) / 10,
      color: CHAR_TO_COLOR[char] || VACANT_COLOR,
    };
  });

  return { width, height: targetHeight, seats };
}
