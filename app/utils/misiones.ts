import slugify from "slugify";

function slugPart(value: string, max = 48): string {
  const s = slugify(String(value || ""), { lower: true, strict: true, trim: true });
  return (s || "x").slice(0, max);
}

/** País / destino principal a partir del campo `destino` HCDN. */
export function paisFromDestino(destino: string): string {
  const raw = String(destino || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw || raw === "—") return "Sin destino";
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return raw;
  return parts[parts.length - 1] || parts[0]!;
}

export type MisionMonto = {
  amount: number;
  currency: "USD" | "EUR" | "ARS";
};

/** Monto principal declarado (prioriza USD → EUR → ARS). */
export function misionMontoPrincipal(v: {
  viaticosUsd?: number | null;
  viaticosEuro?: number | null;
  viaticosArs?: number | null;
}): MisionMonto | null {
  if (v.viaticosUsd != null && Number.isFinite(v.viaticosUsd)) {
    return { amount: Number(v.viaticosUsd), currency: "USD" };
  }
  if (v.viaticosEuro != null && Number.isFinite(v.viaticosEuro)) {
    return { amount: Number(v.viaticosEuro), currency: "EUR" };
  }
  if (v.viaticosArs != null && Number.isFinite(v.viaticosArs)) {
    return { amount: Number(v.viaticosArs), currency: "ARS" };
  }
  return null;
}

const MONEY_FMT = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatMisionMonto(monto: MisionMonto | null): string {
  if (!monto) return "—";
  const n = MONEY_FMT.format(monto.amount);
  if (monto.currency === "USD") return `U$S ${n}`;
  if (monto.currency === "EUR") return `€ ${n}`;
  return `$ ${n}`;
}

export function formatMisionMontoCompact(
  amount: number,
  currency: "USD" | "EUR" | "ARS" = "USD",
): string {
  return formatMisionMonto({ amount, currency });
}

export type MisionIdParts = {
  documentoId?: string | null;
  recursoId?: string | null;
  fechaInicio?: string | null;
  anio?: number | null;
  nombre?: string | null;
  diputadoNombre?: string | null;
  destino?: string | null;
};

/**
 * Id estable y legible para rutas `/diputados/misiones/:id`.
 * Clave: documento + fecha + nombre + destino (única en el dataset HCDN).
 */
export function buildMisionId(m: MisionIdParts): string {
  const doc = String(m.documentoId || m.recursoId || "x")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toLowerCase() || "x";
  const date = String(m.fechaInicio || m.anio || "0000")
    .slice(0, 10)
    .replace(/[^0-9-]/g, "");
  const who = slugPart(m.nombre || m.diputadoNombre || "sin-nombre", 40);
  const dest = slugPart(paisFromDestino(String(m.destino || "")), 32);
  return `${date}-${who}-${dest}-${doc}`;
}

export function misionPath(id: string) {
  return `/diputados/misiones/${encodeURIComponent(id)}`;
}

/** Página CKAN del recurso CSV (no el download directo). */
export function misionRecursoPageUrl(v: {
  documentoId?: string | null;
  recursoId?: string | null;
}) {
  const id = String(v.documentoId || v.recursoId || "").trim();
  if (!id) return null;
  return `https://datos.hcdn.gob.ar/dataset/misiones-oficiales/resource/${id}`;
}

/** CSV oficial (download) publicado por HCDN. */
export function misionCsvUrl(v: {
  documentoUrl?: string | null;
  recursoUrl?: string | null;
}) {
  const url = String(v.documentoUrl || v.recursoUrl || "").trim();
  return url || null;
}
