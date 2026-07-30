<script setup lang="ts">
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { periodosWithMemberCounts } from "@/utils/periodoLegislativo";

const props = withDefaults(
  defineProps<{
    /** Mostrar el chart temporal debajo del select. */
    showTimeline?: boolean;
    /** Mostrar el select de período. */
    showSelect?: boolean;
    /** Ancho compacto (solo select, sin timeline). */
    compact?: boolean;
    /** Mostrar título + rangos del período seleccionado. */
    showHeading?: boolean;
    /** Limitar el timeline a estas claves (p. ej. períodos del miembro). */
    timelineKeys?: string[] | null;
    /** Override de filas del timeline (p. ej. conteos del miembro). */
    timelinePeriods?: PeriodoInfo[] | null;
    /**
     * Si se pasa, el timeline usa cantidad de integrantes por período
     * (las votaciones quedan como dimensión secundaria).
     */
    timelineMembers?: Array<{
      periodoMandato?: { inicio?: string | null; fin?: string | null } | null;
      ceseFecha?: string | null;
      periodoReal?: { inicio?: string | null; fin?: string | null } | null;
      periodoLegal?: { inicio?: string | null; fin?: string | null } | null;
    }> | null;
    /** Sustantivo del conteo de miembros: "diputados" | "senadores". */
    membersLabel?: string;
    /** Métrica primaria del timeline. Explícita para mantener SSR/hidratación. */
    timelineMode?: "actas" | "members";
  }>(),
  {
    showTimeline: true,
    showSelect: true,
    compact: false,
    showHeading: true,
    timelineKeys: null,
    timelinePeriods: null,
    timelineMembers: null,
    membersLabel: "integrantes",
    timelineMode: "actas",
  },
);

const { isLegislative } = useChamber();
const { selectItems, periodos, pending, periods, setPeriodos } =
  usePeriodoFilter();

/** Clic en el chart: keys ya resueltas (uno / toggle / rango). */
function selectPeriodoFromChart(keys: string[]) {
  setPeriodos(keys);
}

const displayLabel = computed(() => {
  if (!periodos.value?.length) return "Todos los períodos";
  const labels = periodos.value
    .map((v) => selectItems.value.find((item) => item.value === v)?.label ?? v)
    .filter(Boolean);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.length} períodos`;
});

const timelinePeriodsResolved = computed<PeriodoInfo[]>(() => {
  if (props.timelinePeriods != null) return props.timelinePeriods;
  const base = !props.timelineKeys?.length
    ? periods.value
    : (() => {
        const allow = new Set(props.timelineKeys);
        return periods.value.filter((p) => allow.has(p.key));
      })();
  if (props.timelineMode === "members") {
    return periodosWithMemberCounts(base, props.timelineMembers || [], {
      countNoun: props.membersLabel,
      secondaryNoun: "votaciones",
    });
  }
  return base;
});

const showScopeHeading = computed(
  () => props.showHeading && !props.compact && props.showSelect,
);
</script>

<template>
  <div
    v-if="isLegislative"
    :class="
      showTimeline || showScopeHeading
        ? 'flex w-full flex-col gap-3'
        : compact
          ? 'w-full min-w-[12rem] sm:w-56'
          : 'w-full min-w-[14rem] sm:w-72'
    "
  >
    <PeriodoScopeHeading v-if="showScopeHeading" />

    <UFormField
      v-if="showSelect"
      label="Período"
      orientation="vertical"
      :class="
        showTimeline || showScopeHeading ? 'w-full sm:max-w-md' : 'w-full'
      "
    >
      <ClientOnly>
        <USelectMenu
          v-model="periodos"
          multiple
          clear
          value-key="value"
          :items="selectItems"
          :filter-fields="['label', 'description', 'value']"
          placeholder="Todos los períodos"
          :loading="pending"
          :disabled="pending && !selectItems.length"
          :search-input="{
            placeholder: 'Buscar período...',
            icon: 'i-lucide-search',
          }"
          class="w-full"
        />
        <template #fallback>
          <div
            class="flex h-8 w-full items-center truncate rounded-md bg-default px-2.5 text-sm ring ring-inset ring-accented"
          >
            {{ displayLabel }}
          </div>
        </template>
      </ClientOnly>
    </UFormField>

    <ChartsPeriodosTimelineChart
      v-if="showTimeline && timelinePeriodsResolved.length"
      :periods="timelinePeriodsResolved"
      :selected="periodos"
      :members-metric="timelineMode === 'members'"
      @select="selectPeriodoFromChart"
    />
  </div>
</template>
