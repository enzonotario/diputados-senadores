<script setup lang="ts">
import type { ActaChartRow } from "@/utils/chartSeries";
import { useChartPalette } from "@/composables/useChartPalette";
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = defineProps<{
  acta: ActaChartRow & {
    resultado?: string | null;
    votos?: unknown[] | null;
    presentes?: number | null;
    miembros?: number | null;
  };
}>();

const palette = useChartPalette();

const afirmativos = computed(() => Number(props.acta.votosAfirmativos || 0));
const negativos = computed(() => Number(props.acta.votosNegativos || 0));
const abstenciones = computed(() => Number(props.acta.abstenciones || 0));
const ausentes = computed(() => Number(props.acta.ausentes || 0));

const presentes = computed(() => {
  if (
    typeof props.acta.presentes === "number" &&
    props.acta.presentes > 0
  ) {
    return props.acta.presentes;
  }
  return afirmativos.value + negativos.value + abstenciones.value;
});

const total = computed(() => {
  const miembros = Number(props.acta.miembros || 0);
  if (miembros > 0) return miembros;
  const sum = presentes.value + ausentes.value;
  if (sum > 0) return sum;
  return Number(props.acta.votos?.length || 0);
});

const presentismo = computed(() =>
  total.value ? Math.round((presentes.value / total.value) * 100) : 0,
);

const sankeyOption = computed(() => {
  const p = palette.value;
  const af = afirmativos.value;
  const neg = negativos.value;
  const abs = abstenciones.value;
  const aus = ausentes.value;
  const pres = presentes.value;
  const tot = total.value || pres + aus;

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

  const voteBranches: Array<{
    name: string;
    value: number;
    color: string;
  }> = [
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
        const pct =
          tot > 0 ? Math.round((Number(params.value) / tot) * 1000) / 10 : 0;
        const value =
          params.value != null
            ? params.value
            : params.name === "Total"
              ? tot
              : params.name === "Presentes"
                ? pres
                : params.name === "Ausentes"
                  ? aus
                  : params.name === "A favor"
                    ? af
                    : params.name === "En contra"
                      ? neg
                      : params.name === "Abstenciones"
                        ? abs
                        : "";
        return `${params.marker} ${params.name}: <b>${value}</b>${
          value !== "" && tot > 0 ? ` (${pct}%)` : ""
        }`;
      },
    },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        nodeAlign: "justify",
        nodeGap: 12,
        nodeWidth: 16,
        orient: "horizontal",
        layoutIterations: 32,
        label: {
          color: p.text,
          fontSize: 11,
          formatter: (params: any) => {
            const map: Record<string, number> = {
              Total: tot,
              Presentes: pres,
              Ausentes: aus,
              "A favor": af,
              "En contra": neg,
              Abstenciones: abs,
            };
            const n = map[params.name];
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
  <UCard
    v-if="sankeyOption"
    class="overflow-hidden"
    :ui="{ body: 'space-y-4' }"
  >
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">Asistencia y resultados</h2>
        <p class="text-sm text-muted">
          Del total: quiénes estaban, y entre los presentes, a favor, en contra o
          abstención.
        </p>
      </div>
    </template>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="rounded-xl border border-default bg-elevated/40 p-3 space-y-3">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="text-sm font-medium text-highlighted">Asistencia</h3>
          <span class="text-xs text-muted tabular-nums">
            Total {{ total }} · Asistencia
            <span class="font-medium text-highlighted">{{ presentismo }}%</span>
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-lg bg-default/80 p-3 text-center">
            <div
              class="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400"
            >
              {{ presentes }}
            </div>
            <div class="text-xs text-muted mt-0.5">Presentes</div>
          </div>
          <div class="rounded-lg bg-default/80 p-3 text-center">
            <div
              class="text-2xl font-bold tabular-nums text-gray-600 dark:text-gray-300"
            >
              {{ ausentes }}
            </div>
            <div class="text-xs text-muted mt-0.5">Ausentes</div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-elevated/40 p-3 space-y-3">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="text-sm font-medium text-highlighted">Resultados</h3>
          <span class="text-xs text-muted">Entre presentes</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-lg bg-default/80 p-3 text-center">
            <div
              class="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400"
            >
              {{ afirmativos }}
            </div>
            <div class="text-xs text-muted mt-0.5">A favor</div>
          </div>
          <div class="rounded-lg bg-default/80 p-3 text-center">
            <div
              class="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400"
            >
              {{ negativos }}
            </div>
            <div class="text-xs text-muted mt-0.5">En contra</div>
          </div>
          <div class="rounded-lg bg-default/80 p-3 text-center">
            <div
              class="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
            >
              {{ abstenciones }}
            </div>
            <div class="text-xs text-muted mt-0.5">Abstenciones</div>
          </div>
        </div>
      </div>
    </div>

    <ClientOnly>
      <ChartsAppChart
        :option="sankeyOption"
        height="18rem"
        aria-label="Flujo de asistencia y resultados de la votación"
      />
      <template #fallback>
        <div class="h-72 animate-pulse rounded-lg bg-elevated" />
      </template>
    </ClientOnly>
  </UCard>
</template>
