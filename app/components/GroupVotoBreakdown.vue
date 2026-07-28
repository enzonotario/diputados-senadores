<script setup lang="ts">
import { normalizeVotoTipo } from "@/utils/votoTipo";

const props = defineProps<{
  members: Array<{ tipoVoto?: string | null }>;
}>();

const tallies = computed(() => {
  let votosAfirmativos = 0;
  let votosNegativos = 0;
  let abstenciones = 0;
  let ausentes = 0;

  for (const m of props.members) {
    switch (normalizeVotoTipo(m.tipoVoto)) {
      case "afirmativo":
        votosAfirmativos++;
        break;
      case "negativo":
        votosNegativos++;
        break;
      case "abstencion":
        abstenciones++;
        break;
      default:
        ausentes++;
        break;
    }
  }

  return { votosAfirmativos, votosNegativos, abstenciones, ausentes };
});

const total = computed(
  () =>
    tallies.value.votosAfirmativos +
    tallies.value.votosNegativos +
    tallies.value.abstenciones +
    tallies.value.ausentes,
);

/** Tipo de voto con más miembros en el grupo (para resaltar la barra). */
const predominant = computed(() => {
  const t = tallies.value;
  const entries: Array<[string, number]> = [
    ["afirmativo", t.votosAfirmativos],
    ["negativo", t.votosNegativos],
    ["abstencion", t.abstenciones],
    ["ausente", t.ausentes],
  ];
  let best = entries[0]!;
  for (const entry of entries) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[1] > 0 ? best[0] : "";
});

function pct(n: number) {
  if (!total.value) return "0";
  return ((n / total.value) * 100).toFixed(0);
}
</script>

<template>
  <div v-if="total" class="flex flex-col justify-end flex-1 gap-3">
    <div class="grid grid-cols-4 gap-2 px-2 text-xs text-center">
      <div
        class="flex flex-col items-center justify-center text-teal-800 dark:text-teal-300"
      >
        <span>A favor</span>
        <span
          >{{ pct(tallies.votosAfirmativos) }}% ({{
            tallies.votosAfirmativos
          }})</span
        >
      </div>
      <div
        class="flex flex-col items-center justify-center text-red-800 dark:text-red-300"
      >
        <span>En contra</span>
        <span
          >{{ pct(tallies.votosNegativos) }}% ({{
            tallies.votosNegativos
          }})</span
        >
      </div>
      <div
        class="flex flex-col items-center justify-center text-blue-800 dark:text-blue-300"
      >
        <span>Abstenciones</span>
        <span>{{ pct(tallies.abstenciones) }}% ({{ tallies.abstenciones }})</span>
      </div>
      <div
        class="flex flex-col items-center justify-center text-yellow-800 dark:text-yellow-300"
      >
        <span>Ausentes</span>
        <span>{{ pct(tallies.ausentes) }}% ({{ tallies.ausentes }})</span>
      </div>
    </div>

    <VotacionesProgress
      :acta="tallies"
      :resultado="predominant"
    />
  </div>
</template>
