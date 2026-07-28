import { provinciaKey } from "@/utils/provinciaKey";

export type ProvinciaMembersGroup<T> = {
  key: string;
  label: string;
  members: T[];
};

/**
 * Parte integrantes ya filtrados en una sección por cada provincia
 * seleccionada (orden = selección en URL/select/mapa).
 */
export function groupMembersBySelectedProvincias<
  T extends { provincia?: string | null },
>(members: T[], selected: string[]): ProvinciaMembersGroup<T>[] {
  if (!selected.length) return [];

  const buckets = new Map<string, T[]>();
  for (const m of members) {
    const k = provinciaKey(m.provincia);
    if (!k) continue;
    const list = buckets.get(k);
    if (list) list.push(m);
    else buckets.set(k, [m]);
  }

  return selected.map((name) => ({
    key: name,
    label: name,
    members: buckets.get(provinciaKey(name)) || [],
  }));
}
