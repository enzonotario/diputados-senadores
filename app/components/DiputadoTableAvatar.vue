<script setup lang="ts">
withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string | null;
    size?: "xs" | "sm" | "md" | "lg";
  }>(),
  {
    size: "md",
  },
);
</script>

<template>
  <UAvatar
    :src="src || '/placeholder-user.jpg'"
    :alt="alt || ''"
    :size="size"
    loading="lazy"
    decoding="async"
  />
</template>
