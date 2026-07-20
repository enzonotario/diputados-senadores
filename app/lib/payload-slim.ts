/**
 * Recortes de payload para SSR: no embeber votos/actas completas en HTML.
 * Los scrapers de OG (p. ej. Meta) rechazan páginas > 5 MB.
 */

/** Acta sin array `votos` (conserva totales afirmativos/negativos/…). */
export function slimActa<T extends { votos?: unknown }>(
  acta: T,
): Omit<T, "votos"> {
  const { votos: _votos, ...rest } = acta;
  return rest;
}

export function slimActas<T extends { votos?: unknown }>(
  actas: T[],
): Omit<T, "votos">[] {
  return actas.map(slimActa);
}

/** Miembro con estadísticas, sin historial de actas embebido. */
export function slimMemberStats<
  T extends { actasDiputado?: unknown; actasSenador?: unknown },
>(member: T): Omit<T, "actasDiputado" | "actasSenador"> {
  const { actasDiputado: _a, actasSenador: _b, ...rest } = member;
  return rest;
}

export function slimMembersStats<
  T extends { actasDiputado?: unknown; actasSenador?: unknown },
>(members: T[]): Omit<T, "actasDiputado" | "actasSenador">[] {
  return members.map(slimMemberStats);
}

/** Total de votos para barras/% — usa `votos.length` o la suma de conteos. */
export function actaVoteTotal(acta: {
  votos?: unknown[] | null;
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
}): number {
  const fromList = acta.votos?.length;
  if (fromList) return fromList;
  return (
    Number(acta.votosAfirmativos || 0) +
    Number(acta.votosNegativos || 0) +
    Number(acta.abstenciones || 0) +
    Number(acta.ausentes || 0)
  );
}

/** Peer de afinidad listo para serializar (sin actas completas). */
export type SlimAffinityPeer = {
  id: string;
  name: string;
  group?: string | null;
  foto?: string | null;
  votes: Array<{ id: string; fecha: string; voto?: string | null }>;
};
