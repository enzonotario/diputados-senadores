<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import type { CareerCargo } from "@/utils/memberCareer";
import { filterActasByPeriodo } from "@/utils/periodoLegislativo";
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { memberVoteStatsFromActas } from "@/utils/chartSeries";
import { actaPdfUrl } from "@/utils/staticPdf";

type HistoryRow = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
  fecha?: string | null;
  periodo?: string | null;
  tipoVoto?: string | null;
};

type MemberProfileResponse = {
  member: Senador;
  chartActas: Array<{
    id: string;
    fecha?: string | null;
    titulo?: string | null;
    resultado?: string | null;
    periodo?: string | null;
    votosAfirmativos?: number | null;
    votosNegativos?: number | null;
    abstenciones?: number | null;
    ausentes?: number | null;
    presentes?: number | null;
    miembros?: number | null;
    tipoVotoSenador?: string | null;
  }>;
  career?: CareerCargo[];
};

const HISTORY_LIMIT = 40;
const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();
const { periodos, isTodos, periods } = usePeriodoFilter();

const { data } = await useAsyncData(
  () => `senador-${id.value}`,
  () =>
    localFetch<MemberProfileResponse>(`/api/members/${id.value}`, {
      query: { limit: HISTORY_LIMIT },
    }),
  { watch: [id] },
);

const senador = computed(() => data.value?.member || null);
const chartActas = computed(() => data.value?.chartActas || []);
const chartActasFiltered = computed(() =>
  filterActasByPeriodo(chartActas.value, periodos.value, "senadores"),
);
const periodStats = computed(() =>
  memberVoteStatsFromActas(chartActasFiltered.value),
);
const periodScoped = computed(() => !isTodos.value);
const career = computed(() => data.value?.career || []);

const memberTimelinePeriods = computed<PeriodoInfo[]>(() => {
  const byKey = new Map<
    string,
    { count: number; minFecha: string; maxFecha: string }
  >();
  for (const a of chartActas.value) {
    const key = String(a.periodo || "").trim();
    if (!key) continue;
    const fecha = String(a.fecha || "").slice(0, 10);
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, {
        count: 1,
        minFecha: fecha,
        maxFecha: fecha,
      });
      continue;
    }
    cur.count += 1;
    if (fecha && (!cur.minFecha || fecha < cur.minFecha)) cur.minFecha = fecha;
    if (fecha && (!cur.maxFecha || fecha > cur.maxFecha)) cur.maxFecha = fecha;
  }
  const catalog = new Map(periods.value.map((p) => [p.key, p]));
  return [...byKey.entries()]
    .map(([key, stats]) => {
      const base = catalog.get(key);
      return {
        key,
        label: base?.label || `Período ${key}`,
        count: stats.count,
        minFecha: stats.minFecha || base?.minFecha || "",
        maxFecha: stats.maxFecha || base?.maxFecha || "",
      } satisfies PeriodoInfo;
    })
    .filter((p) => p.minFecha && p.maxFecha);
});

const historyItems = ref<HistoryRow[]>([]);
const historyTotal = ref(0);
const historyPage = ref(1);
const historyLoading = ref(false);

const { sorting } = useTableSorting("fecha", true, { syncQuery: false });
const searchQuery = ref("");
const searchDebounced = refDebounced(searchQuery, 300);

const historyPeriodoParam = computed(() =>
  periodos.value.length ? periodos.value.join(",") : undefined,
);

async function fetchHistoryPage(page: number, append = false) {
  if (!id.value) return;
  historyLoading.value = true;
  try {
    const res = await localFetch<{
      page: number;
      limit: number;
      total: number;
      items: HistoryRow[];
    }>(`/api/members/${id.value}/history`, {
      query: {
        page,
        limit: HISTORY_LIMIT,
        q: searchQuery.value.trim() || undefined,
        periodo: historyPeriodoParam.value,
      },
    });
    historyItems.value = append
      ? [...historyItems.value, ...res.items]
      : res.items;
    historyTotal.value = res.total;
    historyPage.value = res.page;
  } finally {
    historyLoading.value = false;
  }
}

watch(
  [id, searchDebounced, historyPeriodoParam],
  () => {
    if (!id.value) return;
    void fetchHistoryPage(1);
  },
  { immediate: true },
);

const displayedHistory = computed(() => historyItems.value);
const hasMoreHistory = computed(
  () => historyItems.value.length < historyTotal.value,
);

async function loadMoreHistory() {
  if (!hasMoreHistory.value || historyLoading.value) return;
  await fetchHistoryPage(historyPage.value + 1, true);
}

const tableColumns = [
  { id: "fecha", accessorKey: "fecha", header: sortableHeader("Fecha") },
  {
    id: "titulo",
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: {
      class: {
        td: "max-w-xs whitespace-normal",
      },
    },
  },
  {
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  },
  {
    id: "voto",
    accessorKey: "tipoVoto",
    header: sortableHeader("Voto"),
  },
];

function onRowSelect(_e: Event, row: { original: HistoryRow }) {
  navigateTo(`/actas/${row.original.id}`);
}

useChamberSeo(() => {
  const s = senador.value;
  if (!s) {
    return {
      title: "Senador",
      description: "Perfil de un senador del Senado de la Nación Argentina.",
      og: { kind: "member", eyebrow: "senador" },
    };
  }
  const name = s.nombreCompleto || s.nombre;
  const bits = [s.bloque || s.partido, s.provincia].filter(Boolean);
  return {
    title: name,
    description: bits.length
      ? `${name} (${bits.join(" · ")}). Historial de votos y presentismo en el Senado.`
      : `${name}. Historial de votos y presentismo en el Senado.`,
    og: {
      kind: "member",
      eyebrow: "senador",
      badge: s.bloque || s.partido || undefined,
      photoSrc: s.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <div v-if="senador" class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <p class="text-sm text-muted">
        Resumen, charts e historial según el período legislativo seleccionado
        <template v-if="periodScoped">
          ({{ chartActasFiltered.length }}
          {{
            chartActasFiltered.length === 1 ? "votación" : "votaciones"
          }}
          de este senador).
        </template>
        <template v-else>.</template>
      </p>
      <FilterPeriodo :timeline-periods="memberTimelinePeriods" />
      <MemberVoteStatsCards :stats="periodStats" />
    </div>

    <ChartsMemberVotingCharts
      v-if="chartActasFiltered.length"
      :actas="chartActasFiltered"
      :member-label="senador.nombreCompleto || senador.nombre"
      :career="career"
      chamber="senadores"
      :period-scoped="periodScoped"
    />
    <UCard v-else>
      <p class="text-sm text-muted">
        No hay votaciones de este senador en el período seleccionado.
      </p>
    </UCard>

    <DataTableCard title="Sus votos">
      <template #filters>
        <div class="w-full sm:max-w-sm">
          <FilterSearch
            v-model="searchQuery"
            placeholder="Título o resultado..."
          />
        </div>
      </template>

      <InfiniteScrollArea
        :has-more="hasMoreHistory"
        :loading="historyLoading"
        :load-more="loadMoreHistory"
        aria-label="Historial de votaciones del senador"
      >
        <UTable
          v-model:sorting="sorting"
          :data="displayedHistory"
          :columns="tableColumns"
          :loading="historyLoading && !displayedHistory.length"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron votaciones para este senador."
          :on-select="onRowSelect"
        >
          <template #fecha-cell="{ row }">
            <div class="flex items-center gap-1">
              <span>{{
                formatDate((row.original as HistoryRow).fecha || "")
              }}</span>
              <FuentePdfButton
                :href="actaPdfUrl('senadores', (row.original as HistoryRow).id)"
              />
            </div>
          </template>
          <template #titulo-cell="{ row }">
            <NuxtLink
              :to="`/actas/${(row.original as HistoryRow).id}`"
              class="hover:underline line-clamp-5"
              @click.stop
            >
              {{ (row.original as HistoryRow).titulo }}
            </NuxtLink>
          </template>
          <template #resultado-cell="{ row }">
            <ResultadoBadge
              :resultado="(row.original as HistoryRow).resultado"
            />
          </template>
          <template #voto-cell="{ row }">
            <TipoVotoLabel
              :tipo="(row.original as HistoryRow).tipoVoto || 'ausente'"
            />
          </template>
        </UTable>
      </InfiniteScrollArea>
    </DataTableCard>
  </div>
</template>
