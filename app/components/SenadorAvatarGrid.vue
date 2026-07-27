<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { sortByVotoTipo } from "@/utils/votoTipo";

const props = withDefaults(
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

/** Con halo de voto, agrupar visualmente por tipo (a favor → … → ausente). */
const orderedSenadores = computed(() =>
  props.showVotoHalo
    ? sortByVotoTipo(props.senadores)
    : props.senadores,
);
</script>

<template>
  <div :class="gridClass">
    <SenadorAvatarLink
      v-for="d in orderedSenadores"
      :key="d.id"
      :senador="d"
      :label-mode="labelMode"
      :size="size"
      :show-voto-halo="showVotoHalo"
    />
  </div>
</template>
