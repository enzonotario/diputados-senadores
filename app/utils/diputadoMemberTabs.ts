import type { TabsItem } from "@nuxt/ui";

export type DiputadoMemberTab =
  | "votaciones"
  | "afinidad"
  | "viajes"
  | "misiones"
  | "comisiones";

export function diputadoMemberBasePath(id: string | number) {
  return `/diputados/${id}`;
}

export function diputadoMemberTabPath(
  id: string | number,
  tab: DiputadoMemberTab,
) {
  const base = diputadoMemberBasePath(id);
  return tab === "votaciones" ? base : `${base}/${tab}`;
}

export function diputadoMemberTabFromPath(
  path: string,
  id: string | number,
): DiputadoMemberTab {
  const base = diputadoMemberBasePath(id);
  if (path === base || path === `${base}/`) return "votaciones";
  if (path.startsWith(`${base}/afinidad`)) return "afinidad";
  if (path.startsWith(`${base}/viajes`)) return "viajes";
  if (path.startsWith(`${base}/misiones`)) return "misiones";
  if (path.startsWith(`${base}/comisiones`)) return "comisiones";
  return "votaciones";
}

export function diputadoMemberTabItems(options?: {
  viajesCount?: number;
  misionesCount?: number;
  comisionesCount?: number;
}): TabsItem[] {
  const viajes =
    options?.viajesCount != null && options.viajesCount > 0
      ? options.viajesCount
      : undefined;
  const misiones =
    options?.misionesCount != null && options.misionesCount > 0
      ? options.misionesCount
      : undefined;
  const comisiones =
    options?.comisionesCount != null && options.comisionesCount > 0
      ? options.comisionesCount
      : undefined;

  return [
    {
      label: "Votaciones",
      value: "votaciones",
      icon: "i-lucide-check-square",
    },
    {
      label: "Afinidad",
      value: "afinidad",
      icon: "i-lucide-git-compare",
    },
    {
      label: "Viajes",
      value: "viajes",
      icon: "i-lucide-plane",
      ...(viajes != null ? { badge: viajes } : {}),
    },
    {
      label: "Misiones oficiales",
      value: "misiones",
      icon: "i-lucide-globe",
      ...(misiones != null ? { badge: misiones } : {}),
    },
    {
      label: "Comisiones",
      value: "comisiones",
      icon: "i-lucide-users",
      ...(comisiones != null ? { badge: comisiones } : {}),
    },
  ];
}
