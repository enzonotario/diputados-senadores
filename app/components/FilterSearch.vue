<script setup lang="ts">
const model = defineModel<string>({ required: true });

withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
  }>(),
  {
    label: "Buscar",
    placeholder: "Buscar...",
  },
);
</script>

<template>
  <UFormField :label="label" orientation="vertical" class="w-full">
    <ClientOnly>
      <UInput
        v-model="model"
        icon="i-lucide-search"
        :placeholder="placeholder"
        class="w-full"
      />
      <template #fallback>
        <div
          class="flex h-8 w-full items-center gap-1.5 truncate rounded-md bg-default px-2.5 text-sm text-muted ring ring-inset ring-accented"
        >
          <UIcon name="i-lucide-search" class="size-4 shrink-0" />
          <span class="truncate">{{ placeholder }}</span>
        </div>
      </template>
    </ClientOnly>
  </UFormField>
</template>
