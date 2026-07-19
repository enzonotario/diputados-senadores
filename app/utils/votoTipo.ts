/**
 * Estilos compartidos por tipo de voto (tabla, labels, halo de avatar).
 * Normaliza variantes del Senado (si/no) a afirmativo/negativo.
 */
export type VotoTipoConfig = {
  key: string;
  label: string;
  icon: string;
  iconClass: string;
  textClass: string;
  haloClass: string;
  color: string;
};

const DEFAULT_CONFIG: VotoTipoConfig = {
  key: "ausente",
  label: "Ausente",
  icon: "lucide:circle-alert",
  iconClass: "text-gray-400 dark:text-gray-500",
  textClass: "text-gray-500 dark:text-gray-400",
  haloClass: "bg-gray-400 dark:bg-gray-500",
  color: "#9ca3af",
};

const BY_TIPO: Record<string, VotoTipoConfig> = {
  afirmativo: {
    key: "afirmativo",
    label: "A favor",
    icon: "lucide:circle-check",
    iconClass: "text-teal-500",
    textClass: "text-teal-800 dark:text-teal-200",
    haloClass: "bg-teal-500",
    color: "#14b8a6",
  },
  negativo: {
    key: "negativo",
    label: "En contra",
    icon: "lucide:circle-x",
    iconClass: "text-red-500",
    textClass: "text-red-800 dark:text-red-200",
    haloClass: "bg-red-500",
    color: "#ef4444",
  },
  abstencion: {
    key: "abstencion",
    label: "Abstención",
    icon: "lucide:circle-minus",
    iconClass: "text-blue-500",
    textClass: "text-blue-800 dark:text-blue-200",
    haloClass: "bg-blue-500",
    color: "#3b82f6",
  },
  ausente: DEFAULT_CONFIG,
};

export const VOTO_TIPO_ORDER = [
  "afirmativo",
  "negativo",
  "abstencion",
  "ausente",
] as const;

/** Mapea votos crudos del Senado (si/no/…) al vocabulario UI. */
export function normalizeVotoTipo(tipo?: string | null) {
  const raw = (tipo || "ausente").toLowerCase().trim();
  if (raw === "si" || raw === "sí" || raw === "afirmativo") return "afirmativo";
  if (raw === "no" || raw === "negativo") return "negativo";
  if (raw === "abstencion" || raw === "abstención") return "abstencion";
  if (raw === "ausente") return "ausente";
  if (raw.includes("lev") || raw.includes("no emite")) return "ausente";
  return raw || "ausente";
}

export function getVotoTipoColores(
  tipos: string[] = [...VOTO_TIPO_ORDER],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of tipos) {
    map[normalizeVotoTipo(t)] = getVotoTipoConfig(t).color;
  }
  return map;
}

export function getVotoTipoConfig(tipo?: string | null): VotoTipoConfig {
  const key = normalizeVotoTipo(tipo);
  const known = BY_TIPO[key];
  if (known) return known;
  return {
    ...DEFAULT_CONFIG,
    key,
    label: tipo || "Ausente",
  };
}

export function normalizeResultado(resultado?: string | null) {
  const raw = String(resultado || "")
    .toLowerCase()
    .trim();
  if (raw.startsWith("afirmativ")) return "afirmativo";
  if (raw.startsWith("negativ")) return "negativo";
  if (raw.includes("empate")) return "empate";
  if (raw.includes("cancel")) return "cancelada";
  return raw || "—";
}
