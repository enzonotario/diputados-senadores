<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { chamber, otherChamber, otherChamberUrl } = useChamber();

const exploreItems = computed<NavigationMenuItem[]>(() => [
  { label: "Inicio", to: "/" },
  { label: "Votaciones", to: "/actas" },
  {
    label: chamber.value.membersLabel,
    to: chamber.value.membersPath,
  },
  {
    label: chamber.value.groupsLabel,
    to: chamber.value.groupsPath,
  },
]);

const sourceItems = computed<NavigationMenuItem[]>(() => [
  {
    label: chamber.value.officialLabel,
    to: chamber.value.officialUrl,
    target: "_blank",
    external: true,
  },
  {
    label: "argentinadatos.com",
    to: "https://argentinadatos.com/",
    target: "_blank",
    external: true,
  },
  {
    label: otherChamber.value.brand,
    to: otherChamberUrl.value,
    target: "_blank",
    external: true,
  },
]);
</script>

<template>
  <UFooter
    :ui="{
      root: 'mt-auto border-t border-default bg-default',
      top: 'border-b border-default',
      bottom: 'py-5',
      container: 'page-container',
    }"
  >
    <template #top>
      <div
        class="page-container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8"
      >
        <div class="space-y-4 lg:col-span-5">
          <AppBrand />
          <p class="text-sm text-muted max-w-sm leading-relaxed">
            Datos abiertos del Congreso: mirá votaciones, votos y
            {{ chamber.groupsLabel.toLowerCase() }} de
            {{ chamber.bodyName }}.
          </p>
          <UButton
            :to="chamber.githubUrl"
            target="_blank"
            external
            color="neutral"
            variant="soft"
            icon="i-lucide-github"
            size="sm"
          >
            Reportar un error
          </UButton>
        </div>

        <div class="space-y-3 lg:col-span-3 lg:col-start-7">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
            Explorar
          </h2>
          <UNavigationMenu
            :items="exploreItems"
            orientation="vertical"
            variant="link"
            :ui="{
              link: 'text-sm text-toned hover:text-highlighted',
            }"
          />
        </div>

        <div class="space-y-3 lg:col-span-3">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
            Fuentes y más
          </h2>
          <UNavigationMenu
            :items="sourceItems"
            orientation="vertical"
            variant="link"
            :ui="{
              link: 'text-sm text-toned hover:text-highlighted',
            }"
          />
        </div>
      </div>
    </template>

    <template #left>
      <p class="text-xs text-muted text-center md:text-left">
        Datos públicos de
        <a
          :href="chamber.officialUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-2 hover:underline text-toned"
        >
          {{ chamber.officialLabel }}
        </a>
        · Publicados por
        <a
          href="https://argentinadatos.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-2 hover:underline text-toned"
        >
          Argentina Datos
        </a>
      </p>
    </template>

    <template #right>
      <div class="flex items-center gap-1">
        <UButton
          :to="otherChamberUrl"
          target="_blank"
          external
          color="neutral"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-external-link"
          :aria-label="`Abrir ${otherChamber.siteName}`"
        >
          {{ otherChamber.brand }}
        </UButton>
        <UButton
          :to="chamber.githubUrl"
          target="_blank"
          external
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-github"
          aria-label="GitHub"
        />
      </div>
    </template>
  </UFooter>
</template>
