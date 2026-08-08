<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Senador, FilterConfig } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import { filterSenadores, isSenadorActivo } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupSenadoresBy } from "@/utils/groupSenadoresBy";
import { partidoPath } from "@/utils/partido";
import { DIETAS_MECANISMOS_PDF_URL } from "@/utils/dieta";

const { localFetch } = useLocalApi();
const { sorting } = useTableSorting("donacion", true);
const vista = useRouteQuery("vista", "lista");

const searchQuery = useRouteQuery("q", "");
const renunciaFilter = useMultiQuery("renuncia");
const donacionFilter = useMultiQuery("donacion");
const aportesFilter = useMultiQuery("aportes");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por partidos", value: "partidos" },
  { label: "Por provincias", value: "provincias" },
];

const boolFilterItems = [
  { label: "Sí", value: "si" },
  { label: "No", value: "no" },
];

const { data, pending } = useAsyncData(
  "senadores-dietas",
  async () => {
    const res = await localFetch<{ members: Senador[] }>("/api/members");
    return res.members || [];
  },
  { lazy: true },
);

const senadores = computed(() => (data.value as Senador[]) || []);

/** Dietas = período actual: solo senadores vigentes. */
const baseList = computed(() => senadores.value.filter(isSenadorActivo));

const filters = computed<FilterConfig>(() => ({
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
}));

function matchBoolFilter(
  selected: string[],
  value: boolean | null | undefined,
): boolean {
  if (!selected.length) return true;
  if (value == null) return false;
  const token = value ? "si" : "no";
  return selected.includes(token);
}

const displayed = computed(() => {
  return filterSenadores(baseList.value, filters.value).filter((s) => {
    const d = s.meta?.dieta;
    return (
      matchBoolFilter(renunciaFilter.value, d?.renunciaAlAumento) &&
      matchBoolFilter(donacionFilter.value, d?.donacion) &&
      matchBoolFilter(aportesFilter.value, d?.aportesPartidarios)
    );
  });
});

const groupsByPartido = computed(() =>
  groupSenadoresBy(displayed.value, "partido"),
);
const groupsByProvincia = computed(() =>
  groupSenadoresBy(displayed.value, "provincia"),
);

const partidoColores = computed(() =>
  getPartidoColores(groupsByPartido.value.map((g) => g.key)),
);

const stats = computed(() => {
  const withDieta = baseList.value.filter((s) => s.meta?.dieta);
  return {
    actualizado: withDieta[0]?.meta?.dieta?.actualizado || null,
  };
});

function applyChartFilter(
  field: "donacion" | "renuncia" | "aportes",
  value: "si" | "no",
) {
  if (field === "donacion") donacionFilter.value = [value];
  else if (field === "renuncia") renunciaFilter.value = [value];
  else aportesFilter.value = [value];
}

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value.trim() ||
    renunciaFilter.value.length > 0 ||
    donacionFilter.value.length > 0 ||
    aportesFilter.value.length > 0,
);

function clearFilters() {
  searchQuery.value = "";
  renunciaFilter.value = [];
  donacionFilter.value = [];
  aportesFilter.value = [];
}

const emptyMessage = "No se encontraron senadores con los filtros aplicados.";

const tableColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: {
      class: {
        th: "w-12 px-2",
        td: "w-12 px-2",
      },
    },
  },
  {
    id: "nombreCompleto",
    accessorKey: "nombreCompleto",
    header: sortableHeader("Senador"),
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
    meta: {
      class: {
        td: "max-w-xs whitespace-normal",
      },
    },
  },
  {
    id: "partido",
    accessorKey: "partido",
    header: sortableHeader("Partido"),
  },
  {
    id: "bloque",
    accessorKey: "bloque",
    header: sortableHeader("Bloque"),
  },
  {
    id: "donacion",
    accessorFn: (row: Senador) =>
      row.meta?.dieta ? (row.meta.dieta.donacion ? 1 : 0) : -1,
    header: sortableHeader("Donación"),
    meta: {
      class: {
        th: "text-center whitespace-nowrap",
        td: "text-center",
      },
    },
  },
  {
    id: "renunciaAlAumento",
    accessorFn: (row: Senador) =>
      row.meta?.dieta ? (row.meta.dieta.renunciaAlAumento ? 1 : 0) : -1,
    header: sortableHeader("Renuncia al aumento"),
    meta: {
      class: {
        th: "text-center whitespace-nowrap",
        td: "text-center",
      },
    },
  },
  {
    id: "aportesPartidarios",
    accessorFn: (row: Senador) =>
      row.meta?.dieta ? (row.meta.dieta.aportesPartidarios ? 1 : 0) : -1,
    header: sortableHeader("Aportes partidarios"),
    meta: {
      class: {
        th: "text-center whitespace-nowrap",
        td: "text-center",
      },
    },
  },
];

function onRowSelect(_e: Event, row: { original: Senador }) {
  void navigateTo(`/senadores/${row.original.id}`);
}

function boolBadge(value: boolean | null | undefined) {
  if (value == null) {
    return { label: "—", color: "neutral" as const };
  }
  return value
    ? { label: "Sí", color: "success" as const }
    : { label: "No", color: "neutral" as const };
}

useChamberSeo(() => ({
  title: "Dietas",
  description:
    "Mecanismos sobre la dieta de los senadores: renuncia al aumento, donación y aportes partidarios.",
  og: { kind: "list", eyebrow: "dietas", badge: "Dietas" },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Dietas del Senado</h1>
      <p class="text-muted max-w-3xl">
        Detalle de los mecanismos declarados por cada senador respecto de la
        dieta: renuncia al aumento, donación y aportes partidarios.
      </p>
    </div>

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <AppDataSkeleton v-if="pending" variant="home" />
    <template v-else>
      <SenadorDietasCharts
        v-if="vista === 'lista'"
        :senadores="baseList"
        @select="applyChartFilter"
      />
      <SenadorDietasGroupCharts
        v-else-if="vista === 'partidos'"
        :groups="groupsByPartido"
        group-label="Partido"
      />
      <SenadorDietasGroupCharts
        v-else-if="vista === 'provincias'"
        :groups="groupsByProvincia"
        group-label="Provincia"
      />
    </template>

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
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <FilterSearch
          v-model="searchQuery"
          label="Buscar"
          placeholder="Nombre, provincia, partido..."
        />
        <FilterSelect
          v-model="donacionFilter"
          label="Donación"
          placeholder="Todas"
          :items="boolFilterItems"
        />
        <FilterSelect
          v-model="renunciaFilter"
          label="Renuncia al aumento"
          placeholder="Todas"
          :items="boolFilterItems"
        />
        <FilterSelect
          v-model="aportesFilter"
          label="Aportes partidarios"
          placeholder="Todas"
          :items="boolFilterItems"
        />
      </div>
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <p class="text-sm text-muted">
        {{ displayed.length }}
        {{ displayed.length === 1 ? "senador" : "senadores" }}
        <template v-if="vista === 'partidos'">
          · {{ groupsByPartido.length }}
          {{ groupsByPartido.length === 1 ? "partido" : "partidos" }}
        </template>
        <template v-else-if="vista === 'provincias'">
          · {{ groupsByProvincia.length }}
          {{
            groupsByProvincia.length === 1 ? "provincia" : "provincias"
          }}
        </template>
      </p>

      <DataTableCard v-if="vista === 'lista'" :show-periodo-badge="false">
        <UTable
          v-model:sorting="sorting"
          :data="displayed"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          :empty="emptyMessage"
          :on-select="onRowSelect"
        >
          <template #foto-cell="{ row }">
            <SenadorTableAvatar
              :src="(row.original as Senador).foto"
              :alt="(row.original as Senador).nombreCompleto"
            />
          </template>
          <template #nombreCompleto-cell="{ row }">
            <NuxtLink
              :to="`/senadores/${(row.original as Senador).id}`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as Senador).nombreCompleto }}
            </NuxtLink>
          </template>
          <template #partido-cell="{ row }">
            <NuxtLink
              v-if="partidoPath((row.original as Senador).partido)"
              :to="partidoPath((row.original as Senador).partido)!"
              class="inline-flex"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
              >
                {{ (row.original as Senador).partido }}
              </UBadge>
            </NuxtLink>
            <UBadge
              v-else
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces"
            >
              {{ (row.original as Senador).partido || "—" }}
            </UBadge>
          </template>
          <template #bloque-cell="{ row }">
            <span class="text-sm">
              {{ (row.original as Senador).bloque || "—" }}
            </span>
          </template>
          <template #donacion-cell="{ row }">
            <UBadge
              :color="
                boolBadge((row.original as Senador).meta?.dieta?.donacion)
                  .color
              "
              variant="soft"
            >
              {{
                boolBadge((row.original as Senador).meta?.dieta?.donacion)
                  .label
              }}
            </UBadge>
          </template>
          <template #renunciaAlAumento-cell="{ row }">
            <UBadge
              :color="
                boolBadge(
                  (row.original as Senador).meta?.dieta?.renunciaAlAumento,
                ).color
              "
              variant="soft"
            >
              {{
                boolBadge(
                  (row.original as Senador).meta?.dieta?.renunciaAlAumento,
                ).label
              }}
            </UBadge>
          </template>
          <template #aportesPartidarios-cell="{ row }">
            <UBadge
              :color="
                boolBadge(
                  (row.original as Senador).meta?.dieta?.aportesPartidarios,
                ).color
              "
              variant="soft"
            >
              {{
                boolBadge(
                  (row.original as Senador).meta?.dieta?.aportesPartidarios,
                ).label
              }}
            </UBadge>
          </template>
        </UTable>
      </DataTableCard>

      <SenadoresGroupedTable
        v-else-if="vista === 'partidos'"
        group-by="partido"
        :groups="groupsByPartido"
        :accent-colors="partidoColores"
        :group-to="(g) => partidoPath(g.key)"
        :show-presentismo="false"
        show-dieta
        :empty-message="emptyMessage"
      />

      <SenadoresGroupedTable
        v-else-if="vista === 'provincias'"
        group-by="provincia"
        :groups="groupsByProvincia"
        :show-presentismo="false"
        show-dieta
        :empty-message="emptyMessage"
      />

      <p class="text-xs text-muted">
        Fuente:
        <a
          :href="DIETAS_MECANISMOS_PDF_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-highlighted"
        >
          mecanismos de dieta (PDF del Senado)
        </a>
        <template v-if="stats.actualizado">
          · actualizado
          {{ new Date(stats.actualizado).toLocaleDateString("es-AR") }}
        </template>
      </p>
    </template>
  </div>
</template>
