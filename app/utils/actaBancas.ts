/**
 * Banca de cada diputado en el hemiciclo de un acta.
 *
 * La API (`votos[].banca`) guarda la banca que ocupaba cada diputado al
 * momento de la votación (historial del recinto HCDN). Esa es la única fuente
 * correcta para actas ya pasadas.
 *
 * Si el acta no la trae, el fallback es la banca *actual* del diputado, pero
 * solo es válido si el acta es del mandato vigente: para actas anteriores los
 * asientos cambiaron de dueño y el hemiciclo mostraría bancas "Vacante" falsas
 * (o bancas equivocadas). En ese caso no se asigna banca y el hemiciclo cae al
 * layout agrupado.
 */

/** Inicio del mandato al que corresponde el recinto actual (2025–2029). */
export const RECINTO_VIGENTE_DESDE = "2025-12-10";

/** Mínimo de votos con banca para considerar que el acta tiene recinto histórico. */
export const MIN_VOTOS_CON_BANCA = 20;

export type ActaBancasModo =
  /** El acta trae `votos[].banca`: usar solo eso. */
  | "historica"
  /** Sin dato histórico pero del mandato vigente: usar la banca actual. */
  | "vigente"
  /** Sin dato histórico y de un mandato anterior: no mostrar bancas. */
  | "desconocida";

function hasBanca(banca: unknown): banca is number {
  return typeof banca === "number" && Number.isFinite(banca);
}

export function resolveActaBancasModo(
  fecha: string | Date | null | undefined,
  votos: ReadonlyArray<{ banca?: number | null }>,
): ActaBancasModo {
  const conBanca = votos.filter((v) => hasBanca(v.banca)).length;
  if (conBanca >= MIN_VOTOS_CON_BANCA) return "historica";

  const t = fecha instanceof Date ? fecha.getTime() : Date.parse(fecha || "");
  if (Number.isFinite(t) && t >= Date.parse(RECINTO_VIGENTE_DESDE)) {
    return "vigente";
  }
  return "desconocida";
}

/** Banca a usar para un voto de un acta según el modo resuelto. */
export function bancaDeVotoEnActa(
  modo: ActaBancasModo,
  votoBanca: number | null | undefined,
  bancaActual: number | null | undefined,
): number | null {
  if (modo === "historica") return hasBanca(votoBanca) ? votoBanca : null;
  if (modo === "vigente") return hasBanca(bancaActual) ? bancaActual : null;
  return null;
}
