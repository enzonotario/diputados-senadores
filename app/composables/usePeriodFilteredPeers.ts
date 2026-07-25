import type { AffinityMemberInput } from "@/utils/votingAffinity";

/**
 * Peers de afinidad filtrados por período (sync).
 * El filtro de fechas está optimizado; no diferir (evita titilar skeleton↔chart).
 */
export function usePeriodFilteredPeers(opts: {
  getSource: () => AffinityMemberInput[];
  deps?: () => unknown;
}) {
  const { filterPeers, periodos, catalog } = usePeriodoFilter();

  const peers = computed(() => {
    // deps intencional: fuerza recompute cuando cambia el payload/miembro
    void opts.deps?.();
    void periodos.value;
    void catalog.value;
    return filterPeers(opts.getSource());
  });

  return { peers };
}
