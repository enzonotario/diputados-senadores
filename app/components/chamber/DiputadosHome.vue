<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { getBloqueColores } from "@/lib/diputados-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import {
  filterActasByPeriodo,
  filterMembersByPeriodo,
  recentPeriodoKeys,
} from "@/utils/periodoLegislativo";

/** Hemiciclo / recientes: período vigente. Charts overview: últimos N. */
const HOME_CHART_PERIODS = 5;

const { localFetch } = useLocalApi();
const { catalog, defaultKey, pending: pendingPeriodos } = usePeriodoFilter();
const homePeriodo = computed(() =>
  defaultKey.value ? [defaultKey.value] : [],
);
const chartPeriodoKeys = computed(() =>
  recentPeriodoKeys(catalog.value, HOME_CHART_PERIODS),
);
const chartPeriodoBadgeLabels = computed(() => {
  const n = chartPeriodoKeys.value.length;
  if (!n) return [];
  return n === 1 ? [`P. ${chartPeriodoKeys.value[0]}`] : [`Últimos ${n}`];
});

const { data: membersData, pending: pendingMembers } = useAsyncData(
  "diputados-home-members",
  async () => {
    const res = await localFetch<{ members: Diputado[] }>("/api/members");
    // Campos del hemiciclo/home (incl. foto).
    return (res.members || []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      apellido: m.apellido,
      nombreCompleto: m.nombreCompleto,
      provincia: m.provincia,
      bloque: m.bloque,
      foto: m.foto,
      periodoMandato: m.periodoMandato,
      ceseFecha: m.ceseFecha,
      juramentoFecha: m.juramentoFecha,
    }));
  },
  { lazy: true },
);

const { data: actasData, pending: pendingActas } = useAsyncData(
  "diputados-actas-home",
  async () => {
    const res = await localFetch<{ actas: any[] }>("/api/actas");
    return (res.actas || []).map((a) => ({
      id: a.id,
      titulo: a.titulo,
      fecha: a.fecha,
      resultado: a.resultado,
      periodo: a.periodo,
      votosAfirmativos: a.votosAfirmativos,
      votosNegativos: a.votosNegativos,
      abstenciones: a.abstenciones,
      ausentes: a.ausentes,
      presentes: a.presentes,
      miembros: a.miembros,
    }));
  },
  { lazy: true },
);

const pendingHome = computed(
  () => pendingMembers.value || pendingActas.value || pendingPeriodos.value,
);

const diputadosInPeriodo = computed(() =>
  filterMembersByPeriodo(
    membersData.value || [],
    homePeriodo.value,
    catalog.value,
  ),
);
const bloqueColores = computed(() =>
  getBloqueColores([
    ...new Set(
      diputadosInPeriodo.value.map((d) => d.bloque).filter(Boolean) as string[],
    ),
  ]),
);

const actasInPeriodo = computed(() =>
  filterActasByPeriodo(actasData.value || [], homePeriodo.value, "diputados"),
);

const actasOverview = computed(() =>
  filterActasByPeriodo(
    actasData.value || [],
    chartPeriodoKeys.value,
    "diputados",
  ),
);

useChamberSeo(() => {
  const groups = groupsForOgHemiciclo(
    diputadosInPeriodo.value.map((d) => ({ group: d.bloque })),
    bloqueColores.value,
  );
  return {
    title: "Cómo votan los diputados",
    description:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada diputado en cada proyecto de ley de la Cámara de Diputados.",
    og: {
      kind: "home",
      eyebrow: "diputados",
      hemiciclo: encodeOgHemiciclo(groups),
    },
  };
});

const actasRecientes = computed(() => {
  const actas = [...actasInPeriodo.value];
  actas.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  return actas.slice(0, 9);
});
</script>

<template>
  <div class="page-container">
    <section
      class="flex flex-col items-center justify-center space-y-4 text-center"
    >
      <AppBrand :show-text="false" size="lg" class="justify-center" />
      <h1 class="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
        Votaciones de Diputados
      </h1>
      <p
        class="max-w-[700px] text-lg text-gray-600 dark:text-gray-300 md:text-xl"
      >
        Mirá cómo votaron los diputados en cada proyecto de ley de la Cámara
      </p>
      <div class="flex flex-col sm:flex-row gap-4">
        <UButton to="/actas" size="lg" :prefetch="false">
          <UIcon name="lucide:file-text" class="size-4" />
          <span>Ver votaciones</span>
        </UButton>
        <UButton
          to="/diputados"
          size="lg"
          variant="soft"
          color="neutral"
          :prefetch="false"
        >
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver Diputados</span>
        </UButton>
      </div>
    </section>

    <USeparator class="my-20" />

    <AppDataSkeleton v-if="pendingHome" variant="home" />

    <template v-else>
      <section>
        <ClientOnly>
          <LazyDiputadosChart
            :diputados="diputadosInPeriodo"
            :bloque-colores="bloqueColores"
          />
          <template #fallback>
            <div
              class="w-full aspect-[2/1] max-w-4xl mx-auto rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse"
              aria-hidden="true"
            />
          </template>
        </ClientOnly>
      </section>

      <USeparator class="my-20" />

      <section class="space-y-4 min-h-[32rem] xl:min-h-[28rem]">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Cómo viene votando la Cámara
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Cuántas votaciones se aprueban o rechazan, y cuántos diputados
            asisten, mes a mes — últimos
            {{ chartPeriodoKeys.length || HOME_CHART_PERIODS }} períodos.
          </p>
        </div>
        <ChartsActasOverviewCharts
          :actas="actasOverview"
          :periodo-badge-labels="chartPeriodoBadgeLabels"
        />
      </section>

      <USeparator class="my-20" />

      <section>
        <RecentVotings :actas="actasRecientes" />
      </section>
    </template>

    <USeparator class="my-20" />

    <ChamberOtherChamberCta />
  </div>
</template>
