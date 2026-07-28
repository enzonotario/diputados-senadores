<script setup lang="ts">
import {
  actaGroupVoteRows,
  groupVotePct,
  type ActaGroupVoteMember,
} from "@/utils/actaGroupVotes";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = withDefaults(
  defineProps<{
    members: ActaGroupVoteMember[];
    /** Sustantivo de UI: "partido" | "bloque" */
    groupNoun?: string;
  }>(),
  { groupNoun: "partido" },
);

const palette = useChartPalette();

const rows = computed(() =>
  actaGroupVoteRows(props.members, {
    emptyLabel: `Sin ${props.groupNoun}`,
  }),
);

const unitedCount = computed(
  () => rows.value.filter((r) => r.united && r.total > 0).length,
);

const title = computed(
  () => `Comparación de votos por ${props.groupNoun}`,
);

const description = computed(() => {
  const n = rows.value.length;
  const u = unitedCount.value;
  if (!n) return "";
  const noun = props.groupNoun;
  return `${u} de ${n} ${noun}${n === 1 ? "" : "s"} votaron unidos. Barra solo a un lado = mismo sentido; a ambos = división. Abstenciones y ausentes en el detalle al pasar el mouse.`;
});

const chartHeight = computed(() => {
  const n = rows.value.length;
  return `${Math.max(14, 3.4 + n * 2.2)}rem`;
});

const option = computed(() => {
  const list = rows.value;
  if (!list.length) return null;

  const p = palette.value;
  const chrome = baseChartChrome(p);
  const ordered = [...list].reverse();

  const labels = ordered.map((r) => {
    const extras: string[] = [];
    if (r.abstencion) extras.push(`${r.abstencion} abs.`);
    if (r.ausente) extras.push(`${r.ausente} aus.`);
    const status = r.united ? "unidos" : "divididos";
    const extra = extras.length ? ` · ${extras.join(", ")}` : "";
    return `${r.label}  (${r.total} · ${status}${extra})`;
  });

  const afirmativo = ordered.map((r) => groupVotePct(r.afirmativo, r.total));
  const negativo = ordered.map((r) => groupVotePct(r.negativo, r.total));

  const labelFmt = (params: any) => {
    const v = Number(params.value);
    if (!v) return "";
    return `${Math.round(v)}%`;
  };

  return {
    ...chrome,
    toolbox: undefined,
    dataZoom: undefined,
    legend: {
      ...chrome.legend,
      top: 0,
      left: 0,
      data: [
        getVotoTipoConfig("afirmativo").label,
        getVotoTipoConfig("negativo").label,
      ],
    },
    grid: [
      {
        left: 4,
        right: "51%",
        top: 44,
        bottom: 32,
        containLabel: true,
      },
      {
        left: "51%",
        right: 12,
        top: 44,
        bottom: 32,
        containLabel: true,
      },
    ],
    tooltip: {
      ...chrome.tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const idx = items[0]?.dataIndex;
        if (idx == null) return "";
        const row = ordered[idx];
        if (!row) return "";
        const parts: Array<[string, number]> = [
          ["afirmativo", row.afirmativo],
          ["negativo", row.negativo],
          ["abstencion", row.abstencion],
          ["ausente", row.ausente],
        ];
        const lines = parts
          .filter(([, n]) => n > 0)
          .map(([key, n]) => {
            const cfg = getVotoTipoConfig(key);
            return `${cfg.label}: <b>${n}</b> (${groupVotePct(n, row.total)}%)`;
          });
        const status = row.united ? "Unidos" : "Divididos";
        return `<div class="text-xs"><div class="mb-1 font-medium">${row.label}</div><div class="opacity-70 mb-1">${row.total} legisladores · ${status}</div>${lines.join("<br/>")}</div>`;
      },
    },
    xAxis: [
      {
        type: "value",
        gridIndex: 0,
        inverse: true,
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          color: p.textMuted,
          fontSize: 10,
          formatter: (v: number) => (v === 0 ? "" : `${v}%`),
        },
        splitLine: { lineStyle: { color: p.splitLine } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: "value",
        gridIndex: 1,
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          color: p.textMuted,
          fontSize: 10,
          formatter: (v: number) => `${v}%`,
        },
        splitLine: { lineStyle: { color: p.splitLine } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: "category",
        gridIndex: 0,
        data: labels,
        axisLabel: {
          color: p.text,
          fontSize: 11,
          width: 168,
          overflow: "truncate",
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      {
        type: "category",
        gridIndex: 1,
        data: labels,
        show: false,
      },
    ],
    series: [
      {
        name: getVotoTipoConfig("afirmativo").label,
        type: "bar",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: afirmativo,
        itemStyle: {
          color: p.afirmativo,
          borderRadius: [4, 0, 0, 4],
        },
        barMaxWidth: 22,
        label: {
          show: true,
          position: "insideLeft",
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          formatter: labelFmt,
        },
        emphasis: { focus: "series" },
      },
      {
        name: getVotoTipoConfig("negativo").label,
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: negativo,
        itemStyle: {
          color: p.negativo,
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 22,
        label: {
          show: true,
          position: "insideRight",
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          formatter: labelFmt,
        },
        emphasis: { focus: "series" },
      },
    ],
    graphic: [
      {
        type: "text",
        left: "26%",
        top: 24,
        style: {
          text: getVotoTipoConfig("afirmativo").label,
          fill: p.afirmativo,
          fontSize: 12,
          fontWeight: 600,
          align: "center",
        },
      },
      {
        type: "text",
        right: "20%",
        top: 24,
        style: {
          text: getVotoTipoConfig("negativo").label,
          fill: p.negativo,
          fontSize: 12,
          fontWeight: 600,
          align: "center",
        },
      },
    ],
  };
});
</script>

<template>
  <ChartsChartCard
    v-if="option"
    :title="title"
    :description="description"
    :show-periodo-badge="false"
  >
    <ChartsAppChart
      :option="option"
      :height="chartHeight"
      :aria-label="title"
    />
  </ChartsChartCard>
</template>
