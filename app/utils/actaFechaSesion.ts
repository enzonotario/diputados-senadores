import { formatDate, formatTime } from "@/lib/utils";
import { toIsoDateAr } from "@/utils/periodoLegislativo";

/** Shape mínimo compartido entre actas de diputados y senadores. */
export type ActaSesionLike = {
  id: string;
  fecha: string;
  fechaSesion?: string | null;
  numeroActa?: string | null;
};

export type ActasSesionGroup<T extends ActaSesionLike = ActaSesionLike> = {
  /** Clave `yyyy-MM-dd` (o `sin-dato`). */
  key: string;
  label: string;
  actas: T[];
};

/**
 * Día de sesión oficial (`yyyy-MM-dd`).
 * Usa `fechaSesion` si viene de la API; si no, fecha civil argentina de `fecha`.
 */
export function actaFechaSesionKey(
  acta: ActaSesionLike | null | undefined,
): string {
  const explicit = String(acta?.fechaSesion || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return toIsoDateAr(acta?.fecha) || "sin-dato";
}

export function actaFechaSesionLabel(
  acta: ActaSesionLike | null | undefined,
): string {
  const key = actaFechaSesionKey(acta);
  if (key === "sin-dato") return "Sin fecha de sesión";
  return formatDate(key);
}

export function parseNumeroActa(raw: string | null | undefined): number {
  const n = Number(String(raw || "").replace(/\D+/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Sesión desc, luego nº de acta asc; empate por hora de votación asc. */
export function compareActasBySesionThenActa(
  a: ActaSesionLike,
  b: ActaSesionLike,
): number {
  const ka = actaFechaSesionKey(a);
  const kb = actaFechaSesionKey(b);
  if (ka !== kb) {
    if (ka === "sin-dato") return 1;
    if (kb === "sin-dato") return -1;
    return kb.localeCompare(ka);
  }
  const na = parseNumeroActa(a.numeroActa);
  const nb = parseNumeroActa(b.numeroActa);
  if (na !== nb) return na - nb;
  return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
}

export function sortActasBySesionThenActa<T extends ActaSesionLike>(
  actas: T[],
): T[] {
  return [...actas].sort(compareActasBySesionThenActa);
}

/**
 * Agrupa por fecha de sesión (desc). Dentro de cada grupo: acta asc.
 */
export function groupActasByFechaSesion<T extends ActaSesionLike>(
  actas: T[],
): ActasSesionGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const acta of actas) {
    const key = actaFechaSesionKey(acta);
    const list = map.get(key);
    if (list) list.push(acta);
    else map.set(key, [acta]);
  }

  const groups: ActasSesionGroup<T>[] = [...map.entries()].map(
    ([key, items]) => ({
      key,
      label: key === "sin-dato" ? "Sin fecha de sesión" : formatDate(key),
      actas: [...items].sort((a, b) => {
        const na = parseNumeroActa(a.numeroActa);
        const nb = parseNumeroActa(b.numeroActa);
        if (na !== nb) return na - nb;
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      }),
    }),
  );

  groups.sort((a, b) => {
    if (a.key === "sin-dato") return 1;
    if (b.key === "sin-dato") return -1;
    return b.key.localeCompare(a.key);
  });

  return groups;
}

/** Hora de la votación; vacío si no hay componente horario. */
export function actaHoraVotacion(
  acta: ActaSesionLike | null | undefined,
): string {
  return formatTime(acta?.fecha, "");
}
