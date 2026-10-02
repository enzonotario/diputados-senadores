<script setup lang="ts">
import type { GastoSenadoSenadorRow } from "@/lib/types";
import {
  SENADO_DIETAS_URL,
  SENADO_ESCALA_SALARIAL_URL,
  senadoSenadorFichaUrl,
} from "@/utils/senadoFuentes";

const props = defineProps<{
  gasto: GastoSenadoSenadorRow | null;
  compact?: boolean;
}>();

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

const cards = computed(() => {
  const g = props.gasto;
  if (!g) return [];
  const ficha = senadoSenadorFichaUrl(g.senadorId);
  return [
    {
      label: "Dieta estimada",
      value: formatMoney(g.dietaBrutoEstimado),
      hint: g.renunciaAlAumento
        ? "Renunció al aumento: el cobro real puede ser menor"
        : "4000 módulos × valor módulo",
      sourceHref: SENADO_DIETAS_URL,
      sourceLabel: "Fuente dietas",
    },
    {
      label: "Personal del despacho",
      value: formatMoney(g.personalBrutoEstimado),
      hint: `${g.personalAgentes} agente${g.personalAgentes === 1 ? "" : "s"} · Total + RC`,
      sourceHref: ficha,
      sourceLabel: "Ficha Senado",
    },
    {
      label: "Total estimado / mes",
      value: formatMoney(g.totalEstimado),
      hint: "Dieta + personal (bruto, sin adicionales personales)",
      sourceHref: SENADO_ESCALA_SALARIAL_URL,
      sourceLabel: "Escala salarial",
    },
  ];
});
</script>

<template>
  <div
    v-if="cards.length"
    class="grid gap-3"
    :class="compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'"
  >
    <UCard
      v-for="card in cards"
      :key="card.label"
      :ui="{ body: compact ? 'p-4!' : undefined }"
    >
      <p class="text-xs text-muted">{{ card.label }}</p>
      <p class="text-xl font-semibold tabular-nums">{{ card.value }}</p>
      <p class="text-xs text-muted mt-1">
        {{ card.hint }}
        <template v-if="card.sourceHref">
          ·
          <a
            :href="card.sourceHref"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-highlighted"
            @click.stop
          >
            {{ card.sourceLabel }}
          </a>
        </template>
      </p>
    </UCard>
  </div>
</template>
