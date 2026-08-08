<script setup lang="ts">
import type { SenadoresGroup } from "@/utils/groupSenadoresBy";
import { useChartPalette } from "@/composables/useChartPalette";

const props = withDefaults(
  defineProps<{
    groups: SenadoresGroup[];
    /** Etiqueta del eje (Partido / Provincia). */
    groupLabel?: string;
  }>(),
  { groupLabel: "Grupo" },
);

const palette = useChartPalette();

function countSi(senadores: SenadoresGroup["senadores"]) {
  let donacion = 0;
  let renuncia = 0;
  let aportes = 0;
  for (const s of senadores) {
    const d = s.meta?.dieta;
    if (!d) continue;
    if (d.donacion) donacion += 1;
    if (d.renunciaAlAumento) renuncia += 1;
    if (d.aportesPartidarios) aportes += 1;
  }
  return { donacion, renuncia, aportes };
}

const chartRows = computed(() => {
  // Más sí arriba; limitar a grupos con al menos un sí para no diluir el chart.
  const rows = props.groups
    .map((g) => ({
      key: g.key,
      label: g.label,
      total: g.senadores.length,
      ...countSi(g.senadores),
    }))
    .filter((r) => r.donacion + r.renuncia + r.aportes > 0)
    .sort(
      (a, b) =>
        b.donacion +
        b.renuncia +
        b.aportes -
        (a.donacion + a.renuncia + a.aportes),
    );
  return rows;
});

const stackedOption = computed(() => {
  const p = palette.value;
  const rows = chartRows.value;
  if (!rows.length) return null;

  const labels = rows.map((r) => r.label);
  // Invertir para que el top del chart sea el primero del sort.
  const yData = [...labels].reverse();
  const donacion = [...rows.map((r) => r.donacion)].reverse();
  const renuncia = [...rows.map((r) => r.renuncia)].reverse();
  const aportes = [...rows.map((r) => r.aportes)].reverse();

  return {
    backgroundColor: p.background,
    textStyle: { color: p.text, fontFamily: "inherit" },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: p.tooltipBg,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.text, fontSize: 12 },
      extraCssText:
        "backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12);",
      axisPointer: { type: "shadow" as const },
    },
    legend: {
      top: 0,
      textStyle: { color: p.textMuted },
      data: ["Donación", "Renuncia al aumento", "Aportes partidarios"],
    },
    grid: {
      left: 12,
      right: 24,
      top: 36,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: p.textMuted },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: yData,
      axisLabel: {
        color: p.textMuted,
        width: 140,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Donación",
        type: "bar",
        stack: "dieta",
        data: donacion,
        itemStyle: { color: p.presentismo },
        emphasis: { focus: "series" },
      },
      {
        name: "Renuncia al aumento",
        type: "bar",
        stack: "dieta",
        data: renuncia,
        itemStyle: { color: p.isDark ? "#38bdf8" : "#0284c7" },
        emphasis: { focus: "series" },
      },
      {
        name: "Aportes partidarios",
        type: "bar",
        stack: "dieta",
        data: aportes,
        itemStyle: {
          color: p.otros,
          borderRadius: [0, 4, 4, 0],
        },
        emphasis: { focus: "series" },
      },
    ],
  };
});

const chartHeight = computed(() => {
  const n = chartRows.value.length;
  return `${Math.max(14, Math.min(36, 4 + n * 1.55))}rem`;
});
</script>

<template>
  <ChartsChartCard
    v-if="stackedOption"
    :title="`Mecanismos por ${groupLabel.toLowerCase()}`"
    :description="`Cantidad de «Sí» en donación, renuncia al aumento y aportes partidarios por ${groupLabel.toLowerCase()}.`"
    :show-periodo-badge="false"
  >
    <ChartsAppChart
      :option="stackedOption"
      :height="chartHeight"
      :aria-label="`Mecanismos de dieta por ${groupLabel}`"
    />
  </ChartsChartCard>
</template>
