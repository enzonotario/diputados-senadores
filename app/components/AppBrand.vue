<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Mostrar logo de la cámara. */
    logo?: boolean;
    /** Tamaño del logo (navbar vs hero). */
    size?: "sm" | "lg";
    /** Mostrar texto brand.argentinadatos.com junto al logo. */
    showText?: boolean;
  }>(),
  {
    logo: true,
    size: "sm",
    showText: true,
  },
);

const { chamber } = useChamber();

const logoClass = computed(() =>
  props.size === "lg" ? "h-28 w-auto sm:h-36 md:h-44" : "h-8 w-auto sm:h-9",
);

const showLogo = computed(
  () => props.logo && Boolean(chamber.value.logoSrc),
);
</script>

<template>
  <NuxtLink
    to="/"
    class="flex items-center gap-2 font-semibold shrink-0 min-w-0"
    :aria-label="`${chamber.siteName} — inicio`"
  >
    <span v-if="showLogo" class="relative shrink-0">
      <img
        :src="chamber.logoSrc"
        :alt="chamber.siteName"
        :class="['object-contain dark:hidden', logoClass]"
        width="180"
        height="180"
        decoding="async"
      />
      <img
        :src="chamber.logoSrcDark"
        :alt="chamber.siteName"
        :class="['hidden object-contain dark:block', logoClass]"
        width="180"
        height="180"
        decoding="async"
      />
    </span>
    <div v-if="showText" class="truncate">
      <span class="text-xs sm:text-base">{{ chamber.brand }}</span>
      <span class="text-xs sm:text-base text-muted">.argentinadatos.com</span>
    </div>
  </NuxtLink>
</template>
