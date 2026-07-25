<script setup lang="ts">
import { useChartPalette } from "@/composables/useChartPalette";
import { formatDateRange } from "@/lib/utils";
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { SIN_PERIODO_KEY } from "@/utils/periodoLegislativo";

const props = defineProps<{
  periods: PeriodoInfo[];
  selected: string[];
  /** Timeline de listados: barra = integrantes, tooltip incluye votaciones. */
  membersMetric?: boolean;
}>();

const emit = defineEmits<{
  /** Claves a aplicar (vacío = todos los períodos). */
  select: [keys: string[]];
}>();

/** Ancla para Shift+clic (como el explorador de Windows). */
const shiftAnchorKey = ref<string | null>(null);
/** Modifiers del último pointer sobre el chart (ECharts no siempre los expone). */
const pointerMods = ref({ ctrl: false, shift: false });

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

const orderedKeys = computed(() => timelineRows.value.map((r) => r.key));

const selectedSet = computed(() => new Set(props.selected || []));
const allSelected = computed(() => !(props.selected?.length > 0));

const usesMembersMetric = computed(() => props.membersMetric);

const chartHeight = computed(() => {
  const n = timelineRows.value.length;
  return `${Math.min(360, Math.max(140, 28 + n * 26))}px`;
});

const chartDescription = computed(() => {
  const shortcuts =
    "Clic = uno · Ctrl/⌘+clic = sumar · Shift+clic = rango.";
  if (usesMembersMetric.value) {
    return `La barra es la cantidad de integrantes del período; las votaciones van en el tooltip. ${shortcuts}`;
  }
  return `${shortcuts} Para buscar, usá el select.`;
});

function onPointerDown(e: MouseEvent) {
  pointerMods.value = {
    ctrl: !!(e.ctrlKey || e.metaKey),
    shift: !!e.shiftKey,
  };
}

function resolveMods() {
  // Fuente de verdad: mousedown capturado en el wrapper (ECharts no siempre expone modifiers).
  return pointerMods.value;
}

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
      countNoun: row.countNoun || "votaciones",
      secondaryCount: row.secondaryCount,
      secondaryNoun: row.secondaryNoun || "votaciones",
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
        const range =
          d.minFecha || d.maxFecha
            ? formatDateRange(d.minFecha, d.maxFecha, "")
            : "";
        const onlyThis =
          !noneScoped && selected.size === 1 && selected.has(String(d.key));
        const hint = onlyThis
          ? "Período activo"
          : "Clic = este · Ctrl/⌘ = sumar · Shift = rango";
        const primary = `<div>${d.value ?? 0} ${d.countNoun || "votaciones"}</div>`;
        const secondary =
          d.secondaryCount != null
            ? `<div class="opacity-80">${d.secondaryCount} ${d.secondaryNoun || "votaciones"}</div>`
            : "";
        return `<div class="text-xs"><div class="font-medium mb-0.5">${d.label || params?.name || ""}</div>${primary}${secondary}${range ? `<div class="opacity-80">${range}</div>` : ""}<div class="mt-1 opacity-70">${hint}</div></div>`;
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
  const key = String(params?.data?.key || "");
  if (!key) return;

  const { ctrl, shift } = resolveMods();
  const keys = orderedKeys.value;
  const selected = props.selected || [];

  if (shift) {
    const anchor =
      shiftAnchorKey.value || selected[selected.length - 1] || key;
    const i0 = keys.indexOf(anchor);
    const i1 = keys.indexOf(key);
    if (i0 < 0 || i1 < 0) {
      emit("select", [key]);
      shiftAnchorKey.value = key;
      return;
    }
    const [lo, hi] = i0 < i1 ? [i0, i1] : [i1, i0];
    emit("select", keys.slice(lo, hi + 1));
    // No mover el ancla (comportamiento tipo Explorer).
    return;
  }

  if (ctrl) {
    const set = new Set(selected);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    emit(
      "select",
      keys.filter((k) => set.has(k)),
    );
    if (!shiftAnchorKey.value) shiftAnchorKey.value = key;
    return;
  }

  emit("select", [key]);
  shiftAnchorKey.value = key;
}
</script>

<template>
  <ChartsChartCard
    v-if="option"
    title="Períodos en el tiempo"
    :description="chartDescription"
    :show-periodo-badge="false"
  >
    <div @mousedown.capture="onPointerDown">
      <ChartsAppChart
        :option="option"
        :height="chartHeight"
        aria-label="Períodos legislativos en el tiempo"
        @click="onClick"
      />
    </div>
  </ChartsChartCard>
</template>
