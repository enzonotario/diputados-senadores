/**
 * Qué tan holgada o ajustada fue una votación (solo afirmativos vs negativos).
 * Abstenciones/ausentes no entran: el margen es el de la disputa sí/no.
 */

export type VoteMarginLevel =
  | "empate"
  | "ajustada"
  | "comoda"
  | "amplia"
  | "unanime";

export type VoteMargin = {
  /** |afirmativos − negativos| */
  votes: number;
  /** Votos que definen el margen (af + neg). */
  decisive: number;
  /**
   * 0 = empate, 1 = unánime entre quienes votaron sí/no.
   * null si no hubo votos decisivos.
   */
  share: number | null;
  level: VoteMarginLevel | null;
  label: string;
};

const LABELS: Record<VoteMarginLevel, string> = {
  empate: "Empate",
  ajustada: "Ajustada",
  comoda: "Cómoda",
  amplia: "Amplia",
  unanime: "Unánime",
};

export function getVoteMargin(
  afirmativos: number | null | undefined,
  negativos: number | null | undefined,
): VoteMargin {
  const af = Math.max(0, Number(afirmativos) || 0);
  const neg = Math.max(0, Number(negativos) || 0);
  const decisive = af + neg;
  const votes = Math.abs(af - neg);

  if (decisive === 0) {
    return {
      votes: 0,
      decisive: 0,
      share: null,
      level: null,
      label: "—",
    };
  }

  const share = votes / decisive;
  let level: VoteMarginLevel;

  if (votes === 0) level = "empate";
  else if (Math.min(af, neg) === 0) level = "unanime";
  else if (share < 0.1) level = "ajustada";
  else if (share < 0.3) level = "comoda";
  else level = "amplia";

  return {
    votes,
    decisive,
    share,
    level,
    label: LABELS[level],
  };
}

/** Valor numérico para ordenar: menor = más peleada. Sin datos → al final. */
export function voteMarginSortValue(
  afirmativos: number | null | undefined,
  negativos: number | null | undefined,
): number {
  const { share } = getVoteMargin(afirmativos, negativos);
  return share ?? 2;
}
