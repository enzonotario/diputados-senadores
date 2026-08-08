/**
 * Coordenadas aproximadas de aeropuertos argentinos (IATA → lon/lat)
 * para el mapa de viajes nacionales del Senado.
 */
export type AeropuertoPunto = {
  code: string;
  label: string;
  lon: number;
  lat: number;
};

const BY_CODE: Record<string, AeropuertoPunto> = {
  AEP: { code: "AEP", label: "Buenos Aires (Aeroparque)", lon: -58.4156, lat: -34.5592 },
  EZE: { code: "EZE", label: "Ezeiza", lon: -58.5358, lat: -34.8222 },
  BUE: { code: "BUE", label: "Buenos Aires", lon: -58.45, lat: -34.6 },
  MDZ: { code: "MDZ", label: "Mendoza", lon: -68.7958, lat: -32.8317 },
  AFA: { code: "AFA", label: "San Rafael", lon: -68.4006, lat: -34.5883 },
  COR: { code: "COR", label: "Córdoba", lon: -64.212, lat: -31.315 },
  CDR: { code: "CDR", label: "Córdoba", lon: -64.212, lat: -31.315 },
  TUC: { code: "TUC", label: "Tucumán", lon: -65.1422, lat: -26.8409 },
  SLA: { code: "SLA", label: "Salta", lon: -65.3797, lat: -24.856 },
  JUJ: { code: "JUJ", label: "Jujuy", lon: -65.0978, lat: -24.3928 },
  IRJ: { code: "IRJ", label: "La Rioja", lon: -66.7958, lat: -29.3816 },
  CTC: { code: "CTC", label: "Catamarca", lon: -65.7517, lat: -28.5956 },
  SDE: { code: "SDE", label: "Santiago del Estero", lon: -64.3113, lat: -27.7656 },
  RES: { code: "RES", label: "Resistencia", lon: -59.0561, lat: -27.45 },
  CNQ: { code: "CNQ", label: "Corrientes", lon: -58.7619, lat: -27.4455 },
  FMA: { code: "FMA", label: "Formosa", lon: -58.2281, lat: -26.2127 },
  PSS: { code: "PSS", label: "Posadas", lon: -55.9711, lat: -27.3858 },
  IGR: { code: "IGR", label: "Puerto Iguazú", lon: -54.4734, lat: -25.7373 },
  IGZ: { code: "IGZ", label: "Puerto Iguazú", lon: -54.4734, lat: -25.7373 },
  ROS: { code: "ROS", label: "Rosario", lon: -60.785, lat: -32.9036 },
  SFN: { code: "SFN", label: "Santa Fe", lon: -60.8117, lat: -31.7117 },
  SFE: { code: "SFE", label: "Santa Fe", lon: -60.8117, lat: -31.7117 },
  PRA: { code: "PRA", label: "Paraná", lon: -60.4803, lat: -31.7947 },
  LUQ: { code: "LUQ", label: "San Luis", lon: -66.3514, lat: -33.2731 },
  UAQ: { code: "UAQ", label: "San Juan", lon: -68.4189, lat: -31.5715 },
  NQN: { code: "NQN", label: "Neuquén", lon: -68.1551, lat: -38.949 },
  RSA: { code: "RSA", label: "Santa Rosa", lon: -64.2753, lat: -36.5883 },
  REL: { code: "REL", label: "Trelew", lon: -65.2703, lat: -43.2105 },
  BRC: { code: "BRC", label: "Bariloche", lon: -71.1395, lat: -41.1512 },
  CPC: { code: "CPC", label: "San Martín de los Andes", lon: -71.139, lat: -40.0754 },
  CRD: { code: "CRD", label: "Comodoro Rivadavia", lon: -67.4655, lat: -45.7853 },
  RGL: { code: "RGL", label: "Río Gallegos", lon: -69.3126, lat: -51.6089 },
  RGA: { code: "RGA", label: "Río Grande", lon: -67.7494, lat: -53.7777 },
  USH: { code: "USH", label: "Ushuaia", lon: -68.2956, lat: -54.8433 },
  FTE: { code: "FTE", label: "El Calafate", lon: -72.0532, lat: -50.2803 },
  MDQ: { code: "MDQ", label: "Mar del Plata", lon: -57.5733, lat: -37.9342 },
  BHI: { code: "BHI", label: "Bahía Blanca", lon: -62.1522, lat: -38.725 },
  VDM: { code: "VDM", label: "Viedma", lon: -63.0004, lat: -40.8692 },
  PMY: { code: "PMY", label: "Puerto Madryn", lon: -65.07, lat: -42.7592 },
  EQS: { code: "EQS", label: "Esquel", lon: -71.1395, lat: -42.9081 },
  RHD: { code: "RHD", label: "Río Hondo", lon: -64.9361, lat: -27.5092 },
  THD: { code: "THD", label: "Tartagal", lon: -63.8125, lat: -22.6192 },
  RCU: { code: "RCU", label: "Río Cuarto", lon: -64.2615, lat: -33.085 },
  RCQ: { code: "RCQ", label: "Reconquista", lon: -59.6125, lat: -29.2103 },
  RLO: { code: "RLO", label: "Merlo", lon: -65.1833, lat: -32.35 },
  OES: { code: "OES", label: "San Antonio Oeste", lon: -64.9514, lat: -40.7512 },
  GPO: { code: "GPO", label: "General Pico", lon: -63.7564, lat: -35.6961 },
};

/** Nombres de ciudad (normalizados) → código IATA de respaldo. */
const BY_NAME: Record<string, string> = {
  "buenos aires": "AEP",
  buenosaires: "AEP",
  ezeiza: "EZE",
  mendoza: "MDZ",
  "san rafael": "AFA",
  cordoba: "COR",
  tucuman: "TUC",
  salta: "SLA",
  jujuy: "JUJ",
  "la rioja": "IRJ",
  catamarca: "CTC",
  "santiago del estero": "SDE",
  resistencia: "RES",
  corrientes: "CNQ",
  formosa: "FMA",
  posadas: "PSS",
  "puerto iguazu": "IGR",
  iguazu: "IGR",
  rosario: "ROS",
  "santa fe": "SFN",
  parana: "PRA",
  "san luis": "LUQ",
  "san juan": "UAQ",
  neuquen: "NQN",
  "santa rosa": "RSA",
  trelew: "REL",
  bariloche: "BRC",
  "san martin de los andes": "CPC",
  "comodoro rivadavia": "CRD",
  "rio gallegos": "RGL",
  "rio grande": "RGA",
  ushuaia: "USH",
  "el calafate": "FTE",
  elcalafate: "FTE",
  "mar del plata": "MDQ",
  "bahia blanca": "BHI",
  viedma: "VDM",
  "puerto madryn": "PMY",
  esquel: "EQS",
};

function foldName(raw: string) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveAeropuertoPunto(
  nombre: string | null | undefined,
  codigo: string | null | undefined,
): AeropuertoPunto | null {
  const code = String(codigo || "")
    .trim()
    .toUpperCase();
  if (code && BY_CODE[code]) {
    const base = BY_CODE[code]!;
    const label = String(nombre || "").trim();
    return label
      ? { ...base, label: codigo ? `${label} (${code})` : label }
      : base;
  }

  const nameKey = foldName(nombre || "");
  const fromName = nameKey ? BY_NAME[nameKey] : undefined;
  if (fromName && BY_CODE[fromName]) {
    const base = BY_CODE[fromName]!;
    const label = String(nombre || "").trim() || base.label;
    return { ...base, label };
  }

  return null;
}

export function resolveViajeSegmento(viaje: {
  origen: string;
  origenCodigo?: string | null;
  destino: string;
  destinoCodigo?: string | null;
}): { origen: AeropuertoPunto; destino: AeropuertoPunto } | null {
  const origen = resolveAeropuertoPunto(viaje.origen, viaje.origenCodigo);
  const destino = resolveAeropuertoPunto(viaje.destino, viaje.destinoCodigo);
  if (!origen || !destino) return null;
  return { origen, destino };
}
