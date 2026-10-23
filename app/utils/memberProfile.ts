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

export type ProfileHighlight = {
  label: string;
  value: string;
  hint?: string | null;
  to?: string | null;
};

const DAY_MS = 86_400_000;

/** Años totales en el Congreso (une mandatos solapados, corta en hoy). */
export function careerYears(
  cargos: Array<{ inicio: string; fin: string | null }>,
  now = Date.now(),
): number {
  const ranges = cargos
    .map((c) => [
      new Date(c.inicio).getTime(),
      Math.min(c.fin ? new Date(c.fin).getTime() : now, now),
    ])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((x, y) => x[0]! - y[0]!);

  let total = 0;
  let [start, end] = [Number.NaN, Number.NaN];
  for (const [a, b] of ranges) {
    if (Number.isNaN(start) || a! > end) {
      if (!Number.isNaN(start)) total += end - start;
      [start, end] = [a!, b!];
    } else {
      end = Math.max(end, b!);
    }
  }
  if (!Number.isNaN(start)) total += end - start;
  return total / (365.25 * DAY_MS);
}

/** Highlight "Comisiones" con las presidencias como dato destacado. */
export function comisionesHighlight(
  comisiones: Array<{ nombre: string; cargo: string }> | undefined,
  to: string,
): ProfileHighlight | null {
  if (!comisiones?.length) return null;
  const preside = comisiones.filter((c) => /^president/i.test(c.cargo.trim()));
  return {
    label: comisiones.length === 1 ? "Comisión" : "Comisiones",
    value: String(comisiones.length),
    hint: preside.length
      ? `Preside ${preside.map((c) => c.nombre).join(", ")}`
      : null,
    to,
  };
}

export function careerHighlights(
  cargos: Array<{ inicio: string; fin: string | null }>,
): ProfileHighlight[] {
  if (!cargos.length) return [];
  const years = careerYears(cargos);
  return [
    {
      label: "En el Congreso",
      value: years < 1 ? "< 1 año" : `${Math.floor(years)} años`,
    },
    {
      label: cargos.length === 1 ? "Mandato" : "Mandatos",
      value: String(cargos.length),
    },
  ];
}

/** "1 año y 3 meses", "8 meses", "12 días". */
export function formatDuration(days: number): string {
  if (days < 60) return `${days} ${days === 1 ? "día" : "días"}`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days - years * 365) / 30.4);
  const y = years ? `${years} ${years === 1 ? "año" : "años"}` : "";
  const m = months ? `${months} ${months === 1 ? "mes" : "meses"}` : "";
  return [y, m].filter(Boolean).join(" y ");
}
