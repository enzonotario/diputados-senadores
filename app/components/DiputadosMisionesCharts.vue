<script setup lang="ts">
import type { DiputadosMisionesExploreRow } from "@/lib/diputados-data";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { misionPaisDestino } from "@/utils/viajes";

const props = defineProps<{
  misiones: DiputadosMisionesExploreRow[];
}>();

const emit = defineEmits<{
  selectYear: [anio: number];
  selectDestino: [pais: string];
}>();

const palette = useChartPalette();

const byYear = computed(() => {
  const map = new Map<number, { count: number; usd: number; ars: number }>();
  for (const m of props.misiones) {
    if (!m.anio) continue;
    const entry = map.get(m.anio) || { count: 0, usd: 0, ars: 0 };
    entry.count += 1;
    entry.usd += m.viaticosUsd || 0;
    entry.ars += m.viaticosArs || 0;
    map.set(m.anio, entry);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([anio, v]) => ({ anio, ...v }));
});

const topPaises = computed(() => {
  const map = new Map<string, number>();
  for (const m of props.misiones) {
    const pais = misionPaisDestino(m.destino);
    if (!pais || pais === "—") continue;
    map.set(pais, (map.get(pais) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 10)
    .map(([pais, count]) => ({ pais, count }));
});

const porAnioOption = computed(() => {
  const rows = byYear.value;
  if (!rows.length) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);
  return {
    ...chrome,
    legend: {
      ...chrome.legend,
      data: ["Misiones oficiales", "Viáticos USD"],
    },
    grid: {
      left: 48,
      right: 48,
      top: 48,
      bottom: 48,
      containLabel: false,
    },
    tooltip: {
      ...chrome.tooltip,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const anio = list[0]?.axisValueLabel ?? list[0]?.name ?? "";
        const lines = list.map((item: any) => {
          const val =
            item.seriesName === "Viáticos USD"
              ? `U$S ${Number(item.value || 0).toLocaleString("es-AR")}`
              : String(item.value ?? 0);
          return `${item.marker} ${item.seriesName}: <b>${val}</b>`;
        });
        return [`<b>${anio}</b>`, ...lines].join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: rows.map((r) => String(r.anio)),
      axisLabel: { color: p.textMuted, hideOverlap: true },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "Misiones oficiales",
        nameTextStyle: { color: p.textMuted, fontSize: 11 },
        minInterval: 1,
        axisLabel: { color: p.textMuted },
        splitLine: { lineStyle: { color: p.splitLine } },
        axisLine: { show: false },
      },
      {
        type: "value",
        name: "U$S",
        nameTextStyle: { color: p.textMuted, fontSize: 11 },
        axisLabel: {
          color: p.textMuted,
          formatter: (v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : String(v),
        },
        splitLine: { show: false },
        axisLine: { show: false },
      },
    ],
    series: [
      {
        name: "Misiones oficiales",
        type: "bar",
        data: rows.map((r) => r.count),
        barMaxWidth: 28,
        itemStyle: {
          color: p.presentismo,
          borderRadius: [3, 3, 0, 0],
        },
        emphasis: { focus: "series" },
      },
      {
        name: "Viáticos USD",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((r) => Math.round(r.usd)),
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: p.otros },
        lineStyle: { width: 2, color: p.otros },
        emphasis: { focus: "series" },
      },
    ],
  };
});

const destinosOption = computed(() => {
  const rows = [...topPaises.value].reverse();
  if (!rows.length) return null;
  const p = palette.value;
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
    grid: {
      left: 12,
      right: 28,
      top: 12,
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
      data: rows.map((r) => r.pais),
      axisLabel: {
        color: p.textMuted,
        width: 110,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rows.map((r) => r.count),
        barWidth: 14,
        itemStyle: {
          color: p.primary,
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: "right",
          color: p.textMuted,
          fontSize: 11,
        },
      },
    ],
  };
});

function onYearClick(params: any) {
  const anio = Number(params?.name || params?.axisValue);
  if (Number.isFinite(anio) && anio > 1900) emit("selectYear", anio);
}

function onDestinoClick(params: any) {
  const pais = String(params?.name || "").trim();
  if (pais) emit("selectDestino", pais);
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <ChartsChartCard
      v-if="porAnioOption"
      title="Misiones oficiales y viáticos por año"
      description="Cantidad de misiones oficiales y suma de viáticos en USD reportados."
      :show-periodo-badge="false"
    >
      <ChartsAppChart
        :option="porAnioOption"
        height="16rem"
        aria-label="Misiones oficiales y viáticos por año"
        @click="onYearClick"
      />
    </ChartsChartCard>

    <ChartsChartCard
      v-if="destinosOption"
      title="Destinos más frecuentes"
      description="Top 10 países según el destino declarado."
      :show-periodo-badge="false"
    >
      <ChartsAppChart
        :option="destinosOption"
        height="16rem"
        aria-label="Destinos más frecuentes"
        @click="onDestinoClick"
      />
    </ChartsChartCard>
  </div>
</template>
