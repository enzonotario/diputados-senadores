/** Base pública de estáticos de ArgentinaDatos. */
export const STATIC_PUBLIC_BASE = "https://api.argentinadatos.com/static";

/** PDF de un acta del Senado (`/static/senado/actas/pdf/{id}.pdf`). */
export function senadoActaPdfUrl(actaId: string | number): string {
  return `${STATIC_PUBLIC_BASE}/senado/actas/pdf/${encodeURIComponent(String(actaId))}.pdf`;
}

/**
 * PDF estático de un acta. Solo el Senado tiene PDFs en `static/`;
 * diputados no publica actas ahí (retorna null).
 */
export function actaPdfUrl(
  chamber: string,
  actaId: string | number | null | undefined,
): string | null {
  if (chamber !== "senadores" || actaId == null || actaId === "") return null;
  return senadoActaPdfUrl(actaId);
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
