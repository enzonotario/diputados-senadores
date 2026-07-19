<script setup lang="ts">
withDefaults(
  defineProps<{
    option: Record<string, any>;
    height?: string;
    /** Accesible: resumen del gráfico */
    ariaLabel?: string;
  }>(),
  {
    height: "20rem",
    ariaLabel: "Gráfico interactivo",
  },
);
</script>

<template>
  <ClientOnly>
    <VChart
      class="w-full min-h-0"
      :style="{ height }"
      :option="option"
      :autoresize="{ throttle: 50 }"
      :init-options="{ renderer: 'canvas' }"
      role="img"
      :aria-label="ariaLabel"
    />
    <template #fallback>
      <div
        class="w-full animate-pulse rounded-lg bg-elevated"
        :style="{ height }"
        aria-hidden="true"
      />
    </template>
  </ClientOnly>
</template>
