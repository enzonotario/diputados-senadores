<template>
  <UApp>
    <UDashboardGroup
      class="!relative !inset-auto !overflow-visible !h-auto min-h-dvh flex flex-col"
    >
      <GlobalSearch />
      <AppNavbar />
      <NuxtRouteAnnouncer />

      <UMain role="main" class="bg-gray-50 dark:bg-gray-950 flex-1">
        <slot />
      </UMain>

      <AppFooter />
    </UDashboardGroup>
  </UApp>
</template>
