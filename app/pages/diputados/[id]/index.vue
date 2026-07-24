<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { formatDate, isDiputadoActivo } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloquePath } from "@/utils/bloque";
import { formatGenero, type ProfileFactSection } from "@/utils/memberProfile";
import type { CareerCargo } from "@/utils/memberCareer";
import { mandatoRangesForChamber } from "@/utils/memberCareer";
import {
  memberActasInWindow,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";
import { filterActasByPeriodo } from "@/utils/periodoLegislativo";
import type { PeriodoInfo } from "@/utils/periodoLegislativo";

type HistoryRow = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
  fecha?: string | null;
  periodo?: string | null;
  tipoVoto?: string | null;
};

type MemberProfileResponse = {
  member: Diputado;
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
    tipoVotoDiputado?: string | null;
  }>;
  actasMeta: Array<{
    id: string;
    titulo?: string | null;
    resultado?: string | null;
  }>;
  history: {
    page: number;
    limit: number;
    total: number;
    items: HistoryRow[];
  };
  career?: CareerCargo[];
};

const HISTORY_LIMIT = 40;
const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();
const {
  filterVotes,
  periodos,
  isTodos,
  periods,
} = usePeriodoFilter();

const { data, pending } = await useAsyncData(
  () => `diputado-${id.value}`,
  () =>
    localFetch<MemberProfileResponse>(`/api/members/${id.value}`, {
      query: { limit: HISTORY_LIMIT },
    }),
  { watch: [id] },
);

const diputado = computed(() => data.value?.member || null);
const chartActas = computed(() => data.value?.chartActas || []);
const chartActasFiltered = computed(() =>
  filterActasByPeriodo(chartActas.value, periodos.value, "diputados"),
);
const periodScoped = computed(() => !isTodos.value);
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
const actasMeta = computed(() => {
  const ids = new Set(chartActasFiltered.value.map((a) => a.id));
  return (data.value?.actasMeta || []).filter((a) => ids.has(a.id));
});
const career = computed(() => data.value?.career || []);
const mandatoRanges = computed(() =>
  mandatoRangesForChamber(career.value, "diputados"),
);

const historyItems = ref<HistoryRow[]>([]);
const historyTotal = ref(0);
const historyPage = ref(1);
const historyLoading = ref(false);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "diputados-affinity-peers",
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const current = diputado.value;
  const ensure: AffinityMemberInput | null = current
    ? {
        id: current.id,
        name:
          current.nombreCompleto ||
          `${current.apellido}, ${current.nombre}` ||
          `${current.nombre} ${current.apellido}`,
        group: current.bloque,
        foto: current.foto,
        votes: filterVotes(
          memberActasInWindow(
            chartActas.value.map((a) => ({
              id: a.id,
              fecha: String(a.fecha || ""),
              voto: a.tipoVotoDiputado,
            })),
          ),
        ),
      }
    : null;
  const base = peersToAffinityInputs(peersPayload.value?.peers, { ensure });
  return base.map((p) => ({
    ...p,
    votes: filterVotes(p.votes || []),
  }));
});

const affinityGroupPeers = computed(() => {
  const bloque = diputado.value?.bloque;
  if (!bloque) return [];
  return affinityPeers.value.filter((p) => p.group === bloque);
});

useChamberSeo(() => {
  const d = diputado.value;
  if (!d) {
    return {
      title: "Diputado",
      description:
        "Perfil de un diputado de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "member", eyebrow: "diputado" },
    };
  }
  const name = `${d.nombre} ${d.apellido}`.trim();
  const bits = [d.bloque, d.provincia].filter(Boolean);
  return {
    title: name,
    description: bits.length
      ? `${name} (${bits.join(" · ")}). Historial de votos, presentismo y afinidad en la Cámara de Diputados.`
      : `${name}. Historial de votos, presentismo y afinidad en la Cámara de Diputados.`,
    og: {
      kind: "member",
      eyebrow: "diputado",
      badge: d.bloque || undefined,
      photoSrc: d.foto || "/placeholder-user.jpg",
    },
  };
});

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

const profileSections = computed<ProfileFactSection[]>(() => {
  const d = diputado.value;
  if (!d) return [];

  const mandatoFin = d.periodoMandato?.fin
    ? formatDate(d.periodoMandato.fin)
    : "—";
  const mandatoInicio = d.periodoMandato?.inicio
    ? formatDate(d.periodoMandato.inicio)
    : "—";

  const bloqueInicio = d.periodoBloque?.inicio
    ? formatDate(d.periodoBloque.inicio)
    : "";
  const bloqueFin = d.periodoBloque?.fin
    ? formatDate(d.periodoBloque.fin)
    : "hoy";
  const periodoBloque = bloqueInicio && `${bloqueInicio} – ${bloqueFin}`;

  return [
    {
      title: "Identidad",
      items: [
        { label: "Provincia", value: d.provincia },
        { label: "Género", value: formatGenero(d.genero) },
      ],
    },
    {
      title: "Bloque",
      items: [
        {
          label: "Bloque",
          value: d.bloque || "—",
          to: bloquePath(d.bloque),
        },
        {
          label: "En el bloque",
          value: periodoBloque || null,
        },
      ],
    },
    {
      title: "Mandato",
      items: [
        {
          label: "Período",
          value: `${mandatoInicio} – ${mandatoFin}`,
        },
        {
          label: "Juramento",
          value: d.juramentoFecha ? formatDate(d.juramentoFecha) : null,
        },
        {
          label: "Cese",
          value: d.ceseFecha
            ? formatDate(d.ceseFecha)
            : isDiputadoActivo(d)
              ? "En funciones"
              : null,
        },
      ],
    },
  ];
});
</script>

<template>
  <div class="page-container flex flex-col gap-10">
    <AppDataSkeleton v-if="pending && !diputado" variant="member" />

    <UCard v-else-if="!diputado">
      <template #header>
        <h1 class="text-xl font-semibold">Diputado no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el diputado solicitado.
      </p>
    </UCard>

    <template v-else>
      <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-start">
          <div
            class="w-40 sm:w-48 md:w-52 shrink-0 mx-auto md:mx-0 aspect-square overflow-hidden bg-elevated self-center md:self-start"
          >
            <NuxtImg
              :src="diputado.foto || '/placeholder-user.jpg'"
              :alt="`${diputado.nombre} ${diputado.apellido}`"
              width="208"
              height="208"
              sizes="160px sm:192px md:208px"
              densities="x1"
              class="w-full h-full object-cover object-top"
              loading="eager"
            />
          </div>

          <div class="flex flex-col gap-5 flex-1 p-6">
            <h1 class="text-2xl font-bold">
              {{ diputado.nombre }} {{ diputado.apellido }}
            </h1>

            <MemberProfileFacts :sections="profileSections" />

            <MemberCareerTimeline
              v-if="career.length"
              :cargos="career"
              chamber="diputados"
            />

            <div v-if="diputado.estadisticas" class="grid grid-cols-1 gap-4">
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  class="rounded-lg border border-teal-300! p-3 bg-teal-50 dark:border-teal-700! dark:bg-teal-950"
                >
                  <div
                    class="text-3xl font-bold text-teal-600 dark:text-teal-400"
                  >
                    {{ diputado.estadisticas.votosAfirmativos }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    A favor
                  </div>
                </div>
                <div
                  class="rounded-lg border border-red-300! p-3 bg-red-50 dark:border-red-700! dark:bg-red-950"
                >
                  <div class="text-3xl font-bold text-red-600 dark:text-red-400">
                    {{ diputado.estadisticas.votosNegativos }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    En contra
                  </div>
                </div>
                <div
                  class="rounded-lg border border-blue-300! p-3 bg-blue-50 dark:border-blue-700! dark:bg-blue-950"
                >
                  <div
                    class="text-3xl font-bold text-blue-600 dark:text-blue-400"
                  >
                    {{ diputado.estadisticas.abstenciones }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Abstenciones
                  </div>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div class="rounded-lg border p-3">
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Total Votaciones
                  </div>
                  <div class="text-2xl font-bold">
                    {{ diputado.estadisticas.totalVotaciones }}
                  </div>
                </div>
                <div
                  class="rounded-lg border border-gray-300! p-3 bg-gray-50 dark:border-gray-600! dark:bg-gray-950"
                >
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Ausencias
                  </div>
                  <div
                    class="text-2xl font-bold text-gray-700 dark:text-gray-200"
                  >
                    {{ diputado.estadisticas.ausencias }}
                  </div>
                </div>
              </div>

              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-sm font-medium">Asistencia</span>
                  <span class="text-sm font-medium"
                    >{{ diputado.estadisticas.presentismo }}%</span
                  >
                </div>
                <UProgress
                  :model-value="diputado.estadisticas.presentismo"
                  size="sm"
                  color="neutral"
                />
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted">
          Charts e historial según el período legislativo seleccionado
          <template v-if="periodScoped">
            ({{ chartActasFiltered.length }}
            {{
              chartActasFiltered.length === 1 ? "votación" : "votaciones"
            }}
            de este diputado).
          </template>
          <template v-else>.</template>
        </p>
        <FilterPeriodo :timeline-periods="memberTimelinePeriods" />
      </div>

      <ChartsMemberVotingCharts
        v-if="chartActasFiltered.length"
        :actas="chartActasFiltered"
        :member-label="`${diputado.nombre} ${diputado.apellido}`"
        :career="career"
        chamber="diputados"
        :period-scoped="periodScoped"
      />
      <UCard v-else>
        <p class="text-sm text-muted">
          No hay votaciones de este diputado en el período seleccionado.
        </p>
      </UCard>

      <ClientOnly>
        <AppDataSkeleton v-if="peersPending" variant="affinity" />
        <AnalisisMemberAffinityPanel
          v-else-if="affinityPeers.length"
          :member-id="diputado.id"
          :member-name="`${diputado.nombre} ${diputado.apellido}`"
          group-label="bloque"
          :group-name="diputado.bloque"
          member-base-path="/diputados"
          :peers="affinityPeers"
          :group-peers="affinityGroupPeers"
          :actas="actasMeta"
          :mandatos="mandatoRanges"
          :detail-to="`/diputados/${diputado.id}/afinidad`"
        />
        <template #fallback>
          <AppDataSkeleton variant="affinity" />
        </template>
      </ClientOnly>

      <DataTableCard title="Sus votos">
        <template #filters>
          <div class="w-full sm:max-w-sm">
            <FilterSearch
              v-model="searchQuery"
              placeholder="Título o resultado..."
            />
          </div>
        </template>

        <UTable
          v-model:sorting="sorting"
          :data="displayedHistory"
          :columns="tableColumns"
          :loading="historyLoading"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron votaciones para este diputado."
          :on-select="onRowSelect"
        >
          <template #fecha-cell="{ row }">
            <span>{{
              formatDate((row.original as HistoryRow).fecha || "")
            }}</span>
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

        <div v-if="hasMoreHistory" class="flex justify-center pt-4">
          <UButton
            color="neutral"
            variant="outline"
            :loading="historyLoading"
            @click="loadMoreHistory"
          >
            Cargar más ({{ displayedHistory.length }} / {{ historyTotal }})
          </UButton>
        </div>
      </DataTableCard>
    </template>
  </div>
</template>
