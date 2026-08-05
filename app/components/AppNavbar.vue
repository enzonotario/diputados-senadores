<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { getChamberConfig } from "@/lib/chamber";

const route = useRoute();
const {
  chamberId,
  otherChamber,
  otherChamberUrl,
  isCongreso,
  isLegislative,
} = useChamber();

const legislative = computed(() =>
  isLegislative.value ? getChamberConfig(chamberId.value) : null,
);

function withPeriodo(path: string) {
  const periodo = String(route.query.periodo || "").trim();
  return periodo ? { path, query: { periodo } } : path;
}

const navLinks = computed(() => {
  const c = legislative.value;
  if (!c) return [];

  const path = route.path;
  const groupsActive =
    path.startsWith(c.groupsPath) ||
    path.includes("/bloques") ||
    path.includes("/partidos");
  const membersActive =
    !groupsActive &&
    (path.startsWith(c.membersPath) ||
      path.startsWith("/diputados") ||
      path.startsWith("/senadores"));

  return [
    {
      label: "Inicio",
      to: withPeriodo("/"),
      active: path === "/",
    },
    {
      label: "Votaciones",
      to: withPeriodo("/actas"),
      active: path.startsWith("/actas"),
    },
    {
      label: "Poroteo",
      to: withPeriodo("/poroteo"),
      active: path.startsWith("/poroteo"),
    },
    {
      label: c.membersLabel,
      to: withPeriodo(c.membersPath),
      active: membersActive,
    },
    {
      label: c.groupsLabel,
      to: withPeriodo(c.groupsPath),
      active: groupsActive,
    },
  ];
});

const sidebarItems = computed<NavigationMenuItem[]>(() => {
  if (isCongreso.value || !legislative.value) {
    return [
      {
        label: "Inicio",
        icon: "i-lucide-house",
        to: "/",
        active: true,
      },
    ];
  }

  const c = legislative.value;
  const path = route.path;
  const groupsActive =
    path.startsWith(c.groupsPath) ||
    path.includes("/bloques") ||
    path.includes("/partidos");
  const membersActive =
    !groupsActive &&
    (path.startsWith(c.membersPath) ||
      path.startsWith("/diputados") ||
      path.startsWith("/senadores"));

  return [
    {
      label: "Inicio",
      icon: "i-lucide-house",
      to: "/",
      active: path === "/",
    },
    {
      label: "Votaciones",
      icon: "i-lucide-file-text",
      to: "/actas",
      active: path.startsWith("/actas"),
    },
    {
      label: "Poroteo",
      icon: "i-lucide-pie-chart",
      to: "/poroteo",
      active: path.startsWith("/poroteo"),
    },
    {
      label: c.membersLabel,
      icon: "i-lucide-users",
      to: c.membersPath,
      active: membersActive,
    },
    {
      label: c.groupsLabel,
      icon: "i-lucide-shapes",
      to: c.groupsPath,
      active: groupsActive,
    },
    {
      label: otherChamber.value.membersLabel,
      icon: "i-lucide-external-link",
      to: otherChamberUrl.value,
      target: "_blank",
      external: true,
    },
  ];
});
</script>

<template>
  <!-- Solo slideover en mobile. El panel desktop del theme es
       `hidden lg:flex`; hay que forzar !hidden o reaparece en lg+. -->
  <UDashboardSidebar
    mode="slideover"
    toggle-side="left"
    class="!hidden"
    :ui="{ root: '!hidden' }"
  >
    <template #header>
      <AppBrand :logo="!isCongreso" />
    </template>

    <div v-if="isLegislative" class="px-2 pb-2">
      <UDashboardSearchButton label="Buscar" class="w-full" />
    </div>

    <UNavigationMenu
      :items="sidebarItems"
      orientation="vertical"
      class="w-full"
    />
  </UDashboardSidebar>

  <div
    class="sticky top-0 z-10 border-b bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/50"
  >
    <UDashboardNavbar
      toggle-side="left"
      :ui="{
        root: 'sticky top-0 z-50 h-(--ui-header-height) shrink-0 flex items-center justify-between border-b-0 page-container !py-0 gap-2 sm:gap-3',
        left: 'flex items-center gap-1.5 min-w-0',
        center: 'hidden lg:flex flex-1 min-w-0 justify-end h-full',
        right: 'flex items-center shrink-0 gap-1.5',
      }"
    >
      <template #leading>
        <AppBrand :logo="!isCongreso" />
      </template>

      <!-- Slot default = center: oculto en mobile (lg:flex) -->
      <nav
        v-if="isLegislative"
        class="h-full flex items-stretch justify-end gap-0"
        aria-label="Navegación principal"
      >
        <UButton
          v-for="link in navLinks"
          :key="link.label"
          :to="link.to"
          :variant="link.active ? 'link' : 'ghost'"
          color="neutral"
          size="sm"
          :class="[
            'h-full rounded-none px-3 sm:px-4 text-sm whitespace-nowrap transition-colors',
            link.active
              ? 'border-b-2 border-neutral! text-highlighted'
              : 'text-muted hover:text-highlighted',
          ]"
        >
          {{ link.label }}
        </UButton>
      </nav>

      <template #right>
        <template v-if="isLegislative">
          <UDashboardSearchButton
            class="hidden sm:inline-flex"
            size="sm"
            label="Buscar"
          />
          <UDashboardSearchButton
            class="sm:hidden"
            size="sm"
            collapsed
            aria-label="Buscar"
          />
          <UButton
            :to="otherChamberUrl"
            target="_blank"
            external
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-lucide-external-link"
            class="hidden sm:inline-flex"
            :aria-label="`Abrir ${otherChamber.membersLabel} en una pestaña nueva`"
          >
            {{ otherChamber.membersLabel }}
          </UButton>
        </template>
        <ColorModeToggle />
      </template>
    </UDashboardNavbar>
  </div>
</template>
