/**
 * Coordenadas oficiales del hemiciclo HCDN (viewBox del SVG embebido en
 * parlamentaria.hcdn.gob.ar/public/libs/hemicicloHCDN_2).
 * `banca` 0 = podio central; 1–256 = bancas del recinto (223 suele estar vacante).
 */
import layout from "@/data/diputados-recinto-layout.json";

export type RecintoSeatCoord = {
  banca: number;
  x: number;
  y: number;
  r: number;
};

export const RECINTO_VIEWBOX = layout.viewBox as {
  width: number;
  height: number;
};

export const RECINTO_SEATS = layout.seats as RecintoSeatCoord[];

export function recintoSeatByBanca(
  banca: number,
): RecintoSeatCoord | undefined {
  return RECINTO_SEATS.find((s) => s.banca === banca);
}
