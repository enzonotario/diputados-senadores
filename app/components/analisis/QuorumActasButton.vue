<script setup lang="ts">
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";

export type QuorumActaRow = {
  id: string;
  fecha: string;
  mode: string;
  modeCount: number;
  total: number;
  titulo: string;
  resultado: string | null;
};

const props = defineProps<{
  actas: QuorumActaRow[];
  groupLabel: string;
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
  { id: "mode", accessorKey: "mode", header: sortableHeader("Voto del grupo") },
  {
    id: "total",
    accessorKey: "total",
    header: sortableHeader("Mayoría / total"),
  },
  {
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  },
];

function onSelect(_e: Event, row: { original: QuorumActaRow }) {
  open.value = false;
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Votaciones usadas (${actas.length})`"
    :description="`Votaciones donde al menos 2 del ${groupLabel} votaron (así se puede saber el voto mayoritario del grupo).`"
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
        empty="No hay votaciones con suficientes votos del grupo."
        :on-select="onSelect"
      >
        <template #fecha-cell="{ row }">
          <span>{{ formatDate((row.original as QuorumActaRow).fecha) }}</span>
        </template>
        <template #titulo-cell="{ row }">
          <NuxtLink
            :to="`/actas/${(row.original as QuorumActaRow).id}`"
            class="hover:underline line-clamp-3"
            @click.stop="open = false"
          >
            {{ (row.original as QuorumActaRow).titulo }}
          </NuxtLink>
        </template>
        <template #mode-cell="{ row }">
          <TipoVotoLabel :tipo="(row.original as QuorumActaRow).mode" />
        </template>
        <template #total-cell="{ row }">
          <span class="tabular-nums"
            >{{ (row.original as QuorumActaRow).modeCount }}/{{
              (row.original as QuorumActaRow).total
            }}</span
          >
        </template>
        <template #resultado-cell="{ row }">
          <ResultadoBadge
            v-if="(row.original as QuorumActaRow).resultado"
            :resultado="(row.original as QuorumActaRow).resultado!"
          />
          <span v-else class="text-muted">—</span>
        </template>
      </UTable>
    </template>
  </UModal>
</template>
