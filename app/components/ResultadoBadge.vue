<script setup lang="ts">
import { normalizeResultado } from "@/utils/votoTipo";

const props = defineProps<{
  resultado?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
}>();

const normalized = computed(() => normalizeResultado(props.resultado));

const color = computed(() => {
  if (normalized.value === "afirmativo") return "success";
  if (normalized.value === "negativo") return "error";
  return "neutral";
});

const label = computed(() => {
  if (normalized.value === "—") return "—";
  if (normalized.value === "afirmativo") return "Aprobada";
  if (normalized.value === "negativo") return "Rechazada";
  if (normalized.value === "cancelada") return "Cancelada";
  if (normalized.value === "empate") return "Empate";
  return (
    normalized.value.charAt(0).toUpperCase() + normalized.value.slice(1)
  );
});
</script>

<template>
  <UBadge :color="color" :size="size || 'md'" variant="soft">
    {{ label }}
  </UBadge>
</template>
