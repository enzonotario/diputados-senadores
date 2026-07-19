<script setup lang="ts">
import type { DiputadosGroup } from "@/utils/groupDiputadosBy";

withDefaults(
  defineProps<{
    groups: DiputadosGroup[];
    kind?: "resultado" | "default";
    /** Colores por key de grupo (ej. bloque → hex) */
    accentColors?: Record<string, string>;
    showVotoHalo?: boolean;
    emptyMessage?: string;
    /** Layout de columns masonry */
    columnsClass?: string;
    avatarGridClass?: string;
    /** Href opcional por grupo (ej. página de bloque) */
    groupTo?: (group: DiputadosGroup) => string | null | undefined;
    /** Mostrar presentismo promedio en cada card */
    showPresentismo?: boolean;
  }>(),
  {
    kind: "default",
    showVotoHalo: false,
    emptyMessage: "No hay diputados para mostrar.",
    columnsClass: "columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4",
    showPresentismo: false,
  },
);
</script>

<template>
  <div v-if="groups.length" :class="columnsClass">
    <DiputadosGroupCard
      v-for="group in groups"
      :key="group.key"
      :group="group"
      :kind="kind"
      :accent-color="accentColors?.[group.key]"
      :show-voto-halo="showVotoHalo"
      :avatar-grid-class="avatarGridClass"
      :title-to="groupTo?.(group)"
      :show-presentismo="showPresentismo"
      class="mb-4"
    />
  </div>

  <UCard v-else>
    <p class="text-sm text-toned">{{ emptyMessage }}</p>
  </UCard>
</template>
