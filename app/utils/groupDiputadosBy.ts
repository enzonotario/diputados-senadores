import type { Diputado } from "@/lib/types-diputados";

export type DiputadosGroup = {
  key: string;
  label: string;
  diputados: Diputado[];
};

const RESULTADO_ORDER = ["afirmativo", "negativo", "abstencion", "ausente"];

function labelForKey(
  key: string,
  kind: "resultado" | "default",
  field?: string,
) {
  if (key === "sin-dato") {
    if (field === "provincia") return "Sin provincia";
    if (field === "bloque") return "Sin bloque";
    return "Sin dato";
  }
  if (kind === "resultado") {
    const map: Record<string, string> = {
      afirmativo: "Afirmativo",
      negativo: "Negativo",
      abstencion: "Abstención",
      ausente: "Ausente",
    };
    return map[key.toLowerCase()] || key;
  }
  return key;
}

/**
 * Agrupa diputados por un campo (tipoVoto, bloque, provincia, …).
 */
export function groupDiputadosBy(
  diputados: Diputado[],
  key: keyof Diputado | "tipoVoto",
  options?: { kind?: "resultado" | "default" },
): DiputadosGroup[] {
  const kind = options?.kind ?? "default";
  const map = new Map<string, Diputado[]>();

  for (const d of diputados) {
    const raw = (d as any)[key];
    const groupKey = String(raw || "sin-dato").trim() || "sin-dato";
    const list = map.get(groupKey);
    if (list) list.push(d);
    else map.set(groupKey, [d]);
  }

  const groups: DiputadosGroup[] = [...map.entries()].map(([k, items]) => ({
    key: k,
    label: labelForKey(k, kind, String(key)),
    diputados: items.sort((a, b) => {
      const aLabel =
        a.apellido ||
        a.nombreCompleto?.split(",")[0] ||
        a.nombre ||
        "";
      const bLabel =
        b.apellido ||
        b.nombreCompleto?.split(",")[0] ||
        b.nombre ||
        "";
      return aLabel.localeCompare(bLabel, "es");
    }),
  }));

  if (kind === "resultado") {
    groups.sort((a, b) => {
      const ai = RESULTADO_ORDER.indexOf(a.key.toLowerCase());
      const bi = RESULTADO_ORDER.indexOf(b.key.toLowerCase());
      const ao = ai === -1 ? RESULTADO_ORDER.length : ai;
      const bo = bi === -1 ? RESULTADO_ORDER.length : bi;
      if (ao !== bo) return ao - bo;
      return b.diputados.length - a.diputados.length;
    });
  } else {
    groups.sort((a, b) => b.diputados.length - a.diputados.length);
  }

  return groups;
}
