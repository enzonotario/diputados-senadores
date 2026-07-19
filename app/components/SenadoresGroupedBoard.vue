<script setup lang="ts">
import type { SenadoresGroup } from "@/utils/groupSenadoresBy";

withDefaults(
  defineProps<{
    groups: SenadoresGroup[];
    kind?: "resultado" | "default";
    /** Colores por key de grupo (ej. partido → hex) */
    accentColors?: Record<string, string>;
    showVotoHalo?: boolean;
    emptyMessage?: string;
    /** Layout de columns masonry */
    columnsClass?: string;
    avatarGridClass?: string;
    /** Href opcional por grupo (ej. página de partido) */
    groupTo?: (group: SenadoresGroup) => string | null | undefined;
    /** Mostrar presentismo promedio en cada card */
    showPresentismo?: boolean;
  }>(),
  {
    kind: "default",
    showVotoHalo: false,
    emptyMessage: "No hay senadores para mostrar.",
    columnsClass: "columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4",
    showPresentismo: false,
  },
);
</script>

<template>
  <div v-if="groups.length" :class="columnsClass">
    <SenadoresGroupCard
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
