<script setup lang="ts">
import type {
  GastoSenadoSenadorRow,
  SenadorPersonalDetalle,
} from "@/lib/types";
import { sortableHeader } from "@/utils/sortableHeader";
import { senadorGastoFuentesLinks } from "@/utils/senadoFuentes";

const props = defineProps<{
  gasto: GastoSenadoSenadorRow | null;
  personal: SenadorPersonalDetalle | null;
  showEmpty?: boolean;
}>();

const fuentes = computed(() =>
  senadorGastoFuentesLinks({
    senadorId: props.gasto?.senadorId || props.personal?.senadorId,
    personalFuente: props.personal?.fuente,
  }),
);

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

const agentes = computed(
  () => props.personal?.personalDetalle || props.personal?.personal || [],
);

const columns = [
  {
    accessorKey: "nombre",
    header: sortableHeader("Nombre"),
  },
  {
    accessorKey: "categoria",
    header: sortableHeader("Categoría"),
  },
  {
    id: "brutoBase",
    accessorFn: (row: any) => row.brutoBase ?? 0,
    header: sortableHeader("Bruto base"),
    cell: ({ row }: any) => formatMoney(row.original.brutoBase),
  },
];

const { sorting } = useTableSorting("brutoBase", true);
</script>

<template>
  <div class="space-y-6">
    <SenadorGastoCards :gasto="gasto" />

    <UAlert
      v-if="gasto?.renunciaAlAumento"
      color="warning"
      variant="subtle"
      title="Renuncia al aumento"
      description="Este senador figura con renuncia al aumento de dieta. El monto de dieta mostrado es el estimado a valor de módulo vigente; el cobro real puede ser menor."
    />

    <div class="space-y-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-semibold">Personal del despacho</h2>
        <NuxtLink
          to="/senadores/gasto"
          class="text-sm text-muted hover:underline"
        >
          Ver gasto de todos
        </NuxtLink>
      </div>
      <p class="text-sm text-muted">
        Categorías publicadas por el Senado. Monto =
        Total en pesos + RC 2 y 6/22 (sin título/antigüedad/presentismo).
      </p>
    </div>

    <DataTableCard v-if="agentes.length" :show-periodo-badge="false">
      <UTable
        v-model:sorting="sorting"
        :data="agentes"
        :columns="columns"
        empty="Sin personal"
      />
    </DataTableCard>

    <UAlert
      v-else-if="showEmpty"
      color="neutral"
      variant="subtle"
      title="Sin personal publicado"
      description="La ficha del senador no lista agentes en el tab Personal, o aún no hay datos en la API."
    />

    <SenadoFuentesLinks :links="fuentes" title="Fuentes oficiales" compact />
  </div>
</template>
