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

/** Caja con aspect 4:3 fija → evita CLS (PageSpeed: “imagen sin tamaño”). */
const frameClass = computed(() =>
  props.size === "lg"
    ? "relative block h-28 w-[9.333rem] sm:h-36 sm:w-48 md:h-44 md:w-[14.667rem] shrink-0"
    : "relative block h-8 w-[2.667rem] sm:h-9 sm:w-12 shrink-0",
);

const imgClass = "absolute inset-0 h-full w-full object-contain";

/** Intrinsic del asset 1x (200×150 diputados / 160×119 senado). */
const logoWidth = computed(() => (props.size === "lg" ? 200 : 96));
const logoHeight = computed(() => (props.size === "lg" ? 150 : 72));

const logoSizes = computed(() =>
  props.size === "lg"
    ? "(min-width: 768px) 235px, (min-width: 640px) 192px, 149px"
    : "36px",
);

const logoSrcset = computed(() => {
  const c = chamber.value;
  if (!c.logoSrc || !c.logoSrc2x) return undefined;
  const w1 = c.id === "senadores" ? 160 : 200;
  const w2 = c.id === "senadores" ? 280 : 360;
  return `${c.logoSrc} ${w1}w, ${c.logoSrc2x} ${w2}w`;
});

const logoSrcsetDark = computed(() => {
  const c = chamber.value;
  if (!c.logoSrcDark || !c.logoSrcDark2x) return undefined;
  const w1 = c.id === "senadores" ? 160 : 200;
  const w2 = c.id === "senadores" ? 280 : 360;
  return `${c.logoSrcDark} ${w1}w, ${c.logoSrcDark2x} ${w2}w`;
});

const showLogo = computed(
  () => props.logo && Boolean(chamber.value.logoSrc),
);

/** LCP en home: priorizar logo claro (auditorías light). */
const isLcp = computed(() => props.size === "lg");

useHead(() => {
  if (!isLcp.value || !showLogo.value || !chamber.value.logoSrc) return {};
  const imagesSrcset = logoSrcset.value;
  return {
    link: [
      {
        rel: "preload",
        as: "image",
        href: chamber.value.logoSrc,
        type: "image/webp",
        ...(imagesSrcset
          ? { imagesrcset: imagesSrcset, imagesizes: logoSizes.value }
          : {}),
        fetchpriority: "high",
      } as Record<string, string>,
    ],
  };
});
</script>

<template>
  <NuxtLink
    to="/"
    class="flex items-center gap-2 font-semibold shrink-0 min-w-0"
    :aria-label="`${chamber.siteName} — inicio`"
  >
    <span v-if="showLogo" :class="frameClass">
      <img
        :src="chamber.logoSrc"
        :srcset="logoSrcset"
        :sizes="logoSrcset ? logoSizes : undefined"
        :alt="chamber.siteName"
        :class="['dark:hidden', imgClass]"
        :width="logoWidth"
        :height="logoHeight"
        decoding="async"
        :loading="isLcp ? 'eager' : 'lazy'"
        :fetchpriority="isLcp ? 'high' : 'low'"
      />
      <img
        :src="chamber.logoSrcDark"
        :srcset="logoSrcsetDark"
        :sizes="logoSrcsetDark ? logoSizes : undefined"
        :alt="chamber.siteName"
        :class="['hidden dark:block', imgClass]"
        :width="logoWidth"
        :height="logoHeight"
        decoding="async"
        loading="lazy"
        fetchpriority="low"
      />
    </span>
    <div v-if="showText" class="truncate">
      <span class="text-xs sm:text-base">{{ chamber.brand }}</span>
      <span class="text-xs sm:text-base text-muted">.argentinadatos.com</span>
    </div>
  </NuxtLink>
</template>
