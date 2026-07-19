<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";
import UButton from "@nuxt/ui/components/Button.vue";
import type { Senador } from "@/lib/types";
import type { SenadoresGroup } from "@/utils/groupSenadoresBy";
import { averagePresentismo } from "@/utils/presentismo";
import { partidoPath } from "@/utils/partido";
import { sortableHeader } from "@/utils/sortableHeader";

export type SenadoresGroupedTableRow = SenadoresGroup & {
  count: number;
  presentismo: number | null;
  color?: string;
};

const props = withDefaults(
  defineProps<{
    groups: SenadoresGroup[];
    /** 'partido' | 'provincia' — define columnas del grupo y de la tabla anidada */
    groupBy: "partido" | "provincia";
    accentColors?: Record<string, string>;
    groupTo?: (group: SenadoresGroup) => string | null | undefined;
    showPresentismo?: boolean;
    emptyMessage?: string;
  }>(),
  {
    showPresentismo: true,
    emptyMessage: "No se encontraron grupos con los filtros aplicados.",
  },
);

const rows = computed<SenadoresGroupedTableRow[]>(() =>
  props.groups.map((g) => ({
    ...g,
    count: g.senadores.length,
    presentismo: props.showPresentismo
      ? averagePresentismo(g.senadores)
      : null,
    color: props.accentColors?.[g.key],
  })),
);

const { sorting } = useTableSorting("count", true, { syncQuery: false });
const expanded = ref<Record<string, boolean>>({});

watch(
  () => props.groupBy,
  () => {
    expanded.value = {};
  },
);

const groupLabel = computed(() =>
  props.groupBy === "partido" ? "Partido" : "Provincia",
);

const groupColumns = computed(() => {
  const cols: TableColumn<SenadoresGroupedTableRow>[] = [
    {
      id: "expand",
      enableSorting: false,
      meta: {
        class: {
          th: "w-10 px-2",
          td: "w-10 px-2",
        },
      },
      cell: ({ row }) =>
        h(UButton, {
          color: "neutral",
          variant: "ghost",
          icon: "i-lucide-chevron-down",
          square: true,
          "aria-label": row.getIsExpanded() ? "Contraer" : "Expandir",
          ui: {
            leadingIcon: [
              "transition-transform",
              row.getIsExpanded() ? "duration-200 rotate-180" : "",
            ],
          },
          onClick: (e: Event) => {
            e.stopPropagation();
            row.toggleExpanded();
          },
        }),
    },
  ];

  if (props.groupBy === "partido") {
    cols.push({
      id: "color",
      accessorKey: "color",
      header: "",
      enableSorting: false,
      meta: {
        class: {
          th: "w-10 px-2",
          td: "w-10 px-2",
        },
      },
    });
  }

  cols.push(
    {
      id: "label",
      accessorKey: "label",
      header: sortableHeader(groupLabel.value),
      meta: {
        class: {
          th: "min-w-48",
          td: "min-w-48",
        },
      },
    },
    {
      id: "count",
      accessorKey: "count",
      header: sortableHeader("Senadores"),
      meta: {
        class: {
          th: "text-right whitespace-nowrap",
          td: "text-right tabular-nums whitespace-nowrap",
        },
      },
    },
  );

  if (props.showPresentismo) {
    cols.push({
      id: "presentismo",
      accessorKey: "presentismo",
      header: sortableHeader("Asistencia"),
      meta: {
        class: {
          th: "whitespace-nowrap",
          td: "whitespace-nowrap",
        },
      },
    });
  }

  return cols;
});

const nestedColumns = computed(() => {
  const cols: any[] = [
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
  ];

  if (props.groupBy === "partido") {
    cols.push({
      id: "provincia",
      accessorKey: "provincia",
      header: sortableHeader("Provincia"),
    });
  } else {
    cols.push({
      id: "partido",
      accessorKey: "partido",
      header: sortableHeader("Partido"),
    });
  }

  cols.push({
    id: "presentismo",
    accessorKey: "estadisticas.presentismo",
    header: sortableHeader("Asistencia"),
  });

  return cols;
});

function onGroupSelect(
  _e: Event,
  row: { original: SenadoresGroupedTableRow; toggleExpanded: () => void },
) {
  row.toggleExpanded();
}

function onSenadorSelect(_e: Event, row: { original: Senador }) {
  navigateTo(`/senadores/${row.original.id}`);
}

function hrefForGroup(group: SenadoresGroupedTableRow) {
  return props.groupTo?.(group) ?? null;
}
</script>

<template>
  <DataTableCard :scrollable="false">
    <!--
      Scrollport propio: overflow-x sin aplastar columnas, y sticky del grupo
      relativo a este contenedor (top-0) en lugar del viewport.
    -->
    <div
      class="grouped-expandable-table min-w-0 max-h-[min(70dvh,calc(100dvh-var(--ui-header-height)-8rem))] overflow-auto overscroll-contain"
    >
      <UTable
        v-model:sorting="sorting"
        v-model:expanded="expanded"
        :data="rows"
        :columns="groupColumns"
        :get-row-id="(row) => row.key"
        :ui="{
          root: 'overflow-visible',
          base: 'w-full min-w-[40rem]',
          tr: 'cursor-pointer',
        }"
        :empty="emptyMessage"
        :on-select="onGroupSelect"
      >
        <template v-if="groupBy === 'partido'" #color-cell="{ row }">
          <span
            class="inline-block size-3.5 rounded-full ring-2 ring-default"
            :style="{
              backgroundColor:
                (row.original as SenadoresGroupedTableRow).color || '#6b7280',
            }"
            aria-hidden="true"
          />
        </template>

        <template #label-cell="{ row }">
          <NuxtLink
            v-if="hrefForGroup(row.original as SenadoresGroupedTableRow)"
            :to="hrefForGroup(row.original as SenadoresGroupedTableRow)!"
            class="font-medium hover:underline block truncate"
            @click.stop
          >
            {{ (row.original as SenadoresGroupedTableRow).label }}
          </NuxtLink>
          <span v-else class="font-medium block truncate">
            {{ (row.original as SenadoresGroupedTableRow).label }}
          </span>
        </template>

        <template #count-cell="{ row }">
          {{ (row.original as SenadoresGroupedTableRow).count }}
        </template>

        <template #presentismo-cell="{ row }">
          <div
            v-if="
              (row.original as SenadoresGroupedTableRow).presentismo != null
            "
            class="flex items-center gap-3 min-w-40 max-w-56"
          >
            <UProgress
              :model-value="
                (row.original as SenadoresGroupedTableRow).presentismo!
              "
              size="sm"
              class="flex-1"
              :color="
                ((row.original as SenadoresGroupedTableRow).presentismo || 0) >
                80
                  ? 'success'
                  : 'error'
              "
            />
            <span class="text-sm tabular-nums w-12 text-right shrink-0">
              {{ (row.original as SenadoresGroupedTableRow).presentismo }}%
            </span>
          </div>
          <span v-else class="text-muted">—</span>
        </template>

        <template #expanded="{ row }">
          <div class="group-expanded-section pb-2">
            <div
              class="sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap py-3 -mx-1 px-3 sm:px-4 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 dark:supports-[backdrop-filter]:bg-gray-950/80 border-b border-default"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-chevron-up"
                  square
                  aria-label="Contraer"
                  @click.stop="row.toggleExpanded()"
                />
                <span
                  v-if="
                    groupBy === 'partido' &&
                    (row.original as SenadoresGroupedTableRow).color
                  "
                  class="inline-block size-3.5 rounded-full ring-2 ring-default shrink-0"
                  :style="{
                    backgroundColor: (row.original as SenadoresGroupedTableRow)
                      .color,
                  }"
                  aria-hidden="true"
                />
                <NuxtLink
                  v-if="hrefForGroup(row.original as SenadoresGroupedTableRow)"
                  :to="hrefForGroup(row.original as SenadoresGroupedTableRow)!"
                  class="text-lg font-bold hover:underline truncate"
                  @click.stop
                >
                  {{ (row.original as SenadoresGroupedTableRow).label }}
                </NuxtLink>
                <h3 v-else class="text-lg font-bold truncate">
                  {{ (row.original as SenadoresGroupedTableRow).label }}
                </h3>
              </div>

              <div class="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                <div
                  v-if="
                    (row.original as SenadoresGroupedTableRow).presentismo !=
                    null
                  "
                  class="flex items-center gap-2 min-w-36 max-w-48"
                >
                  <UProgress
                    :model-value="
                      (row.original as SenadoresGroupedTableRow).presentismo!
                    "
                    size="sm"
                    class="flex-1"
                    :color="
                      ((row.original as SenadoresGroupedTableRow)
                        .presentismo || 0) > 80
                        ? 'success'
                        : 'error'
                    "
                  />
                  <span class="text-sm tabular-nums w-12 text-right shrink-0">
                    {{
                      (row.original as SenadoresGroupedTableRow).presentismo
                    }}%
                  </span>
                </div>
                <UBadge variant="subtle" color="neutral">
                  {{ (row.original as SenadoresGroupedTableRow).count }}
                  {{
                    (row.original as SenadoresGroupedTableRow).count === 1
                      ? "senador"
                      : "senadores"
                  }}
                </UBadge>
              </div>
            </div>

            <div class="pt-3 min-w-0">
              <UTable
                :data="(row.original as SenadoresGroupedTableRow).senadores"
                :columns="nestedColumns"
                :ui="{
                  root: 'rounded-lg ring ring-default bg-default overflow-x-auto max-w-full min-w-0',
                  tr: 'cursor-pointer hover:bg-elevated/50',
                }"
                empty="Sin senadores en este grupo."
                :on-select="onSenadorSelect"
              >
                <template #foto-cell="{ row: nested }">
                  <SenadorTableAvatar
                    :src="(nested.original as Senador).foto"
                    :alt="(nested.original as Senador).nombreCompleto"
                  />
                </template>
                <template #nombreCompleto-cell="{ row: nested }">
                  <NuxtLink
                    :to="`/senadores/${(nested.original as Senador).id}`"
                    class="hover:underline"
                    @click.stop
                  >
                    {{ (nested.original as Senador).nombreCompleto }}
                  </NuxtLink>
                </template>
                <template #partido-cell="{ row: nested }">
                  <NuxtLink
                    v-if="partidoPath((nested.original as Senador).partido)"
                    :to="partidoPath((nested.original as Senador).partido)!"
                    class="inline-flex"
                    @click.stop
                  >
                    <UBadge
                      variant="outline"
                      color="neutral"
                      class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
                    >
                      {{ (nested.original as Senador).partido }}
                    </UBadge>
                  </NuxtLink>
                  <UBadge
                    v-else
                    variant="outline"
                    color="neutral"
                    class="w-[max-content] max-w-32 whitespace-break-spaces"
                  >
                    {{ (nested.original as Senador).partido || "—" }}
                  </UBadge>
                </template>
                <template #presentismo-cell="{ row: nested }">
                  <UBadge
                    :color="
                      ((nested.original as Senador).estadisticas
                        ?.presentismo || 0) > 80
                        ? 'success'
                        : 'error'
                    "
                    variant="soft"
                  >
                    {{
                      (nested.original as Senador).estadisticas?.presentismo ??
                      0
                    }}%
                  </UBadge>
                </template>
              </UTable>
            </div>
          </div>
        </template>
      </UTable>
    </div>
  </DataTableCard>
</template>

<style scoped>
.grouped-expandable-table :deep(tbody > tr[data-expanded="true"]) {
  display: none;
}
</style>
