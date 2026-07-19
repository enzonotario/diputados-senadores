<script setup lang="ts">
import {
  AFFINITY_FROM_DATE,
  affinityRateClass,
  formatAffinityPct,
  groupCohesion,
  type AffinityMemberInput,
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

const props = withDefaults(
  defineProps<{
    /** Label de cámara: "bloque" | "partido" */
    groupLabel: string;
    groupName: string;
    members: AffinityMemberInput[];
    memberBasePath: string;
    /** Máximo de integrantes en el heatmap (evita ejes ilegibles). */
    heatmapMax?: number;
    /** Ruta a la página dedicada de afinidad. */
    detailTo?: string;
  }>(),
  {
    heatmapMax: 24,
    detailTo: undefined,
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

const alignmentRows = computed(() =>
  (cohesion.value?.memberAlignment || []).slice(0, 12),
);

const heatmapMembers = computed(() =>
  props.members.slice(0, props.heatmapMax),
);

const heatmapData = computed(() => {
  if (heatmapMembers.value.length < 2) return null;
  return groupCohesion(heatmapMembers.value, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: 5,
  }).heatmap;
});

const chartFotos = computed(() =>
  (heatmapData.value?.fotos || []).map((f) => resolveChartPhoto(img, f, 64)),
);

const memberNameByIndex = computed(() =>
  heatmapMembers.value.map((m) => m.name),
);

const heatmapLayout = computed(() => {
  const n = heatmapData.value?.labels.length || 0;
  const cell = heatmapCellPx(n);
  const photoSize = heatmapPhotoSize(cell);
  const labelChars = n > 16 ? 11 : n > 10 ? 13 : 16;
  const fontSize = n > 16 ? 9 : 10;
  const leftPad = photoSize + 12 + Math.ceil(labelChars * fontSize * 0.62);
  const bottomPad = photoSize + 16 + Math.ceil(labelChars * fontSize * 0.62) + 8;
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
  const { n, photoSize, labelChars, fontSize, leftPad, bottomPad, topPad, rightPad } =
    layout;
  const fotos = chartFotos.value;
  const names = memberNameByIndex.value;

  const data: [number, number, number | null][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data.push([j, i, hm.values[i]![j] ?? null]);
    }
  }

  const xAxisLabel = memberPhotoAxisLabel(fotos, {
    size: photoSize,
    labels: hm.labels,
    textColor: p.textMuted,
    layout: "inline",
    rotate: 90,
    fontSize,
    maxLabelChars: labelChars,
  });
  const yAxisLabel = memberPhotoAxisLabel(fotos, {
    size: photoSize,
    labels: hm.labels,
    textColor: p.textMuted,
    layout: "inline",
    fontSize,
    maxLabelChars: labelChars,
  });

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
      axisLabel: xAxisLabel,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: hm.labels,
      splitArea: { show: true },
      axisLabel: yAxisLabel,
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

function memberTo(id: string) {
  return `${props.memberBasePath}/${id}`;
}
</script>

<template>
  <div v-if="cohesion" class="grid grid-cols-1 gap-4">
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <ChartsChartCard
        title="Qué tan unidos votan"
        :description="`En promedio, cuánto coinciden entre sí los integrantes del ${groupLabel} (votaciones desde ${AFFINITY_FROM_DATE.slice(0, 4)}).`"
        :more-to="detailTo"
      >
        <ClientOnly>
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
          <template #fallback>
            <div class="h-24 animate-pulse rounded-lg bg-elevated" />
          </template>
        </ClientOnly>
      </ChartsChartCard>

      <ChartsChartCard
        class="lg:col-span-2"
        title="Quién sigue más al grupo"
        :description="`Ordenados de quien más coincide con el voto habitual de ${groupName} a quien menos.`"
      >
        <ClientOnly>
          <ul v-if="alignmentRows.length" class="space-y-1.5">
            <li
              v-for="row in alignmentRows"
              :key="row.id"
              class="flex items-center justify-between gap-2 text-sm"
            >
              <NuxtLink
                :to="memberTo(row.id)"
                class="flex min-w-0 items-center gap-2 hover:underline"
              >
                <UAvatar
                  :src="row.foto || '/placeholder-user.jpg'"
                  :alt="row.name"
                  size="xs"
                />
                <span class="line-clamp-2">{{ row.name }}</span>
              </NuxtLink>
              <span
                class="shrink-0 tabular-nums font-medium"
                :class="affinityRateClass(row.rate)"
              >
                {{ formatAffinityPct(row.rate) }}
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted">Sin datos.</p>
          <template #fallback>
            <div class="h-40 animate-pulse rounded-lg bg-elevated" />
          </template>
        </ClientOnly>
      </ChartsChartCard>
    </div>

    <ChartsChartCard
      v-if="heatmapOption"
      title="Coincidencias dentro del grupo"
      :description="
        members.length > heatmapMax
          ? `Tabla de coincidencias entre los primeros ${heatmapMax} integrantes (de ${members.length}).`
          : `Tabla de coincidencias entre integrantes de ${groupName}.`
      "
    >
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
  </div>
</template>
