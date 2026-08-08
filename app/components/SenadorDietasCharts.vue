<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { useChartPalette } from "@/composables/useChartPalette";

const props = defineProps<{
  senadores: Senador[];
}>();

const emit = defineEmits<{
  select: [field: "donacion" | "renuncia" | "aportes", value: "si" | "no"];
}>();

const palette = useChartPalette();

type MechKey = "donacion" | "renunciaAlAumento" | "aportesPartidarios";

function countMech(key: MechKey) {
  let si = 0;
  let no = 0;
  let sinDatos = 0;
  for (const s of props.senadores) {
    const d = s.meta?.dieta;
    if (!d) {
      sinDatos += 1;
      continue;
    }
    if (d[key]) si += 1;
    else no += 1;
  }
  return { si, no, sinDatos };
}

function pieOption(
  title: string,
  counts: { si: number; no: number; sinDatos: number },
) {
  const p = palette.value;
  const data = [
    {
      name: "Sí",
      value: counts.si,
      itemStyle: { color: p.presentismo },
    },
    {
      name: "No",
      value: counts.no,
      itemStyle: { color: p.isDark ? "#475569" : "#94a3b8" },
    },
  ].filter((d) => d.value > 0);

  if (counts.sinDatos > 0) {
    data.push({
      name: "Sin datos",
      value: counts.sinDatos,
      itemStyle: { color: p.isDark ? "#334155" : "#cbd5e1" },
    });
  }

  if (!data.length) return null;

  return {
    backgroundColor: p.background,
    textStyle: { color: p.text, fontFamily: "inherit" },
    tooltip: {
      trigger: "item" as const,
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
        name: title,
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
}

const donacionCounts = computed(() => countMech("donacion"));
const renunciaCounts = computed(() => countMech("renunciaAlAumento"));
const aportesCounts = computed(() => countMech("aportesPartidarios"));

const donacionOption = computed(() =>
  pieOption("Donación", donacionCounts.value),
);
const renunciaOption = computed(() =>
  pieOption("Renuncia al aumento", renunciaCounts.value),
);
const aportesOption = computed(() =>
  pieOption("Aportes partidarios", aportesCounts.value),
);

const overviewOption = computed(() => {
  const p = palette.value;
  const rows = [
    { name: "Donación", value: donacionCounts.value.si },
    { name: "Renuncia al aumento", value: renunciaCounts.value.si },
    { name: "Aportes partidarios", value: aportesCounts.value.si },
  ];
  if (!rows.some((r) => r.value > 0)) return null;

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
      right: 20,
      top: 16,
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
      axisLabel: { color: p.textMuted },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rows.map((r) => r.value),
        barWidth: 18,
        itemStyle: {
          color: p.presentismo,
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: "right",
          color: p.textMuted,
          fontSize: 12,
        },
      },
    ],
  };
});

function onPieClick(
  field: "donacion" | "renuncia" | "aportes",
  params: any,
) {
  const name = String(params?.name || "");
  if (name === "Sí") emit("select", field, "si");
  else if (name === "No") emit("select", field, "no");
}
</script>

<template>
  <div class="space-y-4">
    <ChartsChartCard
      v-if="overviewOption"
      title="Quiénes aplican cada mecanismo"
      description="Cantidad de senadores vigentes que declararon Sí en cada ítem."
      :show-periodo-badge="false"
    >
      <ChartsAppChart
        :option="overviewOption"
        height="14rem"
        aria-label="Cantidad de sí por mecanismo de dieta"
      />
    </ChartsChartCard>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartsChartCard
        v-if="donacionOption"
        title="Donación"
        description="Sí vs No entre senadores vigentes."
        :show-periodo-badge="false"
      >
        <ChartsAppChart
          :option="donacionOption"
          height="16rem"
          aria-label="Donación de dieta"
          @click="onPieClick('donacion', $event)"
        />
      </ChartsChartCard>

      <ChartsChartCard
        v-if="renunciaOption"
        title="Renuncia al aumento"
        description="Sí vs No entre senadores vigentes."
        :show-periodo-badge="false"
      >
        <ChartsAppChart
          :option="renunciaOption"
          height="16rem"
          aria-label="Renuncia al aumento de dieta"
          @click="onPieClick('renuncia', $event)"
        />
      </ChartsChartCard>

      <ChartsChartCard
        v-if="aportesOption"
        title="Aportes partidarios"
        description="Sí vs No entre senadores vigentes."
        :show-periodo-badge="false"
      >
        <ChartsAppChart
          :option="aportesOption"
          height="16rem"
          aria-label="Aportes partidarios de dieta"
          @click="onPieClick('aportes', $event)"
        />
      </ChartsChartCard>
    </div>
  </div>
</template>
