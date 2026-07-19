<script setup lang="ts">
export type FilterSelectItem = {
  label: string;
  value: string;
};

const model = defineModel<string[]>({ required: true });

const props = withDefaults(
  defineProps<{
    label: string;
    items: FilterSelectItem[];
    placeholder?: string;
  }>(),
  {
    placeholder: undefined,
  },
);

const displayLabel = computed(() => {
  if (!model.value?.length) return props.placeholder ?? props.label;
  const labels = model.value
    .map((v) => props.items.find((item) => item.value === v)?.label ?? v)
    .filter(Boolean);
  return labels.join(", ");
});
</script>

<template>
  <UFormField :label="label" orientation="vertical" class="w-full">
    <ClientOnly>
      <USelectMenu
        v-model="model"
        multiple
        clear
        value-key="value"
        :items="items"
        :placeholder="placeholder ?? label"
        :search-input="{
          placeholder: 'Buscar...',
          icon: 'i-lucide-search',
        }"
        class="w-full"
      />
      <template #fallback>
        <div
          class="flex h-8 w-full items-center truncate rounded-md bg-default px-2.5 text-sm ring ring-inset ring-accented"
        >
          {{ displayLabel }}
        </div>
      </template>
    </ClientOnly>
  </UFormField>
</template>
