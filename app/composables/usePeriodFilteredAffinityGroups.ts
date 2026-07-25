import type { AffinityGroupInput } from "@/utils/votingAffinity";

/**
 * Grupos de afinidad con votos filtrados por período (sync).
 */
export function usePeriodFilteredAffinityGroups(opts: {
  getSource: () => AffinityGroupInput[];
  deps?: () => unknown;
}) {
  const { filterPeers, periodos, catalog } = usePeriodoFilter();

  const groups = computed(() => {
    void opts.deps?.();
    void periodos.value;
    void catalog.value;
    return opts
      .getSource()
      .map((g) => ({
        ...g,
        members: filterPeers(g.members || []).filter(
          (m) => (m.votes?.length ?? 0) > 0,
        ),
      }))
      .filter((g) => g.members.length > 0);
  });

  return { groups };
}
