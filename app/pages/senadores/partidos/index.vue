<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { sortableHeader } from "@/utils/sortableHeader";
import type { AffinityGroupInput } from "@/utils/votingAffinity";
import type { Senador } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import { getUniqueValues } from "@/lib/utils";
import { groupSenadoresBy } from "@/utils/groupSenadoresBy";
import { partidoSlug } from "@/utils/partido";
import { averagePresentismo } from "@/utils/presentismo";
import { useMultiQuery } from "@/composables/useMultiQuery";

type PartidoRow = {
  nombre: string;
  slug: string;
  color: string;
  activos: number;
  presentismo: number;
};

type AffinityIndexResponse = {
  rows: PartidoRow[];
  groups: AffinityGroupInput[];
};

const { localFetch } = useLocalApi();
const route = useRoute();
const { filterMembers, filterVotes } = usePeriodoFilter();
const vista = useRouteQuery("vista", "lista");
const provinciaFilter = useMultiQuery("provincia");

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por provincias", value: "provincias" },
];

const { data: affinityGroups, pending: pendingAffinity } = useAsyncData(
  "partidos-affinity-groups",
  async () => {
    const res = await localFetch<AffinityIndexResponse>(
      "/api/groups/affinity-index",
    );
    return res.groups || [];
  },
  { server: false, lazy: true },
);

const { data: allMembers, pending: pendingMembers } = useAsyncData(
  "partidos-index-members",
  async () => {
    const res = await localFetch<{ members: Senador[] }>("/api/members");
    return res.members || [];
  },
  { lazy: true },
);

const inPeriodoMembers = computed(() =>
  filterMembers(allMembers.value || []),
);

const partidos = computed<PartidoRow[]>(() => {
  const byPartido = new Map<string, Senador[]>();
  for (const s of inPeriodoMembers.value) {
    const nombre = s.partido?.trim();
    if (!nombre) continue;
    const list = byPartido.get(nombre);
    if (list) list.push(s);
    else byPartido.set(nombre, [s]);
  }
  const colores = getPartidoColores([...byPartido.keys()]);
  return [...byPartido.entries()]
    .map(([nombre, list]) => ({
      nombre,
      slug: partidoSlug(nombre),
      color: colores[nombre] ?? "#6b7280",
      activos: list.length,
      presentismo: averagePresentismo(list) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"),
    );
});

const filteredAffinityGroups = computed<AffinityGroupInput[]>(() =>
  (affinityGroups.value || [])
    .map((g) => ({
      ...g,
      members: g.members
        .map((m) => ({
          ...m,
          votes: filterVotes(m.votes || []),
        }))
        .filter((m) => (m.votes?.length ?? 0) > 0),
    }))
    .filter((g) => g.members.length > 0),
);

const pendingPartidos = pendingMembers;

const { sorting } = useTableSorting("activos", true);

const tableColumns = [
  {
    id: "color",
    accessorKey: "color",
    header: "",
    enableSorting: false,
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: sortableHeader("Partido"),
  },
  {
    id: "activos",
    accessorKey: "activos",
    header: sortableHeader("Senadores"),
  },
  {
    id: "presentismo",
    accessorKey: "presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: PartidoRow }) {
  const periodo = String(route.query.periodo || "").trim();
  navigateTo({
    path: `/senadores/partidos/${row.original.slug}`,
    query: periodo ? { periodo } : undefined,
  });
}

const categories = computed(() =>
  partidos.value.map((p) => ({
    key: p.nombre,
    label: p.nombre,
    color: p.color,
  })),
);

const compositionMembers = computed(() =>
  inPeriodoMembers.value.map((s) => ({
    provincia: s.provincia,
    category: s.partido,
  })),
);

const provincias = computed(() =>
  getUniqueValues(inPeriodoMembers.value, "provincia"),
);

const membersForTable = computed(() => {
  const list = inPeriodoMembers.value;
  if (!provinciaFilter.value.length) return list;
  const set = new Set(provinciaFilter.value);
  return list.filter((s) => set.has(s.provincia));
});

const groupsByProvincia = computed(() =>
  groupSenadoresBy(membersForTable.value, "provincia"),
);

useChamberSeo({
  title: "Partidos",
  description:
    "Explorá los partidos políticos activos del Senado, quiénes los integran y cuánto asisten a votar.",
  og: { kind: "list", eyebrow: "partidos", badge: "Partidos" },
});
</script>

<template>
  <div class="page-container flex flex-col gap-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Partidos</h1>
      <p class="text-muted max-w-2xl">
        {{ partidos.length }} partidos con senadores en el período. La
        asistencia es el promedio de cuánto asiste cada integrante a las
        votaciones.
      </p>
    </div>

    <FilterPeriodo />

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <template v-if="vista === 'lista'">
      <AppDataSkeleton v-if="pendingPartidos" variant="list" />

      <DataTableCard v-else>
        <UTable
          v-model:sorting="sorting"
          :data="partidos"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron partidos con senadores activos."
          :on-select="onRowSelect"
        >
          <template #color-cell="{ row }">
            <span
              class="inline-block size-3.5 rounded-full ring-2 ring-default"
              :style="{ backgroundColor: (row.original as PartidoRow).color }"
              aria-hidden="true"
            />
          </template>
          <template #nombre-cell="{ row }">
            <NuxtLink
              :to="`/senadores/partidos/${(row.original as PartidoRow).slug}`"
              class="inline-flex items-center gap-2.5 font-medium hover:underline min-w-0"
              @click.stop
            >
              <PartidoLogo
                :partido="(row.original as PartidoRow).nombre"
                img-class="h-7 w-auto max-w-16 object-contain shrink-0"
              />
              <span class="min-w-0">{{
                (row.original as PartidoRow).nombre
              }}</span>
            </NuxtLink>
          </template>
          <template #activos-cell="{ row }">
            {{ (row.original as PartidoRow).activos }}
          </template>
          <template #presentismo-cell="{ row }">
            <div
              class="flex items-center gap-2 sm:gap-3 min-w-0 w-full max-w-56"
            >
              <UProgress
                :model-value="(row.original as PartidoRow).presentismo"
                size="sm"
                class="flex-1"
                :color="
                  (row.original as PartidoRow).presentismo > 80
                    ? 'success'
                    : 'error'
                "
              />
              <span class="text-sm tabular-nums w-12 text-right shrink-0">
                {{ (row.original as PartidoRow).presentismo }}%
              </span>
            </div>
          </template>
        </UTable>
      </DataTableCard>

      <ClientOnly>
        <AppDataSkeleton v-if="pendingAffinity" variant="affinity" />
        <AnalisisInterGroupAffinityHeatmap
          v-else-if="filteredAffinityGroups.length >= 2"
          group-label="partido"
          :groups="filteredAffinityGroups"
          group-base-path="/senadores/partidos"
        />
        <template #fallback>
          <AppDataSkeleton variant="affinity" />
        </template>
      </ClientOnly>
    </template>

    <template v-else>
      <AppDataSkeleton
        v-if="pendingMembers || pendingPartidos"
        variant="list"
      />
      <div v-else class="flex flex-col gap-6">
        <AnalisisProvinciasCompositionGeoMap
          :members="compositionMembers"
          :categories="categories"
          :catalog="provincias"
          :selected="provinciaFilter"
          members-label="senadores"
          title="Partidos por provincia"
          description="Cada torta muestra la proporción de partidos entre los senadores activos de esa provincia. Clic para filtrar."
          @select="(name) => (provinciaFilter = name ? [name] : [])"
        />
        <SenadoresGroupedTable
          group-by="provincia"
          :groups="groupsByProvincia"
          show-presentismo
          empty-message="No hay senadores en el período para mostrar."
        />
      </div>
    </template>
  </div>
</template>
