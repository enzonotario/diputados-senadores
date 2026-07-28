<script setup lang="ts">
import type { Acta } from "@/lib/types";
import { actaVoteTotal } from "@/lib/payload-slim";
import { normalizeVotoTipo } from "@/utils/votoTipo";

/** Compatible con Acta de diputados o senadores */
const props = defineProps<{
  acta: Pick<
    Acta,
    | "votosAfirmativos"
    | "votosNegativos"
    | "abstenciones"
    | "ausentes"
    | "votos"
  > & { votos?: unknown[] };
  /** Tipo a resaltar con color fuerte (resultado del acta o predominante del grupo). */
  resultado: string;
}>();

const highlight = computed(() => normalizeVotoTipo(props.resultado));

const total = computed(() => actaVoteTotal(props.acta));
const pct = computed(() => {
  const t = total.value || 1;
  return {
    afirmativos: (props.acta.votosAfirmativos / t) * 100,
    negativos: (props.acta.votosNegativos / t) * 100,
    abstenciones: (props.acta.abstenciones / t) * 100,
    ausentes: (props.acta.ausentes / t) * 100,
  };
});
</script>

<template>
  <div class="w-full flex flex-row">
    <div
      class="h-2"
      :style="{ width: `${pct.afirmativos}%` }"
      :class="
        highlight === 'afirmativo'
          ? 'bg-teal-500 dark:bg-teal-400'
          : 'bg-teal-100 dark:bg-teal-950'
      "
    />
    <div
      class="h-2"
      :style="{ width: `${pct.negativos}%` }"
      :class="
        highlight === 'negativo'
          ? 'bg-red-500 dark:bg-red-400'
          : 'bg-red-100 dark:bg-red-950'
      "
    />
    <div
      class="h-2"
      :style="{ width: `${pct.abstenciones}%` }"
      :class="
        highlight === 'abstencion'
          ? 'bg-blue-500 dark:bg-blue-400'
          : 'bg-blue-100 dark:bg-blue-950'
      "
    />
    <div
      class="h-2"
      :style="{ width: `${pct.ausentes}%` }"
      :class="
        highlight === 'ausente'
          ? 'bg-yellow-500 dark:bg-yellow-400'
          : 'bg-yellow-100 dark:bg-yellow-900'
      "
    />
  </div>
</template>
