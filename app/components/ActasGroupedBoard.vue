<script setup lang="ts">
import type { ActasGroup } from "@/utils/groupActasBy";

withDefaults(
  defineProps<{
    groups: ActasGroup[];
    emptyMessage?: string;
  }>(),
  {
    emptyMessage: "No hay actas para mostrar.",
  },
);
</script>

<template>
  <div v-if="groups.length" class="space-y-12">
    <section v-for="group in groups" :key="group.key" class="space-y-4">
      <div
        class="sticky top-[calc(var(--ui-header-height)_-_0.20rem)] z-10 flex items-center justify-between gap-3 flex-wrap py-3 -mx-1 px-1 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 dark:supports-[backdrop-filter]:bg-gray-950/80 border-b border-default"
      >
        <h2 class="text-2xl font-bold">{{ group.label }}</h2>
        <UBadge variant="subtle" color="neutral">
          {{ group.actas.length }}
          {{ group.actas.length === 1 ? "acta" : "actas" }}
        </UBadge>
      </div>

      <div
        v-if="group.actas.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <ActaVotingCard
          v-for="acta in group.actas"
          :key="acta.id"
          :acta="acta"
        />
      </div>
      <p v-else class="text-sm text-toned">Sin actas en este grupo.</p>
    </section>
  </div>

  <UCard v-else>
    <p class="text-sm text-toned">{{ emptyMessage }}</p>
  </UCard>
</template>
