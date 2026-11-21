<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Acta, FilterConfig } from "@/lib/types";
import { filterActas as applyActaFilters, getUniqueValues } from "@/lib/utils";
import {
  actaFechaSesionLabel,
  sortActasBySesionThenActa,
} from "@/utils/actaFechaSesion";

useChamberSeo({
  title: "Votaciones",
  description:
    "Mirá las votaciones del Senado de la Nación Argentina y cómo votó cada uno.",
  og: { kind: "list", summary: "actas", eyebrow: "actas", badge: "Votaciones" },
});

const { filterActas: filterByPeriodo } = usePeriodoFilter();
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
  sortActasBySesionThenActa(
    applyActaFilters(actasInPeriodo.value, filters.value),
  ),
);

const resultados = computed(() =>
  getUniqueValues(actasInPeriodo.value, "resultado"),
);
const resultadoItems = computed(() =>
  resultados.value.map((r) => ({ label: r, value: r })),
);

const emptyMessage = "No se encontraron actas con los filtros aplicados.";
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Todas las votaciones</h1>

    <FilterPeriodo />

    <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
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
            @click="
              () => {
                layout = 'tabla';
              }
            "
          />
          <UButton
            color="neutral"
            :variant="layout === 'grid' ? 'solid' : 'outline'"
            icon="i-lucide-layout-grid"
            label="Grid"
            @click="
              () => {
                layout = 'grid';
              }
            "
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

      <ActasSessionGroupedTable
        v-if="layout === 'tabla'"
        :actas="displayed"
        variant="senadores"
        :empty-message="emptyMessage"
      />

      <template v-else>
        <div
          v-if="displayed.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <ActaVotingCard
            v-for="acta in displayed"
            :key="acta.id"
            :acta="acta"
            :fecha-label="actaFechaSesionLabel(acta)"
          />
        </div>
        <UCard v-else>
          <p class="text-sm text-toned">{{ emptyMessage }}</p>
        </UCard>
      </template>
    </template>
  </div>
</template>
