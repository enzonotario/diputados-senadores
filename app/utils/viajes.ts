/** Índice oficial de viajes según cámara. */
export const VIAJES_FUENTE_URL_SENADO =
  "https://www.senado.gob.ar/administrativo/viajes";

export const VIAJES_FUENTE_URL_DIPUTADOS =
  "https://datos.hcdn.gob.ar/dataset/viajes-nacionales";

export const MISIONES_FUENTE_URL_DIPUTADOS =
  "https://datos.hcdn.gob.ar/dataset/misiones-oficiales";

/** @deprecated preferí VIAJES_FUENTE_URL_SENADO o viajesFuenteUrl(chamber) */
export const VIAJES_FUENTE_URL = VIAJES_FUENTE_URL_SENADO;

export function viajesFuenteUrl(chamber: "senadores" | "diputados") {
  return chamber === "diputados"
    ? VIAJES_FUENTE_URL_DIPUTADOS
    : VIAJES_FUENTE_URL_SENADO;
}

/** URL externa del registro (HCDN misiones oficiales). */
export function misionDocumentoUrl(v: {
  documentoUrl?: string | null;
  recursoUrl?: string | null;
}) {
  const url = String(v.documentoUrl || v.recursoUrl || "").trim();
  return url || null;
}

/** @deprecated preferí misionDocumentoUrl */
export function viajeIntlDocumentoUrl(v: {
  documentoUrl?: string | null;
  recursoUrl?: string | null;
}) {
  return misionDocumentoUrl(v);
}

export type MisionMonto = {
  amount: number;
  currency: "USD" | "EUR" | "ARS";
};

/** Monto principal reportado (prioridad USD → EUR → ARS). */
export function misionMontoPrincipal(v: {
  viaticosUsd?: number | null;
  viaticosEuro?: number | null;
  viaticosArs?: number | null;
}): MisionMonto | null {
  if (v.viaticosUsd != null && Number.isFinite(v.viaticosUsd)) {
    return { amount: v.viaticosUsd, currency: "USD" };
  }
  if (v.viaticosEuro != null && Number.isFinite(v.viaticosEuro)) {
    return { amount: v.viaticosEuro, currency: "EUR" };
  }
  if (v.viaticosArs != null && Number.isFinite(v.viaticosArs)) {
    return { amount: v.viaticosArs, currency: "ARS" };
  }
  return null;
}

export function formatMisionMonto(
  v: {
    viaticosUsd?: number | null;
    viaticosEuro?: number | null;
    viaticosArs?: number | null;
  },
  empty = "—",
): string {
  const m = misionMontoPrincipal(v);
  if (!m) return empty;
  const n = m.amount.toLocaleString("es-AR", {
    maximumFractionDigits: m.amount % 1 === 0 ? 0 : 2,
  });
  if (m.currency === "USD") return `U$S ${n}`;
  if (m.currency === "EUR") return `€ ${n}`;
  return `$ ${n}`;
}

/** País / último tramo del destino "Ciudad, País". */
export function misionPaisDestino(destino: string): string {
  const parts = String(destino || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || destino || "—";
}
