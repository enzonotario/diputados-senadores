<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { sortableHeader } from "@/utils/sortableHeader";
import { comisionPath } from "@/utils/comision";
import { useMultiQuery } from "@/composables/useMultiQuery";

type ComisionRow = {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string;
  integrantesCount: number;
  senadoresCount: number;
};

const { localFetch } = useLocalApi();
const searchQuery = useRouteQuery("q", "");
const tipoFilter = useMultiQuery("tipo");

const { data, pending } = await useAsyncData("senado-comisiones", () =>
  localFetch<{ comisiones: ComisionRow[] }>("/api/comisiones"),
);

const comisiones = computed(() => data.value?.comisiones || []);

const tipos = computed(() =>
  [...new Set(comisiones.value.map((c) => c.tipo).filter(Boolean) as string[])].sort(
    (a, b) => a.localeCompare(b, "es"),
  ),
);

const tipoItems = computed(() =>
  tipos.value.map((t) => ({ label: t, value: t })),
);

const displayed = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return comisiones.value.filter((c) => {
    if (tipoFilter.value.length && (!c.tipo || !tipoFilter.value.includes(c.tipo))) {
      return false;
    }
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.tipo || "").toLowerCase().includes(q)
    );
  });
});

const hasActiveFilters = computed(
  () => !!searchQuery.value.trim() || tipoFilter.value.length > 0,
);

function clearFilters() {
  searchQuery.value = "";
  tipoFilter.value = [];
}

const { sorting } = useTableSorting("nombre", false);

const tableColumns = [
  {
    id: "nombre",
    accessorKey: "nombre",
    header: sortableHeader("Comisión"),
    meta: {
      class: {
        td: 'max-w-xs whitespace-normal',
      },
    }
  },
  {
    id: "tipo",
    accessorKey: "tipo",
    header: sortableHeader("Tipo"),
  },
  {
    id: "integrantesCount",
    accessorKey: "integrantesCount",
    header: sortableHeader("Integrantes"),
    meta: {
      class: {
        th: "text-right",
        td: "text-right tabular-nums",
      },
    },
  },
  {
    id: "senadoresCount",
    accessorKey: "senadoresCount",
    header: sortableHeader("Senadores"),
    meta: {
      class: {
        th: "text-right",
        td: "text-right tabular-nums",
      },
    },
  },
];

function onRowSelect(_e: Event, row: { original: ComisionRow }) {
  const to = comisionPath(row.original.id);
  if (to) void navigateTo(to);
}

useChamberSeo(() => ({
  title: "Comisiones",
  description:
    "Comisiones del Senado de la Nación Argentina: integrantes, tipología y senadores que las conforman.",
  og: { kind: "list", eyebrow: "comisiones", badge: "Comisiones" },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Comisiones del Senado</h1>
      <p class="text-muted max-w-2xl">
        Listado de comisiones permanentes y especiales, con los senadores que
        las integran.
      </p>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-toned">Filtros</h2>
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="Limpiar"
          @click="clearFilters"
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FilterSelect
          v-model="tipoFilter"
          label="Tipo"
          placeholder="Todos los tipos"
          :items="tipoItems"
        />
        <FilterSearch
          v-model="searchQuery"
          label="Buscar"
          placeholder="Nombre de la comisión..."
        />
      </div>
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <p class="text-sm text-muted">
        {{ displayed.length }}
        {{ displayed.length === 1 ? "comisión" : "comisiones" }}
      </p>

      <DataTableCard :show-periodo-badge="false">
        <UTable
          v-model:sorting="sorting"
          :data="displayed"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron comisiones con los filtros aplicados."
          :on-select="onRowSelect"
        >
          <template #nombre-cell="{ row }">
            <NuxtLink
              :to="comisionPath((row.original as ComisionRow).id) || '#'"
              class="font-medium hover:underline"
              @click.stop
            >
              {{ (row.original as ComisionRow).nombre }}
            </NuxtLink>
          </template>
          <template #tipo-cell="{ row }">
            <span class="text-sm text-muted">
              {{ (row.original as ComisionRow).tipo || "—" }}
            </span>
          </template>
        </UTable>
      </DataTableCard>
    </template>
  </div>
</template>
