/**
 * Períodos legislativos para filtrar actas / miembros / charts.
 *
 * - Diputados: `acta.periodo` tal cual viene de la API (p. ej. "144").
 * - Senadores: la API no manda período → se deriva un “período ordinario”
 *   por fecha (1 mar Y → fin feb Y+1), clave = año de inicio (`"2025"`).
 *
 * `sin` = sin período conocido (acta sin clave, o miembro fuera de todos los rangos).
 */

export const SIN_PERIODO_KEY = "sin";
export const TODOS_PERIODO_KEY = "todos";

export type PeriodoInfo = {
  key: string;
  label: string;
  /** ISO date (YYYY-MM-DD) inclusive */
  minFecha: string;
  /** ISO date (YYYY-MM-DD) inclusive */
  maxFecha: string;
  count: number;
};

export type PeriodosCatalog = {
  periods: PeriodoInfo[];
  /** Incluye `sin` si hay actas sin período. */
  hasSin: boolean;
  defaultKey: string;
};

type ActaPeriodoRow = {
  fecha?: string | null;
  periodo?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Fecha civil en Argentina a partir de un ISO/date string. */
export function datePartsAr(fecha: string | null | undefined): {
  y: number;
  m: number;
  d: number;
} | null {
  const raw = String(fecha || "").trim();
  if (!raw) return null;
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(t);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function toIsoDateAr(fecha: string | null | undefined): string | null {
  const p = datePartsAr(fecha);
  if (!p) return null;
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

/**
 * Año de inicio del período ordinario argentino (mar–feb).
 * Ene/feb → año anterior.
 */
export function legislativeYearStartFromFecha(
  fecha: string | null | undefined,
): number | null {
  const p = datePartsAr(fecha);
  if (!p) return null;
  return p.m < 3 ? p.y - 1 : p.y;
}

export function legislativeYearBounds(startYear: number): {
  minFecha: string;
  maxFecha: string;
} {
  const endY = startYear + 1;
  const lastDay = isLeapYear(endY) ? 29 : 28;
  return {
    minFecha: `${startYear}-03-01`,
    maxFecha: `${endY}-02-${pad2(lastDay)}`,
  };
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Período fake para Senado a partir de la fecha del acta. */
export function fakeSenadoPeriodoKey(
  fecha: string | null | undefined,
): string {
  const y = legislativeYearStartFromFecha(fecha);
  return y == null ? SIN_PERIODO_KEY : String(y);
}

export function formatPeriodoLabel(
  key: string,
  chamber: "diputados" | "senadores",
): string {
  if (key === SIN_PERIODO_KEY) return "Sin período conocido";
  if (key === TODOS_PERIODO_KEY) return "Todos los períodos";
  if (chamber === "senadores") {
    const y = Number(key);
    if (Number.isFinite(y) && y > 1800) return `${y}–${y + 1}`;
  }
  return `Período ${key}`;
}

/**
 * Clave de período de un acta.
 * Diputados: API. Senadores: deriva si falta.
 */
export function resolveActaPeriodoKey(
  acta: ActaPeriodoRow,
  chamber: "diputados" | "senadores",
): string {
  const raw = String(acta.periodo || "").trim();
  if (raw) return raw;
  if (chamber === "senadores") return fakeSenadoPeriodoKey(acta.fecha);
  return SIN_PERIODO_KEY;
}

export function buildPeriodosCatalog(
  actas: ActaPeriodoRow[],
  chamber: "diputados" | "senadores",
): PeriodosCatalog {
  const map = new Map<
    string,
    { min: string; max: string; count: number }
  >();

  for (const a of actas || []) {
    const key = resolveActaPeriodoKey(a, chamber);
    const iso = toIsoDateAr(a.fecha);
    let row = map.get(key);
    if (!row) {
      row = { min: iso || "", max: iso || "", count: 0 };
      map.set(key, row);
    }
    row.count += 1;
    if (iso) {
      if (!row.min || iso < row.min) row.min = iso;
      if (!row.max || iso > row.max) row.max = iso;
    }
  }

  // Senadores: rangos oficiales mar–feb (más estables que min/max de actas).
  if (chamber === "senadores") {
    for (const [key, row] of map) {
      if (key === SIN_PERIODO_KEY) continue;
      const y = Number(key);
      if (!Number.isFinite(y)) continue;
      const bounds = legislativeYearBounds(y);
      row.min = bounds.minFecha;
      row.max = bounds.maxFecha;
    }
  }

  const hasSin = (map.get(SIN_PERIODO_KEY)?.count || 0) > 0;
  const known = [...map.entries()]
    .filter(([k]) => k !== SIN_PERIODO_KEY)
    .map(([key, row]) => ({
      key,
      label: formatPeriodoLabel(key, chamber),
      minFecha: row.min || "0000-01-01",
      maxFecha: row.max || "9999-12-31",
      count: row.count,
    }));

  known.sort((a, b) => {
    const an = Number(a.key);
    const bn = Number(b.key);
    if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an;
    return b.maxFecha.localeCompare(a.maxFecha);
  });

  const periods: PeriodoInfo[] = [...known];
  if (hasSin) {
    const sin = map.get(SIN_PERIODO_KEY)!;
    periods.push({
      key: SIN_PERIODO_KEY,
      label: formatPeriodoLabel(SIN_PERIODO_KEY, chamber),
      minFecha: sin.min || "0000-01-01",
      maxFecha: sin.max || "9999-12-31",
      count: sin.count,
    });
  }

  return {
    periods,
    hasSin,
    defaultKey: pickDefaultPeriodoKey(periods),
  };
}

export function pickDefaultPeriodoKey(periods: PeriodoInfo[]): string {
  const known = periods.filter((p) => p.key !== SIN_PERIODO_KEY);
  if (!known.length) {
    return periods[0]?.key || SIN_PERIODO_KEY;
  }

  const today = toIsoDateAr(new Date().toISOString()) || "";
  const current = known.find(
    (p) => p.minFecha <= today && today <= p.maxFecha,
  );
  if (current) return current.key;

  return [...known].sort((a, b) => b.maxFecha.localeCompare(a.maxFecha))[0]!
    .key;
}

export function findPeriodo(
  catalog: PeriodosCatalog | null | undefined,
  key: string | null | undefined,
): PeriodoInfo | null {
  if (!catalog || !key) return null;
  return catalog.periods.find((p) => p.key === key) || null;
}

/** Normaliza query/`periodo=` a lista de claves (sin `todos`). */
export function normalizePeriodoKeys(
  periodo: string | string[] | null | undefined,
): string[] {
  const raw = Array.isArray(periodo)
    ? periodo
    : periodo == null || periodo === ""
      ? []
      : String(periodo).split(",");
  const keys = raw
    .map((k) => String(k || "").trim())
    .filter((k) => k && k !== TODOS_PERIODO_KEY);
  return [...new Set(keys)];
}

export function isTodosPeriodoSelection(
  periodo: string | string[] | null | undefined,
): boolean {
  const keys = normalizePeriodoKeys(periodo);
  if (!keys.length) return true;
  return keys.includes(TODOS_PERIODO_KEY);
}

export function actaMatchesPeriodo(
  acta: ActaPeriodoRow,
  periodo: string | string[] | null | undefined,
  chamber: "diputados" | "senadores",
): boolean {
  if (isTodosPeriodoSelection(periodo)) return true;
  const keys = new Set(normalizePeriodoKeys(periodo));
  return keys.has(resolveActaPeriodoKey(acta, chamber));
}

export function filterActasByPeriodo<T extends ActaPeriodoRow>(
  actas: T[],
  periodo: string | string[] | null | undefined,
  chamber: "diputados" | "senadores",
): T[] {
  if (isTodosPeriodoSelection(periodo)) return actas;
  return actas.filter((a) => actaMatchesPeriodo(a, periodo, chamber));
}

type DateRange = { inicio?: string | null; fin?: string | null };

function parseMs(fecha: string | null | undefined): number | null {
  const iso = toIsoDateAr(fecha);
  if (!iso) return null;
  const t = new Date(`${iso}T12:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function memberMandatoRange(member: {
  periodoMandato?: DateRange | null;
  ceseFecha?: string | null;
  periodoReal?: DateRange | null;
  periodoLegal?: DateRange | null;
}): { inicio: string | null; fin: string | null } {
  if (member.periodoMandato?.inicio) {
    return {
      inicio: member.periodoMandato.inicio || null,
      fin: member.ceseFecha || member.periodoMandato.fin || null,
    };
  }
  const real = member.periodoReal;
  const legal = member.periodoLegal;
  return {
    inicio: real?.inicio || legal?.inicio || null,
    fin: real?.fin || legal?.fin || null,
  };
}

export function memberOverlapsDateRange(
  member: {
    periodoMandato?: DateRange | null;
    ceseFecha?: string | null;
    periodoReal?: DateRange | null;
    periodoLegal?: DateRange | null;
  },
  minFecha: string,
  maxFecha: string,
): boolean {
  const { inicio, fin } = memberMandatoRange(member);
  const mStart = parseMs(inicio);
  if (mStart == null) return false;
  const mEnd = parseMs(fin) ?? parseMs("9999-12-31")!;
  const pStart = parseMs(minFecha);
  const pEnd = parseMs(maxFecha);
  if (pStart == null || pEnd == null) return false;
  return rangesOverlap(mStart, mEnd, pStart, pEnd);
}

function memberMatchesSinglePeriodo(
  member: {
    periodoMandato?: DateRange | null;
    ceseFecha?: string | null;
    periodoReal?: DateRange | null;
    periodoLegal?: DateRange | null;
  },
  periodoKey: string,
  catalog: PeriodosCatalog,
): boolean {
  if (periodoKey === SIN_PERIODO_KEY) {
    const known = catalog.periods.filter((p) => p.key !== SIN_PERIODO_KEY);
    if (!known.length) return true;
    return !known.some((p) =>
      memberOverlapsDateRange(member, p.minFecha, p.maxFecha),
    );
  }
  const info = findPeriodo(catalog, periodoKey);
  if (!info) return false;
  return memberOverlapsDateRange(member, info.minFecha, info.maxFecha);
}

/**
 * ¿El miembro entra en los períodos seleccionados?
 * - vacío / todos: sí
 * - uno o más: solapa al menos uno (unión)
 */
export function memberMatchesPeriodo(
  member: {
    periodoMandato?: DateRange | null;
    ceseFecha?: string | null;
    periodoReal?: DateRange | null;
    periodoLegal?: DateRange | null;
  },
  periodo: string | string[] | null | undefined,
  catalog: PeriodosCatalog | null | undefined,
): boolean {
  if (isTodosPeriodoSelection(periodo)) return true;
  if (!catalog) return true;
  const keys = normalizePeriodoKeys(periodo);
  return keys.some((k) => memberMatchesSinglePeriodo(member, k, catalog));
}

export function filterMembersByPeriodo<
  T extends {
    periodoMandato?: DateRange | null;
    ceseFecha?: string | null;
    periodoReal?: DateRange | null;
    periodoLegal?: DateRange | null;
  },
>(
  members: T[],
  periodo: string | string[] | null | undefined,
  catalog: PeriodosCatalog | null | undefined,
): T[] {
  if (isTodosPeriodoSelection(periodo)) return members;
  return members.filter((m) => memberMatchesPeriodo(m, periodo, catalog));
}

function voteInPeriodoRanges(
  iso: string,
  keys: string[],
  catalog: PeriodosCatalog,
): boolean {
  for (const key of keys) {
    if (key === SIN_PERIODO_KEY) {
      const known = catalog.periods.filter((p) => p.key !== SIN_PERIODO_KEY);
      if (!known.some((p) => p.minFecha <= iso && iso <= p.maxFecha)) {
        return true;
      }
      continue;
    }
    const info = findPeriodo(catalog, key);
    if (info && info.minFecha <= iso && iso <= info.maxFecha) return true;
  }
  return false;
}

/** Filtra votos de afinidad por rango(s) de fechas del/los período(s). */
export function filterVotesByPeriodo<
  T extends { fecha?: string | null },
>(
  votes: T[],
  periodo: string | string[] | null | undefined,
  catalog: PeriodosCatalog | null | undefined,
): T[] {
  if (isTodosPeriodoSelection(periodo)) return votes;
  if (!catalog) return votes;
  const keys = normalizePeriodoKeys(periodo);
  return votes.filter((v) => {
    const iso = toIsoDateAr(v.fecha);
    if (!iso) return keys.includes(SIN_PERIODO_KEY);
    return voteInPeriodoRanges(iso, keys, catalog);
  });
}
