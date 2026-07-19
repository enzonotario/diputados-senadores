export interface Senador {
  id: string;
  /** "Apellido, Nombre" según la API del Senado */
  nombre: string;
  apellido?: string;
  nombreDePila?: string;
  nombreCompleto?: string;
  nombreSlug?: string;
  provincia: string;
  partido: string;
  periodoLegal: {
    inicio: string;
    fin: string | null;
  };
  periodoReal: {
    inicio: string;
    fin: string | null;
  };
  reemplazo?: string | null;
  observaciones?: string | null;
  foto?: string | null;
  email?: string | null;
  telefono?: string | null;
  estadisticas?: {
    totalVotaciones: number;
    presentismo: number;
    votosAfirmativos: number;
    votosNegativos: number;
    abstenciones: number;
    ausencias: number;
  };
  actasSenador?: Acta[];
  tipoVoto?: string;
}

export interface Voto {
  /** Nombre tal como viene en el acta */
  senador: string;
  senadorSlug?: string;
  senadorObj?: Senador;
  tipoVoto: string;
  banca?: string;
  imagen?: string;
}

export interface Acta {
  id: string;
  titulo: string;
  proyecto?: string;
  descripcion?: string;
  quorumTipo?: string;
  fecha: string;
  numeroActa?: string;
  mayoria?: string;
  miembros?: number;
  votosAfirmativos: number;
  votosNegativos: number;
  abstenciones: number;
  presentes?: number;
  ausentes: number;
  amn?: number;
  resultado: string;
  votos: Voto[];
  observaciones?: string[];
  votoSenador?: Voto;
  tipoVotoSenador?: string;
  /** Campos opcionales para UI compartida */
  periodo?: string;
  reunion?: string;
  presidente?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | string[] | null | undefined;
}
