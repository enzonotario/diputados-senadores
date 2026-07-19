import slugify from "slugify";

export function bloqueSlug(bloque: string) {
  return (
    slugify(bloque || "", { lower: true, strict: true, trim: true }) ||
    "sin-bloque"
  );
}

/** Ruta a la página dedicada del bloque, o null si no aplica. */
export function bloquePath(bloque?: string | null): string | null {
  const name = String(bloque || "").trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower === "sin-dato" || lower === "sin bloque") return null;
  return `/diputados/bloques/${bloqueSlug(name)}`;
}
