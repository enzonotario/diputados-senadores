<script setup lang="ts">
import { CHAMBERS } from "@/lib/chamber";

useChamberSeo({
  title: "Cómo votan en el Congreso",
  description:
    "Elegí Cámara de Diputados o Senado y mirá cómo votan en el Congreso de la Nación Argentina.",
});

const { diputadosUrl, senadoresUrl } = useChamber();

const cards = computed(() => [
  {
    id: "diputados" as const,
    url: diputadosUrl.value,
    cta: "Ir a Diputados",
    config: CHAMBERS.diputados,
  },
  {
    id: "senadores" as const,
    url: senadoresUrl.value,
    cta: "Ir a Senadores",
    config: CHAMBERS.senadores,
  },
]);
</script>

<template>
  <div class="page-container">
    <section
      class="flex flex-col items-center justify-center space-y-4 text-center pt-6 sm:pt-10"
    >
      <AppBrand :logo="false" size="lg" class="justify-center" />
      <h1 class="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
        Votaciones del Congreso
      </h1>
      <p
        class="max-w-[700px] text-lg text-gray-600 dark:text-gray-300 md:text-xl"
      >
        Elegí una cámara para ver cómo votan, quiénes son y cómo se agrupan
      </p>
    </section>

    <section
      class="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto"
      aria-label="Elegir cámara"
    >
      <a
        v-for="item in cards"
        :key="item.id"
        :href="item.url"
        class="group flex flex-col items-center gap-5 rounded-xl border border-default bg-default p-8 text-center transition-colors hover:border-primary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span class="relative shrink-0">
          <img
            :src="item.config.logoSrc"
            :alt="item.config.siteName"
            class="h-24 w-auto sm:h-28 object-contain dark:hidden"
            width="180"
            height="180"
            decoding="async"
          />
          <img
            :src="item.config.logoSrcDark"
            :alt="item.config.siteName"
            class="hidden h-24 w-auto sm:h-28 object-contain dark:block"
            width="180"
            height="180"
            decoding="async"
          />
        </span>
        <div class="space-y-1">
          <h2 class="text-xl font-bold tracking-tight sm:text-2xl">
            {{ item.config.membersLabel }}
          </h2>
          <p class="text-sm text-muted">
            {{ item.config.brand }}.argentinadatos.com
          </p>
        </div>
        <UButton
          :label="item.cta"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="pointer-events-none"
          tabindex="-1"
        />
      </a>
    </section>
  </div>
</template>
