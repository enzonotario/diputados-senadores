import { SIN_PERIODO_KEY, isTodosPeriodoSelection } from "./periodoLegislativo";

/** Conteos mínimos por período para recalcular presentismo en el cliente. */
export type PresentismoPeriodoBucket = {
  totalVotaciones: number;
  ausencias: number;
  presentismo: number;
};

export type MemberWithPresentismoPeriodo = {
  estadisticas?: { presentismo?: number | null } | null;
  estadisticasPorPeriodo?: Record<string, PresentismoPeriodoBucket> | null;
};

function presentismoPct(total: number, ausencias: number): number {
  if (total <= 0) return 0;
  return Math.round(((total - ausencias) / total) * 1000) / 10;
}

/**
 * Agrupa votos por clave de período (misma regla que el catálogo).
 * Cada ítem con `tipoVoto` cuenta como votación; `ausente` suma a ausencias.
 */
export function buildPresentismoPorPeriodo(
  items: Array<{ periodo?: string | null; tipoVoto?: string | null }>,
): Record<string, PresentismoPeriodoBucket> {
  const map = new Map<string, { total: number; ausentes: number }>();

  for (const item of items) {
    const tipo = String(item.tipoVoto || "")
      .trim()
      .toLowerCase();
    if (!tipo) continue;
    const key = String(item.periodo || "").trim() || SIN_PERIODO_KEY;
    let cur = map.get(key);
    if (!cur) {
      cur = { total: 0, ausentes: 0 };
      map.set(key, cur);
    }
    cur.total++;
    if (tipo === "ausente") cur.ausentes++;
  }

  const out: Record<string, PresentismoPeriodoBucket> = {};
  for (const [key, cur] of map) {
    out[key] = {
      totalVotaciones: cur.total,
      ausencias: cur.ausentes,
      presentismo: presentismoPct(cur.total, cur.ausentes),
    };
  }
  return out;
}

/** Presentismo para la selección de períodos (o career si "todos"). */
export function presentismoForPeriodos(
  member: MemberWithPresentismoPeriodo,
  periodos: string | string[] | null | undefined,
): number {
  const fallback = member.estadisticas?.presentismo ?? 0;
  if (isTodosPeriodoSelection(periodos)) return fallback;

  const keys = Array.isArray(periodos)
    ? periodos
    : periodos
      ? [periodos]
      : [];
  if (!keys.length) return fallback;

  const porPeriodo = member.estadisticasPorPeriodo;
  if (!porPeriodo) return fallback;

  let total = 0;
  let ausencias = 0;
  for (const key of keys) {
    const bucket = porPeriodo[key];
    if (!bucket) continue;
    total += bucket.totalVotaciones;
    ausencias += bucket.ausencias;
  }
  if (!total) return 0;
  return presentismoPct(total, ausencias);
}

/** Clona miembros con `estadisticas.presentismo` acorde al filtro de período. */
export function withPeriodPresentismo<T extends MemberWithPresentismoPeriodo>(
  members: T[],
  periodos: string | string[] | null | undefined,
): T[] {
  if (isTodosPeriodoSelection(periodos)) return members;
  return members.map((m) => {
    const presentismo = presentismoForPeriodos(m, periodos);
    if (m.estadisticas?.presentismo === presentismo) return m;
    return {
      ...m,
      estadisticas: {
        totalVotaciones: m.estadisticas?.totalVotaciones ?? 0,
        votosAfirmativos: (m.estadisticas as any)?.votosAfirmativos ?? 0,
        votosNegativos: (m.estadisticas as any)?.votosNegativos ?? 0,
        abstenciones: (m.estadisticas as any)?.abstenciones ?? 0,
        ausencias: (m.estadisticas as any)?.ausencias ?? 0,
        ...m.estadisticas,
        presentismo,
      },
    };
  });
}

/** Promedio de presentismo de miembros que tienen estadísticas. */
export function averagePresentismo(
  members: Array<{ estadisticas?: { presentismo?: number | null } }>,
): number | null {
  const values = members
    .map((d) => d.estadisticas?.presentismo)
    .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (!values.length) return null;
  const sum = values.reduce((s, n) => s + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
