<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Link «Ver más» en el header (alternativa al slot #actions). */
    moreTo?: string;
  }>(),
  {
    description: undefined,
    moreTo: undefined,
  },
);
</script>

<template>
  <UCard :ui="{ body: 'space-y-3' }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <h3 class="text-base font-semibold text-highlighted">{{ title }}</h3>
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
