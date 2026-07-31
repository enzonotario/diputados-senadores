<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { bloquePath } from "@/utils/bloque";
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = withDefaults(
  defineProps<{
    diputados: Diputado[];
    bloqueColores: Record<string, string>;
    /** Presidente del período (asiento central). */
    president?: Diputado | null;
    /** Fotos en asientos (desactivar solo si hace falta por peso de red). */
    showPhotos?: boolean;
  }>(),
  { showPhotos: true, president: null },
);

const bloquesCount = computed(
  () => new Set(props.diputados.map((d) => d.bloque)).size,
);

const groupColors = computed(() => ({
  ...props.bloqueColores,
  presidente: getVotoTipoConfig("presidente").color,
}));
</script>

<template>
  <HemicicloChart
    :diputados="diputados"
    :president="president"
    :group-colors="groupColors"
    group-by="bloque"
    member-base-path="/diputados"
    :group-to="(key) => bloquePath(key)"
    :show-photos="showPhotos"
  >
    <template #header>
      <div>
        <h2 class="text-2xl font-bold text-center">
          La Cámara hoy
        </h2>
        <p class="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ diputados.length }} diputados agrupados en
          {{ bloquesCount }} bloques políticos
        </p>
      </div>
    </template>

    <template #footer>
      <div
        class="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
      >
        <UButton to="/diputados" size="lg">
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver todos los diputados</span>
        </UButton>
        <UButton
          to="/diputados/bloques"
          size="lg"
          variant="soft"
          color="neutral"
        >
          <UIcon name="lucide:layout-grid" class="size-4" />
          <span>Explorar por bloque</span>
        </UButton>
      </div>
    </template>
  </HemicicloChart>
</template>
