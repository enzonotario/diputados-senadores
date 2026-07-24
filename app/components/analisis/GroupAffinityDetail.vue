<script setup lang="ts">
import { sortableHeader } from "@/utils/sortableHeader";
import {
  AFFINITY_FROM_DATE,
  allInterGroupAffinities,
  formatAffinityPct,
  groupActasWithQuorum,
  groupCohesion,
  affinityRateClass,
  type AffinityMemberInput,
  type GroupActaQuorum,
  type InterGroupPair,
  type MemberAlignment,
} from "@/utils/votingAffinity";
import {
  memberPhotoAxisLabel,
  memberPhotoTooltipHtml,
  resolveChartPhoto,
  heatmapCellPx,
  heatmapPhotoSize,
} from "@/utils/chartMemberAxis";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";

export type GroupActaMeta = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
};

const props = withDefaults(
  defineProps<{
    groupLabel: string;
    groupName: string;
    groupColor?: string | null;
    /** Link "volver" / ficha; omitir en modo embedded. */
    groupTo?: string | null;
    members: AffinityMemberInput[];
    allMembers: AffinityMemberInput[];
    memberBasePath: string;
    groupBasePath: string;
    groupSlugs?: Record<string, string>;
    actasMeta?: Record<string, GroupActaMeta>;
    groupColors?: Record<string, string>;
    /** Sin header propio: se embebe en la ficha del bloque/partido. */
    embedded?: boolean;
  }>(),
  {
    groupColor: null,
    groupTo: null,
    groupSlugs: () => ({}),
    actasMeta: () => ({}),
    groupColors: () => ({}),
    embedded: false,
  },
);

const palette = useChartPalette();
const img = useImage();

const cohesion = computed(() => {
  if (props.members.length < 2) return null;
  return groupCohesion(props.members, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: 5,
    minGroupVoters: 2,
  });
});

const alignment = computed(() => cohesion.value?.memberAlignment || []);

const heatmapData = computed(() => cohesion.value?.heatmap || null);

const chartFotos = computed(() =>
  (heatmapData.value?.fotos || []).map((f) => resolveChartPhoto(img, f, 64)),
);

const memberNameByIndex = computed(() => props.members.map((m) => m.name));

const heatmapLayout = computed(() => {
  const n = heatmapData.value?.labels.length || 0;
  const cell = heatmapCellPx(n);
  const photoSize = heatmapPhotoSize(cell);
  const labelChars = n > 16 ? 11 : n > 10 ? 13 : 16;
  const fontSize = n > 16 ? 9 : 10;
  const leftPad = photoSize + 12 + Math.ceil(labelChars * fontSize * 0.62);
  const bottomPad =
    photoSize + 16 + Math.ceil(labelChars * fontSize * 0.62) + 8;
  const topPad = 52;
  const rightPad = 28;
  return {
    n,
    cell,
    photoSize,
    labelChars,
    fontSize,
    leftPad,
    bottomPad,
    topPad,
    rightPad,
    width: n * cell + leftPad + rightPad,
    height: n * cell + topPad + bottomPad,
  };
});

const heatmapOption = computed(() => {
  const hm = heatmapData.value;
  if (!hm || hm.labels.length < 2) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);
  const layout = heatmapLayout.value;
  const {
    n,
    photoSize,
    labelChars,
    fontSize,
    leftPad,
    bottomPad,
    topPad,
    rightPad,
  } = layout;
  const fotos = chartFotos.value;
  const names = memberNameByIndex.value;

  const data: [number, number, number | null][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data.push([j, i, hm.values[i]![j] ?? null]);
    }
  }

  return {
    ...chrome,
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      left: leftPad,
      right: rightPad,
      top: topPad,
      bottom: bottomPad,
      containLabel: false,
    },
    tooltip: {
      ...chrome.tooltip,
      trigger: "item" as const,
      formatter: (params: any) => {
        const v = params?.data;
        if (!Array.isArray(v)) return "";
        const [x, y, rate] = v;
        const a = names[y] || hm.labels[y] || "";
        const b = names[x] || hm.labels[x] || "";
        const pct = rate == null ? "Sin datos" : `${rate}%`;
        return `<div class="text-xs space-y-1.5">
          ${memberPhotoTooltipHtml(a, fotos[y])}
          ${memberPhotoTooltipHtml(b, fotos[x], `Coincidencia: <b>${pct}</b>`)}
        </div>`;
      },
    },
    xAxis: {
      type: "category",
      data: hm.labels,
      splitArea: { show: true },
      axisLabel: memberPhotoAxisLabel(fotos, {
        size: photoSize,
        labels: hm.labels,
        textColor: p.textMuted,
        layout: "inline",
        rotate: 90,
        fontSize,
        maxLabelChars: labelChars,
      }),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: hm.labels,
      splitArea: { show: true },
      axisLabel: memberPhotoAxisLabel(fotos, {
        size: photoSize,
        labels: hm.labels,
        textColor: p.textMuted,
        layout: "inline",
        fontSize,
        maxLabelChars: labelChars,
      }),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: "horizontal",
      left: "center",
      top: 4,
      itemWidth: 12,
      itemHeight: 8,
      text: ["100%", "0%"],
      textStyle: { color: p.textMuted, fontSize: 10 },
      inRange: {
        color: p.isDark
          ? ["#1e3a5f", "#0d9488", "#5eead4"]
          : ["#fee2e2", "#fbbf24", "#0d9488"],
      },
    },
    series: [
      {
        name: "Coincidencia",
        type: "heatmap",
        data,
        itemStyle: {
          borderColor: p.isDark ? "#111827" : "#ffffff",
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: "rgba(0,0,0,0.25)",
          },
        },
      },
    ],
  };
});

const heatmapHeight = computed(
  () => `${Math.max(320, heatmapLayout.value.height)}px`,
);
const heatmapMinWidth = computed(
  () => `${Math.max(480, heatmapLayout.value.width)}px`,
);

const interGroup = computed(() =>
  allInterGroupAffinities(props.groupName, props.allMembers, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: 20,
    minGroupVoters: 1,
    groupMeta: Object.fromEntries(
      Object.entries(props.groupSlugs).map(([name, slug]) => [
        name,
        { id: name, slug },
      ]),
    ),
  }),
);

const interAllies = computed(() => interGroup.value);
const interOpponents = computed(() =>
  [...interGroup.value].sort(
    (a, b) => a.rate - b.rate || b.compared - a.compared,
  ),
);

const quorumActas = computed(() =>
  groupActasWithQuorum(props.members, {
    fromDate: AFFINITY_FROM_DATE,
    minGroupVoters: 2,
  }),
);

type QuorumRow = GroupActaQuorum & {
  titulo: string;
  resultado: string | null;
};

const quorumRows = computed<QuorumRow[]>(() =>
  quorumActas.value.map((row) => {
    const meta = props.actasMeta[row.id];
    return {
      ...row,
      titulo: meta?.titulo || row.id,
      resultado: meta?.resultado || null,
    };
  }),
);

const { sorting: alignedSorting } = useTableSorting("rate", true, {
  syncQuery: false,
});
const { sorting: alliesSorting } = useTableSorting("rate", true, {
  syncQuery: false,
});
const { sorting: opponentsSorting } = useTableSorting("rate", false, {
  syncQuery: false,
});

const memberColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: { class: { th: "w-12 px-2", td: "w-12 px-2" } },
  },
  { id: "name", accessorKey: "name", header: sortableHeader("Nombre") },
  { id: "rate", accessorKey: "rate", header: sortableHeader("Coincide con el grupo") },
  {
    id: "compared",
    accessorKey: "compared",
    header: sortableHeader("Votaciones"),
  },
];

const groupColumns = [
  {
    id: "name",
    accessorKey: "name",
    header: sortableHeader("Grupo"),
    meta: {
      class: {
        td: "whitespace-normal",
      },
    },
  },
  { id: "rate", accessorKey: "rate", header: sortableHeader("Coincidencia") },
  {
    id: "compared",
    accessorKey: "compared",
    header: sortableHeader("Actas"),
  },
];

function memberPath(id: string) {
  return `${props.memberBasePath}/${id}`;
}

function pairGroupTo(pair: InterGroupPair) {
  const slug = pair.slug || props.groupSlugs[pair.name];
  if (!slug) return null;
  return `${props.groupBasePath}/${slug}`;
}

function onMemberSelect(_e: Event, row: { original: MemberAlignment }) {
  navigateTo(memberPath(row.original.id));
}

function onGroupSelect(_e: Event, row: { original: InterGroupPair }) {
  const to = pairGroupTo(row.original);
  if (to) navigateTo(to);
}
</script>

<template>
  <div
    class="flex flex-col gap-8"
    :class="embedded ? undefined : 'page-container'"
  >
    <template v-if="!embedded">
      <div v-if="groupTo" class="flex flex-wrap items-center gap-3">
        <UButton :to="groupTo" variant="ghost" color="neutral" size="sm">
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          Volver al {{ groupLabel }}
        </UButton>
      </div>

      <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
        <div
          v-if="groupColor"
          class="h-2"
          :style="{ backgroundColor: groupColor }"
        />
        <div
          class="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Cómo votan juntos · {{ groupLabel }}</p>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ groupName }}
            </h1>
            <p class="text-sm text-muted">
              {{ members.length }}
              {{ members.length === 1 ? "integrante" : "integrantes" }} · actas
              desde {{ AFFINITY_FROM_DATE.slice(0, 4) }}
            </p>
            <UButton
              v-if="groupTo"
              :to="groupTo"
              size="sm"
              color="neutral"
              variant="soft"
            >
              Ver página del {{ groupLabel }}
            </UButton>
          </div>
          <div
            v-if="groupColor"
            class="size-12 shrink-0 rounded-full ring-4 ring-default"
            :style="{ backgroundColor: groupColor }"
            aria-hidden="true"
          />
        </div>
      </UCard>
    </template>

    <template v-if="cohesion">
      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <ChartsChartCard
          title="Qué tan unidos votan"
          :description="`En promedio, cuánto coinciden entre sí los integrantes del ${groupLabel}.`"
        >
          <template #actions>
            <AnalisisQuorumActasButton
              :actas="quorumRows"
              :group-label="groupLabel"
            />
          </template>
          <div class="space-y-3">
            <div>
              <div class="text-3xl font-bold tabular-nums text-highlighted">
                {{ formatAffinityPct(cohesion.pairwiseAvg) }}
              </div>
              <p class="text-sm text-muted">Coincidencia promedio entre integrantes</p>
            </div>
            <div v-if="cohesion.modeAlignment != null">
              <div class="flex justify-between mb-1.5 text-sm">
                <span class="text-muted">Cuánto siguen al voto más común</span>
                <span class="font-medium tabular-nums">{{
                  formatAffinityPct(cohesion.modeAlignment)
                }}</span>
              </div>
              <UProgress
                :model-value="Math.round((cohesion.modeAlignment || 0) * 100)"
                size="sm"
                color="neutral"
              />
            </div>
          </div>
        </ChartsChartCard>

        <DataTableCard class="lg:col-span-2" title="Quién sigue más al grupo">
          <UTable
            v-model:sorting="alignedSorting"
            :data="alignment"
            :columns="memberColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="Sin datos."
            :on-select="onMemberSelect"
          >
            <template #foto-cell="{ row }">
              <UAvatar
                :src="
                  (row.original as MemberAlignment).foto ||
                  '/placeholder-user.jpg'
                "
                :alt="(row.original as MemberAlignment).name"
                size="xs"
              />
            </template>
            <template #name-cell="{ row }">
              <NuxtLink
                :to="memberPath((row.original as MemberAlignment).id)"
                class="hover:underline"
                @click.stop
              >
                {{ (row.original as MemberAlignment).name }}
              </NuxtLink>
            </template>
            <template #rate-cell="{ row }">
              <span
                class="tabular-nums font-medium"
                :class="
                  affinityRateClass((row.original as MemberAlignment).rate)
                "
              >
                {{
                  formatAffinityPct((row.original as MemberAlignment).rate)
                }}
              </span>
            </template>
          </UTable>
        </DataTableCard>
      </div>

      <ChartsChartCard
        v-if="heatmapOption"
        title="Coincidencias dentro del grupo"
        :description="`Quién coincide con quién entre los ${members.length} integrantes de ${groupName}.`"
      >
        <template #actions>
          <AnalisisQuorumActasButton
            :actas="quorumRows"
            :group-label="groupLabel"
          />
        </template>
        <ClientOnly>
          <div class="overflow-x-auto -mx-1 px-1">
            <div :style="{ minWidth: heatmapMinWidth }">
              <ChartsAppChart
                :option="heatmapOption"
                :height="heatmapHeight"
                :aria-label="`Mapa de coincidencias del ${groupLabel} ${groupName}`"
              />
            </div>
          </div>
          <template #fallback>
            <div
              class="animate-pulse rounded-lg bg-elevated"
              :style="{ height: heatmapHeight }"
            />
          </template>
        </ClientOnly>
      </ChartsChartCard>
    </template>

    <ChartsChartCard
      v-if="interGroup.length"
      :title="`Con qué otros ${groupLabel}s coinciden`"
      :description="`Comparamos el voto más común de cada ${groupLabel} desde ${AFFINITY_FROM_DATE.slice(0, 4)}.`"
    >
      <template #actions>
        <AnalisisQuorumActasButton
          :actas="quorumRows"
          :group-label="groupLabel"
        />
      </template>
      <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <DataTableCard title="Más parecidos">
          <UTable
            v-model:sorting="alliesSorting"
            :data="interAllies"
            :columns="groupColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="Sin datos suficientes."
            :on-select="onGroupSelect"
          >
            <template #name-cell="{ row }">
              <NuxtLink
                v-if="pairGroupTo(row.original as InterGroupPair)"
                :to="pairGroupTo(row.original as InterGroupPair)!"
                class="hover:underline"
                @click.stop
              >
                {{ (row.original as InterGroupPair).name }}
              </NuxtLink>
              <span v-else>{{ (row.original as InterGroupPair).name }}</span>
            </template>
            <template #rate-cell="{ row }">
              <span
                class="tabular-nums font-medium text-teal-700 dark:text-teal-300"
              >
                {{ formatAffinityPct((row.original as InterGroupPair).rate) }}
              </span>
            </template>
          </UTable>
        </DataTableCard>

        <DataTableCard title="Más opuestos">
          <UTable
            v-model:sorting="opponentsSorting"
            :data="interOpponents"
            :columns="groupColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="Sin datos suficientes."
            :on-select="onGroupSelect"
          >
            <template #name-cell="{ row }">
              <NuxtLink
                v-if="pairGroupTo(row.original as InterGroupPair)"
                :to="pairGroupTo(row.original as InterGroupPair)!"
                class="hover:underline"
                @click.stop
              >
                {{ (row.original as InterGroupPair).name }}
              </NuxtLink>
              <span v-else>{{ (row.original as InterGroupPair).name }}</span>
            </template>
            <template #rate-cell="{ row }">
              <span
                class="tabular-nums font-medium text-red-700 dark:text-red-300"
              >
                {{ formatAffinityPct((row.original as InterGroupPair).rate) }}
              </span>
            </template>
          </UTable>
        </DataTableCard>
      </div>
    </ChartsChartCard>
  </div>
</template>
