<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Acta, FilterConfig } from "@/lib/types";
import {
  filterActas as applyActaFilters,
  formatDate,
  formatTime,
  getUniqueValues,
} from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { voteMarginSortValue } from "@/utils/voteMargin";
import { actaPdfUrl } from "@/utils/staticPdf";

useChamberSeo({
  title: "Votaciones",
  description:
    "Mirá las votaciones del Senado de la Nación Argentina y cómo votó cada uno.",
  og: { kind: "list", eyebrow: "actas", badge: "Votaciones" },
});

const { chamberId } = useChamber();
const actaPdf = (id: string) => actaPdfUrl(chamberId.value, id);

const { filterActas: filterByPeriodo } = usePeriodoFilter();
const { sorting } = useTableSorting("fecha", true);
const resultado = useMultiQuery("resultado");
const searchQuery = useRouteQuery("q", "");

/** Cómo mostrar el listado: tabla (default) o grilla de cards. */
const layout = useLocalStorage<"tabla" | "grid">("actas-layout", "tabla", {
  initOnMounted: true,
});

const { localFetch } = useLocalApi();

const { data, pending } = useAsyncData(
  "actas",
  async () => {
    const res = await localFetch<{ actas: Acta[] }>("/api/actas");
    return res.actas || [];
  },
  { lazy: true },
);
const actas = computed(() => (data.value as any as Acta[]) || []);
const actasInPeriodo = computed(() => filterByPeriodo(actas.value));

const filters = computed<FilterConfig>(() => ({
  ...(resultado.value.length ? { resultado: resultado.value } : {}),
  ...(searchQuery.value ? { titulo: searchQuery.value } : {}),
}));

const displayed = computed(() =>
  applyActaFilters(actasInPeriodo.value, filters.value),
);

const resultados = computed(() =>
  getUniqueValues(actasInPeriodo.value, "resultado"),
);
const resultadoItems = computed(() =>
  resultados.value.map((r) => ({ label: r, value: r })),
);

const emptyMessage = "No se encontraron actas con los filtros aplicados.";

const tableColumns = [
  { accessorKey: "fecha", header: sortableHeader("Fecha") },
  {
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: {
      class: {
        td: "whitespace-normal",
      },
    },
  },
  {
    accessorKey: "proyecto",
    header: sortableHeader("Proyecto"),
    meta: {
      class: {
        td: "whitespace-normal",
      },
    },
  },
  {
    accessorKey: "descripcion",
    header: sortableHeader("Descripción"),
    meta: {
      class: {
        td: "whitespace-normal max-w-[9rem]",
      },
    },
  },
  { accessorKey: "resultado", header: sortableHeader("Resultado") },
  {
    id: "margen",
    accessorFn: (row: Acta) =>
      voteMarginSortValue(row.votosAfirmativos, row.votosNegativos),
    header: sortableHeader("Margen"),
  },
  {
    accessorKey: "votosAfirmativos",
    header: sortableHeader("A favor"),
  },
  { accessorKey: "votosNegativos", header: sortableHeader("En contra") },
  { accessorKey: "abstenciones", header: sortableHeader("Abstenciones") },
  { accessorKey: "ausentes", header: sortableHeader("Ausentes") },
];

function onRowSelect(_e: Event, row: { original: Acta }) {
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Todas las votaciones</h1>

    <FilterPeriodo />

    <div
      class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
    >
      <div class="w-full sm:max-w-sm">
        <FilterSearch
          v-model="searchQuery"
          placeholder="Buscar por título..."
        />
      </div>
      <FilterSelect
        v-model="resultado"
        label="Resultado"
        placeholder="Todos los resultados"
        :items="resultadoItems"
        class="w-full sm:w-56"
      />
      <ClientOnly>
        <UFieldGroup size="md" class="shrink-0 self-end">
          <UButton
            color="neutral"
            :variant="layout === 'tabla' ? 'solid' : 'outline'"
            icon="i-lucide-table"
            label="Tabla"
            @click="layout = 'tabla'"
          />
          <UButton
            color="neutral"
            :variant="layout === 'grid' ? 'solid' : 'outline'"
            icon="i-lucide-layout-grid"
            label="Grid"
            @click="layout = 'grid'"
          />
        </UFieldGroup>
        <template #fallback>
          <div class="h-9 w-40 animate-pulse rounded-md bg-elevated" />
        </template>
      </ClientOnly>
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <ChartsActasOverviewCharts :actas="displayed" />

      <DataTableCard v-if="layout === 'tabla'">
        <UTable
          v-model:sorting="sorting"
          :data="displayed"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          :empty="emptyMessage"
          :on-select="onRowSelect"
        >
          <template #titulo-cell="{ row }">
            <NuxtLink
              :to="`/actas/${(row.original as Acta).id}`"
              class="hover:underline line-clamp-5"
              @click.stop
            >
              {{ (row.original as Acta).titulo }}
            </NuxtLink>
          </template>
          <template #fecha-cell="{ row }">
            <div class="flex items-start gap-1">
              <div class="flex flex-col leading-tight">
                <span class="tabular-nums">{{
                  formatDate((row.original as Acta).fecha)
                }}</span>
                <span
                  v-if="formatTime((row.original as Acta).fecha, '')"
                  class="text-xs text-muted tabular-nums"
                >
                  {{ formatTime((row.original as Acta).fecha) }}
                </span>
              </div>
              <FuentePdfButton :href="actaPdf((row.original as Acta).id)" />
            </div>
          </template>
          <template #descripcion-cell="{ row }">
            <span
              class="block max-w-[9rem] text-xs text-toned leading-snug whitespace-normal break-words"
            >
              {{ (row.original as Acta).descripcion || "—" }}
            </span>
          </template>
          <template #resultado-cell="{ row }">
            <ResultadoBadge :resultado="(row.original as Acta).resultado" />
          </template>
          <template #margen-cell="{ row }">
            <MargenBadge
              :afirmativos="(row.original as Acta).votosAfirmativos"
              :negativos="(row.original as Acta).votosNegativos"
            />
          </template>
        </UTable>
      </DataTableCard>

      <template v-else>
        <div
          v-if="displayed.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <ActaVotingCard
            v-for="acta in displayed"
            :key="acta.id"
            :acta="acta"
          />
        </div>
        <UCard v-else>
          <p class="text-sm text-toned">{{ emptyMessage }}</p>
        </UCard>
      </template>
    </template>
  </div>
</template>
