<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { sortByVotoTipo } from "@/utils/votoTipo";

const props = withDefaults(
  defineProps<{
    diputados: Diputado[];
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
const orderedDiputados = computed(() =>
  props.showVotoHalo
    ? sortByVotoTipo(props.diputados)
    : props.diputados,
);
</script>

<template>
  <div :class="gridClass">
    <DiputadoAvatarLink
      v-for="d in orderedDiputados"
      :key="d.id"
      :diputado="d"
      :label-mode="labelMode"
      :size="size"
      :show-voto-halo="showVotoHalo"
    />
  </div>
</template>
