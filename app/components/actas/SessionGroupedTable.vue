<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { sortableHeader } from "@/utils/sortableHeader";
import { voteMarginSortValue } from "@/utils/voteMargin";
import {
  actaFechaSesionLabel,
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

const tableMinWidth = computed(() =>
  props.variant === "senadores" ? "min-w-[72rem]" : "min-w-[60rem]",
);

const tableColumns = computed(() => {
  const cols: TableColumn<ActaRow>[] = [
    {
      accessorKey: "numeroActa",
      header: sortableHeader("Acta"),
      meta: {
        class: {
          th: "min-w-14",
          td: "min-w-14 tabular-nums whitespace-nowrap",
        },
      },
    },
    {
      id: "hora",
      accessorFn: (row) => actaHoraVotacion(row) || "",
      header: sortableHeader("Hora"),
      meta: {
        class: {
          th: "min-w-16",
          td: "min-w-16 tabular-nums text-muted whitespace-nowrap",
        },
      },
    },
  ];

  if (props.variant === "diputados") {
    cols.push({
      accessorKey: "periodo",
      header: sortableHeader("Período"),
      meta: {
        class: {
          th: "min-w-20",
          td: "min-w-20 tabular-nums whitespace-nowrap",
        },
      },
    });
  }

  cols.push({
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: {
      class: {
        th: "min-w-[16rem] max-w-[22rem]",
        td: "min-w-[16rem] max-w-[22rem] whitespace-normal align-top",
      },
    },
  });

  if (props.variant === "senadores") {
    cols.push(
      {
        accessorKey: "proyecto",
        header: sortableHeader("Proyecto"),
        meta: {
          class: {
            th: "min-w-[9rem] max-w-[12rem]",
            td: "min-w-[9rem] max-w-[12rem] whitespace-normal align-top",
          },
        },
      },
      {
        accessorKey: "descripcion",
        header: sortableHeader("Descripción"),
        meta: {
          class: {
            th: "min-w-[7rem] max-w-[9rem]",
            td: "min-w-[7rem] max-w-[9rem] whitespace-normal align-top",
          },
        },
      },
    );
  }

  cols.push(
    {
      accessorKey: "resultado",
      header: sortableHeader("Resultado"),
      meta: {
        class: { th: "min-w-28", td: "min-w-28 whitespace-nowrap" },
      },
    },
    {
      id: "margen",
      accessorFn: (row) =>
        voteMarginSortValue(row.votosAfirmativos, row.votosNegativos),
      header: sortableHeader("Margen"),
      meta: {
        class: { th: "min-w-24", td: "min-w-24 whitespace-nowrap" },
      },
    },
    {
      accessorKey: "votosAfirmativos",
      header: sortableHeader("A favor"),
      meta: {
        class: {
          th: "min-w-20",
          td: "min-w-20 tabular-nums whitespace-nowrap",
        },
      },
    },
    {
      accessorKey: "votosNegativos",
      header: sortableHeader("En contra"),
      meta: {
        class: {
          th: "min-w-20",
          td: "min-w-20 tabular-nums whitespace-nowrap",
        },
      },
    },
    {
      accessorKey: "abstenciones",
      header: sortableHeader("Abstenciones"),
      meta: {
        class: {
          th: "min-w-28",
          td: "min-w-28 tabular-nums whitespace-nowrap",
        },
      },
    },
    {
      accessorKey: "ausentes",
      header: sortableHeader("Ausentes"),
      meta: {
        class: {
          th: "min-w-20",
          td: "min-w-20 tabular-nums whitespace-nowrap",
        },
      },
    },
  );

  return cols;
});

function onRowSelect(_e: Event, row: { original: ActaRow }) {
  navigateTo(`/actas/${row.original.id}`);
}

function mobileCardLabel(acta: ActaRow) {
  const hora = formatTime(acta.fecha, "");
  const actaN = acta.numeroActa ? `Acta ${acta.numeroActa}` : "";
  if (hora && actaN) return `${actaN} · ${hora}`;
  return actaN || hora || actaFechaSesionLabel(acta);
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
        Sticky de fecha fuera del overflow-x: el header sigue pegado bajo el
        navbar. Desktop: tabla con min-width + scroll. Mobile: cards.
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

        <div v-show="isExpanded(group.key)">
          <!-- Mobile: cards legibles -->
          <div class="md:hidden space-y-3 p-3">
            <ActaVotingCard
              v-for="acta in group.actas"
              :key="acta.id"
              :acta="acta"
              :fecha-label="mobileCardLabel(acta)"
            />
          </div>

          <!-- Desktop+: tabla con scroll horizontal -->
          <div class="hidden md:block min-w-0 overflow-x-auto">
            <UTable
              :data="group.actas"
              :columns="tableColumns"
              :ui="{
                root: 'overflow-visible',
                base: `${tableMinWidth} w-full`,
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
                  class="block max-w-[22rem] whitespace-normal break-words leading-snug hover:underline line-clamp-4"
                  @click.stop
                >
                  {{ (row.original as ActaRow).titulo }}
                </NuxtLink>
              </template>
              <template v-if="variant === 'senadores'" #proyecto-cell="{ row }">
                <span
                  class="block max-w-[12rem] text-sm leading-snug whitespace-normal break-words"
                >
                  {{ (row.original as ActaRow).proyecto || "—" }}
                </span>
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
        </div>
      </section>
    </div>
  </div>
</template>
