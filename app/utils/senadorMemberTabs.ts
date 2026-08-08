import type { TabsItem } from "@nuxt/ui";

export type SenadorMemberTab =
  | "votaciones"
  | "afinidad"
  | "viajes"
  | "comisiones";

export function senadorMemberBasePath(id: string | number) {
  return `/senadores/${id}`;
}

export function senadorMemberTabPath(
  id: string | number,
  tab: SenadorMemberTab,
) {
  const base = senadorMemberBasePath(id);
  return tab === "votaciones" ? base : `${base}/${tab}`;
}

export function senadorMemberTabFromPath(
  path: string,
  id: string | number,
): SenadorMemberTab {
  const base = senadorMemberBasePath(id);
  if (path === base || path === `${base}/`) return "votaciones";
  if (path.startsWith(`${base}/afinidad`)) return "afinidad";
  if (path.startsWith(`${base}/viajes`)) return "viajes";
  if (path.startsWith(`${base}/comisiones`)) return "comisiones";
  return "votaciones";
}

export function senadorMemberTabItems(options?: {
  viajesCount?: number;
  comisionesCount?: number;
}): TabsItem[] {
  const viajes =
    options?.viajesCount != null && options.viajesCount > 0
      ? options.viajesCount
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
      label: "Comisiones",
      value: "comisiones",
      icon: "i-lucide-users",
      ...(comisiones != null ? { badge: comisiones } : {}),
    },
  ];
}
