import type { Senador } from "@/lib/types";

export type SenadoresGroup = {
  key: string;
  label: string;
  senadores: Senador[];
};

const RESULTADO_ORDER = ["afirmativo", "negativo", "abstencion", "ausente"];

function labelForKey(
  key: string,
  kind: "resultado" | "default",
  field?: string,
) {
  if (key === "sin-dato") {
    if (field === "provincia") return "Sin provincia";
    if (field === "partido") return "Sin partido";
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
 * Agrupa senadores por un campo (tipoVoto, partido, provincia, …).
 */
export function groupSenadoresBy(
  senadores: Senador[],
  key: keyof Senador | "tipoVoto",
  options?: { kind?: "resultado" | "default" },
): SenadoresGroup[] {
  const kind = options?.kind ?? "default";
  const map = new Map<string, Senador[]>();

  for (const d of senadores) {
    const raw = (d as any)[key];
    const groupKey = String(raw || "sin-dato").trim() || "sin-dato";
    const list = map.get(groupKey);
    if (list) list.push(d);
    else map.set(groupKey, [d]);
  }

  const groups: SenadoresGroup[] = [...map.entries()].map(([k, items]) => ({
    key: k,
    label: labelForKey(k, kind, String(key)),
    senadores: items.sort((a, b) => {
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
      return b.senadores.length - a.senadores.length;
    });
  } else {
    groups.sort((a, b) => b.senadores.length - a.senadores.length);
  }

  return groups;
}
