/**
 * Recortes de payload para SSR: no embeber votos/actas completas en HTML.
 * Los scrapers de OG (p. ej. Meta) rechazan páginas > 5 MB.
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
type MemberActasFields = { actasDiputado?: unknown; actasSenador?: unknown };

// `T extends object` (no el tipo débil de arriba): TS 6 marca exceso de
// propiedades en literales si el constraint es all-optional.
export function slimMemberStats<T extends object>(
  member: T,
): Omit<T, keyof MemberActasFields> {
  const {
    actasDiputado: _a,
    actasSenador: _b,
    ...rest
  } = member as T & MemberActasFields;
  return rest;
}

export function slimMembersStats<T extends object>(
  members: T[],
): Omit<T, keyof MemberActasFields>[] {
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
