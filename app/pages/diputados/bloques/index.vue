<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { sortableHeader } from "@/utils/sortableHeader";
import type { AffinityGroupInput } from "@/utils/votingAffinity";
import type { Diputado } from "@/lib/types-diputados";
import { getBloqueColores } from "@/lib/diputados-data";
import {
  getUniqueValues,
} from "@/lib/utils";
import { groupDiputadosBy } from "@/utils/groupDiputadosBy";
import { bloqueSlug } from "@/utils/bloque";
import { averagePresentismo } from "@/utils/presentismo";
import { useMultiQuery } from "@/composables/useMultiQuery";

type BloqueRow = {
  nombre: string;
  slug: string;
  color: string;
  activos: number;
  presentismo: number;
};

type AffinityIndexResponse = {
  rows: BloqueRow[];
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
  "bloques-affinity-groups",
  async () => {
    const res = await localFetch<AffinityIndexResponse>(
      "/api/groups/affinity-index",
    );
    return res.groups || [];
  },
  { server: false, lazy: true },
);

const { data: allMembers, pending: pendingMembers } = useAsyncData(
  "bloques-index-members",
  async () => {
    const res = await localFetch<{ members: Diputado[] }>("/api/members");
    return res.members || [];
  },
  { lazy: true },
);

const inPeriodoMembers = computed(() =>
  filterMembers(allMembers.value || []),
);

const bloques = computed<BloqueRow[]>(() => {
  const byBloque = new Map<string, Diputado[]>();
  for (const d of inPeriodoMembers.value) {
    const nombre = d.bloque?.trim();
    if (!nombre) continue;
    const list = byBloque.get(nombre);
    if (list) list.push(d);
    else byBloque.set(nombre, [d]);
  }
  const colores = getBloqueColores([...byBloque.keys()]);
  return [...byBloque.entries()]
    .map(([nombre, list]) => ({
      nombre,
      slug: bloqueSlug(nombre),
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

const pendingBloques = pendingMembers;

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
    header: sortableHeader("Bloque"),
  },
  {
    id: "activos",
    accessorKey: "activos",
    header: sortableHeader("Diputados"),
  },
  {
    id: "presentismo",
    accessorKey: "presentismo",
    header: sortableHeader("Asistencia"),
  },
];

function onRowSelect(_e: Event, row: { original: BloqueRow }) {
  const periodo = String(route.query.periodo || "").trim();
  navigateTo({
    path: `/diputados/bloques/${row.original.slug}`,
    query: periodo ? { periodo } : undefined,
  });
}

const categories = computed(() =>
  bloques.value.map((b) => ({
    key: b.nombre,
    label: b.nombre,
    color: b.color,
  })),
);

const compositionMembers = computed(() =>
  inPeriodoMembers.value.map((d) => ({
    provincia: d.provincia,
    category: d.bloque,
  })),
);

const provincias = computed(() =>
  getUniqueValues(inPeriodoMembers.value, "provincia"),
);

const membersForTable = computed(() => {
  const list = inPeriodoMembers.value;
  if (!provinciaFilter.value.length) return list;
  const set = new Set(provinciaFilter.value);
  return list.filter((d) => set.has(d.provincia));
});

const groupsByProvincia = computed(() =>
  groupDiputadosBy(membersForTable.value, "provincia"),
);

useChamberSeo({
  title: "Bloques",
  description:
    "Explorá los bloques políticos activos de la Cámara de Diputados, quiénes los integran y cuánto asisten a votar.",
  og: { kind: "list", eyebrow: "bloques", badge: "Bloques" },
});
</script>

<template>
  <div class="page-container flex flex-col gap-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Bloques</h1>
      <p class="text-muted max-w-2xl">
        {{ bloques.length }} bloques con diputados en el período. La asistencia
        es el promedio de cuánto asiste cada integrante a las votaciones.
      </p>
    </div>

    <FilterPeriodo />

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <template v-if="vista === 'lista'">
      <AppDataSkeleton v-if="pendingBloques" variant="list" />

      <DataTableCard v-else>
        <UTable
          v-model:sorting="sorting"
          :data="bloques"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron bloques con diputados activos."
          :on-select="onRowSelect"
        >
          <template #color-cell="{ row }">
            <span
              class="inline-block size-3.5 rounded-full ring-2 ring-default"
              :style="{ backgroundColor: (row.original as BloqueRow).color }"
              aria-hidden="true"
            />
          </template>
          <template #nombre-cell="{ row }">
            <NuxtLink
              :to="`/diputados/bloques/${(row.original as BloqueRow).slug}`"
              class="font-medium hover:underline"
              @click.stop
            >
              {{ (row.original as BloqueRow).nombre }}
            </NuxtLink>
          </template>
          <template #activos-cell="{ row }">
            {{ (row.original as BloqueRow).activos }}
          </template>
          <template #presentismo-cell="{ row }">
            <div
              class="flex items-center gap-2 sm:gap-3 min-w-0 w-full max-w-56"
            >
              <UProgress
                :model-value="(row.original as BloqueRow).presentismo"
                size="sm"
                class="flex-1"
                :color="
                  (row.original as BloqueRow).presentismo > 80
                    ? 'success'
                    : 'error'
                "
              />
              <span class="text-sm tabular-nums w-12 text-right shrink-0">
                {{ (row.original as BloqueRow).presentismo }}%
              </span>
            </div>
          </template>
        </UTable>
      </DataTableCard>

      <ClientOnly>
        <AppDataSkeleton v-if="pendingAffinity" variant="affinity" />
        <AnalisisInterGroupAffinityHeatmap
          v-else-if="filteredAffinityGroups.length >= 2"
          group-label="bloque"
          :groups="filteredAffinityGroups"
          group-base-path="/diputados/bloques"
        />
        <template #fallback>
          <AppDataSkeleton variant="affinity" />
        </template>
      </ClientOnly>
    </template>

    <template v-else>
      <AppDataSkeleton
        v-if="pendingMembers || pendingBloques"
        variant="list"
      />
      <div v-else class="flex flex-col gap-6">
        <AnalisisProvinciasCompositionGeoMap
          :members="compositionMembers"
          :categories="categories"
          :catalog="provincias"
          :selected="provinciaFilter"
          members-label="diputados"
          title="Bloques por provincia"
          description="Cada torta muestra la proporción de bloques entre los diputados activos de esa provincia. Clic para filtrar."
          @select="(name) => (provinciaFilter = name ? [name] : [])"
        />
        <DiputadosGroupedTable
          group-by="provincia"
          :groups="groupsByProvincia"
          show-presentismo
          empty-message="No hay diputados en el período para mostrar."
        />
      </div>
    </template>
  </div>
</template>
