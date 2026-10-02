<script setup lang="ts">
import type {
  GastoSenadoSenadorRow,
  Senador,
  SenadorPersonalDetalle,
  SenadorViajes,
} from "@/lib/types";
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
  gasto?: GastoSenadoSenadorRow | null;
  personal?: SenadorPersonalDetalle | null;
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
const gasto = computed(() => data.value?.gasto || null);
const personal = computed(() => data.value?.personal || null);
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

const showGastoSummary = computed(
  () => activeTab.value !== "gasto" && Boolean(gasto.value),
);

const tabItems = computed(() =>
  senadorMemberTabItems({
    viajesCount:
      (viajes.value?.nacionales.length || 0) +
      (viajes.value?.internacionales.length || 0),
    comisionesCount: comisiones.value.length,
    personalCount:
      personal.value?.gasto?.agentes ??
      gasto.value?.personalAgentes ??
      personal.value?.personal?.length ??
      0,
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

      <div v-if="showGastoSummary" class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-toned">Gasto estimado / mes</h2>
          <NuxtLink
            :to="senadorMemberTabPath(senador.id, 'gasto')"
            class="text-xs text-muted hover:underline"
          >
            Ver detalle
          </NuxtLink>
        </div>
        <SenadorGastoCards :gasto="gasto" compact />
      </div>

      <SegmentedTabs
        v-model="activeTab"
        :items="tabItems"
        :center="false"
      />

      <NuxtPage />
    </template>
  </div>
</template>
