<script setup lang="ts">
import type { MemberVoteStats } from "@/utils/chartSeries";
import { useChartPalette } from "@/composables/useChartPalette";
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = defineProps<{
  stats: MemberVoteStats;
}>();

const palette = useChartPalette();

const presentes = computed(
  () =>
    props.stats.votosAfirmativos +
    props.stats.votosNegativos +
    props.stats.abstenciones,
);

const presentismo = computed(() => Math.round(props.stats.presentismo));

const sankeyOption = computed(() => {
  const p = palette.value;
  const af = props.stats.votosAfirmativos;
  const neg = props.stats.votosNegativos;
  const abs = props.stats.abstenciones;
  const aus = props.stats.ausencias;
  const pres = presentes.value;
  const tot = props.stats.totalVotaciones;

  if (tot <= 0) return null;

  const cAf = getVotoTipoConfig("afirmativo").color;
  const cNeg = getVotoTipoConfig("negativo").color;
  const cAbs = getVotoTipoConfig("abstencion").color;
  const cAus = getVotoTipoConfig("ausente").color;
  const cPres = p.presentismo;

  type Node = {
    name: string;
    depth: number;
    itemStyle: { color: string };
  };
  type Link = {
    source: string;
    target: string;
    value: number;
    lineStyle?: { color: string; opacity: number };
  };

  const nodes: Node[] = [
    { name: "Total", depth: 0, itemStyle: { color: p.primary } },
  ];
  const links: Link[] = [];

  if (pres > 0) {
    nodes.push({
      name: "Presentes",
      depth: 1,
      itemStyle: { color: cPres },
    });
    links.push({
      source: "Total",
      target: "Presentes",
      value: pres,
      lineStyle: { color: cPres, opacity: 0.35 },
    });
  }

  if (aus > 0) {
    nodes.push({
      name: "Ausentes",
      depth: 1,
      itemStyle: { color: cAus },
    });
    links.push({
      source: "Total",
      target: "Ausentes",
      value: aus,
      lineStyle: { color: cAus, opacity: 0.35 },
    });
  }

  const voteBranches = [
    { name: "A favor", value: af, color: cAf },
    { name: "En contra", value: neg, color: cNeg },
    { name: "Abstenciones", value: abs, color: cAbs },
  ];

  for (const branch of voteBranches) {
    if (branch.value <= 0 || pres <= 0) continue;
    nodes.push({
      name: branch.name,
      depth: 2,
      itemStyle: { color: branch.color },
    });
    links.push({
      source: "Presentes",
      target: branch.name,
      value: branch.value,
      lineStyle: { color: branch.color, opacity: 0.4 },
    });
  }

  if (!links.length) return null;

  const valueByName: Record<string, number> = {
    Total: tot,
    Presentes: pres,
    Ausentes: aus,
    "A favor": af,
    "En contra": neg,
    Abstenciones: abs,
  };

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
      formatter: (params: any) => {
        if (params.dataType === "edge") {
          const pct =
            tot > 0
              ? Math.round((Number(params.value) / tot) * 1000) / 10
              : 0;
          return `${params.data.source} → ${params.data.target}<br/><b>${params.value}</b> (${pct}%)`;
        }
        const value = valueByName[params.name];
        const pct =
          tot > 0 && value != null
            ? Math.round((value / tot) * 1000) / 10
            : null;
        return `${params.marker} ${params.name}: <b>${value ?? ""}</b>${
          pct != null ? ` (${pct}%)` : ""
        }`;
      },
    },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        nodeAlign: "justify",
        nodeGap: 10,
        nodeWidth: 14,
        orient: "horizontal",
        layoutIterations: 32,
        label: {
          color: p.text,
          fontSize: 11,
          formatter: (params: any) => {
            const n = valueByName[params.name];
            return n != null ? `${params.name}\n${n}` : params.name;
          },
        },
        lineStyle: {
          color: "gradient",
          curveness: 0.5,
        },
        data: nodes,
        links,
      },
    ],
  };
});
</script>

<template>
  <UCard class="overflow-hidden" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-0.5 min-w-0">
          <h2 class="text-base font-semibold text-highlighted">
            Votos y asistencia
          </h2>
          <p class="text-sm text-muted">
            Del total: presentes vs ausentes; entre presentes, cómo votó.
          </p>
        </div>
        <div
          class="shrink-0 rounded-lg border border-default bg-elevated/50 px-3 py-1.5 text-right"
        >
          <div class="text-[11px] uppercase tracking-wide text-muted">
            Total votaciones
          </div>
          <div class="text-xl font-bold tabular-nums leading-tight">
            {{ stats.totalVotaciones }}
          </div>
        </div>
      </div>
    </template>

    <div
      class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)] gap-4 lg:gap-5 lg:items-stretch"
    >
      <!-- Chart primero en DOM → arriba en mobile, izquierda en desktop -->
      <div class="min-w-0 flex flex-col justify-center">
        <ClientOnly v-if="sankeyOption">
          <ChartsAppChart
            :option="sankeyOption"
            height="16rem"
            aria-label="Flujo de asistencia y votos del legislador"
          />
          <template #fallback>
            <div class="h-64 animate-pulse rounded-lg bg-elevated" />
          </template>
        </ClientOnly>
        <p v-else class="text-sm text-muted py-8 text-center">
          Sin votaciones en el período seleccionado.
        </p>
      </div>

      <div class="flex flex-col gap-3 min-w-0 justify-center">
        <div
          class="grid grid-cols-2 gap-2"
          role="list"
          aria-label="Conteo por tipo de voto"
        >
          <div
            role="listitem"
            class="rounded-lg border border-teal-300! bg-teal-50 p-2.5 dark:border-teal-700! dark:bg-teal-950"
          >
            <div
              class="text-2xl font-bold tabular-nums leading-none text-teal-600 dark:text-teal-400"
            >
              {{ stats.votosAfirmativos }}
            </div>
            <div class="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-tight">
              A favor
            </div>
          </div>
          <div
            role="listitem"
            class="rounded-lg border border-red-300! bg-red-50 p-2.5 dark:border-red-700! dark:bg-red-950"
          >
            <div
              class="text-2xl font-bold tabular-nums leading-none text-red-600 dark:text-red-400"
            >
              {{ stats.votosNegativos }}
            </div>
            <div class="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-tight">
              En contra
            </div>
          </div>
          <div
            role="listitem"
            class="rounded-lg border border-blue-300! bg-blue-50 p-2.5 dark:border-blue-700! dark:bg-blue-950"
          >
            <div
              class="text-2xl font-bold tabular-nums leading-none text-blue-600 dark:text-blue-400"
            >
              {{ stats.abstenciones }}
            </div>
            <div class="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-tight">
              Abstenciones
            </div>
          </div>
          <div
            role="listitem"
            class="rounded-lg border border-gray-300! bg-gray-50 p-2.5 dark:border-gray-600! dark:bg-gray-950"
          >
            <div
              class="text-2xl font-bold tabular-nums leading-none text-gray-700 dark:text-gray-200"
            >
              {{ stats.ausencias }}
            </div>
            <div class="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-tight">
              Ausencias
            </div>
          </div>
        </div>

        <UCard
          class="shrink-0"
          :ui="{
            root: 'rounded-lg',
            body: 'flex items-center gap-3 py-2.5! px-3!',
          }"
        >
          <span class="text-xs font-medium text-muted shrink-0">Asistencia</span>
          <UProgress
            :model-value="presentismo"
            size="sm"
            color="neutral"
            class="flex-1 min-w-0"
          />
          <span class="text-sm font-semibold tabular-nums shrink-0">
            {{ presentismo }}%
          </span>
        </UCard>
      </div>
    </div>
  </UCard>
</template>
