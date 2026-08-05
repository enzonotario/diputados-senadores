import {
  getVotoTipoConfig,
  normalizeVotoTipo,
  POROTEO_VOTO_ORDER,
} from "@/utils/votoTipo";

export type PoroteoVoto = (typeof POROTEO_VOTO_ORDER)[number];

export type PoroteoMember = {
  id: string;
  foto?: string | null;
  nombreCompleto?: string;
  apellido?: string;
  nombre?: string;
  provincia?: string;
  bloque?: string;
  partido?: string;
};

export type PoroteoVotes = Record<string, PoroteoVoto>;

export function isPoroteoVoto(v: string): v is PoroteoVoto {
  return (POROTEO_VOTO_ORDER as readonly string[]).includes(v);
}

export function voteOf(
  votes: PoroteoVotes,
  id: string,
): PoroteoVoto {
  const raw = votes[id];
  if (raw && isPoroteoVoto(raw)) return raw;
  return "indeciso";
}

export function cyclePoroteoVoto(current: PoroteoVoto): PoroteoVoto {
  const i = POROTEO_VOTO_ORDER.indexOf(current);
  const next = (i + 1) % POROTEO_VOTO_ORDER.length;
  return POROTEO_VOTO_ORDER[next]!;
}

export function countPoroteoVotes(
  members: PoroteoMember[],
  votes: PoroteoVotes,
): Record<PoroteoVoto, number> {
  const counts = {
    indeciso: 0,
    afirmativo: 0,
    negativo: 0,
    abstencion: 0,
  } satisfies Record<PoroteoVoto, number>;
  for (const m of members) {
    counts[voteOf(votes, m.id)] += 1;
  }
  return counts;
}

export function poroteoLegendLabel(tipo: PoroteoVoto): string {
  if (tipo === "indeciso") return "Indecisos";
  if (tipo === "afirmativo") return "A favor";
  if (tipo === "negativo") return "En contra";
  return getVotoTipoConfig(tipo).label;
}

export function setGroupVotes(
  votes: PoroteoVotes,
  memberIds: string[],
  tipo: PoroteoVoto,
): PoroteoVotes {
  const next = { ...votes };
  for (const id of memberIds) next[id] = tipo;
  return next;
}

export function resetVotes(memberIds: string[]): PoroteoVotes {
  const next: PoroteoVotes = {};
  for (const id of memberIds) next[id] = "indeciso";
  return next;
}

/** Colores de hemiciclo por tipo de voto (incl. indeciso). */
export function poroteoGroupColors(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of POROTEO_VOTO_ORDER) {
    map[t] = getVotoTipoConfig(t).color;
  }
  map.presidente = getVotoTipoConfig("presidente").color;
  return map;
}

export function normalizeIncomingVote(tipo?: string | null): PoroteoVoto {
  const n = normalizeVotoTipo(tipo);
  if (isPoroteoVoto(n)) return n;
  return "indeciso";
}
