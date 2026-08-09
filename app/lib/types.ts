export interface Senador {
  id: string
  /** "Apellido, Nombre" según la API del Senado */
  nombre: string
  apellido?: string
  nombreDePila?: string
  nombreCompleto?: string
  nombreSlug?: string
  provincia: string
  partido: string
  /** Bloque parlamentario actual (oficial; distinto de partido/alianza). */
  bloque?: string | null
  periodoLegal: {
    inicio: string
    fin: string | null
  }
  periodoReal: {
    inicio: string
    fin: string | null
  }
  reemplazo?: string | null
  observaciones?: string | null
  foto?: string | null
  email?: string | null
  telefono?: string | null
  meta?: SenadorMeta | null
  /**
   * Viajes nacionales + internacionales en los últimos 12 meses
   * (desde `/v1/senado/viajes/conteo-12m`).
   */
  viajesUltimos12Meses?: number
  estadisticas?: {
    totalVotaciones: number
    presentismo: number
    votosAfirmativos: number
    votosNegativos: number
    abstenciones: number
    ausencias: number
  }
  /** Conteos por período para presentismo scoped al filtro `?periodo=`. */
  estadisticasPorPeriodo?: Record<
    string,
    { totalVotaciones: number, ausencias: number, presentismo: number }
  >
  actasSenador?: Acta[]
  tipoVoto?: string
}

export interface SenadorDietaMeta {
  renunciaAlAumento: boolean
  donacion: boolean
  aportesPartidarios: boolean
  fuente?: string
  actualizado?: string
}

export interface SenadorComisionMeta {
  id: string
  nombre: string
  cargo: string
}

export interface SenadorMeta {
  dieta?: SenadorDietaMeta
  comisiones?: SenadorComisionMeta[]
}

export interface ViajeNacional {
  ambito: 'nacional'
  anio: number
  mes: number
  mesNombre: string
  /** Senado (PDF). */
  documentoId?: string
  documentoUrl?: string
  /** Diputados (CSV HCDN). */
  recursoId?: string
  recursoUrl?: string
  nombre: string
  senadorId?: string | null
  diputadoId?: string | null
  tipoSolicitud?: string | null
  origen: string
  origenCodigo: string | null
  destino: string
  destinoCodigo: string | null
  provincia?: string | null
  bloque?: string | null
}

export interface ViajeInternacional {
  ambito: 'internacional'
  anio: number
  mes: number | null
  mesNombre: string | null
  documentoId?: string
  documentoUrl?: string
  recursoId?: string
  recursoUrl?: string
  nombre: string
  senadorId?: string | null
  diputadoId?: string | null
  expediente: string
  destino: string
  fechaInicio: string | null
  fechaFin: string | null
  fechaTexto: string | null
  asistenciaAlViajero: boolean | null
  viaticos: boolean | null
  viaticosUsd: number | null
  viaticosEuro: number | null
  viaticosArs: number | null
  motivo: string | null
  bloque: string | null
}

export interface SenadorViajes {
  senadorId: string
  nacionales: ViajeNacional[]
  internacionales: ViajeInternacional[]
}

export interface DiputadoViajes {
  diputadoId: string
  nacionales: ViajeNacional[]
  internacionales: ViajeInternacional[]
}

export interface ComisionIntegrante {
  nombre: string
  cargo: string
  camara: 'senado' | 'diputados' | null
  senadorId: string | null
  diputadoId: string | null
  /** Senador resuelto desde el catálogo (cámara senado). */
  senador?: Senador | null
  /** Diputado resuelto desde el catálogo (cámara diputados). */
  diputado?: import("./types-diputados").Diputado | null
}

export interface Comision {
  id: string
  nombre: string
  tipo: string | null
  url: string
  integrantes: ComisionIntegrante[]
}

/** Presidente actual del Senado (`/v1/senado/presidencia`). */
export interface PresidenciaSenado {
  nombre: string
  cargo: string | null
  periodoInicio: string | null
  periodoFin: string | null
  foto: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  curriculum: string | null
  fuente: string | null
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
  /** Tipo de votación del PDF (p. ej. NOMINAL). */
  votacion?: string | null;
  /** Presidente de la sesión según cabecera del PDF. */
  presidente?: string | null;
  votos: Voto[];
  observaciones?: string[];
  votoSenador?: Voto;
  tipoVotoSenador?: string;
  /** Campos opcionales para UI compartida */
  periodo?: string;
  reunion?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | string[] | null | undefined;
}
