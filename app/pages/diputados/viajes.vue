<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloquePath } from "@/utils/bloque";
import type {
  DiputadosViajesExploreNacional,
  DiputadosViajesExplorePayload,
  DiputadosViajesExploreRankingRow,
} from "@/lib/diputados-data";
import { viajesFuenteUrl } from "@/utils/viajes";

const { localFetch } = useLocalApi();
const vista = useRouteQuery("vista", "ranking");
const searchQuery = useRouteQuery("q", "");
const fuenteUrl = viajesFuenteUrl("diputados");

const { data, pending } = useAsyncData(
  "diputados-viajes-explore",
  () => localFetch<DiputadosViajesExplorePayload>("/api/viajes"),
  { lazy: true },
);

const vistaItems = computed(() => [
  { label: "Ranking", value: "ranking" },
  {
    label: `Nacionales (${data.value?.nacionales.length ?? "…"})`,
    value: "nacionales",
  },
]);

const { sorting: sortingRanking } = useTableSorting(
  "viajesUltimos12Meses",
  true,
);
const { sorting: sortingNac } = useTableSorting("periodo", true, {
  syncQuery: false,
});

function mesLabel(anio: number, mes: number) {
  const fallback = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

function periodoKey(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

function periodoLabel(anio: number, mes: number, mesNombre: string) {
  const nombre = String(mesNombre || "").trim();
  if (nombre) return `${nombre} de ${anio}`;
  return mesLabel(anio, mes);
}

function lugarLabel(nombre: string, codigo: string | null) {
  return codigo ? `${nombre} (${codigo})` : nombre;
}

const q = computed(() => searchQuery.value.trim().toLowerCase());

const rankingDisplayed = computed(() => {
  const list = data.value?.ranking || [];
  if (!q.value) return list;
  return list.filter((r) =>
    [r.nombreCompleto, r.provincia, r.bloque]
      .join(" ")
      .toLowerCase()
      .includes(q.value),
  );
});

const nacionalesDisplayed = computed(() => {
  const list = data.value?.nacionales || [];
  if (!q.value) return list;
  return list.filter((v) =>
    [v.nombre, v.origen, v.destino, v.tipoSolicitud]
      .join(" ")
      .toLowerCase()
      .includes(q.value),
  );
});

const stats = computed(() => {
  const ranking = data.value?.ranking || [];
  const nacionales = data.value?.nacionales || [];
  return {
    total: nacionales.length,
    nacionales: nacionales.length,
    conViajes: ranking.filter((r) => r.viajesUltimos12Meses > 0).length,
  };
});

const hasActiveFilters = computed(() => !!searchQuery.value.trim());
function clearFilters() {
  searchQuery.value = "";
}

const rankingColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: { class: { th: "w-12 px-2", td: "w-12 px-2" } },
  },
  {
    id: "nombreCompleto",
    accessorKey: "nombreCompleto",
    header: sortableHeader("Diputado/a"),
  },
  {
    id: "bloque",
    accessorKey: "bloque",
    header: sortableHeader("Bloque"),
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
  },
  {
    id: "viajesUltimos12Meses",
    accessorKey: "viajesUltimos12Meses",
    header: sortableHeader("Viajes 12m"),
    meta: {
      class: {
        th: "text-right",
        td: "text-right tabular-nums",
      },
    },
  },
];

const nacionalesColumns = [
  {
    id: "periodo",
    accessorFn: (row: DiputadosViajesExploreNacional) =>
      periodoKey(row.anio, row.mes),
    header: sortableHeader("Período"),
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: sortableHeader("Diputado/a"),
  },
  {
    id: "tipoSolicitud",
    accessorKey: "tipoSolicitud",
    header: sortableHeader("Tipo"),
  },
  {
    id: "origen",
    accessorFn: (row: DiputadosViajesExploreNacional) =>
      lugarLabel(row.origen, row.origenCodigo),
    header: sortableHeader("Origen"),
  },
  {
    id: "destino",
    accessorFn: (row: DiputadosViajesExploreNacional) =>
      lugarLabel(row.destino, row.destinoCodigo),
    header: sortableHeader("Destino"),
  },
];

function onRankingSelect(
  _e: Event,
  row: { original: DiputadosViajesExploreRankingRow },
) {
  void navigateTo(`/diputados/${row.original.id}/viajes`);
}

function onNacSelect(
  _e: Event,
  row: { original: DiputadosViajesExploreNacional },
) {
  const id = row.original.diputadoId;
  if (id) void navigateTo(`/diputados/${id}/viajes`);
}

useChamberSeo(() => ({
  title: "Viajes",
  description:
    "Viajes nacionales de los diputados (datos abiertos HCDN).",
  og: { kind: "list", eyebrow: "viajes", badge: "Viajes" },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Viajes de Diputados</h1>
      <p class="text-muted max-w-3xl">
        Explorá los viajes nacionales publicados por la HCDN.
        <UButton
          :to="fuenteUrl"
          target="_blank"
          external
          color="neutral"
          variant="link"
          size="sm"
          class="px-0"
          label="Fuente"
        />
      </p>
    </div>

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <div
      v-if="!pending && data"
      class="grid grid-cols-2 sm:grid-cols-3 gap-3"
    >
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Total tramos</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats.total }}</p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Nacionales</p>
        <p class="text-2xl font-semibold tabular-nums">
          {{ stats.nacionales }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Diputados con viajes</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats.conViajes }}</p>
      </div>
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
      <FilterSearch
        v-model="searchQuery"
        label="Buscar"
        :placeholder="
          vista === 'ranking'
            ? 'Nombre, provincia, bloque...'
            : 'Diputado, destino, origen...'
        "
      />
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <p v-if="vista === 'ranking'" class="text-sm text-muted">
        {{ rankingDisplayed.length }}
        {{ rankingDisplayed.length === 1 ? "diputado" : "diputados" }}
      </p>
      <p v-else class="text-sm text-muted">
        {{ nacionalesDisplayed.length }}
        {{ nacionalesDisplayed.length === 1 ? "viaje" : "viajes" }} nacionales
      </p>

      <DataTableCard v-if="vista === 'ranking'" :show-periodo-badge="false">
        <UTable
          v-model:sorting="sortingRanking"
          :data="rankingDisplayed"
          :columns="rankingColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron diputados con los filtros aplicados."
          :on-select="onRankingSelect"
        >
          <template #foto-cell="{ row }">
            <SenadorTableAvatar
              :src="(row.original as DiputadosViajesExploreRankingRow).foto"
              :alt="
                (row.original as DiputadosViajesExploreRankingRow).nombreCompleto
              "
            />
          </template>
          <template #nombreCompleto-cell="{ row }">
            <NuxtLink
              :to="`/diputados/${(row.original as DiputadosViajesExploreRankingRow).id}/viajes`"
              class="hover:underline"
              @click.stop
            >
              {{
                (row.original as DiputadosViajesExploreRankingRow)
                  .nombreCompleto
              }}
            </NuxtLink>
          </template>
          <template #bloque-cell="{ row }">
            <NuxtLink
              v-if="
                bloquePath(
                  (row.original as DiputadosViajesExploreRankingRow).bloque,
                )
              "
              :to="
                bloquePath(
                  (row.original as DiputadosViajesExploreRankingRow).bloque,
                )!
              "
              class="inline-flex"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
              >
                {{ (row.original as DiputadosViajesExploreRankingRow).bloque }}
              </UBadge>
            </NuxtLink>
            <UBadge
              v-else
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces"
            >
              {{
                (row.original as DiputadosViajesExploreRankingRow).bloque || "—"
              }}
            </UBadge>
          </template>
        </UTable>
      </DataTableCard>

      <DataTableCard v-else :show-periodo-badge="false">
        <UTable
          v-model:sorting="sortingNac"
          :data="nacionalesDisplayed"
          :columns="nacionalesColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron viajes nacionales."
          :on-select="onNacSelect"
        >
          <template #periodo-cell="{ row }">
            {{
              periodoLabel(
                (row.original as DiputadosViajesExploreNacional).anio,
                (row.original as DiputadosViajesExploreNacional).mes,
                (row.original as DiputadosViajesExploreNacional).mesNombre,
              )
            }}
          </template>
          <template #nombre-cell="{ row }">
            <NuxtLink
              v-if="(row.original as DiputadosViajesExploreNacional).diputadoId"
              :to="`/diputados/${(row.original as DiputadosViajesExploreNacional).diputadoId}/viajes`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as DiputadosViajesExploreNacional).nombre }}
            </NuxtLink>
            <span v-else>{{
              (row.original as DiputadosViajesExploreNacional).nombre
            }}</span>
          </template>
        </UTable>
        <p class="px-4 sm:px-6 py-3 text-xs text-muted border-t border-default">
          Fuente:
          <a
            :href="fuenteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-highlighted"
          >
            viajes nacionales (HCDN)
          </a>
        </p>
      </DataTableCard>
    </template>
  </div>
</template>
