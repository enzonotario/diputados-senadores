/** Índice oficial de viajes según cámara. */
export const VIAJES_FUENTE_URL_SENADO =
  "https://www.senado.gob.ar/administrativo/viajes";

export const VIAJES_FUENTE_URL_DIPUTADOS =
  "https://datos.hcdn.gob.ar/dataset/viajes-nacionales";

/** @deprecated preferí VIAJES_FUENTE_URL_SENADO o viajesFuenteUrl(chamber) */
export const VIAJES_FUENTE_URL = VIAJES_FUENTE_URL_SENADO;

export function viajesFuenteUrl(chamber: "senadores" | "diputados") {
  return chamber === "diputados"
    ? VIAJES_FUENTE_URL_DIPUTADOS
    : VIAJES_FUENTE_URL_SENADO;
}

/** URL externa del registro (HCDN misiones oficiales). */
export function viajeIntlDocumentoUrl(v: {
  documentoUrl?: string | null;
  recursoUrl?: string | null;
}) {
  const url = String(v.documentoUrl || v.recursoUrl || "").trim();
  return url || null;
}
