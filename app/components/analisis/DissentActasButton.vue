<script setup lang="ts">
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import type { DissentActa } from "@/utils/votingAffinity";

export type DissentActaMeta = {
  id: string;
  titulo?: string | null;
  resultado?: string | null;
};

const props = withDefaults(
  defineProps<{
    actas: DissentActa[];
    groupLabel: string;
    /** Metadatos de actas (título/resultado) indexados por id. */
    actasMeta?: DissentActaMeta[] | Record<string, DissentActaMeta>;
  }>(),
  {
    actasMeta: () => [],
  },
);

const open = ref(false);

const { sorting } = useTableSorting("fecha", true, { syncQuery: false });

const metaById = computed(() => {
  const map = new Map<string, DissentActaMeta>();
  const raw = props.actasMeta;
  if (Array.isArray(raw)) {
    for (const a of raw) {
      if (a?.id) map.set(String(a.id), a);
    }
  } else {
    for (const [id, a] of Object.entries(raw || {})) {
      map.set(String(id), a);
    }
  }
  return map;
});

type Row = DissentActa & {
  titulo: string;
  resultado: string | null;
};

const rows = computed<Row[]>(() =>
  props.actas.map((row) => {
    const meta = metaById.value.get(row.id);
    return {
      ...row,
      titulo: meta?.titulo || row.id,
      resultado: meta?.resultado || null,
    };
  }),
);

const columns = computed(() => [
  { id: "fecha", accessorKey: "fecha", header: sortableHeader("Fecha") },
  {
    id: "titulo",
    accessorKey: "titulo",
    header: sortableHeader("Título"),
    meta: { class: { td: "max-w-xs whitespace-normal" } },
  },
  { id: "voto", accessorKey: "voto", header: sortableHeader("Su voto") },
  {
    id: "mode",
    accessorKey: "mode",
    header: sortableHeader(`Voto del ${props.groupLabel}`),
  },
  {
    id: "resultado",
    accessorKey: "resultado",
    header: sortableHeader("Resultado"),
  },
]);

function onSelect(_e: Event, row: { original: Row }) {
  open.value = false;
  navigateTo(`/actas/${row.original.id}`);
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Votaciones en las que se apartó (${actas.length})`"
    :description="`Votaciones donde no votó como la mayoría de su ${groupLabel}.`"
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
        :data="rows"
        :columns="columns"
        :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
        empty="No hay votaciones en las que se haya apartado."
        :on-select="onSelect"
      >
        <template #fecha-cell="{ row }">
          <span>{{ formatDate((row.original as Row).fecha) }}</span>
        </template>
        <template #titulo-cell="{ row }">
          <NuxtLink
            :to="`/actas/${(row.original as Row).id}`"
            class="hover:underline line-clamp-3"
            @click.stop="open = false"
          >
            {{ (row.original as Row).titulo }}
          </NuxtLink>
        </template>
        <template #voto-cell="{ row }">
          <TipoVotoLabel :tipo="(row.original as Row).voto" />
        </template>
        <template #mode-cell="{ row }">
          <TipoVotoLabel :tipo="(row.original as Row).mode" />
        </template>
        <template #resultado-cell="{ row }">
          <ResultadoBadge
            v-if="(row.original as Row).resultado"
            :resultado="(row.original as Row).resultado!"
          />
          <span v-else class="text-muted">—</span>
        </template>
      </UTable>
    </template>
  </UModal>
</template>
