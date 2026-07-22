<script setup lang="ts">
import { getChamberConfig } from "@/lib/chamber";

const { chamberId } = useChamber();
const bodyName = computed(
  () => getChamberConfig(chamberId.value).bodyName,
);

defineProps<{
  actas: Array<{
    id: string;
    titulo: string;
    fecha: string;
    resultado: string;
    votosAfirmativos: number;
    votosNegativos: number;
    abstenciones: number;
    ausentes: number;
    votos?: unknown[];
  }>;
}>();
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-4">
      <h2 class="text-2xl font-bold text-center">Últimas Votaciones</h2>

      <p class="text-center text-gray-600 dark:text-gray-300">
        Las votaciones más recientes en {{ bodyName }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActaVotingCard v-for="acta in actas" :key="acta.id" :acta="acta" />
      </div>
    </div>

    <div class="flex justify-center">
      <UButton to="/actas" size="lg">
        <UIcon name="lucide:file-text" class="size-4" />
        <span>Ver todas las votaciones</span>
      </UButton>
    </div>
  </div>
</template>
