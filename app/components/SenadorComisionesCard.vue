<script setup lang="ts">
import type { SenadorComisionMeta } from "@/lib/types";
import { comisionPath } from "@/utils/comision";

const props = withDefaults(
  defineProps<{
    comisiones: SenadorComisionMeta[];
    /** Mostrar la tarjeta aunque no haya comisiones (página dedicada). */
    showEmpty?: boolean;
  }>(),
  { showEmpty: false },
);

const visible = computed(
  () => props.showEmpty || props.comisiones.length > 0,
);
</script>

<template>
  <UCard v-if="visible">
    <template #header>
      <div class="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-semibold">Comisiones</h2>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">
            {{ comisiones.length }}
            {{ comisiones.length === 1 ? "comisión" : "comisiones" }}
          </span>
          <UButton
            to="/senadores/comisiones"
            size="xs"
            color="neutral"
            variant="ghost"
            label="Ver todas"
          />
        </div>
      </div>
    </template>

    <p v-if="!comisiones.length" class="text-sm text-muted">
      No hay comisiones registradas para este senador.
    </p>

    <ul v-else class="divide-y divide-default">
      <li
        v-for="c in comisiones"
        :key="`${c.id}-${c.cargo}`"
        class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
      >
        <div class="min-w-0">
          <NuxtLink
            :to="comisionPath(c.id) || '#'"
            class="text-sm font-medium text-highlighted hover:underline"
          >
            {{ c.nombre }}
          </NuxtLink>
          <p class="text-xs text-muted mt-0.5">Comisión {{ c.id }}</p>
        </div>
        <UBadge color="neutral" variant="subtle" class="shrink-0">
          {{ c.cargo }}
        </UBadge>
      </li>
    </ul>
  </UCard>
</template>
