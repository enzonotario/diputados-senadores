<script setup lang="ts">
import type { SenadoFuenteLink } from "@/utils/senadoFuentes";

withDefaults(
  defineProps<{
    links: SenadoFuenteLink[];
    title?: string;
    compact?: boolean;
  }>(),
  {
    title: "Fuentes",
    compact: false,
  },
);
</script>

<template>
  <div
    v-if="links.length"
    class="space-y-1.5"
    :class="compact ? 'text-xs' : 'text-sm'"
  >
    <p class="font-medium text-toned">{{ title }}</p>
    <ul
      class="flex flex-wrap gap-x-3 gap-y-1 text-muted"
      :class="compact ? '' : ''"
    >
      <li v-for="link in links" :key="link.href + link.label">
        <a
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-2 hover:text-highlighted"
        >
          {{ link.label }}
        </a>
      </li>
    </ul>
  </div>
</template>
