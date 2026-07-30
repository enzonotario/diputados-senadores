<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    option: Record<string, any>;
    height?: string;
    /** Accesible: resumen del gráfico */
    ariaLabel?: string;
  }>(),
  {
    height: "20rem",
    ariaLabel: "Gráfico interactivo",
  },
);

const emit = defineEmits<{
  click: [params: any];
  mouseover: [params: any];
  globalout: [];
}>();

const vChartRef = ref<{
  chart?: any;
  getInstance?: () => any;
} | null>(null);

let boundChart: any = null;

function getInstance() {
  const c = vChartRef.value;
  if (!c) return null;
  if (typeof c.getInstance === "function") return c.getInstance();
  return c.chart ?? null;
}

function onChartClick(params: any) {
  emit("click", params);
}
function onChartMouseOver(params: any) {
  emit("mouseover", params);
}
function onChartGlobalOut() {
  emit("globalout");
}

function bindChartEvents() {
  const chart = getInstance();
  if (!chart || chart === boundChart) return;
  if (boundChart) {
    boundChart.off("click", onChartClick);
    boundChart.off("mouseover", onChartMouseOver);
    boundChart.off("globalout", onChartGlobalOut);
  }
  boundChart = chart;
  chart.on("click", onChartClick);
  chart.on("mouseover", onChartMouseOver);
  chart.on("globalout", onChartGlobalOut);
}

onMounted(() => {
  nextTick(() => bindChartEvents());
  const t = window.setInterval(() => {
    bindChartEvents();
    if (boundChart) window.clearInterval(t);
  }, 50);
  window.setTimeout(() => window.clearInterval(t), 2000);
});

onBeforeUnmount(() => {
  if (boundChart) {
    boundChart.off("click", onChartClick);
    boundChart.off("mouseover", onChartMouseOver);
    boundChart.off("globalout", onChartGlobalOut);
    boundChart = null;
  }
});

watch(
  () => props.option,
  () => nextTick(() => bindChartEvents()),
);

defineExpose({ getInstance });
</script>

<template>
  <ClientOnly>
    <VChart
      ref="vChartRef"
      class="w-full min-h-0"
      :style="{ height }"
      :option="option"
      :autoresize="{ throttle: 50 }"
      :init-options="{ renderer: 'canvas' }"
      role="img"
      :aria-label="ariaLabel"
    />
    <template #fallback>
      <div
        class="w-full animate-pulse rounded-lg bg-elevated"
        :style="{ height }"
        aria-hidden="true"
      />
    </template>
  </ClientOnly>
</template>
