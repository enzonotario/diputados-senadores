<script setup lang="ts">
import type { MemberVoteStats } from "@/utils/chartSeries";

defineProps<{
  stats: MemberVoteStats;
}>();
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        class="rounded-lg border border-teal-300! p-3 bg-teal-50 dark:border-teal-700! dark:bg-teal-950"
      >
        <div class="text-3xl font-bold text-teal-600 dark:text-teal-400">
          {{ stats.votosAfirmativos }}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">A favor</div>
      </div>
      <div
        class="rounded-lg border border-red-300! p-3 bg-red-50 dark:border-red-700! dark:bg-red-950"
      >
        <div class="text-3xl font-bold text-red-600 dark:text-red-400">
          {{ stats.votosNegativos }}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">En contra</div>
      </div>
      <div
        class="rounded-lg border border-blue-300! p-3 bg-blue-50 dark:border-blue-700! dark:bg-blue-950"
      >
        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {{ stats.abstenciones }}
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">Abstenciones</div>
      </div>
    </div>

    <div class="grid sm:grid-cols-2 gap-4">
      <div class="rounded-lg border p-3">
        <div class="text-sm text-gray-600 dark:text-gray-300">
          Total Votaciones
        </div>
        <div class="text-2xl font-bold">{{ stats.totalVotaciones }}</div>
      </div>
      <div
        class="rounded-lg border border-gray-300! p-3 bg-gray-50 dark:border-gray-600! dark:bg-gray-950"
      >
        <div class="text-sm text-gray-600 dark:text-gray-300">Ausencias</div>
        <div class="text-2xl font-bold text-gray-700 dark:text-gray-200">
          {{ stats.ausencias }}
        </div>
      </div>
    </div>

    <div>
      <div class="flex justify-between mb-2">
        <span class="text-sm font-medium">Asistencia</span>
        <span class="text-sm font-medium">{{ stats.presentismo }}%</span>
      </div>
      <UProgress :model-value="stats.presentismo" size="sm" color="neutral" />
    </div>
  </div>
</template>
