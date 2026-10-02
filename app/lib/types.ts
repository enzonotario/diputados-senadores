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
  /** Bruto estimado (4000 módulos × valor módulo), si está disponible. */
  brutoEstimado?: number
  valorModulo?: number
}

export interface SenadorDietaEstimadaMeta {
  brutoEstimado: number
  valorModulo: number
  totalModulos: number
  fuente: string
  nota: string
}

export interface SenadorPersonalMeta {
  agentes: number
  brutoMensualEstimado: number
  brutoMensualConAdicionalFuncion: number
  fuente: string
}

export interface SenadorComisionMeta {
  id: string
  nombre: string
  cargo: string
}

export interface SenadorMeta {
  dieta?: SenadorDietaMeta
  dietaEstimada?: SenadorDietaEstimadaMeta
  personal?: SenadorPersonalMeta
  comisiones?: SenadorComisionMeta[]
}

export interface GastoPersonalResumen {
  agentes: number
  brutoMensualEstimado: number
  brutoMensualConAdicionalFuncion: number
  sinCategoriaMatch: number
  porCategoria: Array<{
    categoria: string
    cantidad: number
    montoUnitario: number
    montoUnitarioConAdicionalFuncion: number
    subtotal: number
    subtotalConAdicionalFuncion: number
  }>
  metodo: string
}

export interface BloqueSenadoGasto {
  id: string
  nombre: string
  presidente?: string | null
  integrantes: number
  senadores?: Array<{ id: string, nombre: string }>
  personal?: Array<{ nombre: string, categoria: string }>
  gasto: GastoPersonalResumen
  fuente?: string
}

export interface GastoSenadoSenadorRow {
  senadorId: string
  nombre: string
  bloque: string | null
  dietaBrutoEstimado: number | null
  renunciaAlAumento: boolean | null
  personalAgentes: number
  personalBrutoEstimado: number
  personalBrutoConAdicionalFuncion: number
  totalEstimado: number
}

export interface SenadorPersonalAgente {
  nombre: string
  categoria: string
  brutoBase?: number | null
  brutoConAdicionalFuncion?: number | null
}

export interface SenadorPersonalDetalle {
  senadorId: string
  personal: Array<{ nombre: string, categoria: string }>
  personalDetalle?: SenadorPersonalAgente[]
  gasto?: GastoPersonalResumen
  fuente: string
}

export interface GastoSenado {
  fuenteEscala: string
  fuenteBloques: string
  fuenteDietas: string
  scrapedAt: string
  valorModulo: number
  vigenciaEscala: string | null
  dietaSenadorBrutoEstimado: number
  notas: string[]
  totales: {
    bloquesPersonalBruto: number
    despachosPersonalBruto: number
    dietasSenadoresBruto: number
    grandTotalEstimado: number
  }
  bloques: Array<{
    id: string
    nombre: string
    integrantes: number
    gasto: GastoPersonalResumen
  }>
  senadores: GastoSenadoSenadorRow[]
}

export interface EscalaSalarialSenado {
  fuente: string
  vigencia: string | null
  valorModulo: number
  scrapedAt: string
  categorias: Array<{
    categoria: number
    codigo: string
    totalEnPesos: number
    rc: number
    brutoBase: number
    brutoConAdicionalFuncion: number
  }>
  dietaSenador: {
    totalModulos: number
    brutoEstimado: number
    nota: string
  }
  notas: string[]
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
}

export interface MisionOficial {
  id?: string
  anio: number
  mes: number | null
  mesNombre: string | null
  recursoId: string
  recursoUrl: string
  recursoNombre?: string
  documentoId: string
  documentoUrl: string
  nombre: string
  diputadoId: string | null
  destino: string
  fechaInicio: string | null
  fechaFin: string | null
  fechaTexto: string | null
  institucion: string | null
  viaticos: boolean | null
  viaticosUsd: number | null
  viaticosEuro: number | null
  viaticosArs: number | null
  motivo: string | null
  bloque: string | null
}

export interface DiputadoMisiones {
  diputadoId: string
  misiones: MisionOficial[]
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
  /** Senador resuelto desde `presidente` (para links; null si es VP u otro no-senador). */
  presidenteObj?: Senador | null;
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
