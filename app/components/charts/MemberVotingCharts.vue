<script setup lang="ts">
import type { ActaChartRow, VotosTimeGroupBy } from "@/utils/chartSeries";
import {
  miembroPresentismoSeries,
  miembroVotosOverTime,
} from "@/utils/chartSeries";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { getVotoTipoConfig, VOTO_TIPO_ORDER } from "@/utils/votoTipo";

const props = defineProps<{
  actas: ActaChartRow[];
  memberLabel?: string;
}>();

const palette = useChartPalette();

const groupBy = ref<VotosTimeGroupBy>("mes");
const groupByItems = [
  { label: "Mes", value: "mes" },
  { label: "Trimestre", value: "trimestre" },
  { label: "Cuatrimestre", value: "cuatrimestre" },
  { label: "Período legislativo", value: "periodo" },
];

const series = computed(() => miembroPresentismoSeries(props.actas || []));
const votosOverTime = computed(() =>
  miembroVotosOverTime(props.actas || [], groupBy.value),
);

const hasSeries = computed(() => series.value.dates.length > 1);
const hasVotosOverTime = computed(() => votosOverTime.value.keys.length > 0);

const hasPeriodoData = computed(() =>
  (props.actas || []).some((a) => String(a.periodo || "").trim()),
);

watch(hasPeriodoData, (ok) => {
  if (!ok && groupBy.value === "periodo") groupBy.value = "mes";
});

const presentismoOption = computed(() => {
  if (!hasSeries.value) return null;
  const p = palette.value;
  const s = series.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: ["Hasta ahora", "Últimas 20"],
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const idx = list[0]?.dataIndex ?? 0;
        const titulo = s.titulos[idx] || "";
        const fecha = s.labels[idx] || "";
        const lines = list.map(
          (item: any) =>
            `${item.marker} ${item.seriesName}: <b>${item.value}%</b>`,
        );
        return `<div class="text-xs max-w-xs"><div class="font-medium mb-0.5">${fecha}</div>${
          titulo
            ? `<div class="text-[11px] opacity-80 mb-1 line-clamp-2">${titulo}</div>`
            : ""
        }${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: s.labels,
      axisLabel: { color: p.textMuted, hideOverlap: true, rotate: 0 },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: p.textMuted, formatter: "{value}%" },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Hasta ahora",
        type: "line",
        smooth: 0.3,
        showSymbol: false,
        data: s.cumulative,
        itemStyle: { color: p.presentismo },
        lineStyle: { width: 2.5, color: p.presentismo },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: p.isDark
                  ? "rgba(45,212,191,0.3)"
                  : "rgba(13,148,136,0.22)",
              },
              { offset: 1, color: "rgba(13,148,136,0)" },
            ],
          },
        },
      },
      {
        name: "Últimas 20",
        type: "line",
        smooth: 0.3,
        showSymbol: false,
        data: s.rolling,
        itemStyle: { color: p.isDark ? "#fbbf24" : "#d97706" },
        lineStyle: {
          width: 2,
          type: "dashed",
          color: p.isDark ? "#fbbf24" : "#d97706",
        },
      },
    ],
  };
});

const votosOption = computed(() => {
  if (!hasVotosOverTime.value) return null;
  const p = palette.value;
  const data = votosOverTime.value;
  const chrome = baseChartChrome(p);
  const legend = VOTO_TIPO_ORDER.map((k) => getVotoTipoConfig(k).label);

  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: legend,
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const title = list[0]?.axisValueLabel || "";
        const total = list.reduce(
          (s: number, item: any) => s + (Number(item.value) || 0),
          0,
        );
        const lines = list
          .filter((item: any) => Number(item.value) > 0)
          .map((item: any) => {
            const pct =
              total > 0
                ? Math.round((Number(item.value) / total) * 1000) / 10
                : 0;
            return `${item.marker} ${item.seriesName}: <b>${item.value}</b> (${pct}%)`;
          });
        return `<div class="text-xs"><div class="mb-1 font-medium">${title}</div><div class="opacity-70 mb-1">Total: ${total}</div>${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: { color: p.textMuted, hideOverlap: true },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "Votos",
      nameTextStyle: { color: p.textMuted, fontSize: 11 },
      minInterval: 1,
      axisLabel: { color: p.textMuted },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: getVotoTipoConfig("afirmativo").label,
        type: "bar",
        stack: "votos",
        data: data.afirmativo,
        itemStyle: { color: p.afirmativo },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("negativo").label,
        type: "bar",
        stack: "votos",
        data: data.negativo,
        itemStyle: { color: p.negativo },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("abstencion").label,
        type: "bar",
        stack: "votos",
        data: data.abstencion,
        itemStyle: { color: p.abstencion },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("ausente").label,
        type: "bar",
        stack: "votos",
        data: data.ausente,
        itemStyle: {
          color: p.ausente,
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: { focus: "series" },
      },
    ],
  };
});

const visibleGroupByItems = computed(() =>
  hasPeriodoData.value
    ? groupByItems
    : groupByItems.filter((i) => i.value !== "periodo"),
);
</script>

<template>
  <div
    v-if="hasSeries || hasVotosOverTime"
    class="grid grid-cols-1 gap-4"
  >
    <ChartsChartCard
      v-if="presentismoOption"
      title="Asistencia a lo largo del tiempo"
      :description="
        memberLabel
          ? `Cómo fue cambiando la asistencia de ${memberLabel}.`
          : 'Cómo fue cambiando la asistencia.'
      "
    >
      <ChartsAppChart
        :option="presentismoOption"
        height="22rem"
        aria-label="Asistencia del miembro a lo largo del tiempo"
      />
    </ChartsChartCard>

    <ChartsChartCard
      v-if="votosOption"
      title="Sus votos en el tiempo"
      description="Cuántos votos a favor, en contra, abstenciones o ausencias hubo en cada período."
    >
      <div class="space-y-3">
        <SegmentedTabs
          v-model="groupBy"
          :items="visibleGroupByItems"
          :center="false"
          variant="link"
        />
        <ChartsAppChart
          :option="votosOption"
          height="22rem"
          aria-label="Votos del miembro a lo largo del tiempo"
        />
      </div>
    </ChartsChartCard>
  </div>
</template>
