<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const model = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    items: TabsItem[];
    /** Centrar triggers en sm+ (solo variant pill) */
    center?: boolean;
    variant?: "pill" | "link";
  }>(),
  {
    center: true,
    variant: "pill",
  },
);

const tabsUi = computed(() => {
  const list =
    props.variant === "pill" && props.center
      ? "overflow-x-auto overflow-y-hidden sm:justify-center"
      : "overflow-x-auto overflow-y-hidden";

  return {
    list,
    trigger: "min-w-[max-content] whitespace-nowrap",
  };
});
</script>

<template>
  <UTabs
    v-model="model"
    :content="false"
    :items="items"
    :ui="tabsUi"
    :variant="variant"
    class="w-full"
  />
</template>
