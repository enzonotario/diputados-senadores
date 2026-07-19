export type ProfileFact = {
  label: string;
  value?: string | null;
  /** Ruta interna Nuxt */
  to?: string | null;
  /** Link externo o mailto:/tel: */
  href?: string | null;
  /** Ocultar si no hay valor útil (default true) */
  hideEmpty?: boolean;
};

export type ProfileFactSection = {
  title: string;
  items: ProfileFact[];
};

export function formatGenero(genero?: string | null): string {
  const g = String(genero || "")
    .trim()
    .toUpperCase();
  if (!g) return "";
  if (g === "M" || g === "MASCULINO" || g === "HOMBRE") return "Masculino";
  if (g === "F" || g === "FEMENINO" || g === "MUJER") return "Femenino";
  if (g === "X" || g === "NO BINARIO") return "No binario";
  return genero!.trim();
}
