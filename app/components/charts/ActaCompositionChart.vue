<script setup lang="ts">
import type { ActaChartRow } from "@/utils/chartSeries";
import { actaVotoBreakdown } from "@/utils/chartSeries";
import { useChartPalette } from "@/composables/useChartPalette";
import { getVotoTipoConfig, VOTO_TIPO_ORDER } from "@/utils/votoTipo";

const props = defineProps<{
  acta: ActaChartRow;
}>();

const palette = useChartPalette();

const option = computed(() => {
  const p = palette.value;
  const counts = actaVotoBreakdown(props.acta);
  const data = VOTO_TIPO_ORDER.map((key) => ({
    name: getVotoTipoConfig(key).label,
    value: counts[key as keyof typeof counts] || 0,
    itemStyle: { color: getVotoTipoConfig(key).color },
  })).filter((d) => d.value > 0);

  if (!data.length) return null;

  return {
    backgroundColor: p.background,
    textStyle: { color: p.text, fontFamily: "inherit" },
    tooltip: {
      trigger: "item",
      backgroundColor: p.tooltipBg,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.text, fontSize: 12 },
      extraCssText:
        "backdrop-filter: blur(8px); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12);",
      formatter: (params: any) =>
        `${params.marker} ${params.name}: <b>${params.value}</b> (${params.percent}%)`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: p.textMuted },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "46%"],
        itemStyle: {
          borderRadius: 6,
          borderColor: p.isDark ? "#111827" : "#ffffff",
          borderWidth: 2,
        },
        label: {
          color: p.textMuted,
          formatter: "{b}\n{c}",
          fontSize: 11,
        },
        emphasis: {
          scaleSize: 8,
          label: { fontWeight: 600, color: p.text },
        },
        data,
      },
    ],
  };
});
</script>

<template>
  <ChartsChartCard
    v-if="option"
    title="Cómo se repartieron los votos"
    description="A favor, en contra, abstenciones y ausentes."
  >
    <ChartsAppChart
      :option="option"
      height="18rem"
      aria-label="Cómo se repartieron los votos"
    />
  </ChartsChartCard>
</template>
