import { h } from "vue";
import UButton from "@nuxt/ui/components/Button.vue";

/** Subset of TanStack `Column` used here (avoids a direct @tanstack/vue-table dep). */
interface SortableColumn {
  getIsSorted: () => false | "asc" | "desc";
  toggleSorting: (desc?: boolean) => void;
}

/**
 * Header clickeable para ordenar columnas de UTable (patrón Nuxt UI).
 * Importa UButton directamente: resolveComponent falla fuera del setup del page.
 */
export function sortableHeader(label: string) {
  return ({ column }: { column: SortableColumn }) => {
    const isSorted = column.getIsSorted();

    return h(UButton, {
      color: "neutral",
      variant: "ghost",
      label,
      icon: isSorted
        ? isSorted === "asc"
          ? "i-lucide-arrow-up-narrow-wide"
          : "i-lucide-arrow-down-wide-narrow"
        : "i-lucide-arrow-up-down",
      class: "-mx-2.5",
      onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
    });
  };
}
