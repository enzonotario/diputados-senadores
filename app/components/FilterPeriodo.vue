<script setup lang="ts">
import type { PeriodoInfo } from "@/utils/periodoLegislativo";
import { periodosWithMemberCounts } from "@/utils/periodoLegislativo";

const props = withDefaults(
  defineProps<{
    /** Mostrar el chart temporal en el panel expandido. */
    showTimeline?: boolean;
    /** Mostrar el select de período. */
    showSelect?: boolean;
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
    showHeading: true,
    timelineKeys: null,
    timelinePeriods: null,
    timelineMembers: null,
    membersLabel: "integrantes",
    timelineMode: "actas",
  },
);

const { isLegislative } = useChamber();
const {
  selectItems,
  periodos,
  pending,
  periods,
  setPeriodos,
  defaultKey,
  isVigente,
  isTodos,
} = usePeriodoFilter();

/** Panel de edición (select + timeline). Colapsado por defecto. */
const expanded = ref(false);

/** Clic en el chart: keys ya resueltas (uno / toggle / rango). */
function selectPeriodoFromChart(keys: string[]) {
  setPeriodos(keys);
}

function selectVigente() {
  if (defaultKey.value) setPeriodos([defaultKey.value]);
}

function selectTodos() {
  setPeriodos([]);
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
</script>

<template>
  <div v-if="isLegislative" class="flex w-full flex-col gap-3">
    <div
      class="flex flex-col gap-3 rounded-lg border border-default bg-default px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex min-w-0 items-start gap-3">
        <UIcon
          name="i-lucide-calendar-range"
          class="mt-1 size-5 shrink-0 text-muted"
        />
        <PeriodoScopeHeading v-if="showHeading" />
        <div v-else class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="font-medium text-highlighted">Período</span>
          <PeriodoScopeBadges />
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <UBadge
          v-if="isVigente"
          label="Vigente"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-dot"
        />
        <UButton
          :label="expanded ? 'Listo' : 'Cambiar período'"
          :trailing-icon="
            expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
          "
          :color="expanded ? 'primary' : 'neutral'"
          :variant="expanded ? 'soft' : 'outline'"
          size="sm"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        />
      </div>
    </div>

    <template v-if="expanded">
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <UFormField
          v-if="showSelect"
          label="Períodos"
          hint="Podés elegir varios"
          orientation="vertical"
          class="w-full sm:max-w-md"
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

        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="defaultKey && !isVigente"
            label="Solo vigente"
            icon="i-lucide-circle-dot"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="selectVigente"
          />
          <UButton
            v-if="!isTodos"
            label="Todos los períodos"
            icon="i-lucide-infinity"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="selectTodos"
          />
        </div>
      </div>

      <ChartsPeriodosTimelineChart
        v-if="showTimeline && timelinePeriodsResolved.length"
        :periods="timelinePeriodsResolved"
        :selected="periodos"
        :members-metric="timelineMode === 'members'"
        @select="selectPeriodoFromChart"
      />
    </template>
  </div>
</template>
