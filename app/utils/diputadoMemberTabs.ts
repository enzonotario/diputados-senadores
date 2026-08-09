import type { TabsItem } from "@nuxt/ui";

export type DiputadoMemberTab = "votaciones" | "afinidad" | "viajes";

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
  return "votaciones";
}

export function diputadoMemberTabItems(options?: {
  viajesCount?: number;
}): TabsItem[] {
  const viajes =
    options?.viajesCount != null && options.viajesCount > 0
      ? options.viajesCount
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
  ];
}
