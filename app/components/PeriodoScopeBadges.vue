<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: "xs" | "sm" | "md";
  }>(),
  {
    size: "sm",
  },
);

const { isLegislative, periodosBadgeLabels, isTodos } = usePeriodoFilter();
</script>

<template>
  <div
    v-if="isLegislative && periodosBadgeLabels.length"
    class="inline-flex flex-wrap items-center gap-1.5"
  >
    <UBadge
      v-for="label in periodosBadgeLabels"
      :key="label"
      :label="label"
      :size="size"
      :color="isTodos ? 'neutral' : 'primary'"
      :variant="isTodos ? 'subtle' : 'soft'"
    />
  </div>
</template>
