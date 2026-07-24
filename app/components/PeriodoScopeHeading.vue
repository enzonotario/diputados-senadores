<script setup lang="ts">
const { isLegislative, periodosScopeTitle, periodosScopeDetails } =
  usePeriodoFilter();
</script>

<template>
  <div v-if="isLegislative" class="space-y-2 min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-lg font-semibold text-highlighted">
        {{ periodosScopeTitle }}
      </h2>
      <PeriodoScopeBadges />
    </div>

    <ul
      v-if="periodosScopeDetails.length"
      class="space-y-1 text-sm text-muted"
    >
      <li
        v-for="item in periodosScopeDetails"
        :key="item.key"
        class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
      >
        <span
          v-if="periodosScopeDetails.length > 1"
          class="font-medium text-toned"
        >
          {{ item.label }}
        </span>
        <span v-if="item.range">{{ item.range }}</span>
        <span v-if="item.count != null" class="opacity-80">
          · {{ item.count.toLocaleString("es-AR") }}
          {{ item.count === 1 ? "votación" : "votaciones" }}
        </span>
      </li>
    </ul>
  </div>
</template>
