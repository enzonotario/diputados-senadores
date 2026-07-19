<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { partidoPath } from "@/utils/partido";

const props = defineProps<{
  senadores: Senador[];
  partidoColores: Record<string, string>;
}>();

const partidosCount = computed(
  () => new Set(props.senadores.map((d) => d.partido)).size,
);
</script>

<template>
  <HemicicloChart
    :senadores="senadores"
    :group-colors="partidoColores"
    group-by="partido"
    member-base-path="/senadores"
    :group-to="(key) => partidoPath(key)"
  >
    <template #header>
      <div>
        <h2 class="text-2xl font-bold text-center">
          El Senado hoy
        </h2>
        <p class="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ senadores.length }} senadores agrupados en
          {{ partidosCount }} partidos
        </p>
      </div>
    </template>

    <template #footer>
      <div
        class="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
      >
        <UButton to="/senadores" size="lg">
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver todos los senadores</span>
        </UButton>
        <UButton
          to="/senadores/partidos"
          size="lg"
          variant="soft"
          color="neutral"
        >
          <UIcon name="lucide:layout-grid" class="size-4" />
          <span>Explorar por partido</span>
        </UButton>
      </div>
    </template>
  </HemicicloChart>
</template>
