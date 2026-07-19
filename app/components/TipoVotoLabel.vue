<script setup lang="ts">
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = defineProps<{
  tipo?: string | null;
}>();

const config = computed(() => getVotoTipoConfig(props.tipo));
</script>

<template>
  <div class="flex items-center gap-2">
    <ClientOnly>
      <UIcon :name="config.icon" class="size-5" :class="config.iconClass" />
      <template #fallback>
        <span
          class="inline-block size-5 rounded-full border-2"
          :class="config.iconClass"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
    <span class="text-sm font-medium" :class="config.textClass">{{
      config.label
    }}</span>
  </div>
</template>
