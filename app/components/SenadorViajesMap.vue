<script setup lang="ts">
import type { ViajeNacional } from "@/lib/types";
import {
  ARGENTINA_PROVINCIAS_MAP,
  ensureArgentinaProvinciasMap,
} from "@/composables/useArgentinaProvinciasMap";
import { useChartPalette } from "@/composables/useChartPalette";
import {
  resolveAeropuertoPunto,
  resolveViajeSegmento,
  type AeropuertoPunto,
} from "@/utils/aeropuertoCoords";

const props = withDefaults(
  defineProps<{
    active: ViajeNacional | null;
    trail?: ViajeNacional[];
    catalog?: ViajeNacional[];
    height?: string;
    title?: string;
    canPrev?: boolean;
    canNext?: boolean;
  }>(),
  {
    trail: () => [],
    catalog: () => [],
    height: "32rem",
    title: "Ruta",
    canPrev: false,
    canNext: false,
  },
);

const emit = defineEmits<{
  prev: [];
  next: [];
}>();

const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-73.8, -55.3],
  [-53.4, -21.6],
];

const palette = useChartPalette();
const mapReady = ref(false);
const mapError = ref<string | null>(null);

/** Congelado: no se recalcula en cada scroll. */
const backgroundPoints = shallowRef<AeropuertoPunto[]>([]);

onMounted(async () => {
  try {
    await ensureArgentinaProvinciasMap();
    mapReady.value = true;
  } catch (e: any) {
    mapError.value = e?.message || "No se pudo cargar el mapa";
  }
});

watch(
  () => props.catalog,
  (list) => {
    const byCode = new Map<string, AeropuertoPunto>();
    for (const v of list || []) {
      for (const side of [
        resolveAeropuertoPunto(v.origen, v.origenCodigo),
        resolveAeropuertoPunto(v.destino, v.destinoCodigo),
      ]) {
        if (side) byCode.set(side.code, side);
      }
    }
    backgroundPoints.value = [...byCode.values()];
  },
  { immediate: true },
);

const activeSegment = computed(() =>
  props.active ? resolveViajeSegmento(props.active) : null,
);

const trailSegments = computed(() =>
  (props.trail || [])
    .map((v) => resolveViajeSegmento(v))
    .filter(Boolean) as Array<{
    origen: AeropuertoPunto;
    destino: AeropuertoPunto;
  }>,
);

const routeLabel = computed(() => {
  const seg = activeSegment.value;
  const viaje = props.active;
  if (!seg || !viaje) return "Scrolleá la lista para ver cada ruta.";
  const mes =
    viaje.mes != null && viaje.mes >= 1 && viaje.mes <= 12
      ? String(viaje.mes).padStart(2, "0")
      : null;
  const ym = mes ? `${viaje.anio}-${mes}` : String(viaje.anio);
  return `${ym} · ${seg.origen.label} → ${seg.destino.label}`;
});

/**
 * Option completa en cada update (sin setOption parcial / manual-update).
 * Sin baseChartChrome: evita grid/dataZoom que rompen charts solo-geo.
 */
const option = computed(() => {
  if (!mapReady.value) return null;

  const p = palette.value;
  const active = activeSegment.value;

  const trailLines = trailSegments.value.map((seg) => ({
    coords: [
      [seg.origen.lon, seg.origen.lat],
      [seg.destino.lon, seg.destino.lat],
    ],
  }));

  const activeLines = active
    ? [
        {
          coords: [
            [active.origen.lon, active.origen.lat],
            [active.destino.lon, active.destino.lat],
          ],
        },
      ]
    : [];

  return {
    backgroundColor: p.background,
    animation: false,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: "item" as const,
      backgroundColor: p.tooltipBg,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.text, fontSize: 12 },
      formatter: (params: any) => {
        const name = params?.name || params?.data?.name || "";
        return name ? `<div class="text-xs"><b>${name}</b></div>` : "";
      },
    },
    geo: {
      map: ARGENTINA_PROVINCIAS_MAP,
      roam: false,
      boundingCoords: DEFAULT_BOUNDS,
      layoutCenter: ["50%", "50%"],
      layoutSize: "95%",
      nameProperty: "name",
      select: { disabled: true },
      itemStyle: {
        areaColor: p.isDark ? "#1e293b" : "#e8edf2",
        borderColor: p.isDark ? "#0f172a" : "#ffffff",
        borderWidth: 1,
      },
      emphasis: { disabled: true },
      label: { show: false },
    },
    series: [
      {
        type: "scatter",
        id: "viajes-bg",
        coordinateSystem: "geo",
        geoIndex: 0,
        silent: true,
        z: 2,
        data: backgroundPoints.value.map((pt) => ({
          name: pt.label,
          value: [pt.lon, pt.lat],
          itemStyle: {
            color: p.isDark ? "#475569" : "#94a3b8",
            opacity: 0.5,
          },
          symbolSize: 6,
        })),
      },
      {
        type: "lines",
        id: "viajes-trail",
        coordinateSystem: "geo",
        geoIndex: 0,
        silent: true,
        z: 3,
        data: trailLines,
        lineStyle: {
          color: p.isDark ? "#64748b" : "#94a3b8",
          width: 1.25,
          opacity: 0.35,
          curveness: 0.2,
        },
        effect: { show: false },
      },
      {
        type: "lines",
        id: "viajes-active",
        coordinateSystem: "geo",
        geoIndex: 0,
        z: 4,
        data: activeLines,
        lineStyle: {
          color: p.presentismo,
          width: 2.5,
          opacity: 0.95,
          curveness: 0.22,
        },
        effect: {
          show: true,
          period: 4,
          trailLength: 0.35,
          symbol: "arrow",
          symbolSize: 6,
          color: p.presentismo,
        },
      },
      {
        type: "scatter",
        id: "viajes-ends",
        coordinateSystem: "geo",
        geoIndex: 0,
        z: 5,
        data: active
          ? [
              {
                name: active.origen.label,
                value: [active.origen.lon, active.origen.lat],
                itemStyle: { color: p.presentismo },
                symbolSize: 14,
                label: {
                  show: true,
                  formatter: "Origen",
                  position: "top",
                  color: p.text,
                  fontSize: 11,
                },
              },
              {
                name: active.destino.label,
                value: [active.destino.lon, active.destino.lat],
                itemStyle: { color: p.primary },
                symbolSize: 14,
                label: {
                  show: true,
                  formatter: "Destino",
                  position: "top",
                  color: p.text,
                  fontSize: 11,
                },
              },
            ]
          : [],
      },
    ],
  };
});
</script>

<template>
  <UCard :ui="{ body: 'space-y-3' }">
    <div class="space-y-1">
      <h3 class="text-base font-semibold text-highlighted">{{ title }}</h3>
      <p class="text-sm text-muted min-h-5">{{ routeLabel }}</p>
    </div>

    <p v-if="mapError" class="text-sm text-error">{{ mapError }}</p>
    <div
      v-else-if="!mapReady || !option"
      class="animate-pulse rounded-lg bg-elevated"
      :style="{ height }"
      aria-hidden="true"
    />
    <!--
      autoresize off + altura fija: con sticky, autoresize a veces ve height 0,
      dispone la instancia y el siguiente setOption deja el mapa en blanco.
    -->
    <VChart
      v-else
      class="w-full"
      :style="{ height, width: '100%' }"
      :option="option"
      :update-options="{ notMerge: true }"
      :autoresize="false"
      :init-options="{ renderer: 'canvas' }"
      role="img"
      aria-label="Mapa de origen y destino del viaje"
    />

    <div class="flex items-center gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-chevron-left"
        class="flex-1 justify-center"
        :disabled="!canPrev"
        @click="emit('prev')"
      >
        Anterior
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        size="sm"
        trailing-icon="i-lucide-chevron-right"
        class="flex-1 justify-center"
        :disabled="!canNext"
        @click="emit('next')"
      >
        Siguiente
      </UButton>
    </div>
  </UCard>
</template>
