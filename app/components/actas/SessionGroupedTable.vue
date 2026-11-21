<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { sortableHeader } from "@/utils/sortableHeader";
import { voteMarginSortValue } from "@/utils/voteMargin";
import {
  actaHoraVotacion,
  groupActasByFechaSesion,
  type ActaSesionLike,
} from "@/utils/actaFechaSesion";
import { formatTime } from "@/lib/utils";

type ActaRow = ActaSesionLike & {
  titulo: string;
  resultado: string;
  votosAfirmativos: number;
  votosNegativos: number;
  abstenciones: number;
  ausentes: number;
  proyecto?: string;
  descripcion?: string;
  periodo?: string;
};

const props = withDefaults(
  defineProps<{
    actas: ActaRow[];
    variant: "senadores" | "diputados";
    emptyMessage?: string;
  }>(),
  {
    emptyMessage: "No se encontraron actas con los filtros aplicados.",
  },
);

const groups = computed(() => groupActasByFechaSesion(props.actas));

/** Ausente = expandido (default). Solo `true` colapsa. */
const collapsed = ref<Record<string, boolean>>({});

watch(
  () => groups.value.map((g) => g.key).join("|"),
  () => {
    // Mantener preferencia de colapso al filtrar; limpiar keys huérfanas.
    const next: Record<string, boolean> = {};
    for (const g of groups.value) {
      if (collapsed.value[g.key]) next[g.key] = true;
    }
    collapsed.value = next;
  },
);

function isExpanded(key: string) {
  return collapsed.value[key] !== true;
}

function toggleGroup(key: string) {
  collapsed.value = {
    ...collapsed.value,
    [key]: isExpanded(key),
  };
}

function expandAll() {
  collapsed.value = {};
}

function collapseAll() {
  const next: Record<string, boolean> = {};
  for (const g of groups.value) next[g.key] = true;
  collapsed.value = next;
}

const allExpanded = computed(() =>
  groups.value.every((g) => isExpanded(g.key)),
);

const tableColumns = computed(() => {
  const cols: TableColumn<ActaRow>[] = [
    {
      accessorKey: "numeroActa",
      header: sortableHeader("Acta"),
      meta: { class: { th: "w-16", td: "w-16 tabular-nums" } },
    },
    {
      id: "hora",
      accessorFn: (row) => actaHoraVotacion(row) || "",
      header: sortableHeader("Hora"),
      meta: { class: { th: "w-16", td: "w-16 tabular-nums text-muted" } },
    },
  ];

  if (props.variant === "diputados") {
    cols.push({
      accessorKey: "periodo",
      header: sortableHeader("Período"),
      meta: { class: { th: "w-20", td: "w-20 tabular-nums" } },
    });
  }

  cols.push({
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: { class: { td: "whitespace-normal" } },
  });

  if (props.variant === "senadores") {
    cols.push(
      {
        accessorKey: "proyecto",
        header: sortableHeader("Proyecto"),
        meta: { class: { td: "whitespace-normal" } },
      },
      {
        accessorKey: "descripcion",
        header: sortableHeader("Descripción"),
        meta: {
          class: { td: "whitespace-normal max-w-[9rem]" },
        },
      },
    );
  }

  cols.push(
    { accessorKey: "resultado", header: sortableHeader("Resultado") },
    {
      id: "margen",
      accessorFn: (row) =>
        voteMarginSortValue(row.votosAfirmativos, row.votosNegativos),
      header: sortableHeader("Margen"),
    },
    {
      accessorKey: "votosAfirmativos",
      header: sortableHeader("A favor"),
    },
    { accessorKey: "votosNegativos", header: sortableHeader("En contra") },
    { accessorKey: "abstenciones", header: sortableHeader("Abstenciones") },
    { accessorKey: "ausentes", header: sortableHeader("Ausentes") },
  );

  return cols;
});

function onRowSelect(_e: Event, row: { original: ActaRow }) {
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <div class="min-w-0 w-full space-y-3">
    <div
      v-if="groups.length"
      class="flex flex-wrap items-center justify-end gap-2"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="
          allExpanded ? 'i-lucide-fold-vertical' : 'i-lucide-unfold-vertical'
        "
        :label="allExpanded ? 'Colapsar todo' : 'Expandir todo'"
        @click="allExpanded ? collapseAll() : expandAll()"
      />
    </div>

    <DataTableCard v-if="!groups.length">
      <p class="text-sm text-toned px-1 py-2">{{ emptyMessage }}</p>
    </DataTableCard>

    <div v-else class="min-w-0 space-y-3">
      <!--
        Sticky de fecha fuera del overflow-x: así no ensancha la página y
        el header sigue pegado bajo el navbar (viewport = containing block).
      -->
      <section
        v-for="group in groups"
        :key="group.key"
        class="min-w-0 rounded-lg border border-default"
      >
        <button
          type="button"
          class="sticky top-(--ui-header-height) z-20 w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-default bg-default/75 backdrop-blur hover:bg-elevated/80 transition-colors"
          :aria-expanded="isExpanded(group.key)"
          @click="toggleGroup(group.key)"
        >
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 shrink-0 text-muted transition-transform"
            :class="isExpanded(group.key) ? '' : '-rotate-90'"
          />
          <span class="font-semibold tabular-nums">{{ group.label }}</span>
          <UBadge variant="subtle" color="neutral" size="sm" class="ml-1">
            {{ group.actas.length }}
            {{ group.actas.length === 1 ? "acta" : "actas" }}
          </UBadge>
        </button>

        <div v-show="isExpanded(group.key)" class="min-w-0 overflow-x-auto">
          <UTable
            :data="group.actas"
            :columns="tableColumns"
            :ui="{
              root: 'overflow-visible',
              base: 'min-w-max w-full',
              tr: 'cursor-pointer hover:bg-elevated/50',
            }"
            :empty="emptyMessage"
            :on-select="onRowSelect"
          >
            <template #numeroActa-cell="{ row }">
              <span class="tabular-nums font-medium">
                {{ (row.original as ActaRow).numeroActa || "—" }}
              </span>
            </template>
            <template #hora-cell="{ row }">
              <span class="tabular-nums text-muted text-sm">
                {{ formatTime((row.original as ActaRow).fecha, "—") }}
              </span>
            </template>
            <template #titulo-cell="{ row }">
              <NuxtLink
                :to="`/actas/${(row.original as ActaRow).id}`"
                class="hover:underline line-clamp-5"
                @click.stop
              >
                {{ (row.original as ActaRow).titulo }}
              </NuxtLink>
            </template>
            <template
              v-if="variant === 'senadores'"
              #descripcion-cell="{ row }"
            >
              <span
                class="block max-w-[9rem] text-xs text-toned leading-snug whitespace-normal break-words"
              >
                {{ (row.original as ActaRow).descripcion || "—" }}
              </span>
            </template>
            <template #resultado-cell="{ row }">
              <ResultadoBadge
                :resultado="(row.original as ActaRow).resultado"
              />
            </template>
            <template #margen-cell="{ row }">
              <MargenBadge
                :afirmativos="(row.original as ActaRow).votosAfirmativos"
                :negativos="(row.original as ActaRow).votosNegativos"
              />
            </template>
          </UTable>
        </div>
      </section>
    </div>
  </div>
</template>
