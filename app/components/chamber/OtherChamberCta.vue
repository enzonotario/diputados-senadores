<script setup lang="ts">
const { otherChamber, otherChamberUrl } = useChamber();
</script>

<template>
  <section class="text-center space-y-6 py-4">
    <div class="flex justify-center">
      <span class="relative shrink-0">
        <img
          :src="otherChamber.logoSrc"
          :alt="otherChamber.siteName"
          class="h-20 w-auto sm:h-24 object-contain dark:hidden"
          width="180"
          height="180"
          decoding="async"
        />
        <img
          :src="otherChamber.logoSrcDark"
          :alt="otherChamber.siteName"
          class="hidden h-20 w-auto sm:h-24 object-contain dark:block"
          width="180"
          height="180"
          decoding="async"
        />
      </span>
    </div>

    <div class="space-y-2">
      <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
        También explorá {{ otherChamber.siteName }}
      </h2>
      <p class="text-muted max-w-xl mx-auto text-sm sm:text-base">
        También podés ver cómo votan, quiénes son y cómo se agrupan
        en {{ otherChamber.bodyName }}.
      </p>
    </div>

    <UButton
      :to="otherChamberUrl"
      target="_blank"
      external
      size="lg"
      trailing-icon="i-lucide-external-link"
      :aria-label="`Abrir ${otherChamber.siteName} en una pestaña nueva`"
    >
      Ir a {{ otherChamber.brand }}.argentinadatos.com
    </UButton>
  </section>
</template>
