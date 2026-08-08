<script setup lang="ts">
import type { Senador, SenadorViajes } from "@/lib/types";
import type { CareerCargo } from "@/utils/memberCareer";
import {
  senadorMemberTabFromPath,
  senadorMemberTabItems,
  senadorMemberTabPath,
  type SenadorMemberTab,
} from "@/utils/senadorMemberTabs";

type MemberProfileResponse = {
  member: Senador;
  career?: CareerCargo[];
  viajes?: SenadorViajes | null;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data, pending } = await useAsyncData(
  () => `senador-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);

const senador = computed(() => data.value?.member || null);
const career = computed(() => data.value?.career || []);
const viajes = computed(() => data.value?.viajes || null);
const comisiones = computed(() => senador.value?.meta?.comisiones || []);

if (senador.value && senador.value.id !== id.value) {
  const tab = senadorMemberTabFromPath(route.path, id.value);
  await navigateTo(senadorMemberTabPath(senador.value.id, tab), {
    redirectCode: 301,
    replace: true,
  });
}

const activeTab = computed({
  get: (): string => senadorMemberTabFromPath(route.path, id.value),
  set: (tab: string | number) => {
    void navigateTo(
      senadorMemberTabPath(id.value, String(tab) as SenadorMemberTab),
    );
  },
});

const tabItems = computed(() =>
  senadorMemberTabItems({
    viajesCount:
      (viajes.value?.nacionales.length || 0) +
      (viajes.value?.internacionales.length || 0),
    comisionesCount: comisiones.value.length,
  }),
);
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <AppDataSkeleton v-if="pending && !senador" variant="member" />

    <UCard v-else-if="!senador">
      <template #header>
        <h1 class="text-xl font-semibold">Senador no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el senador solicitado.
      </p>
    </UCard>

    <template v-else>
      <SenadorProfileHeader :senador="senador" :career="career" />

      <SegmentedTabs
        v-model="activeTab"
        :items="tabItems"
        :center="false"
      />

      <NuxtPage />
    </template>
  </div>
</template>
