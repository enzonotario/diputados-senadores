<script setup lang="ts">
import type { ActaChartRow } from "@/utils/chartSeries";
import {
  actasPresentismoByMonth,
  actasResultadosByMonth,
} from "@/utils/chartSeries";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";

const props = withDefaults(
  defineProps<{
    actas: ActaChartRow[];
    /** Si se define, solo se grafican actas desde ese año (inclusive). */
    fromYear?: number | null;
    /** Badge fijo cuando la vista no sigue el filtro global. */
    periodoBadgeLabels?: string[];
  }>(),
  {
    fromYear: null,
    periodoBadgeLabels: undefined,
  },
);

const palette = useChartPalette();

const filteredActas = computed(() => {
  const list = props.actas || [];
  if (props.fromYear == null) return list;
  const start = new Date(`${props.fromYear}-01-01T00:00:00`).getTime();
  return list.filter((a) => {
    if (!a.fecha) return false;
    const t = new Date(a.fecha).getTime();
    return !Number.isNaN(t) && t >= start;
  });
});

const hasData = computed(() => filteredActas.value.length > 0);

const actasRows = computed(() =>
  filteredActas.value
    .filter((a) => a?.id && a.fecha)
    .map((a) => ({
      id: String(a.id),
      fecha: String(a.fecha),
      titulo: String(a.titulo || a.id),
      resultado: a.resultado ? String(a.resultado) : null,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha)),
);

const resultadosOption = computed(() => {
  const p = palette.value;
  const data = actasResultadosByMonth(filteredActas.value);
  if (!data.months.length) return null;

  const chrome = baseChartChrome(p);
  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: ["Aprobadas", "Rechazadas", "Otros"],
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
      name: "Votaciones",
      nameTextStyle: { color: p.textMuted, fontSize: 11 },
      minInterval: 1,
      axisLabel: { color: p.textMuted },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Aprobadas",
        type: "bar",
        stack: "resultado",
        data: data.afirmativo,
        itemStyle: { color: p.afirmativo, borderRadius: [0, 0, 0, 0] },
        emphasis: { focus: "series" },
      },
      {
        name: "Rechazadas",
        type: "bar",
        stack: "resultado",
        data: data.negativo,
        itemStyle: { color: p.negativo },
        emphasis: { focus: "series" },
      },
      {
        name: "Otros",
        type: "bar",
        stack: "resultado",
        data: data.otros,
        itemStyle: { color: p.otros, borderRadius: [3, 3, 0, 0] },
        emphasis: { focus: "series" },
      },
    ],
  };
});

const presentismoOption = computed(() => {
  const p = palette.value;
  const data = actasPresentismoByMonth(filteredActas.value);
  if (!data.months.length) return null;

  const chrome = baseChartChrome(p);
  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: ["Asistencia", "Votaciones"],
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const title = list[0]?.axisValueLabel || "";
        const lines = list.map((item: any) => {
          const unit = item.seriesName === "Asistencia" ? "%" : "";
          return `${item.marker} ${item.seriesName}: <b>${item.value}${unit}</b>`;
        });
        return `<div class="text-xs"><div class="mb-1 font-medium">${title}</div>${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: { color: p.textMuted, hideOverlap: true },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: [
      {
        type: "value",
        name: "%",
        min: 0,
        max: 100,
        nameTextStyle: { color: p.textMuted, fontSize: 11 },
        axisLabel: { color: p.textMuted, formatter: "{value}%" },
        splitLine: { lineStyle: { color: p.splitLine } },
        axisLine: { show: false },
      },
      {
        type: "value",
        name: "Votaciones",
        minInterval: 1,
        nameTextStyle: { color: p.textMuted, fontSize: 11 },
        axisLabel: { color: p.textMuted },
        splitLine: { show: false },
        axisLine: { show: false },
      },
    ],
    series: [
      {
        name: "Asistencia",
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: data.months.length < 40,
        data: data.presentismo,
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
                  ? "rgba(45,212,191,0.35)"
                  : "rgba(13,148,136,0.28)",
              },
              { offset: 1, color: "rgba(13,148,136,0)" },
            ],
          },
        },
      },
      {
        name: "Votaciones",
        type: "bar",
        yAxisIndex: 1,
        barMaxWidth: 18,
        data: data.volumen,
        itemStyle: {
          color: p.isDark ? "rgba(156,163,175,0.35)" : "rgba(156,163,175,0.45)",
          borderRadius: [3, 3, 0, 0],
        },
      },
    ],
  };
});
</script>

<template>
  <div v-if="hasData" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <ChartsChartCard
      v-if="resultadosOption"
      title="Resultados de las votaciones en el tiempo"
      description="Cuántas votaciones por mes se aprobaron, rechazaron u otros."
      :periodo-badge-labels="periodoBadgeLabels"
    >
      <template #actions>
        <AnalisisWindowActasButton
          :actas="actasRows"
          :show-voto="false"
          :from-year="fromYear != null ? String(fromYear) : undefined"
          title="Votaciones del gráfico"
          description="Votaciones incluidas en este gráfico de resultados."
        />
      </template>
      <ChartsAppChart
        :option="resultadosOption"
        height="22rem"
        aria-label="Resultados de votaciones por mes"
      />
    </ChartsChartCard>

    <ChartsChartCard
      v-if="presentismoOption"
      title="Asistencia de la cámara"
      description="En promedio, qué porcentaje asiste a votar cada mes."
      :periodo-badge-labels="periodoBadgeLabels"
    >
      <template #actions>
        <AnalisisWindowActasButton
          :actas="actasRows"
          :show-voto="false"
          :from-year="fromYear != null ? String(fromYear) : undefined"
          title="Votaciones del gráfico"
          description="Votaciones incluidas en este gráfico de asistencia."
        />
      </template>
      <ChartsAppChart
        :option="presentismoOption"
        height="22rem"
        aria-label="Asistencia promedio por mes"
      />
    </ChartsChartCard>
  </div>
</template>
