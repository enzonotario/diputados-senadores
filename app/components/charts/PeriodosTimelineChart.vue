<script setup lang="ts">
import { useChartPalette } from "@/composables/useChartPalette";
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { SIN_PERIODO_KEY } from "@/utils/periodoLegislativo";

const props = defineProps<{
  periods: PeriodoInfo[];
  selected: string[];
}>();

const emit = defineEmits<{
  toggle: [key: string];
}>();

const palette = useChartPalette();

const timelineRows = computed(() => {
  const rows = (props.periods || []).filter(
    (p) => p.key !== SIN_PERIODO_KEY && p.count > 0,
  );
  // Más reciente arriba.
  return [...rows].sort((a, b) => {
    const da = a.maxFecha || a.minFecha || "";
    const db = b.maxFecha || b.minFecha || "";
    if (da !== db) return db.localeCompare(da);
    return Number(b.key) - Number(a.key) || b.key.localeCompare(a.key);
  });
});

const selectedSet = computed(() => new Set(props.selected || []));
const allSelected = computed(() => !(props.selected?.length > 0));

const chartHeight = computed(() => {
  const n = timelineRows.value.length;
  return `${Math.min(360, Math.max(140, 28 + n * 26))}px`;
});

const option = computed(() => {
  const p = palette.value;
  const rows = timelineRows.value;
  if (!rows.length) return null;

  const selected = selectedSet.value;
  const noneScoped = allSelected.value;
  const categories = rows.map((r) => r.label.replace(/^Período\s+/i, "P. "));
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  const data = rows.map((row) => {
    const isOn = noneScoped || selected.has(row.key);
    return {
      value: row.count,
      key: row.key,
      label: row.label,
      minFecha: row.minFecha,
      maxFecha: row.maxFecha,
      itemStyle: {
        color: isOn
          ? p.isDark
            ? "rgba(45, 212, 191, 0.85)"
            : "rgba(13, 148, 136, 0.85)"
          : p.isDark
            ? "rgba(75, 85, 99, 0.55)"
            : "rgba(203, 213, 225, 0.95)",
        borderRadius: [0, 3, 3, 0],
      },
    };
  });

  return {
    backgroundColor: "transparent",
    textStyle: { color: p.text, fontFamily: "inherit" },
    animationDuration: 200,
    grid: {
      left: 4,
      right: 36,
      top: 4,
      bottom: 4,
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: p.tooltipBg,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.text, fontSize: 12 },
      formatter: (params: any) => {
        const d = params?.data || {};
        const on = noneScoped || selected.has(String(d.key));
        const range =
          d.minFecha && d.maxFecha ? `${d.minFecha} → ${d.maxFecha}` : "";
        return `<div class="text-xs"><div class="font-medium mb-0.5">${d.label || params?.name || ""}</div><div>${d.value ?? 0} votaciones</div>${range ? `<div class="opacity-80">${range}</div>` : ""}<div class="mt-1 opacity-70">${on ? "Clic para quitar" : "Clic para filtrar"}</div></div>`;
      },
    },
    xAxis: {
      type: "value",
      max: Math.ceil(maxCount * 1.08),
      axisLabel: { color: p.textMuted, fontSize: 10, hideOverlap: true },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisPointer: { show: false },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: false,
      axisLabel: {
        color: p.textMuted,
        fontSize: 11,
        width: 52,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisPointer: { show: false },
    },
    series: [
      {
        type: "bar",
        data,
        barMaxWidth: 16,
        barCategoryGap: "28%",
        label: {
          show: true,
          position: "right",
          color: p.textMuted,
          fontSize: 10,
          formatter: (params: any) => String(params?.value ?? ""),
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 6,
            shadowColor: p.isDark
              ? "rgba(45,212,191,0.35)"
              : "rgba(13,148,136,0.25)",
          },
        },
      },
    ],
  };
});

function onClick(params: any) {
  const key = params?.data?.key;
  if (!key) return;
  emit("toggle", String(key));
}
</script>

<template>
  <ChartsChartCard
    v-if="option"
    title="Períodos en el tiempo"
    description="Clic en una barra para sumar o quitar ese período del filtro."
    :show-periodo-badge="false"
  >
    <ChartsAppChart
      :option="option"
      :height="chartHeight"
      aria-label="Períodos legislativos en el tiempo"
      @click="onClick"
    />
  </ChartsChartCard>
</template>
