<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: "xs" | "sm" | "md";
    /** Labels fijos para vistas que no siguen el filtro global (p. ej. Home). */
    labels?: string[];
  }>(),
  {
    size: "sm",
    labels: undefined,
  },
);

const { isLegislative, periodosBadgeLabels, isTodos } = usePeriodoFilter();
const resolvedLabels = computed(
  () => props.labels ?? periodosBadgeLabels.value,
);
const resolvedIsTodos = computed(() => props.labels == null && isTodos.value);
</script>

<template>
  <div
    v-if="isLegislative && resolvedLabels.length"
    class="inline-flex flex-wrap items-center gap-1.5"
  >
    <UBadge
      v-for="label in resolvedLabels"
      :key="label"
      :label="label"
      :size="size"
      :color="resolvedIsTodos ? 'neutral' : 'primary'"
      :variant="resolvedIsTodos ? 'subtle' : 'soft'"
    />
  </div>
</template>
