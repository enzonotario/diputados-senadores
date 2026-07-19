<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    /** Padding horizontal de la zona de filtros (default: px-4 sm:px-6) */
    filtersClass?: string;
    /** Si false, no aplica overflow-x-auto (p. ej. sticky vertical en el contenido) */
    scrollable?: boolean;
  }>(),
  {
    filtersClass: "px-4 sm:px-6 pt-4 pb-3",
    scrollable: true,
  },
);
</script>

<template>
  <UCard
    :ui="{
      root: [
        'min-w-0 w-full',
        scrollable ? undefined : 'overflow-visible',
      ]
        .filter(Boolean)
        .join(' '),
      body: 'p-0!',
    }"
  >
    <!-- Always provide #header when needed; v-if on named slots breaks SSR hydration -->
    <template v-if="title || $slots.header" #header>
      <slot name="header">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
      </slot>
    </template>

    <div v-if="$slots.filters" :class="filtersClass">
      <slot name="filters" />
    </div>

    <div
      :class="[
        'min-w-0',
        scrollable ? 'overflow-x-auto' : '',
        $slots.filters ? 'border-t border-default' : '',
      ]"
    >
      <slot />
    </div>
  </UCard>
</template>
