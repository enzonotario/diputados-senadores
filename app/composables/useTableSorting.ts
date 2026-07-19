import { useRouteQuery } from "@vueuse/router";
import type { SortingState } from "@tanstack/vue-table";

/**
 * Estado de sorting de UTable, sincronizado con ?sort=&dir= en la URL.
 */
export function useTableSorting(
  defaultId: string,
  defaultDesc = false,
  options?: { syncQuery?: boolean },
) {
  const syncQuery = options?.syncQuery ?? true;
  const defaultDir = defaultDesc ? "desc" : "asc";

  if (!syncQuery) {
    const sorting = ref<SortingState>([
      { id: defaultId, desc: defaultDesc },
    ]);
    return { sorting };
  }

  const sortKey = useRouteQuery("sort", defaultId);
  const sortDir = useRouteQuery("dir", defaultDir);

  const sorting = computed<SortingState>({
    get: () => [
      {
        id: sortKey.value || defaultId,
        desc: (sortDir.value || defaultDir) === "desc",
      },
    ],
    set: (value) => {
      const first = value?.[0];
      if (!first) {
        sortKey.value = defaultId;
        sortDir.value = defaultDir;
        return;
      }
      sortKey.value = first.id;
      sortDir.value = first.desc ? "desc" : "asc";
    },
  });

  return { sorting, sortKey, sortDir };
}
