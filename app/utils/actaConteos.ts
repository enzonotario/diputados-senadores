export type ActaConteosInput = {
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
  presentes?: number | null;
  sinVotar?: number | null;
  miembros?: number | null;
  presidente?: string | null;
};

function positiveInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function nonNegativeInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Completa presentes / sin votar / miembros cuando el acta no los trae de la API. */
export function normalizeDiputadosActaConteos<T extends ActaConteosInput>(
  acta: T,
): T & { presentes: number; sinVotar: number; miembros: number | null } {
  const afirmativos = Number(acta.votosAfirmativos) || 0;
  const negativos = Number(acta.votosNegativos) || 0;
  const abstenciones = Number(acta.abstenciones) || 0;
  const ausentes = Number(acta.ausentes) || 0;
  const votaron = afirmativos + negativos + abstenciones;

  let presentes = positiveInt(acta.presentes);
  let sinVotar = nonNegativeInt(acta.sinVotar);
  let miembros = positiveInt(acta.miembros);

  if (presentes == null) {
    if (miembros != null) {
      presentes = Math.max(0, miembros - ausentes);
    } else if (sinVotar != null) {
      presentes = votaron + sinVotar;
    } else if (String(acta.presidente || "").trim()) {
      // Quien preside suele estar presente sin emitir voto.
      presentes = votaron + 1;
      sinVotar = 1;
    } else {
      presentes = votaron;
    }
  }

  if (sinVotar == null) {
    sinVotar = Math.max(0, presentes - votaron);
  }

  if (miembros == null && presentes > 0) {
    miembros = presentes + ausentes;
  }

  return {
    ...acta,
    presentes,
    sinVotar,
    miembros,
  };
}
