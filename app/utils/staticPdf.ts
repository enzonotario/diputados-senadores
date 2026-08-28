/** Base pública de estáticos de ArgentinaDatos. */
export const STATIC_PUBLIC_BASE = "https://api.argentinadatos.com/static";

/** PDF de un acta del Senado (`/static/senado/actas/pdf/{id}.pdf`). */
export function senadoActaPdfUrl(actaId: string | number): string {
  return `${STATIC_PUBLIC_BASE}/senado/actas/pdf/${encodeURIComponent(String(actaId))}.pdf`;
}

/** PDF oficial de votación HCDN (no cacheado en static). */
export function diputadosActaPdfUrl(actaId: string | number): string {
  return `https://votaciones.hcdn.gob.ar/pdf/acta/${encodeURIComponent(String(actaId))}`;
}

/**
 * PDF de un acta. Senado: static ArgentinaDatos.
 * Diputados: PDF oficial de votaciones.hcdn.gob.ar.
 */
export function actaPdfUrl(
  chamber: string,
  actaId: string | number | null | undefined,
): string | null {
  if (actaId == null || actaId === "") return null;
  if (chamber === "senadores") return senadoActaPdfUrl(actaId);
  if (chamber === "diputados") return diputadosActaPdfUrl(actaId);
  return null;
}

/** PDF cacheado de un viaje (`/static/senado/viajes/{ambito}/{id}.pdf`). */
export function viajePdfUrl(
  ambito: "nacional" | "internacional" | string,
  documentoId: string | number | null | undefined,
): string | null {
  if (documentoId == null || documentoId === "") return null;
  if (ambito !== "nacional" && ambito !== "internacional") return null;
  return `${STATIC_PUBLIC_BASE}/senado/viajes/${ambito}/${encodeURIComponent(String(documentoId))}.pdf`;
}
