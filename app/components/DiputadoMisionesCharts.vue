<script setup lang="ts">
import type { DiputadosMisionesExploreRow } from "@/lib/diputados-data";
import { useChartPalette, baseChartChrome } from "@/composables/useChartPalette";
import {
  formatMisionMontoCompact,
  paisFromDestino,
} from "@/utils/misiones";

const props = defineProps<{
  misiones: DiputadosMisionesExploreRow[];
}>();

const emit = defineEmits<{
  select: [kind: "anio" | "destino", value: string];
}>();

const palette = useChartPalette();

const byAnio = computed(() => {
  const map = new Map<number, { count: number; usd: number; ars: number }>();
  for (const m of props.misiones) {
    const anio = Number(m.anio);
    if (!anio) continue;
    const entry = map.get(anio) || { count: 0, usd: 0, ars: 0 };
    entry.count += 1;
    if (m.viaticosUsd != null) entry.usd += Number(m.viaticosUsd) || 0;
    if (m.viaticosArs != null) entry.ars += Number(m.viaticosArs) || 0;
    map.set(anio, entry);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([anio, v]) => ({ anio, ...v }));
});

const topDestinos = computed(() => {
  const map = new Map<string, number>();
  for (const m of props.misiones) {
    const pais = paisFromDestino(m.destino);
    map.set(pais, (map.get(pais) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
});

const porAnioOption = computed(() => {
  const rows = byAnio.value;
  if (!rows.length) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
    },
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      left: 12,
      right: 12,
      top: 24,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: rows.map((r) => String(r.anio)),
      axisLabel: { color: p.textMuted, fontSize: 11 },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: p.textMuted },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Misiones oficiales",
        type: "bar",
        data: rows.map((r) => r.count),
        barMaxWidth: 28,
        itemStyle: {
          color: p.presentismo,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

const viaticosUsdOption = computed(() => {
  const rows = byAnio.value.filter((r) => r.usd > 0);
  if (!rows.length) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis" as const,
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const anio = item?.axisValue ?? item?.name;
        const val = Number(item?.value || 0);
        return `${anio}<br/>${item?.marker || ""} Viáticos: <b>${formatMisionMontoCompact(val, "USD")}</b>`;
      },
    },
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      left: 12,
      right: 12,
      top: 24,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: rows.map((r) => String(r.anio)),
      axisLabel: { color: p.textMuted, fontSize: 11 },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: p.textMuted,
        formatter: (v: number) =>
          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v),
      },
      splitLine: { lineStyle: { color: p.splitLine } },
      axisLine: { show: false },
    },
    series: [
      {
        name: "Viáticos USD",
        type: "bar",
        data: rows.map((r) => r.usd),
        barMaxWidth: 28,
        itemStyle: {
          color: p.primary,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

const destinosOption = computed(() => {
  const rows = [...topDestinos.value].reverse();
  if (!rows.length) return null;
  const p = palette.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
    },
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    grid: {
      left: 8,
      right: 36,
      top: 8,
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
      data: rows.map((r) => r.name),
      axisLabel: {
        color: p.textMuted,
        fontSize: 11,
        width: 110,
        overflow: "truncate",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rows.map((r) => r.value),
        barWidth: 14,
        itemStyle: {
          color: p.otros,
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

function onAnioClick(params: any) {
  const anio = String(params?.name || params?.axisValue || "").trim();
  if (anio) emit("select", "anio", anio);
}

function onDestinoClick(params: any) {
  const name = String(params?.name || "").trim();
  if (name) emit("select", "destino", name);
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartsChartCard
        v-if="porAnioOption"
        title="Misiones oficiales por año"
        description="Volumen de misiones oficiales publicadas."
        :show-periodo-badge="false"
      >
        <ChartsAppChart
          :option="porAnioOption"
          height="14rem"
          aria-label="Misiones oficiales por año"
          @click="onAnioClick"
        />
      </ChartsChartCard>

      <ChartsChartCard
        v-if="viaticosUsdOption"
        title="Viáticos USD por año"
        description="Suma de viáticos en dólares cuando el CSV lo declara."
        :show-periodo-badge="false"
      >
        <ChartsAppChart
          :option="viaticosUsdOption"
          height="14rem"
          aria-label="Viáticos en dólares por año"
          @click="onAnioClick"
        />
      </ChartsChartCard>
    </div>

    <ChartsChartCard
      v-if="destinosOption"
      title="Principales destinos"
      description="Top 10 destinos (país o ciudad-país según el CSV)."
      :show-periodo-badge="false"
    >
      <ChartsAppChart
        :option="destinosOption"
        height="18rem"
        aria-label="Top destinos de misiones oficiales"
        @click="onDestinoClick"
      />
    </ChartsChartCard>
  </div>
</template>
