<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import {
  filterActasByPeriodo,
  filterMembersByPeriodo,
  formatPeriodoLabel,
  recentPeriodoKeys,
} from "@/utils/periodoLegislativo";
import {
  matchMemberByPresidenteNombre,
  modePresidenteNombre,
  parsePresidenteNombre,
} from "@/utils/actaPresidente";

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
  if (n === 1) {
    return [formatPeriodoLabel(chartPeriodoKeys.value[0]!, "senadores")];
  }
  return [`Últimos ${n}`];
});

const { data: membersData, pending: pendingMembers } = useAsyncData(
  "senadores-home-members",
  async () => {
    const res = await localFetch<{ members: Senador[] }>("/api/members");
    return (res.members || []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      apellido: m.apellido,
      nombreCompleto: m.nombreCompleto,
      provincia: m.provincia,
      partido: m.partido,
      bloque: m.bloque,
      foto: m.foto,
      periodoMandato: m.periodoMandato,
      periodoReal: (m as any).periodoReal,
      periodoLegal: (m as any).periodoLegal,
      ceseFecha: (m as any).ceseFecha,
    }));
  },
  { lazy: true },
);

const { data: actasData, pending: pendingActas } = useAsyncData(
  "senadores-actas-home",
  async () => {
    const res = await localFetch<{ actas: any[] }>("/api/actas");
    return (res.actas || []).map((a) => ({
      id: a.id,
      titulo: a.titulo,
      fecha: a.fecha,
      resultado: a.resultado,
      periodo: a.periodo,
      presidente: a.presidente,
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

const { data: presidenciaData, pending: pendingPresidencia } = useAsyncData(
  "senadores-presidencia",
  () =>
    localFetch<{
      presidencia: {
        nombre: string;
        cargo: string | null;
        periodoInicio: string | null;
        periodoFin: string | null;
        foto: string | null;
        email: string | null;
        telefono: string | null;
        direccion: string | null;
        fuente: string | null;
      } | null;
    }>("/api/presidencia"),
  { lazy: true },
);

const pendingHome = computed(
  () =>
    pendingMembers.value ||
    pendingActas.value ||
    pendingPeriodos.value ||
    pendingPresidencia.value,
);

const senadoresInPeriodo = computed(() =>
  filterMembersByPeriodo(
    membersData.value || [],
    homePeriodo.value,
    catalog.value,
  ),
);
const partidoColores = computed(() =>
  getPartidoColores([
    ...new Set(
      senadoresInPeriodo.value
        .map((s) => s.partido)
        .filter(Boolean) as string[],
    ),
  ]),
);

const actasInPeriodo = computed(() =>
  filterActasByPeriodo(actasData.value || [], homePeriodo.value, "senadores"),
);

/**
 * Presidente del Senado desde `/v1/senado/presidencia` (vía mini-API).
 * Fallback: nombre más frecuente en actas del período (provisional).
 */
const homePresident = computed(() => {
  const fromApi = presidenciaData.value?.presidencia || null;
  if (fromApi?.nombre) {
    const matched = matchMemberByPresidenteNombre(
      senadoresInPeriodo.value,
      fromApi.nombre,
    );
    if (matched) {
      return {
        ...matched,
        foto: fromApi.foto || matched.foto,
        tipoVoto: "presidente" as const,
      };
    }
    const parsed = parsePresidenteNombre(fromApi.nombre);
    return {
      id: "",
      nombreCompleto: parsed.nombreCompleto || fromApi.nombre,
      nombre: parsed.nombre,
      apellido: parsed.apellido,
      foto: fromApi.foto,
      tipoVoto: "presidente" as const,
    };
  }

  const nombre = modePresidenteNombre(actasInPeriodo.value);
  const matched = matchMemberByPresidenteNombre(
    senadoresInPeriodo.value,
    nombre,
  );
  if (matched) return { ...matched, tipoVoto: "presidente" as const };
  if (!nombre) return null;
  const parsed = parsePresidenteNombre(nombre);
  return {
    id: "",
    nombreCompleto: parsed.nombreCompleto || nombre,
    nombre: parsed.nombre,
    apellido: parsed.apellido,
    foto: null,
    tipoVoto: "presidente" as const,
  };
});

const actasOverview = computed(() =>
  filterActasByPeriodo(
    actasData.value || [],
    chartPeriodoKeys.value,
    "senadores",
  ),
);

useChamberSeo(() => {
  const groups = groupsForOgHemiciclo(
    senadoresInPeriodo.value.map((s) => ({ group: s.partido })),
    partidoColores.value,
  );
  return {
    title: "Cómo votan los senadores",
    description:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada senador en cada proyecto de ley del Senado de la Nación.",
    og: {
      kind: "home",
      eyebrow: "senadores",
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
        Votaciones de Senadores
      </h1>
      <p
        class="max-w-[700px] text-lg text-gray-600 dark:text-gray-300 md:text-xl"
      >
        Mirá cómo votaron los senadores en cada proyecto de ley del Senado
      </p>
      <div class="flex flex-col sm:flex-row gap-4">
        <UButton to="/actas" size="lg" :prefetch="false">
          <UIcon name="lucide:file-text" class="size-4" />
          <span>Ver votaciones</span>
        </UButton>
        <UButton
          to="/senadores"
          size="lg"
          variant="soft"
          color="neutral"
          :prefetch="false"
        >
          <UIcon name="lucide:users" class="size-4" />
          <span>Ver Senadores</span>
        </UButton>
      </div>
    </section>

    <USeparator class="my-20" />

    <AppDataSkeleton v-if="pendingHome" variant="home" />

    <template v-else>
      <section>
        <ClientOnly>
          <LazySenadoresChart
            :senadores="senadoresInPeriodo"
            :partido-colores="partidoColores"
            :president="homePresident"
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
            Cómo viene votando el Senado
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Cuántas votaciones se aprueban o rechazan, y cuántos senadores
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
