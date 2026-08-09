<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import type { DiputadoViajes } from "@/lib/types";
import type { CareerCargo } from "@/utils/memberCareer";
import {
  diputadoMemberTabFromPath,
  diputadoMemberTabItems,
  diputadoMemberTabPath,
  type DiputadoMemberTab,
} from "@/utils/diputadoMemberTabs";

type MemberProfileResponse = {
  member: Diputado;
  career?: CareerCargo[];
  viajes?: DiputadoViajes | null;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data, pending } = await useAsyncData(
  () => `diputado-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);

const diputado = computed(() => data.value?.member || null);
const career = computed(() => data.value?.career || []);
const viajes = computed(() => data.value?.viajes || null);

if (diputado.value && diputado.value.id !== id.value) {
  const tab = diputadoMemberTabFromPath(route.path, id.value);
  await navigateTo(diputadoMemberTabPath(diputado.value.id, tab), {
    redirectCode: 301,
    replace: true,
  });
}

const activeTab = computed({
  get: (): string => diputadoMemberTabFromPath(route.path, id.value),
  set: (tab: string | number) => {
    void navigateTo(
      diputadoMemberTabPath(id.value, String(tab) as DiputadoMemberTab),
    );
  },
});

const tabItems = computed(() =>
  diputadoMemberTabItems({
    viajesCount: viajes.value?.nacionales.length || 0,
  }),
);
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <AppDataSkeleton v-if="pending && !diputado" variant="member" />

    <UCard v-else-if="!diputado">
      <template #header>
        <h1 class="text-xl font-semibold">Diputado no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el diputado solicitado.
      </p>
    </UCard>

    <template v-else>
      <DiputadoProfileHeader :diputado="diputado" :career="career" />

      <SegmentedTabs
        v-model="activeTab"
        :items="tabItems"
        :center="false"
      />

      <NuxtPage />
    </template>
  </div>
</template>
