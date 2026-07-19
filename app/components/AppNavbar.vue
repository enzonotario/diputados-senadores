<script setup lang="ts">
import type { NavigationMenuItem, TabsItem } from "@nuxt/ui";

const route = useRoute();
const { chamber, otherChamber, otherChamberUrl } = useChamber();

const tabItems = computed<TabsItem[]>(() => [
  { label: "Inicio", value: "/" },
  { label: "Votaciones", value: "/actas" },
  { label: chamber.value.membersLabel, value: chamber.value.membersPath },
  { label: chamber.value.groupsLabel, value: chamber.value.groupsPath },
]);

const sidebarItems = computed<NavigationMenuItem[]>(() => {
  const path = route.path;
  const groupsActive =
    path.startsWith(chamber.value.groupsPath) ||
    path.includes("/bloques") ||
    path.includes("/partidos");
  const membersActive =
    !groupsActive &&
    (path.startsWith(chamber.value.membersPath) ||
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
      label: chamber.value.membersLabel,
      icon: "i-lucide-users",
      to: chamber.value.membersPath,
      active: membersActive,
    },
    {
      label: chamber.value.groupsLabel,
      icon: "i-lucide-shapes",
      to: chamber.value.groupsPath,
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

const activeTab = computed({
  get() {
    const path = route.path;
    if (path.startsWith("/actas")) return "/actas";
    if (
      path.startsWith(chamber.value.groupsPath) ||
      path.includes("/bloques") ||
      path.includes("/partidos")
    ) {
      return chamber.value.groupsPath;
    }
    if (
      path.startsWith(chamber.value.membersPath) ||
      path.startsWith("/diputados") ||
      path.startsWith("/senadores")
    ) {
      return chamber.value.membersPath;
    }
    return "/";
  },
  set(value: string | number) {
    navigateTo(String(value));
  },
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
      <AppBrand />
    </template>

    <div class="px-2 pb-2">
      <UDashboardSearchButton label="Buscar" class="w-full" />
    </div>

    <UNavigationMenu
      :items="sidebarItems"
      orientation="vertical"
      class="w-full"
    />
  </UDashboardSidebar>

  <UDashboardNavbar
    toggle-side="left"
    :ui="{
      root: 'sticky top-0 z-50 h-(--ui-header-height) shrink-0 flex items-center justify-between border-b-0 bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 page-container !py-0 gap-2 sm:gap-3',
      left: 'flex items-center gap-1.5 min-w-0',
      center: 'hidden lg:flex flex-1 min-w-0 justify-end h-full',
      right: 'flex items-center shrink-0 gap-1.5',
    }"
  >
    <template #leading>
      <AppBrand />
    </template>

    <!-- Slot default = center: oculto en mobile (lg:flex) -->
    <nav class="h-full flex justify-end" aria-label="Navegación principal">
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        variant="link"
        size="sm"
        :content="false"
        activation-mode="manual"
        :ui="{
          root: 'h-full w-auto',
          list: 'h-full w-auto p-0 gap-0 border-0 mb-0',
          trigger:
            'h-full rounded-none px-3 sm:px-4 text-sm whitespace-nowrap',
          indicator: 'bottom-0 h-0.5 rounded-none',
        }"
        class="h-full"
      />
    </nav>

    <template #right>
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
      <ColorModeToggle />
    </template>
  </UDashboardNavbar>
</template>
