<script setup lang="ts">
import type { DiputadosGroup } from "@/utils/groupDiputadosBy";
import { averagePresentismo } from "@/utils/presentismo";

const props = withDefaults(
  defineProps<{
    group: DiputadosGroup;
    /** Header con TipoVotoMap vs título de texto */
    kind?: "resultado" | "default";
    /** Barra superior de color (ej. color de bloque) */
    accentColor?: string;
    showVotoHalo?: boolean;
    avatarGridClass?: string;
    /** Si se define, el título del grupo enlaza a esta ruta */
    titleTo?: string | null;
    /** Mostrar presentismo promedio de los miembros */
    showPresentismo?: boolean;
  }>(),
  {
    kind: "default",
    showVotoHalo: false,
    titleTo: null,
    showPresentismo: false,
  },
);

const presentismo = computed(() =>
  props.showPresentismo ? averagePresentismo(props.group.diputados) : null,
);
</script>

<template>
  <UCard class="break-inside-avoid overflow-hidden" :ui="{ body: 'p-0!' }">
    <div
      v-if="accentColor"
      class="h-2"
      :style="{ backgroundColor: accentColor }"
    />

    <div class="space-y-4 p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <TipoVotoLabel v-if="kind === 'resultado'" :tipo="group.key" />
          <NuxtLink
            v-else-if="titleTo"
            :to="titleTo"
            class="text-lg font-semibold truncate block hover:underline underline-offset-2"
          >
            {{ group.label }}
          </NuxtLink>
          <h3 v-else class="text-lg font-semibold truncate">
            {{ group.label }}
          </h3>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UBadge
            v-if="presentismo != null"
            :color="presentismo > 80 ? 'success' : 'error'"
            variant="soft"
            size="sm"
          >
            {{ presentismo }}%
          </UBadge>
          <UBadge variant="subtle" color="neutral">
            {{ group.diputados.length }}
            {{ group.diputados.length === 1 ? "diputado" : "diputados" }}
          </UBadge>
        </div>
      </div>

      <div v-if="presentismo != null" class="space-y-1">
        <div class="flex justify-between text-xs text-toned">
          <span>Asistencia</span>
          <span>{{ presentismo }}%</span>
        </div>
        <UProgress
          :model-value="presentismo"
          size="sm"
          :color="presentismo > 80 ? 'success' : 'error'"
        />
      </div>

      <DiputadoAvatarGrid
        v-if="group.diputados.length"
        :diputados="group.diputados"
        :show-voto-halo="showVotoHalo"
        :grid-class="avatarGridClass"
      />
      <p v-else class="text-sm text-toned">Sin diputados en este grupo.</p>
    </div>
  </UCard>
</template>
