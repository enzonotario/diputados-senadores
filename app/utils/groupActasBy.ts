import type { Acta } from "@/lib/types";

export type ActasGroup = {
  key: string;
  label: string;
  actas: Acta[];
};

function yearFromActa(acta: Acta) {
  if (!acta.fecha) return "sin-dato";
  return String(new Date(acta.fecha).getFullYear());
}

function groupKey(acta: Acta, key: keyof Acta | "año") {
  if (key === "año") return yearFromActa(acta);
  const raw = (acta as any)[key];
  return String(raw || "sin-dato").trim() || "sin-dato";
}

function labelForKey(key: string, field: keyof Acta | "año") {
  if (key === "sin-dato") {
    if (field === "año") return "Sin año";
    if (field === "periodo") return "Sin período";
    return "Sin dato";
  }
  if (field === "periodo") return `Período ${key}`;
  return key;
}

/**
 * Agrupa actas por campo (periodo, …) o por año derivado de la fecha.
 * Acepta Acta de diputados o senadores (shape compatible).
 */
export function groupActasBy(
  actas: Acta[] | any[],
  key: keyof Acta | "año",
): ActasGroup[] {
  const map = new Map<string, Acta[]>();

  for (const acta of actas as Acta[]) {
    const k = groupKey(acta, key);
    const list = map.get(k);
    if (list) list.push(acta);
    else map.set(k, [acta]);
  }

  const groups: ActasGroup[] = [...map.entries()].map(([k, items]) => ({
    key: k,
    label: labelForKey(k, key),
    actas: items.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    ),
  }));

  groups.sort((a, b) => {
    if (a.key === "sin-dato") return 1;
    if (b.key === "sin-dato") return -1;
    const an = Number(a.key);
    const bn = Number(b.key);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return bn - an;
    return b.actas.length - a.actas.length;
  });

  return groups;
}
