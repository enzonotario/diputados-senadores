<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloquePath } from "@/utils/bloque";
import type {
  DiputadosMisionesExplorePayload,
  DiputadosMisionesExploreRankingRow,
  DiputadosMisionesExploreRow,
} from "@/lib/diputados-data";
import { MISIONES_FUENTE_URL_DIPUTADOS } from "@/utils/viajes";
import {
  formatMisionMonto,
  formatMisionMontoCompact,
  misionMontoPrincipal,
  misionPath,
} from "@/utils/misiones";

const { localFetch } = useLocalApi();
const vista = useRouteQuery("vista", "ranking");
const searchQuery = useRouteQuery("q", "");
const fuenteUrl = MISIONES_FUENTE_URL_DIPUTADOS;

const { data, pending } = useAsyncData(
  "diputados-misiones-explore",
  () => localFetch<DiputadosMisionesExplorePayload>("/api/misiones"),
  { lazy: true },
);

const vistaItems = computed(() => [
  { label: "Ranking", value: "ranking" },
  {
    label: `Misiones oficiales (${data.value?.misiones.length ?? "…"})`,
    value: "lista",
  },
]);

const { sorting: sortingRanking } = useTableSorting("misionesCount", true);
const { sorting: sortingLista } = useTableSorting("periodo", true, {
  syncQuery: false,
});

function fechasMision(v: DiputadosMisionesExploreRow) {
  if (v.fechaTexto) return v.fechaTexto;
  const a = v.fechaInicio ? formatDate(v.fechaInicio) : null;
  const b = v.fechaFin ? formatDate(v.fechaFin) : null;
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || null;
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

const misionesDisplayed = computed(() => {
  const list = data.value?.misiones || [];
  if (!q.value) return list;
  return list.filter((v) =>
    [
      v.diputadoNombre,
      v.destino,
      v.motivo || "",
      v.institucion || "",
      formatMisionMonto(misionMontoPrincipal(v)),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q.value),
  );
});

const chartMisiones = computed(() => data.value?.misiones || []);

const hasActiveFilters = computed(() => !!searchQuery.value.trim());
function clearFilters() {
  searchQuery.value = "";
}

function onChartSelect(kind: "anio" | "destino", value: string) {
  searchQuery.value = value;
  if (kind === "destino" || kind === "anio") {
    vista.value = "lista";
  }
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
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-44 truncate whitespace-nowrap",
      },
    },
  },
  {
    id: "bloque",
    accessorKey: "bloque",
    header: sortableHeader("Bloque"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-32 whitespace-nowrap",
      },
    },
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-28 truncate whitespace-nowrap",
      },
    },
  },
  {
    id: "misionesCount",
    accessorKey: "misionesCount",
    header: sortableHeader("Misiones oficiales"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
  {
    id: "viaticosUsd",
    accessorKey: "viaticosUsd",
    header: sortableHeader("Viáticos USD"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
];

const listaColumns = [
  {
    id: "periodo",
    accessorFn: (row: DiputadosMisionesExploreRow) => {
      if (row.fechaInicio) return String(row.fechaInicio).slice(0, 10);
      return `${row.anio}-${String(row.mes ?? 0).padStart(2, "0")}`;
    },
    header: sortableHeader("Fecha"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "whitespace-nowrap",
      },
    },
  },
  {
    id: "diputadoNombre",
    accessorKey: "diputadoNombre",
    header: sortableHeader("Diputado/a"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-40 truncate whitespace-nowrap",
      },
    },
  },
  {
    id: "destino",
    accessorKey: "destino",
    header: sortableHeader("Destino"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-44 truncate whitespace-nowrap",
      },
    },
  },
  {
    id: "monto",
    accessorFn: (row: DiputadosMisionesExploreRow) => {
      const m = misionMontoPrincipal(row);
      if (!m) return -1;
      // Orden: USD primero (escala), luego EUR, luego ARS.
      const scale =
        m.currency === "USD" ? 1e12 : m.currency === "EUR" ? 1e9 : 1;
      return m.amount * scale;
    },
    header: sortableHeader("Monto"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
  {
    id: "motivo",
    accessorKey: "motivo",
    header: sortableHeader("Motivo"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-56 truncate",
      },
    },
  },
];

function onRankingSelect(
  _e: Event,
  row: { original: DiputadosMisionesExploreRankingRow },
) {
  void navigateTo(`/diputados/${row.original.id}/misiones`);
}

function onListaSelect(
  _e: Event,
  row: { original: DiputadosMisionesExploreRow },
) {
  void navigateTo(misionPath(row.original.id));
}

useChamberSeo(() => ({
  title: "Misiones oficiales",
  description:
    "Misiones oficiales al exterior de los diputados publicadas por la HCDN.",
  og: {
    kind: "list",
    eyebrow: "misiones oficiales",
    badge: "Misiones oficiales",
  },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Misiones oficiales</h1>
      <p class="text-muted max-w-3xl">
        Explorá las misiones oficiales al exterior publicadas por la HCDN.
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

    <AppDataSkeleton v-if="pending" variant="home" />
    <DiputadoMisionesCharts
      v-else-if="chartMisiones.length"
      :misiones="chartMisiones"
      @select="onChartSelect"
    />

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
            : 'Diputado, destino, motivo, monto...'
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
        {{ misionesDisplayed.length }}
        {{
          misionesDisplayed.length === 1
            ? "misión oficial"
            : "misiones oficiales"
        }}
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
              :src="(row.original as DiputadosMisionesExploreRankingRow).foto"
              :alt="
                (row.original as DiputadosMisionesExploreRankingRow)
                  .nombreCompleto
              "
            />
          </template>
          <template #nombreCompleto-cell="{ row }">
            <NuxtLink
              :to="`/diputados/${(row.original as DiputadosMisionesExploreRankingRow).id}/misiones`"
              class="hover:underline"
              :title="
                (row.original as DiputadosMisionesExploreRankingRow)
                  .nombreCompleto
              "
              @click.stop
            >
              {{
                (row.original as DiputadosMisionesExploreRankingRow)
                  .nombreCompleto
              }}
            </NuxtLink>
          </template>
          <template #bloque-cell="{ row }">
            <NuxtLink
              v-if="
                bloquePath(
                  (row.original as DiputadosMisionesExploreRankingRow).bloque,
                )
              "
              :to="
                bloquePath(
                  (row.original as DiputadosMisionesExploreRankingRow).bloque,
                )!
              "
              class="inline-flex max-w-full"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="max-w-full truncate hover:bg-elevated"
                :title="
                  (row.original as DiputadosMisionesExploreRankingRow).bloque
                "
              >
                {{
                  (row.original as DiputadosMisionesExploreRankingRow).bloque
                }}
              </UBadge>
            </NuxtLink>
            <UBadge
              v-else
              variant="outline"
              color="neutral"
              class="max-w-full truncate"
            >
              {{
                (row.original as DiputadosMisionesExploreRankingRow).bloque ||
                "—"
              }}
            </UBadge>
          </template>
          <template #provincia-cell="{ row }">
            <span
              :title="
                (row.original as DiputadosMisionesExploreRankingRow).provincia
              "
            >
              {{
                (row.original as DiputadosMisionesExploreRankingRow).provincia
              }}
            </span>
          </template>
          <template #viaticosUsd-cell="{ row }">
            {{
              (row.original as DiputadosMisionesExploreRankingRow).viaticosUsd >
              0
                ? formatMisionMontoCompact(
                    (row.original as DiputadosMisionesExploreRankingRow)
                      .viaticosUsd,
                    "USD",
                  )
                : "—"
            }}
          </template>
        </UTable>
      </DataTableCard>

      <DataTableCard v-else :show-periodo-badge="false">
        <UTable
          v-model:sorting="sortingLista"
          :data="misionesDisplayed"
          :columns="listaColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron misiones oficiales."
          :on-select="onListaSelect"
        >
          <template #periodo-cell="{ row }">
            {{
              fechasMision(row.original as DiputadosMisionesExploreRow) || "—"
            }}
          </template>
          <template #diputadoNombre-cell="{ row }">
            <NuxtLink
              v-if="(row.original as DiputadosMisionesExploreRow).diputadoId"
              :to="`/diputados/${(row.original as DiputadosMisionesExploreRow).diputadoId}/misiones`"
              class="hover:underline"
              :title="
                (row.original as DiputadosMisionesExploreRow).diputadoNombre
              "
              @click.stop
            >
              {{
                (row.original as DiputadosMisionesExploreRow).diputadoNombre
              }}
            </NuxtLink>
            <span
              v-else
              :title="
                (row.original as DiputadosMisionesExploreRow).diputadoNombre
              "
            >
              {{
                (row.original as DiputadosMisionesExploreRow).diputadoNombre
              }}
            </span>
          </template>
          <template #destino-cell="{ row }">
            <NuxtLink
              :to="misionPath((row.original as DiputadosMisionesExploreRow).id)"
              class="hover:underline"
              :title="(row.original as DiputadosMisionesExploreRow).destino"
              @click.stop
            >
              {{ (row.original as DiputadosMisionesExploreRow).destino }}
            </NuxtLink>
          </template>
          <template #monto-cell="{ row }">
            {{
              formatMisionMonto(
                misionMontoPrincipal(
                  row.original as DiputadosMisionesExploreRow,
                ),
              )
            }}
          </template>
          <template #motivo-cell="{ row }">
            <NuxtLink
              :to="misionPath((row.original as DiputadosMisionesExploreRow).id)"
              class="hover:underline block truncate"
              :title="
                (row.original as DiputadosMisionesExploreRow).motivo || undefined
              "
              @click.stop
            >
              {{
                (row.original as DiputadosMisionesExploreRow).motivo || "—"
              }}
            </NuxtLink>
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
            misiones oficiales (HCDN)
          </a>
        </p>
      </DataTableCard>
    </template>
  </div>
</template>
