<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Link «Ver más» en el header (alternativa al slot #actions). */
    moreTo?: string;
    /** Mostrar badge(s) del período seleccionado junto al título. */
    showPeriodoBadge?: boolean;
  }>(),
  {
    description: undefined,
    moreTo: undefined,
    showPeriodoBadge: true,
  },
);
</script>

<template>
  <UCard :ui="{ body: 'space-y-3' }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base font-semibold text-highlighted">{{ title }}</h3>
          <PeriodoScopeBadges v-if="showPeriodoBadge" size="xs" />
        </div>
        <p v-if="description" class="text-sm text-muted">{{ description }}</p>
      </div>
      <div
        v-if="moreTo || $slots.actions"
        class="shrink-0 flex items-center gap-2"
      >
        <slot name="actions">
          <UButton
            v-if="moreTo"
            :to="moreTo"
            size="sm"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-arrow-right"
          >
            Ver más
          </UButton>
        </slot>
      </div>
    </div>
    <slot />
  </UCard>
</template>
