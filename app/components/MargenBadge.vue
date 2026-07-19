<script setup lang="ts">
import {
  getVoteMargin,
  type VoteMarginLevel,
} from "@/utils/voteMargin";

const props = defineProps<{
  afirmativos?: number | null;
  negativos?: number | null;
  /** Mostrar "N votos" bajo la etiqueta. */
  showVotes?: boolean;
}>();

const margin = computed(() =>
  getVoteMargin(props.afirmativos, props.negativos),
);

const color = computed(() => {
  const map: Record<VoteMarginLevel, "error" | "warning" | "info" | "success" | "neutral"> = {
    empate: "error",
    ajustada: "warning",
    comoda: "info",
    amplia: "success",
    unanime: "neutral",
  };
  return margin.value.level ? map[margin.value.level] : "neutral";
});
</script>

<template>
  <div
    v-if="margin.level"
    class="inline-flex flex-col items-start gap-0.5"
    :title="`${margin.label}: diferencia de ${margin.votes} voto${margin.votes === 1 ? '' : 's'} (${Math.round((margin.share || 0) * 100)}% del sí/no)`"
  >
    <UBadge :color="color" variant="soft">
      {{ margin.label }}
    </UBadge>
    <span
      v-if="showVotes !== false"
      class="text-xs text-muted tabular-nums"
    >
      {{ margin.votes }}
      {{ margin.votes === 1 ? "voto" : "votos" }}
    </span>
  </div>
  <span v-else class="text-muted">—</span>
</template>
