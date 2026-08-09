<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { TabsItem } from "@nuxt/ui";
import type { Diputado } from "@/lib/types-diputados";
import { getBloqueColores } from "@/lib/diputados-data";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloqueSlug } from "@/utils/bloque";
import type { AffinityMemberInput } from "@/utils/votingAffinity";
import { averagePresentismo, withPeriodPresentismo } from "@/utils/presentismo";

type GroupDetailResponse = {
  nombre: string;
  slug: string;
  color: string;
  presentismo: number | null;
  activos: Diputado[];
  inactivos: Diputado[];
  cohesionPeers: AffinityMemberInput[];
  actasMeta: Record<
    string,
    { id: string; titulo?: string | null; resultado?: string | null }
  >;
};

const route = useRoute();
const slug = computed(() => String(route.params.slug || ""));
const { localFetch } = useLocalApi();
const { filterMembers, periodos } = usePeriodoFilter();

const { data } = await useAsyncData(
  () => `bloque-${slug.value}`,
  () => localFetch<GroupDetailResponse>(`/api/groups/${slug.value}`),
  { watch: [slug] },
);

const bloque = computed(() => data.value || null);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "diputados-affinity-peers",
);

const { peers: allActiveMembersRaw } = usePeriodFilteredPeers({
  getSource: () => peersToAffinityInputs(peersPayload.value?.peers),
  deps: () => peersPayload.value,
});

const { peers: cohesionMembersRaw } = usePeriodFilteredPeers({
  getSource: () => bloque.value?.cohesionPeers || [],
  deps: () => bloque.value?.cohesionPeers,
});

const cohesionMembers = computed(() =>
  cohesionMembersRaw.value.filter((m) => (m.votes?.length ?? 0) > 0),
);

const allActiveMembers = computed(() =>
  allActiveMembersRaw.value.filter((m) => (m.votes?.length ?? 0) > 0),
);

const groupSlugs = computed(() => {
  const map: Record<string, string> = {};
  for (const d of allActiveMembers.value) {
    const name = d.group?.trim();
    if (!name || map[name]) continue;
    map[name] = bloqueSlug(name);
  }
  return map;
});

const groupColors = computed(() => {
  const names = Object.keys(groupSlugs.value);
  return getBloqueColores(names);
});

const actasMeta = computed(() => bloque.value?.actasMeta || {});
const pageVista = useRouteQuery("vista", "integrantes");
const pageVistaItems: TabsItem[] = [
  { label: "Integrantes", value: "integrantes", icon: "i-lucide-users" },
  { label: "Cómo votan juntos", value: "afinidad", icon: "i-lucide-git-compare" },
];

watch(
  pageVista,
  (value) => {
    if (value === "afinidad" || value === "integrantes") return;
    // Compat: /afinidad redirige con vista=afinidad; tabs viejos → integrantes
    pageVista.value = "integrantes";
  },
  { immediate: true },
);

const integrantesVista = useLocalStorage<"lista" | "grilla">(
  "integrantes-vista",
  "lista",
  { initOnMounted: true },
);

/** Integrantes del grupo en el período seleccionado (sin split activo/inactivo). */
const displayed = computed<Diputado[]>(() => {
  if (!bloque.value) return [];
  return withPeriodPresentismo(
    filterMembers([
      ...(bloque.value.activos || []),
      ...(bloque.value.inactivos || []),
    ]),
    periodos.value,
  );
});

const bloquePresentismo = computed(() => averagePresentismo(displayed.value));

const { sorting } = useTableSorting("nombreCompleto", false, {
  syncQuery: false,
});

const tableColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: {
      class: {
        th: "w-12 px-2",
        td: "w-12 px-2",
      },
    },
  },
  {
    accessorKey: "nombreCompleto",
    header: sortableHeader("Diputado"),
  },
  { accessorKey: "provincia", header: sortableHeader("Provincia") },
  {
    id: "viajesUltimos12Meses",
    accessorKey: "viajesUltimos12Meses",
    header: sortableHeader("Viajes 12m"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: Diputado }) {
  navigateTo(`/diputados/${row.original.id}`);
}

useChamberSeo(() => {
  const name = bloque.value?.nombre;
  const isAfinidad = pageVista.value === "afinidad";
  if (!name) {
    return {
      title: "Bloque",
      description:
        "Bloques de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "group", eyebrow: "bloque" },
    };
  }
  if (isAfinidad) {
    return {
      title: `Cómo votan juntos · ${name}`,
      description: `Qué tan unidos votan en ${name} y con qué otros bloques coinciden.`,
      og: { kind: "afinidad", eyebrow: "afinidad", badge: name },
    };
  }
  const n = displayed.value.length;
  return {
    title: name,
    description: `Bloque ${name}: ${n} ${
      n === 1 ? "diputado" : "diputados"
    } en el período. Integrantes, presentismo y votos en la Cámara de Diputados.`,
    og: {
      kind: "group",
      eyebrow: "bloque",
      badge: `${n} ${n === 1 ? "diputado" : "diputados"}`,
    },
  };
});
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        to="/diputados/bloques"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="lucide:arrow-left" class="size-4" />
        Todos los bloques
      </UButton>
    </div>

    <UCard v-if="!bloque">
      <template #header>
        <h1 class="text-xl font-semibold">Bloque no encontrado</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para el bloque solicitado.
      </p>
    </UCard>

    <template v-else>
      <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
        <div class="h-2" :style="{ backgroundColor: bloque.color }" />
        <div
          class="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Bloque</p>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ bloque.nombre }}
            </h1>
            <p class="text-sm text-muted">
              {{ displayed.length }}
              {{
                displayed.length === 1
                  ? "diputado en el período"
                  : "diputados en el período"
              }}
            </p>
            <div
              v-if="bloquePresentismo != null"
              class="max-w-xs space-y-1.5 pt-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium">Asistencia del bloque</span>
                <span class="text-sm font-medium"
                  >{{ bloquePresentismo }}%</span
                >
              </div>
              <UProgress
                :model-value="bloquePresentismo"
                size="sm"
                :color="bloquePresentismo > 80 ? 'success' : 'error'"
              />
            </div>
          </div>
          <div
            class="size-12 shrink-0 rounded-full ring-4 ring-default"
            :style="{ backgroundColor: bloque.color }"
            aria-hidden="true"
          />
        </div>
      </UCard>

      <SegmentedTabs
        v-model="pageVista"
        :items="pageVistaItems"
        :center="false"
      />

      <FilterPeriodo />

      <template v-if="pageVista === 'afinidad'">
        <ClientOnly>
          <AppDataSkeleton v-if="peersPending" variant="affinity" />
          <AnalisisGroupAffinityDetail
            v-else
            embedded
            group-label="bloque"
            :group-name="bloque.nombre"
            :group-color="bloque.color"
            :members="cohesionMembers"
            :all-members="allActiveMembers"
            member-base-path="/diputados"
            group-base-path="/diputados/bloques"
            :group-slugs="groupSlugs"
            :actas-meta="actasMeta"
            :group-colors="groupColors"
          />
          <template #fallback>
            <AppDataSkeleton variant="affinity" />
          </template>
        </ClientOnly>
      </template>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Integrantes</h2>
          <UFieldGroup size="sm">
            <UButton
              color="neutral"
              :variant="integrantesVista === 'lista' ? 'solid' : 'outline'"
              icon="i-lucide-list"
              aria-label="Vista lista"
              @click="integrantesVista = 'lista'"
            />
            <UButton
              color="neutral"
              :variant="integrantesVista === 'grilla' ? 'solid' : 'outline'"
              icon="i-lucide-layout-grid"
              aria-label="Vista grilla"
              @click="integrantesVista = 'grilla'"
            />
          </UFieldGroup>
        </div>

        <DataTableCard v-if="integrantesVista === 'lista'">
          <UTable
            v-model:sorting="sorting"
            :data="displayed"
            :columns="tableColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="No hay diputados para mostrar."
            :on-select="onRowSelect"
          >
            <template #foto-cell="{ row }">
              <DiputadoTableAvatar
                :src="(row.original as Diputado).foto"
                :alt="
                  (row.original as Diputado).nombreCompleto ||
                  `${(row.original as Diputado).apellido}, ${(row.original as Diputado).nombre}`
                "
              />
            </template>
            <template #nombreCompleto-cell="{ row }">
              <NuxtLink
                :to="`/diputados/${(row.original as Diputado).id}`"
                class="hover:underline"
                @click.stop
              >
                {{
                  (row.original as Diputado).nombreCompleto ||
                  `${(row.original as Diputado).apellido}, ${(row.original as Diputado).nombre}`
                }}
              </NuxtLink>
            </template>
            <template #viajesUltimos12Meses-cell="{ row }">
              <NuxtLink
                :to="`/diputados/${(row.original as Diputado).id}/viajes`"
                class="tabular-nums hover:underline"
                title="Viajes 12m"
                @click.stop
              >
                {{ (row.original as Diputado).viajesUltimos12Meses ?? 0 }}
              </NuxtLink>
            </template>
            <template #presentismo-cell="{ row }">
              <span>
                {{
                  (row.original as Diputado).estadisticas?.presentismo ?? "—"
                }}{{ (row.original as Diputado).estadisticas ? "%" : "" }}
              </span>
            </template>
          </UTable>
        </DataTableCard>

        <DiputadoAvatarGrid
          v-else
          :diputados="displayed"
          grid-class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center"
        />
      </template>
    </template>
  </div>
</template>
