<script setup lang="ts">
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";

export type WindowActaRow = {
  id: string;
  fecha: string;
  voto: string;
  titulo: string;
  resultado: string | null;
};

const props = defineProps<{
  actas: WindowActaRow[];
  fromYear?: string;
}>();

const open = ref(false);
const { sorting } = useTableSorting("fecha", true, { syncQuery: false });

const columns = [
  { id: "fecha", accessorKey: "fecha", header: sortableHeader("Fecha") },
  {
    id: "titulo",
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: { class: { td: "max-w-xs whitespace-normal" } },
  },
  { id: "voto", accessorKey: "voto", header: sortableHeader("Su voto") },
  {
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  },
];

function onSelect(_e: Event, row: { original: WindowActaRow }) {
  open.value = false;
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Votaciones incluidas (${actas.length})`"
    :description="
      fromYear
        ? `Votaciones desde ${fromYear} en las que estuvo presente y votó.`
        : 'Votaciones en las que estuvo presente y votó.'
    "
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
        empty="No hay votaciones en el período considerado."
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
          <TipoVotoLabel :tipo="(row.original as WindowActaRow).voto" />
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
