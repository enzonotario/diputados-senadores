<script setup lang="ts">
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";

export type WindowActaRow = {
  id: string;
  fecha: string;
  /** Voto del miembro; omitir en charts de cámara/grupo. */
  voto?: string | null;
  titulo: string;
  resultado: string | null;
};

const props = withDefaults(
  defineProps<{
    actas: WindowActaRow[];
    fromYear?: string;
    title?: string;
    description?: string;
    empty?: string;
    /** Mostrar columna «Su voto» (default: si alguna fila tiene voto). */
    showVoto?: boolean;
  }>(),
  {
    fromYear: undefined,
    title: undefined,
    description: undefined,
    empty: "No hay votaciones en el período considerado.",
    showVoto: undefined,
  },
);

const open = ref(false);
const { sorting } = useTableSorting("fecha", true, { syncQuery: false });

const withVoto = computed(() => {
  if (props.showVoto != null) return props.showVoto;
  return props.actas.some((a) => a.voto != null && String(a.voto).trim());
});

const columns = computed(() => {
  const cols: any[] = [
    { id: "fecha", accessorKey: "fecha", header: sortableHeader("Fecha") },
    {
      id: "titulo",
      accessorKey: "titulo",
      header: sortableHeader("Título"),
      meta: { class: { td: "max-w-xs whitespace-normal" } },
    },
  ];
  if (withVoto.value) {
    cols.push({
      id: "voto",
      accessorKey: "voto",
      header: sortableHeader("Su voto"),
    });
  }
  cols.push({
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  });
  return cols;
});

const modalTitle = computed(
  () => props.title || `Votaciones incluidas (${props.actas.length})`,
);

const modalDescription = computed(() => {
  if (props.description) return props.description;
  return props.fromYear
    ? `Votaciones desde ${props.fromYear} en las que estuvo presente y votó.`
    : "Votaciones incluidas en este análisis.";
});

function onSelect(_e: Event, row: { original: WindowActaRow }) {
  open.value = false;
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <UButton
      size="sm"
      color="neutral"
      variant="soft"
      icon="i-lucide-table"
      :disabled="!actas.length"
    >
      Ver actas
    </UButton>

    <template #body>
      <UTable
        v-model:sorting="sorting"
        :data="actas"
        :columns="columns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        :empty="empty"
        :on-select="onSelect"
      >
        <template #fecha-cell="{ row }">
          <span>{{ formatDate((row.original as WindowActaRow).fecha) }}</span>
        </template>
        <template #titulo-cell="{ row }">
          <NuxtLink
            :to="`/actas/${(row.original as WindowActaRow).id}`"
            class="hover:underline line-clamp-3"
            @click.stop="open = false"
          >
            {{ (row.original as WindowActaRow).titulo }}
          </NuxtLink>
        </template>
        <template #voto-cell="{ row }">
          <TipoVotoLabel
            v-if="(row.original as WindowActaRow).voto"
            :tipo="(row.original as WindowActaRow).voto!"
          />
          <span v-else class="text-muted">—</span>
        </template>
        <template #resultado-cell="{ row }">
          <ResultadoBadge
            v-if="(row.original as WindowActaRow).resultado"
            :resultado="(row.original as WindowActaRow).resultado!"
          />
          <span v-else class="text-muted">—</span>
        </template>
      </UTable>
    </template>
  </UModal>
</template>
