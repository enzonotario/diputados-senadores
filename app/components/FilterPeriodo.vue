<script setup lang="ts">
import type { PeriodoInfo } from "@/utils/periodoLegislativo";

const props = withDefaults(
  defineProps<{
    /** Mostrar el chart temporal debajo del select. */
    showTimeline?: boolean;
    /** Ancho compacto (solo select, sin timeline). */
    compact?: boolean;
    /** Mostrar título + rangos del período seleccionado. */
    showHeading?: boolean;
    /** Limitar el timeline a estas claves (p. ej. períodos del miembro). */
    timelineKeys?: string[] | null;
    /** Override de filas del timeline (p. ej. conteos del miembro). */
    timelinePeriods?: PeriodoInfo[] | null;
  }>(),
  {
    showTimeline: true,
    compact: false,
    showHeading: true,
    timelineKeys: null,
    timelinePeriods: null,
  },
);

const { isLegislative } = useChamber();
const {
  selectItems,
  periodos,
  pending,
  periods,
  togglePeriodo,
} = usePeriodoFilter();

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
  if (!props.timelineKeys?.length) return periods.value;
  const allow = new Set(props.timelineKeys);
  return periods.value.filter((p) => allow.has(p.key));
});

const showScopeHeading = computed(
  () => props.showHeading && !props.compact,
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
      label="Período"
      orientation="vertical"
      :class="showTimeline || showScopeHeading ? 'w-full sm:max-w-md' : 'w-full'"
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
      @toggle="togglePeriodo"
    />
  </div>
</template>
