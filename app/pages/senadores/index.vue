<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type { Senador, FilterConfig } from "@/lib/types";
import { getPartidoColores } from "@/lib/senadores-data";
import {
  encodeOgHemiciclo,
  groupsForOgHemiciclo,
} from "@/lib/hemiciclo-layout";
import {
  filterSenadores,
  formatDate,
  getUniqueValues,
  isSenadorActivo,
} from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { groupSenadoresBy } from "@/utils/groupSenadoresBy";
import { partidoPath } from "@/utils/partido";
import { groupMembersBySelectedProvincias } from "@/utils/groupMembersBySelectedProvincias";

const { sorting } = useTableSorting("presentismo", true);
const vista = useRouteQuery("vista", "lista");
const provinciaFilter = useMultiQuery("provincia");
const partidoFilter = useMultiQuery("partido");
const searchQuery = useRouteQuery("q", "");
const { filterMembers } = usePeriodoFilter();

const vistaItems = [
  { label: "Lista", value: "lista" },
  { label: "Por partidos", value: "partidos" },
  { label: "Por provincias", value: "provincias" },
];

const { localFetch } = useLocalApi();

const { data, pending } = useAsyncData(
  "senadores-list",
  async () => {
    const res = await localFetch<{ members: Senador[] }>("/api/members");
    return res.members || [];
  },
  { lazy: true },
);
const senadores = computed(() => (data.value as any as Senador[]) || []);

const inPeriodo = computed(() => filterMembers(senadores.value));

const filters = computed<FilterConfig>(() => ({
  ...(provinciaFilter.value.length ? { provincia: provinciaFilter.value } : {}),
  ...(partidoFilter.value.length ? { partido: partidoFilter.value } : {}),
  ...(searchQuery.value ? { nombreCompleto: searchQuery.value } : {}),
}));

const filtersForMap = computed<FilterConfig>(() => {
  const { provincia: _p, ...rest } = filters.value;
  return rest;
});

const displayed = computed(() =>
  filterSenadores(inPeriodo.value, filters.value),
);

const displayedForMap = computed(() =>
  filterSenadores(filterMembers(senadores.value), filtersForMap.value),
);

const groupsByPartido = computed(() =>
  groupSenadoresBy(displayed.value, "partido"),
);
const groupsByProvinciaMap = computed(() =>
  groupSenadoresBy(displayedForMap.value, "provincia"),
);

const selectedProvinciaTitle = computed(() => {
  if (provinciaFilter.value.length === 1) {
    return `Senadores de ${provinciaFilter.value[0]}`;
  }
  if (provinciaFilter.value.length > 1) {
    return `Senadores (${provinciaFilter.value.length} provincias)`;
  }
  return "";
});

const displayedByProvincia = computed(() =>
  groupMembersBySelectedProvincias(displayed.value, provinciaFilter.value),
);

const provinciasMembersLayout = useProvinciasMembersLayout();

const partidoColores = computed(() =>
  getPartidoColores(groupsByPartido.value.map((g) => g.key)),
);

useChamberSeo(() => {
  const activosAll = senadores.value.filter(isSenadorActivo);
  const colores = getPartidoColores(
    [
      ...new Set(
        activosAll.map((s) => s.partido).filter(Boolean) as string[],
      ),
    ],
  );
  const groups = groupsForOgHemiciclo(
    activosAll.map((s) => ({ group: s.partido })),
    colores,
  );
  return {
    title: "Senadores",
    description:
      "Conocé a los senadores del Senado de la Nación Argentina. Historial de votos, presentismo y con quién coinciden.",
    og: {
      kind: "list",
      eyebrow: "listado",
      badge: "Senadores",
      hemiciclo: encodeOgHemiciclo(groups),
    },
  };
});

const provincias = computed(() =>
  getUniqueValues(senadores.value, "provincia"),
);
const partidos = computed(() => getUniqueValues(senadores.value, "partido"));

const provinciaItems = computed(() =>
  provincias.value.map((p) => ({ label: p, value: p })),
);
const partidoItems = computed(() =>
  partidos.value.map((b) => ({ label: b, value: b })),
);

const hasActiveFilters = computed(
  () =>
    provinciaFilter.value.length > 0 ||
    partidoFilter.value.length > 0 ||
    !!searchQuery.value,
);

const emptyMessage = computed(
  () => "No se encontraron senadores con los filtros aplicados.",
);

function clearFilters() {
  provinciaFilter.value = [];
  partidoFilter.value = [];
  searchQuery.value = "";
}

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
    id: "nombreCompleto",
    accessorKey: "nombreCompleto",
    header: sortableHeader("Nombre"),
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
  },
  { id: "partido", accessorKey: "partido", header: sortableHeader("Partido") },
  {
    id: "inicio",
    accessorKey: "periodoLegal.inicio",
    header: sortableHeader("Inicio período"),
  },
  {
    id: "fin",
    accessorKey: "periodoLegal.fin",
    header: sortableHeader("Fin período"),
  },
  {
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  },
];

const provinciaTableColumns = tableColumns.filter((col) => col.id !== "provincia");

function onRowSelect(_e: Event, row: { original: Senador }) {
  navigateTo(`/senadores/${row.original.id}`);
}
</script>

<template>
  <div class="page-container space-y-6">
    <h1 class="text-3xl font-bold">Senadores de Argentina</h1>

    <FilterPeriodo
      :timeline-members="senadores"
      members-label="senadores"
      timeline-mode="members"
    />

    <SegmentedTabs
      v-model="vista"
      :items="vistaItems"
      :center="false"
    />

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-toned">Filtros</h2>
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="Limpiar"
          @click="clearFilters"
        />
      </div>
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <FilterSelect
          v-model="provinciaFilter"
          label="Provincia"
          placeholder="Todas las provincias"
          :items="provinciaItems"
        />
        <FilterSelect
          v-model="partidoFilter"
          label="Partido"
          placeholder="Todos los partidos"
          :items="partidoItems"
        />
      </div>
      <div class="w-full sm:max-w-sm">
        <FilterSearch
            v-model="searchQuery"
            placeholder="Nombre, provincia o partido..."
        />
      </div>
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <DataTableCard v-if="vista === 'lista'">
        <UTable
          v-model:sorting="sorting"
          :data="displayed"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          :empty="emptyMessage"
          :on-select="onRowSelect"
        >
          <template #foto-cell="{ row }">
            <SenadorTableAvatar
              :src="(row.original as Senador).foto"
              :alt="(row.original as Senador).nombreCompleto"
            />
          </template>
          <template #nombreCompleto-cell="{ row }">
            <NuxtLink
              :to="`/senadores/${(row.original as Senador).id}`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as Senador).nombreCompleto }}
            </NuxtLink>
          </template>
          <template #partido-cell="{ row }">
            <NuxtLink
              v-if="partidoPath((row.original as Senador).partido)"
              :to="partidoPath((row.original as Senador).partido)!"
              class="inline-flex"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
              >
                {{ (row.original as Senador).partido }}
              </UBadge>
            </NuxtLink>
            <UBadge
              v-else
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces"
            >
              {{ (row.original as Senador).partido || "—" }}
            </UBadge>
          </template>
          <template #inicio-cell="{ row }">
            <span>{{
              formatDate((row.original as Senador).periodoLegal?.inicio)
            }}</span>
          </template>
          <template #fin-cell="{ row }">
            <span>{{
              formatDate((row.original as Senador).periodoLegal?.fin)
            }}</span>
          </template>
          <template #presentismo-cell="{ row }">
            <UBadge
              :color="
                ((row.original as Senador).estadisticas?.presentismo || 0) > 80
                  ? 'success'
                  : 'error'
              "
              variant="soft"
            >
              {{ (row.original as Senador).estadisticas?.presentismo ?? 0 }}%
            </UBadge>
          </template>
        </UTable>
      </DataTableCard>

      <SenadoresGroupedTable
        v-else-if="vista === 'partidos'"
        group-by="partido"
        :groups="groupsByPartido"
        :accent-colors="partidoColores"
        :group-to="(g) => partidoPath(g.key)"
        show-presentismo
        :empty-message="emptyMessage"
      />

      <div
        v-else-if="vista === 'provincias'"
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
      >
        <div
          class="w-full sm:w-[min(42%,28rem)] sm:shrink-0 sm:sticky sm:top-[calc(var(--ui-header-height)+1rem)] sm:self-start"
        >
          <AnalisisProvinciasChoroplethMap
            :data="
              groupsByProvinciaMap.map((g) => ({
                name: g.key,
                value: g.senadores.length,
                label: g.label,
              }))
            "
            :catalog="provincias"
            :selected="provinciaFilter"
            members-label="senadores"
            @select="(names) => (provinciaFilter = names)"
          />
        </div>

        <div class="min-w-0 flex-1">
          <UCard
            v-if="!provinciaFilter.length"
            :ui="{ body: 'flex min-h-[28rem] items-center justify-center' }"
          >
            <UEmpty
              icon="i-lucide-map-pinned"
              title="Seleccioná una provincia"
              description="Usá el select o el mapa (clic / Ctrl+clic) para ver senadores."
              variant="naked"
            />
          </UCard>
          <template v-else>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">
                {{ selectedProvinciaTitle }}
              </h2>
              <ClientOnly>
                <UFieldGroup size="sm">
                  <UButton
                    color="neutral"
                    :variant="
                      provinciasMembersLayout === 'tabla' ? 'solid' : 'outline'
                    "
                    icon="i-lucide-table"
                    label="Tabla"
                    @click="provinciasMembersLayout = 'tabla'"
                  />
                  <UButton
                    color="neutral"
                    :variant="
                      provinciasMembersLayout === 'grid' ? 'solid' : 'outline'
                    "
                    icon="i-lucide-layout-grid"
                    label="Grid"
                    @click="provinciasMembersLayout = 'grid'"
                  />
                </UFieldGroup>
                <template #fallback>
                  <div class="h-8 w-36 animate-pulse rounded-md bg-elevated" />
                </template>
              </ClientOnly>
            </div>

            <div class="space-y-8">
              <section
                v-for="group in displayedByProvincia"
                :key="group.key"
                class="space-y-3"
              >
                <div
                  v-if="provinciaFilter.length > 1"
                  class="flex flex-wrap items-center justify-between gap-3"
                >
                  <h3 class="text-base font-semibold">{{ group.label }}</h3>
                  <UBadge variant="subtle" color="neutral">
                    {{ group.members.length }}
                    {{
                      group.members.length === 1 ? "senador" : "senadores"
                    }}
                  </UBadge>
                </div>

                <DataTableCard v-if="provinciasMembersLayout === 'tabla'">
                  <UTable
                    v-model:sorting="sorting"
                    :data="group.members"
                    :columns="provinciaTableColumns"
                    :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
                    :empty="emptyMessage"
                    :on-select="onRowSelect"
                  >
                    <template #foto-cell="{ row }">
                      <SenadorTableAvatar
                        :src="(row.original as Senador).foto"
                        :alt="(row.original as Senador).nombreCompleto"
                      />
                    </template>
                    <template #nombreCompleto-cell="{ row }">
                      <NuxtLink
                        :to="`/senadores/${(row.original as Senador).id}`"
                        class="hover:underline"
                        @click.stop
                      >
                        {{ (row.original as Senador).nombreCompleto }}
                      </NuxtLink>
                    </template>
                    <template #partido-cell="{ row }">
                      <NuxtLink
                        v-if="partidoPath((row.original as Senador).partido)"
                        :to="partidoPath((row.original as Senador).partido)!"
                        class="inline-flex"
                        @click.stop
                      >
                        <UBadge
                          variant="outline"
                          color="neutral"
                          class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
                        >
                          {{ (row.original as Senador).partido }}
                        </UBadge>
                      </NuxtLink>
                      <UBadge
                        v-else
                        variant="outline"
                        color="neutral"
                        class="w-[max-content] max-w-32 whitespace-break-spaces"
                      >
                        {{ (row.original as Senador).partido || "—" }}
                      </UBadge>
                    </template>
                    <template #inicio-cell="{ row }">
                      <span>{{
                        formatDate(
                          (row.original as Senador).periodoLegal?.inicio,
                        )
                      }}</span>
                    </template>
                    <template #fin-cell="{ row }">
                      <span>{{
                        formatDate((row.original as Senador).periodoLegal?.fin)
                      }}</span>
                    </template>
                    <template #presentismo-cell="{ row }">
                      <UBadge
                        :color="
                          ((row.original as Senador).estadisticas
                            ?.presentismo || 0) > 80
                            ? 'success'
                            : 'error'
                        "
                        variant="soft"
                      >
                        {{
                          (row.original as Senador).estadisticas?.presentismo ??
                          0
                        }}%
                      </UBadge>
                    </template>
                  </UTable>
                </DataTableCard>

                <UCard v-else>
                  <SenadorAvatarGrid
                    :senadores="group.members"
                    grid-class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 justify-items-center"
                  />
                </UCard>
              </section>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
