<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    href?: string | null;
    label?: string;
  }>(),
  {
    href: null,
    label: "Ver PDF original",
  },
);
</script>

<template>
  <UButton
    v-if="href"
    :to="href"
    target="_blank"
    external
    color="neutral"
    variant="ghost"
    size="xs"
    icon="i-lucide-file-text"
    :aria-label="label"
    class="shrink-0"
    @click.stop
  />
</template>
