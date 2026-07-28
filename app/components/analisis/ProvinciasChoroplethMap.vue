<script setup lang="ts">
import {
  ARGENTINA_PROVINCIAS_MAP,
  ensureArgentinaProvinciasMap,
  getArgentinaProvinciaMetas,
} from "@/composables/useArgentinaProvinciasMap";
import {
  baseChartChrome,
  useChartPalette,
} from "@/composables/useChartPalette";
import { provinciaKey } from "@/utils/provinciaKey";
import { applyMultiSelectClick } from "@/utils/multiSelectClick";

export type ProvinciaMapDatum = {
  /** Nombre crudo (API / grupo). */
  name: string;
  value: number;
  /** Etiqueta para tooltip (opcional). */
  label?: string;
};

const props = withDefaults(
  defineProps<{
    data: ProvinciaMapDatum[];
    /**
     * Nombres de provincia conocidos (API), aunque el filtro actual deje value=0.
     * Permite clickear y cambiar el filtro a otra provincia.
     */
    catalog?: string[];
    /** Provincias activas en el filtro (resaltado). */
    selected?: string[];
    /** Sustantivo en tooltip: "diputados" | "senadores" | "integrantes". */
    membersLabel?: string;
    height?: string;
    title?: string;
    description?: string;
  }>(),
  {
    catalog: () => [],
    selected: () => [],
    membersLabel: "integrantes",
    height: "min(70vh, 36rem)",
    title: "Por provincia",
    description:
      "El área del círculo es proporcional a la cantidad. Clic = una · Ctrl/⌘+clic = sumar o quitar.",
  },
);

const emit = defineEmits<{
  select: [names: string[]];
}>();

const pointerMods = ref({ ctrl: false });

function onPointerDown(e: MouseEvent) {
  pointerMods.value = {
    ctrl: !!(e.ctrlKey || e.metaKey),
  };
}

const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-73.8, -55.3],
  [-53.4, -21.6],
];

/** Radio máximo en px (el resto escala con √valor para que el área sea proporcional). */
const MAX_RADIUS = 27;
const MIN_RADIUS = 7;

const palette = useChartPalette();
const mapReady = ref(false);
const mapError = ref<string | null>(null);
const chartRef = ref<any>(null);
/** Tras el primer setOption completo; los siguientes solo parchean data. */
const chartBootstrapped = ref(false);

onMounted(async () => {
  try {
    await ensureArgentinaProvinciasMap();
    mapReady.value = true;
  } catch (e: any) {
    mapError.value = e?.message || "No se pudo cargar el mapa";
  }
});

const selectedKeys = computed(
  () =>
    new Set(
      (props.selected || []).map((n) => provinciaKey(n)).filter(Boolean),
    ),
);

const seriesData = computed(() => {
  // Los centroides sólo existen tras registrar el GeoJSON.
  if (!mapReady.value) return [];

  const byKey = new Map<
    string,
    { value: number; label: string; rawName: string }
  >();

  for (const row of props.data) {
    const key = provinciaKey(row.name);
    if (!key) continue;
    const prev = byKey.get(key);
    const label = row.label || row.name;
    if (prev) {
      prev.value += row.value;
    } else {
      byKey.set(key, { value: row.value, label, rawName: row.name });
    }
  }

  const catalogByKey = new Map<string, string>();
  for (const name of props.catalog || []) {
    const key = provinciaKey(name);
    if (!key || catalogByKey.has(key)) continue;
    catalogByKey.set(key, name);
  }

  const metaByKey = new Map(
    getArgentinaProvinciaMetas().map((m) => [m.key, m] as const),
  );

  const keys = new Set<string>([
    ...metaByKey.keys(),
    ...catalogByKey.keys(),
    ...byKey.keys(),
  ]);

  return [...keys].map((name) => {
    const hit = byKey.get(name);
    const catalogName = catalogByKey.get(name);
    const meta = metaByKey.get(name);
    const rawName = hit?.rawName || catalogName || meta?.displayName || name;
    const label = hit?.label || catalogName || meta?.displayName || name;
    return {
      name,
      value: hit?.value ?? 0,
      label,
      rawName,
      center: meta?.center,
      isSelected: selectedKeys.value.has(name),
    };
  });
});

const maxValue = computed(() =>
  Math.max(1, ...seriesData.value.map((d) => d.value), 1),
);

const rowByKey = computed(
  () => new Map(seriesData.value.map((d) => [d.name, d] as const)),
);

function tooltipHtml(label: string, value: number) {
  return `<div class="text-xs"><b>${label}</b><br/>${value} ${props.membersLabel}</div>`;
}

/**
 * Área ∝ cantidad. El factor se recorta al techo de px, pero también se
 * acota en absoluto: si el máximo es chico (senadores: 3 por provincia)
 * no tiene sentido inflar todos los círculos hasta el tope.
 */
const radiusFactor = computed(() =>
  Math.min(3.2, MAX_RADIUS / Math.sqrt(maxValue.value)),
);

function bubbleRadius(value: number) {
  if (value <= 0) return 0;
  return Math.max(MIN_RADIUS, Math.sqrt(value) * radiusFactor.value);
}

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function mixHex(low: string, high: string, t: number) {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [lr, lg, lb] = parse(low);
  const [hr, hg, hb] = parse(high);
  const clampT = Math.min(1, Math.max(0, t));
  const r = lerpChannel(lr, hr, clampT);
  const g = lerpChannel(lg, hg, clampT);
  const b = lerpChannel(lb, hb, clampT);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Regiones del mapa: fondo neutro; el dato lo llevan las burbujas. */
function buildRegions() {
  const p = palette.value;
  const baseFill = p.isDark ? "#1e293b" : "#e8edf2";
  const selectedFill = p.isDark ? "#334155" : "#cbd5e1";
  const selectedBorder = p.isDark ? "#e5e7eb" : "#111827";
  const hasSelection = selectedKeys.value.size > 0;

  return seriesData.value.map((d) => ({
    name: d.name,
    rawName: d.rawName,
    label: { show: false },
    itemStyle: d.isSelected
      ? {
          areaColor: selectedFill,
          borderColor: selectedBorder,
          borderWidth: 2,
        }
      : {
          areaColor: baseFill,
          borderColor: p.isDark ? "#0f172a" : "#ffffff",
          borderWidth: 1,
          opacity: hasSelection ? 0.6 : 1,
        },
  }));
}

function buildBubbleData() {
  const p = palette.value;
  const low = p.isDark ? "#0f766e" : "#99f6e4";
  const high = p.presentismo;
  const max = maxValue.value;

  return seriesData.value
    .filter((d) => d.value > 0 && d.center)
    .sort((a, b) => b.value - a.value)
    .map((d) => {
      const t = Math.sqrt(d.value / max);
      const radius = bubbleRadius(d.value);
      const digits = String(d.value).length;
      // Ancho aprox. de un dígito bold ≈ 0.58×fontSize; achicar fuente si no entra.
      const diameter = radius * 2;
      let fontSize = Math.min(15, Math.max(9, Math.round(radius * 0.85)));
      const needed = (fs: number) => digits * fs * 0.58 + 2;
      while (fontSize > 8 && needed(fontSize) > diameter) fontSize -= 1;
      return {
        name: d.name,
        value: [d.center![0], d.center![1], d.value],
        label: {
          show: true,
          position: "inside" as const,
          formatter: String(d.value),
          fontSize,
          fontWeight: 700 as const,
          color: t > 0.55 ? "#ffffff" : p.isDark ? "#e5e7eb" : "#0f172a",
        },
        itemStyle: {
          color: mixHex(low, high, t),
          borderColor: d.isSelected
            ? p.isDark
              ? "#ffffff"
              : "#111827"
            : p.isDark
              ? "#0f172a"
              : "#ffffff",
          borderWidth: d.isSelected ? 3 : 1.5,
          opacity: 0.92,
          shadowBlur: d.isSelected ? 10 : 0,
          shadowColor: p.isDark
            ? "rgba(255,255,255,0.45)"
            : "rgba(0,0,0,0.35)",
        },
        provinciaLabel: d.label,
        rawName: d.rawName,
      };
    });
}

function buildChrome() {
  const p = palette.value;
  const chrome = baseChartChrome(p);

  return {
    ...chrome,
    legend: { show: false },
    toolbox: { show: false },
    dataZoom: undefined,
    visualMap: undefined,
    tooltip: {
      ...chrome.tooltip,
      trigger: "item" as const,
      formatter: (params: any) => {
        const d = params?.data;
        const label = d?.provinciaLabel || d?.rawName || params?.name || "";
        const n = Array.isArray(d?.value) ? Number(d.value[2]) || 0 : 0;
        return tooltipHtml(label, n);
      },
    },
  };
}

/** Primera pintura: incluye boundingCoords. Parches posteriores: solo data/estilo. */
function syncChart(full: boolean) {
  const chart = chartRef.value;
  if (!chart || !mapReady.value) return;

  const p = palette.value;
  const regions = buildRegions();
  const bubbles = buildBubbleData();

  const bubbleSeries = {
    type: "scatter" as const,
    id: "provincias-bubbles",
    coordinateSystem: "geo" as const,
    geoIndex: 0,
    symbol: "circle",
    symbolSize: (val: number[]) => 2 * bubbleRadius(Number(val?.[2]) || 0),
    data: bubbles,
    animationDuration: 300,
    emphasis: { scale: 1.12, focus: "none" as const },
    z: 5,
  };

  if (full || !chartBootstrapped.value) {
    chart.setOption(
      {
        ...buildChrome(),
        geo: {
          map: ARGENTINA_PROVINCIAS_MAP,
          roam: false,
          boundingCoords: DEFAULT_BOUNDS,
          layoutCenter: ["50%", "50%"],
          layoutSize: "100%",
          nameProperty: "name",
          select: { disabled: true },
          tooltip: {
            show: true,
            formatter: (params: any) => {
              const row = rowByKey.value.get(String(params?.name || ""));
              return tooltipHtml(
                row?.label || String(params?.name || ""),
                row?.value ?? 0,
              );
            },
          },
          itemStyle: {
            areaColor: p.isDark ? "#1e293b" : "#e8edf2",
            borderColor: p.isDark ? "#0f172a" : "#ffffff",
            borderWidth: 1,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: p.isDark ? "#334155" : "#cbd5e1",
            },
          },
          regions,
        },
        series: [bubbleSeries],
      },
      { notMerge: true },
    );
    chartBootstrapped.value = true;
    return;
  }

  // Zoom fijo (roam: false): solo parchear data/estilo.
  chart.setOption(
    {
      ...buildChrome(),
      geo: { regions },
      series: [bubbleSeries],
    },
    { notMerge: false, lazyUpdate: true },
  );
}

watch(
  [mapReady, chartRef, seriesData, selectedKeys, palette],
  async () => {
    if (!mapReady.value || !chartRef.value) return;
    await nextTick();
    syncChart(!chartBootstrapped.value);
  },
  { flush: "post" },
);

async function onChartFinished() {
  if (!mapReady.value || !chartRef.value) return;
  if (chartBootstrapped.value) return;
  await nextTick();
  syncChart(true);
}

function resolveRawName(params: any): string {
  const direct = params?.data?.rawName || params?.data?.provinciaLabel;
  if (direct) return String(direct);
  const key = provinciaKey(params?.name) || String(params?.name || "");
  if (!key) return "";
  const fromCatalog = (props.catalog || []).find(
    (n) => provinciaKey(n) === key,
  );
  if (fromCatalog) return fromCatalog;
  return (
    getArgentinaProvinciaMetas().find((m) => m.key === key)?.displayName || ""
  );
}

function onChartClick(params: any) {
  if (params?.componentType !== "series" && params?.componentType !== "geo") {
    return;
  }
  const raw = resolveRawName(params);
  if (!raw) return;

  const orderedKeys =
    (props.catalog || []).length > 0
      ? [...(props.catalog || [])]
      : getArgentinaProvinciaMetas().map((m) => m.displayName);

  const { next } = applyMultiSelectClick({
    key: raw,
    orderedKeys,
    selected: props.selected || [],
    ctrl: pointerMods.value.ctrl,
    shift: false,
    shiftAnchorKey: null,
    keyOf: provinciaKey,
  });
  emit("select", next);
}
</script>

<template>
  <ChartsChartCard :title="title" :description="description">
    <p v-if="mapError" class="text-sm text-error">{{ mapError }}</p>
    <div
      v-else-if="!mapReady"
      class="animate-pulse rounded-lg bg-elevated"
      :style="{ height }"
      aria-hidden="true"
    />
    <ClientOnly v-else>
      <div @mousedown.capture="onPointerDown">
        <VChart
          ref="chartRef"
          class="w-full min-h-0"
          :style="{ height }"
          manual-update
          :autoresize="{ throttle: 50 }"
          :init-options="{ renderer: 'canvas' }"
          role="img"
          aria-label="Mapa de provincias"
          @click="onChartClick"
          @finished="onChartFinished"
        />
      </div>
      <template #fallback>
        <div
          class="animate-pulse rounded-lg bg-elevated"
          :style="{ height }"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </ChartsChartCard>
</template>
