export interface Diputado {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto?: string;
  nombreSlug?: string;
  genero: string;
  provincia: string;
  periodoMandato: {
    inicio: string;
    fin: string;
  };
  juramentoFecha: string;
  ceseFecha: string | null;
  bloque: string;
  periodoBloque: {
    inicio: string;
    fin: string;
  };
  foto: string;
  estadisticas?: {
    totalVotaciones: number;
    presentismo: number;
    votosAfirmativos: number;
    votosNegativos: number;
    abstenciones: number;
    ausencias: number;
  };
  actasDiputado?: Acta[];
  tipoVoto?: string;
}

export interface Voto {
  diputado: string;
  diputadoSlug?: string;
  diputadoObj?: Diputado;
  tipoVoto: string;
  imagen: string;
  videoDiscurso: string;
}

export interface Acta {
  id: string;
  periodo: string;
  reunion: string;
  numeroActa: string;
  titulo: string;
  resultado: string;
  fecha: string;
  presidente: string;
  votosAfirmativos: number;
  votosNegativos: number;
  abstenciones: number;
  ausentes: number;
  votos: Voto[];
  votoDiputado?: Voto;
  tipoVotoDiputado?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | string[] | null | undefined;
}
