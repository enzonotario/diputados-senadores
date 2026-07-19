<script setup lang="ts">
import type { Acta } from "@/lib/types";

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
  resultado: string;
}>();

const total = computed(() => props.acta.votos?.length || 0);
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
        resultado === 'afirmativo'
          ? 'bg-teal-500 dark:bg-teal-400'
          : 'bg-teal-100 dark:bg-teal-950'
      "
    />
    <div
      class="h-2"
      :style="{ width: `${pct.negativos}%` }"
      :class="
        resultado === 'negativo'
          ? 'bg-red-500 dark:bg-red-400'
          : 'bg-red-100 dark:bg-red-950'
      "
    />
    <div
      class="h-2 bg-blue-100 dark:bg-blue-950"
      :style="{ width: `${pct.abstenciones}%` }"
    />
    <div
      class="h-2 bg-yellow-100 dark:bg-yellow-900"
      :style="{ width: `${pct.ausentes}%` }"
    />
  </div>
</template>
