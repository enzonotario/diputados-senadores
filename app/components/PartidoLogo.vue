<script setup lang="ts">
import { partidoLogoPath } from "@/utils/partidoLogo";

const props = withDefaults(
  defineProps<{
    partido?: string | null;
    /** Clase de tamaño del img (default h-8) */
    imgClass?: string;
  }>(),
  {
    imgClass: "h-8 w-auto max-w-24 object-contain",
  },
);

const src = computed(() => partidoLogoPath(props.partido));
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="partido ? `Logo de ${partido}` : 'Logo de partido'"
    :class="imgClass"
    loading="lazy"
    decoding="async"
  />
</template>
