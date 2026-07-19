<script setup lang="ts">
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");

function toggle() {
  colorMode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    size="sm"
    :aria-label="isDark ? 'Activar modo claro' : 'Activar modo oscuro'"
    @click="toggle"
  >
    <UIcon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-4" />
  </UButton>
</template>
