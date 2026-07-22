<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { getChamberConfig } from "@/lib/chamber";

const {
  chamber,
  chamberId,
  otherChamber,
  otherChamberUrl,
  isCongreso,
  isLegislative,
  diputadosUrl,
  senadoresUrl,
} = useChamber();

const legislative = computed(() =>
  isLegislative.value ? getChamberConfig(chamberId.value) : null,
);

const exploreItems = computed<NavigationMenuItem[]>(() => {
  if (isCongreso.value || !legislative.value) {
    return [
      { label: "Inicio", to: "/" },
      {
        label: "Diputados",
        to: diputadosUrl.value,
        target: "_blank",
        external: true,
      },
      {
        label: "Senadores",
        to: senadoresUrl.value,
        target: "_blank",
        external: true,
      },
    ];
  }

  const c = legislative.value;
  return [
    { label: "Inicio", to: "/" },
    { label: "Votaciones", to: "/actas" },
    { label: c.membersLabel, to: c.membersPath },
    { label: c.groupsLabel, to: c.groupsPath },
  ];
});

const sourceItems = computed<NavigationMenuItem[]>(() => {
  if (isCongreso.value || !legislative.value) {
    return [
      {
        label: "argentinadatos.com",
        to: "https://argentinadatos.com/",
        target: "_blank",
        external: true,
      },
      {
        label: "diputados.gob.ar",
        to: "https://www.diputados.gob.ar/",
        target: "_blank",
        external: true,
      },
      {
        label: "senadores.gob.ar",
        to: "https://www.senadores.gob.ar/",
        target: "_blank",
        external: true,
      },
    ];
  }

  const c = legislative.value;
  return [
    {
      label: c.officialLabel,
      to: c.officialUrl,
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
  ];
});
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
          <AppBrand :logo="!isCongreso" />
          <p class="text-sm text-muted max-w-sm leading-relaxed">
            <template v-if="isCongreso || !legislative">
              Datos abiertos del Congreso: elegí Diputados o Senadores para
              mirar votaciones, votos y agrupaciones políticas.
            </template>
            <template v-else>
              Datos abiertos del Congreso: mirá votaciones, votos y
              {{ legislative.groupsLabel.toLowerCase() }} de
              {{ legislative.bodyName }}.
            </template>
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
        <template v-if="isCongreso || !legislative">
          Datos públicos del Congreso · Publicados por
          <a
            href="https://argentinadatos.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline-offset-2 hover:underline text-toned"
          >
            Argentina Datos
          </a>
        </template>
        <template v-else>
          Datos públicos de
          <a
            :href="legislative.officialUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="underline-offset-2 hover:underline text-toned"
          >
            {{ legislative.officialLabel }}
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
        </template>
      </p>
    </template>

    <template #right>
      <div class="flex items-center gap-1">
        <template v-if="isCongreso">
          <UButton
            :to="diputadosUrl"
            target="_blank"
            external
            color="neutral"
            variant="ghost"
            size="xs"
            trailing-icon="i-lucide-external-link"
            aria-label="Abrir Diputados"
          >
            diputados
          </UButton>
          <UButton
            :to="senadoresUrl"
            target="_blank"
            external
            color="neutral"
            variant="ghost"
            size="xs"
            trailing-icon="i-lucide-external-link"
            aria-label="Abrir Senadores"
          >
            senadores
          </UButton>
        </template>
        <UButton
          v-else
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
