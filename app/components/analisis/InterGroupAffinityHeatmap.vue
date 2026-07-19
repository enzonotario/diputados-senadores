<script setup lang="ts">
import {
  AFFINITY_FROM_DATE,
  interGroupAffinityMatrix,
  type AffinityGroupInput,
} from "@/utils/votingAffinity";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";

const props = withDefaults(
  defineProps<{
    groupLabel: string;
    groups: AffinityGroupInput[];
    groupBasePath: string;
  }>(),
  {},
);

const palette = useChartPalette();

const heatmap = computed(() => {
  if (props.groups.length < 2) return null;
  return interGroupAffinityMatrix(props.groups, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: 20,
    minGroupVoters: 1,
  });
});

const heatmapOption = computed(() => {
  const hm = heatmap.value;
  if (!hm || hm.labels.length < 2) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);
  const n = hm.labels.length;

  const data: [number, number, number | null][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data.push([j, i, hm.values[i]![j] ?? null]);
    }
  }

  const axisPad = Math.min(140, Math.max(64, n * 5));

  return {
    ...chrome,
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      left: axisPad,
      right: 24,
      top: 52,
      bottom: axisPad,
      containLabel: false,
    },
    tooltip: {
      ...chrome.tooltip,
      trigger: "item" as const,
      formatter: (params: any) => {
        const v = params?.data;
        if (!Array.isArray(v)) return "";
        const [x, y, rate] = v;
        const a = props.groups[y]?.name || hm.labels[y] || "";
        const b = props.groups[x]?.name || hm.labels[x] || "";
        const pct = rate == null ? "Sin datos" : `${rate}%`;
        return `<div class="text-xs"><b>${a}</b> ↔ <b>${b}</b><br/>Coincidencia: ${pct}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: hm.labels,
      splitArea: { show: true },
      axisLabel: {
        color: p.textMuted,
        fontSize: 10,
        rotate: 45,
        interval: 0,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: hm.labels,
      splitArea: { show: true },
      axisLabel: { color: p.textMuted, fontSize: 10, interval: 0 },
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

const heatmapHeight = computed(() => {
  const n = heatmap.value?.labels.length || 0;
  if (n < 2) return "16rem";
  const cell = Math.min(32, Math.max(18, Math.floor(520 / n)));
  return `${Math.max(280, n * cell + 130)}px`;
});
</script>

<template>
  <ChartsChartCard
    v-if="heatmapOption"
    :title="`Qué tan parecido votan los ${groupLabel}s`"
    :description="`Cuánto coincide el voto más común de cada ${groupLabel} (desde ${AFFINITY_FROM_DATE.slice(0, 4)}).`"
  >
    <ClientOnly>
      <ChartsAppChart
        :option="heatmapOption"
        :height="heatmapHeight"
        :aria-label="`Mapa de coincidencias entre ${groupLabel}s`"
      />
      <template #fallback>
        <div
          class="animate-pulse rounded-lg bg-elevated"
          :style="{ height: heatmapHeight }"
        />
      </template>
    </ClientOnly>
  </ChartsChartCard>
</template>
