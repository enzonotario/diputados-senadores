<script setup lang="ts">
import type { Senador } from "@/lib/types";

withDefaults(
  defineProps<{
    senadores: Senador[];
    labelMode?: "apellido" | "nombreCompleto";
    size?: "md" | "lg" | "xl";
    showVotoHalo?: boolean;
    /** Clases del grid (densidad por contexto) */
    gridClass?: string;
  }>(),
  {
    labelMode: "apellido",
    size: "xl",
    showVotoHalo: false,
    gridClass:
      "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-center",
  },
);
</script>

<template>
  <div :class="gridClass">
    <SenadorAvatarLink
      v-for="d in senadores"
      :key="d.id"
      :senador="d"
      :label-mode="labelMode"
      :size="size"
      :show-voto-halo="showVotoHalo"
    />
  </div>
</template>
