<script setup lang="ts">
import { useChartPalette } from "@/composables/useChartPalette";
import { formatDateRange } from "@/lib/utils";
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { SIN_PERIODO_KEY } from "@/utils/periodoLegislativo";

const props = defineProps<{
  periods: PeriodoInfo[];
  selected: string[];
  /** Timeline de listados: incluye cantidad de integrantes además de votaciones. */
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
  // Más antiguo a la izquierda.
  return [...rows].sort((a, b) => {
    const da = a.minFecha || a.maxFecha || "";
    const db = b.minFecha || b.maxFecha || "";
    if (da !== db) return da.localeCompare(db);
    return Number(a.key) - Number(b.key) || a.key.localeCompare(b.key);
  });
});

const orderedKeys = computed(() => timelineRows.value.map((r) => r.key));

const selectedSet = computed(() => new Set(props.selected || []));
const allSelected = computed(() => !(props.selected?.length > 0));

const usesMembersMetric = computed(() => props.membersMetric);

const hasDualMetrics = computed(() =>
  timelineRows.value.some(
    (r) => r.secondaryCount != null || usesMembersMetric.value,
  ),
);

const membersNoun = computed(() => {
  const fromRow = timelineRows.value.find((r) => r.countNoun)?.countNoun;
  return fromRow || "integrantes";
});

const votesNoun = computed(() => {
  if (hasDualMetrics.value) {
    const fromRow = timelineRows.value.find(
      (r) => r.secondaryNoun,
    )?.secondaryNoun;
    return fromRow || "votaciones";
  }
  const fromRow = timelineRows.value.find((r) => r.countNoun)?.countNoun;
  return fromRow || "votaciones";
});

function capitalizeNoun(noun: string) {
  if (!noun) return noun;
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

function yearOf(row: PeriodoInfo): string {
  const y = String(row.minFecha || "").slice(0, 4);
  if (y && y !== "0000") return y;
  const y2 = String(row.maxFecha || "").slice(0, 4);
  if (y2 && y2 !== "9999") return y2;
  return row.label.replace(/^Período\s+/i, "P. ");
}

function membersCount(row: PeriodoInfo): number {
  if (usesMembersMetric.value) return row.count;
  return row.secondaryCount ?? 0;
}

function votesCount(row: PeriodoInfo): number {
  if (usesMembersMetric.value) return row.secondaryCount ?? 0;
  return row.count;
}

const chartDescription = computed(() => {
  const shortcuts =
    "Clic = uno · Ctrl/⌘+clic = sumar · Shift+clic = rango.";
  if (hasDualMetrics.value) {
    return `Barras por año: ${membersNoun.value} y ${votesNoun.value} de cada período. ${shortcuts}`;
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
  return pointerMods.value;
}

function barStyle(isOn: boolean, kind: "members" | "votes") {
  const p = palette.value;
  if (kind === "members") {
    return {
      color: isOn
        ? p.isDark
          ? "rgba(45, 212, 191, 0.85)"
          : "rgba(13, 148, 136, 0.85)"
        : p.isDark
          ? "rgba(75, 85, 99, 0.45)"
          : "rgba(203, 213, 225, 0.85)",
      borderRadius: [3, 3, 0, 0],
    };
  }
  return {
    color: isOn
      ? p.isDark
        ? "rgba(148, 163, 184, 0.75)"
        : "rgba(100, 116, 139, 0.7)"
      : p.isDark
        ? "rgba(75, 85, 99, 0.35)"
        : "rgba(226, 232, 240, 0.95)",
    borderRadius: [3, 3, 0, 0],
  };
}

/** Tooltip Vue propio: el de ECharts no dispara bien al hover en este setup. */
type HoverTip = {
  x: number;
  y: number;
  label: string;
  year: string;
  seriesName: string;
  value: number;
  noun: string;
  explain: string;
  otherLabel: string | null;
  range: string;
  active: boolean;
};

const hoverTip = ref<HoverTip | null>(null);
const chartWrap = ref<HTMLElement | null>(null);

function onChartMouseOver(params: any) {
  const d = params?.data;
  if (!d?.key || params?.componentType !== "series") {
    return;
  }
  const wrap = chartWrap.value;
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const ev = params.event?.event as MouseEvent | undefined;
  const x = ev ? ev.clientX - rect.left : Number(params.event?.offsetX || 0);
  const y = ev ? ev.clientY - rect.top : Number(params.event?.offsetY || 0);

  const membersName = capitalizeNoun(membersNoun.value);
  const isMembers = params.seriesName === membersName;
  const noun = isMembers
    ? d.membersNoun || membersNoun.value
    : d.votesNoun || votesNoun.value;
  const year = String(d.minFecha || "").slice(0, 4);
  const onlyThis =
    !allSelected.value &&
    selectedSet.value.size === 1 &&
    selectedSet.value.has(String(d.key));

  hoverTip.value = {
    x,
    y,
    label: d.label || params.name || "",
    year: year && year !== "0000" ? year : "",
    seriesName: String(params.seriesName || ""),
    value: Number(params.value ?? d.value ?? 0),
    noun,
    explain: isMembers
      ? `Barra de ${noun}: integrantes con mandato en este período`
      : `Barra de ${noun}: votaciones registradas en este período`,
    otherLabel: hasDualMetrics.value
      ? isMembers
        ? `${d.votes ?? 0} ${d.votesNoun || votesNoun.value}`
        : `${d.members ?? 0} ${d.membersNoun || membersNoun.value}`
      : null,
    range:
      d.minFecha || d.maxFecha
        ? formatDateRange(d.minFecha, d.maxFecha, "")
        : "",
    active: onlyThis,
  };
}

function onChartGlobalOut() {
  hoverTip.value = null;
}

const hoverTipStyle = computed(() => {
  const tip = hoverTip.value;
  if (!tip) return {};
  const wrap = chartWrap.value;
  const w = wrap?.clientWidth || 640;
  const h = wrap?.clientHeight || 352;
  const tipW = 260;
  const tipH = 150;
  let left = tip.x + 14;
  let top = tip.y - 12;
  if (left + tipW > w - 8) left = tip.x - tipW - 14;
  if (left < 8) left = 8;
  if (top + tipH > h - 8) top = h - tipH - 8;
  if (top < 8) top = 8;
  return {
    left: `${left}px`,
    top: `${top}px`,
  };
});

const option = computed(() => {
  const p = palette.value;
  const rows = timelineRows.value;
  if (!rows.length) return null;

  const selected = selectedSet.value;
  const noneScoped = allSelected.value;
  const dual = hasDualMetrics.value;

  const yearFreq = new Map<string, number>();
  for (const row of rows) {
    const y = yearOf(row);
    yearFreq.set(y, (yearFreq.get(y) || 0) + 1);
  }

  const categories = rows.map((row) => {
    const y = yearOf(row);
    if ((yearFreq.get(y) || 0) > 1) {
      return `${y} · P.${row.key}`;
    }
    return y;
  });

  const pointMeta = (row: PeriodoInfo) => ({
    key: row.key,
    label: row.label,
    minFecha: row.minFecha,
    maxFecha: row.maxFecha,
    members: membersCount(row),
    votes: votesCount(row),
    membersNoun: membersNoun.value,
    votesNoun: votesNoun.value,
  });

  const membersData = rows.map((row) => {
    const isOn = noneScoped || selected.has(row.key);
    return {
      value: membersCount(row),
      ...pointMeta(row),
      itemStyle: barStyle(isOn, "members"),
    };
  });

  const votesData = rows.map((row) => {
    const isOn = noneScoped || selected.has(row.key);
    return {
      value: votesCount(row),
      ...pointMeta(row),
      itemStyle: barStyle(isOn, "votes"),
    };
  });

  const maxMembers = Math.max(1, ...membersData.map((d) => d.value));
  const maxVotes = Math.max(1, ...votesData.map((d) => d.value));

  const membersName = capitalizeNoun(membersNoun.value);
  const votesName = capitalizeNoun(votesNoun.value);

  return {
    backgroundColor: "transparent",
    textStyle: { color: p.text, fontFamily: "inherit" },
    animationDuration: 200,
    legend: {
      show: dual,
      top: 0,
      data: dual ? [membersName, votesName] : [votesName],
      textStyle: { color: p.textMuted, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 8,
    },
    grid: {
      left: 8,
      right: dual ? 12 : 8,
      top: dual ? 36 : 16,
      bottom: rows.length > 16 ? 48 : 8,
      containLabel: true,
    },
    // Tooltip nativo desactivado: usamos overlay Vue (más fiable con Vue + tree-shaking).
    tooltip: { show: false },
    dataZoom:
      rows.length > 16
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              filterMode: "none",
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
              moveOnMouseWheel: false,
            },
            {
              type: "slider",
              xAxisIndex: 0,
              height: 18,
              bottom: 4,
              borderColor: p.border,
              backgroundColor: p.splitLine,
              fillerColor: p.isDark
                ? "rgba(45,212,191,0.18)"
                : "rgba(13,148,136,0.15)",
              handleStyle: {
                color: p.presentismo,
                borderColor: p.presentismo,
              },
              textStyle: { color: p.textMuted, fontSize: 10 },
            },
          ]
        : undefined,
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: p.textMuted,
        fontSize: 10,
        hideOverlap: true,
        rotate: rows.length > 12 ? 40 : 0,
      },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      axisPointer: { show: false },
    },
    yAxis: dual
      ? [
          {
            type: "value",
            name: membersName,
            min: 0,
            max: Math.ceil(maxMembers * 1.08),
            minInterval: 1,
            nameTextStyle: { color: p.textMuted, fontSize: 10 },
            axisLabel: { color: p.textMuted, fontSize: 10 },
            splitLine: { lineStyle: { color: p.splitLine } },
            axisLine: { show: false },
            axisPointer: { show: false },
          },
          {
            type: "value",
            name: votesName,
            min: 0,
            max: Math.ceil(maxVotes * 1.08),
            minInterval: 1,
            nameTextStyle: { color: p.textMuted, fontSize: 10 },
            axisLabel: { color: p.textMuted, fontSize: 10 },
            splitLine: { show: false },
            axisLine: { show: false },
            axisPointer: { show: false },
          },
        ]
      : {
          type: "value",
          name: votesName,
          min: 0,
          max: Math.ceil(maxVotes * 1.08),
          minInterval: 1,
          nameTextStyle: { color: p.textMuted, fontSize: 10 },
          axisLabel: { color: p.textMuted, fontSize: 10 },
          splitLine: { lineStyle: { color: p.splitLine } },
          axisLine: { show: false },
          axisPointer: { show: false },
        },
    series: dual
      ? [
          {
            name: membersName,
            type: "bar",
            data: membersData,
            barMaxWidth: 18,
            barGap: "20%",
            itemStyle: {
              color: p.isDark
                ? "rgba(45, 212, 191, 0.85)"
                : "rgba(13, 148, 136, 0.85)",
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 6,
                shadowColor: p.isDark
                  ? "rgba(45,212,191,0.35)"
                  : "rgba(13,148,136,0.25)",
              },
            },
          },
          {
            name: votesName,
            type: "bar",
            yAxisIndex: 1,
            data: votesData,
            barMaxWidth: 18,
            itemStyle: {
              color: p.isDark
                ? "rgba(148, 163, 184, 0.75)"
                : "rgba(100, 116, 139, 0.7)",
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 6,
                shadowColor: p.isDark
                  ? "rgba(148,163,184,0.35)"
                  : "rgba(100,116,139,0.25)",
              },
            },
          },
        ]
      : [
          {
            name: votesName,
            type: "bar",
            data: votesData,
            barMaxWidth: 22,
            itemStyle: {
              color: p.isDark
                ? "rgba(148, 163, 184, 0.75)"
                : "rgba(100, 116, 139, 0.7)",
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 6,
                shadowColor: p.isDark
                  ? "rgba(148,163,184,0.35)"
                  : "rgba(100,116,139,0.25)",
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
    <div
      ref="chartWrap"
      class="relative"
      @mousedown.capture="onPointerDown"
    >
      <ChartsAppChart
        :option="option"
        height="22rem"
        aria-label="Períodos legislativos en el tiempo"
        @click="onClick"
        @mouseover="onChartMouseOver"
        @globalout="onChartGlobalOut"
      />
      <div
        v-if="hoverTip"
        class="pointer-events-none absolute z-20 max-w-[16.5rem] rounded-lg border border-default bg-default/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
        :style="hoverTipStyle"
        role="tooltip"
      >
        <div class="font-semibold text-highlighted">
          {{ hoverTip.label }}
        </div>
        <div v-if="hoverTip.year" class="mt-0.5 text-muted">
          Año {{ hoverTip.year }}
        </div>
        <div class="mt-2 font-medium text-default">
          {{ hoverTip.value }} {{ hoverTip.noun }}
          <span class="font-normal text-muted">
            ({{ hoverTip.seriesName }})
          </span>
        </div>
        <div class="mt-1 text-muted">
          {{ hoverTip.explain }}
        </div>
        <div v-if="hoverTip.otherLabel" class="mt-1 text-muted">
          También: {{ hoverTip.otherLabel }}
        </div>
        <div v-if="hoverTip.range" class="mt-2 text-muted">
          {{ hoverTip.range }}
        </div>
        <div class="mt-2 border-t border-default pt-1.5 text-[11px] text-muted">
          {{
            hoverTip.active
              ? "Período activo (clic otra vez o Limpiar para salir)"
              : "Clic = este período · Ctrl/⌘ = sumar · Shift = rango"
          }}
        </div>
      </div>
    </div>
  </ChartsChartCard>
</template>
