import { normalizeVotoTipo, getVotoTipoConfig } from "@/utils/votoTipo";

export type ActaGroupVoteMember = {
  grupo?: string | null;
  tipoVoto?: string | null;
};

export type ActaGroupVoteRow = {
  key: string;
  label: string;
  total: number;
  afirmativo: number;
  negativo: number;
  abstencion: number;
  ausente: number;
  /** Mayor % de un solo tipo de voto (0–100). */
  majorityPct: number;
  /**
   * Todos los que emitieron voto (af/neg/abs) fueron al mismo lado.
   * Ausentes no rompen la unidad si el resto coincidió.
   */
  united: boolean;
};

function emptyCounts() {
  return { afirmativo: 0, negativo: 0, abstencion: 0, ausente: 0 };
}

/** Agrupa legisladores de un acta por partido/bloque y cuenta tipos de voto. */
export function actaGroupVoteRows(
  members: ActaGroupVoteMember[],
  options?: { emptyLabel?: string },
): ActaGroupVoteRow[] {
  const emptyLabel = options?.emptyLabel || "Sin grupo";
  const map = new Map<string, ReturnType<typeof emptyCounts>>();

  for (const m of members) {
    const key = String(m.grupo || "").trim() || emptyLabel;
    let counts = map.get(key);
    if (!counts) {
      counts = emptyCounts();
      map.set(key, counts);
    }
    const tipo = normalizeVotoTipo(m.tipoVoto);
    if (tipo === "afirmativo") counts.afirmativo++;
    else if (tipo === "negativo") counts.negativo++;
    else if (tipo === "abstencion") counts.abstencion++;
    else counts.ausente++;
  }

  const rows: ActaGroupVoteRow[] = [...map.entries()].map(([key, c]) => {
    const total = c.afirmativo + c.negativo + c.abstencion + c.ausente;
    const voted = c.afirmativo + c.negativo + c.abstencion;
    const sides = [c.afirmativo, c.negativo, c.abstencion].filter((n) => n > 0)
      .length;
    const majority = Math.max(
      c.afirmativo,
      c.negativo,
      c.abstencion,
      c.ausente,
    );
    return {
      key,
      label: key,
      total,
      ...c,
      majorityPct: total ? Math.round((majority / total) * 100) : 0,
      united: voted === 0 ? c.ausente === total : sides <= 1,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es"));
  return rows;
}

export function groupVotePct(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function groupVoteTipoLabel(key: string): string {
  return getVotoTipoConfig(key).label;
}
