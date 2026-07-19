import slugify from "slugify";

export function partidoSlug(partido: string) {
  return (
    slugify(partido || "", { lower: true, strict: true, trim: true }) ||
    "sin-partido"
  );
}

/** Ruta a la página dedicada del partido, o null si no aplica. */
export function partidoPath(partido?: string | null): string | null {
  const name = String(partido || "").trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  if (
    lower === "sin-dato" ||
    lower === "sin partido" ||
    lower === "sin especificar"
  ) {
    return null;
  }
  return `/senadores/partidos/${partidoSlug(name)}`;
}
