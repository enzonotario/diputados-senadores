<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import type {
  BloqueSenadoGasto,
  EscalaSalarialSenado,
  GastoSenado,
  GastoSenadoSenadorRow,
} from "@/lib/types";
import { sortableHeader } from "@/utils/sortableHeader";
import { gastoFuentesLinks, SENADO_DIETAS_URL } from "@/utils/senadoFuentes";

const { localFetch } = useLocalApi();
const vista = useRouteQuery("vista", "bloques");
const searchQuery = useRouteQuery("q", "");
const { sorting } = useTableSorting("bruto", true);
const { sorting: sortingSenadores } = useTableSorting("total", true);

const vistaItems = [
  { label: "Bloques", value: "bloques" },
  { label: "Despachos", value: "despachos" },
  { label: "Escala", value: "escala" },
];

const { data, pending } = useAsyncData(
  "senadores-gasto",
  async () => {
    return localFetch<{
      gasto: GastoSenado | null;
      bloques: BloqueSenadoGasto[];
      escala: EscalaSalarialSenado | null;
    }>("/api/gasto");
  },
  { lazy: true },
);

const gasto = computed(() => data.value?.gasto || null);
const bloques = computed(() => data.value?.bloques || []);
const escala = computed(() => data.value?.escala || null);

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

const q = computed(() => searchQuery.value.trim().toLowerCase());

const bloquesFiltered = computed(() => {
  const list = [...bloques.value].sort(
    (a, b) => b.gasto.brutoMensualEstimado - a.gasto.brutoMensualEstimado,
  );
  if (!q.value) return list;
  return list.filter((b) => b.nombre.toLowerCase().includes(q.value));
});

/** Completa bloque vacío desde el endpoint /bloques (por senadorId). */
const bloquePorSenadorId = computed(() => {
  const map = new Map<string, string>();
  for (const b of bloques.value) {
    for (const s of b.senadores || []) {
      if (s?.id && b.nombre) map.set(String(s.id), b.nombre);
    }
  }
  return map;
});

const senadoresConBloque = computed(() =>
  (gasto.value?.senadores || []).map((s) => ({
    ...s,
    bloque: s.bloque || bloquePorSenadorId.value.get(String(s.senadorId)) || null,
  })),
);

const senadoresFiltered = computed(() => {
  const list = [...senadoresConBloque.value];
  if (!q.value) return list;
  return list.filter(
    (s) =>
      s.nombre.toLowerCase().includes(q.value) ||
      (s.bloque || "").toLowerCase().includes(q.value),
  );
});

const bloqueColumns = [
  {
    accessorKey: "nombre",
    header: sortableHeader("Bloque"),
  },
  {
    accessorKey: "integrantes",
    header: sortableHeader("Senadores"),
  },
  {
    id: "agentes",
    accessorFn: (row: BloqueSenadoGasto) => row.gasto.agentes,
    header: sortableHeader("Personal"),
    cell: ({ row }: any) => row.original.gasto.agentes,
  },
  {
    id: "bruto",
    accessorFn: (row: BloqueSenadoGasto) => row.gasto.brutoMensualEstimado,
    header: sortableHeader("Gasto estimado / mes"),
    cell: ({ row }: any) =>
      formatMoney(row.original.gasto.brutoMensualEstimado),
  },
];

const senadorColumns = [
  {
    accessorKey: "nombre",
    header: sortableHeader("Senador"),
  },
  {
    accessorKey: "bloque",
    header: sortableHeader("Bloque"),
    cell: ({ row }: any) => row.original.bloque || "—",
  },
  {
    id: "dieta",
    accessorFn: (row: GastoSenadoSenadorRow) => row.dietaBrutoEstimado || 0,
    header: sortableHeader("Dieta est."),
    cell: ({ row }: any) => formatMoney(row.original.dietaBrutoEstimado),
  },
  {
    id: "personalAgentes",
    accessorKey: "personalAgentes",
    header: sortableHeader("Personal"),
  },
  {
    id: "personalBruto",
    accessorFn: (row: GastoSenadoSenadorRow) => row.personalBrutoEstimado,
    header: sortableHeader("Personal est."),
    cell: ({ row }: any) => formatMoney(row.original.personalBrutoEstimado),
  },
  {
    id: "total",
    accessorFn: (row: GastoSenadoSenadorRow) => row.totalEstimado,
    header: sortableHeader("Total est."),
    cell: ({ row }: any) => formatMoney(row.original.totalEstimado),
  },
];

const escalaColumns = [
  {
    accessorKey: "codigo",
    header: "Categoría",
  },
  {
    accessorKey: "totalEnPesos",
    header: "Total en pesos",
    cell: ({ row }: any) => formatMoney(row.original.totalEnPesos),
  },
  {
    accessorKey: "rc",
    header: "RC 2 y 6/22",
    cell: ({ row }: any) => formatMoney(row.original.rc),
  },
  {
    accessorKey: "brutoBase",
    header: "Bruto base",
    cell: ({ row }: any) => formatMoney(row.original.brutoBase),
  },
  {
    accessorKey: "brutoConAdicionalFuncion",
    header: "Con adic. función",
    cell: ({ row }: any) =>
      formatMoney(row.original.brutoConAdicionalFuncion),
  },
];

function onSenadorSelect(_e: Event, row: any) {
  const id = row?.original?.senadorId;
  if (id) void navigateTo(`/senadores/${id}`);
}

const fuentes = computed(() =>
  gastoFuentesLinks({
    fuenteEscala: gasto.value?.fuenteEscala || escala.value?.fuente,
    fuenteBloques: gasto.value?.fuenteBloques,
    fuenteDietas: gasto.value?.fuenteDietas,
  }),
);

useChamberSeo(() => ({
  title: "Gasto",
  description:
    "Gasto bruto estimado del Senado: personal de bloques, personal de despachos y dietas, según la escala salarial oficial.",
  og: { kind: "list", eyebrow: "gasto", badge: "Gasto" },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Gasto estimado del Senado</h1>
      <p class="text-muted max-w-3xl">
        Cruce del personal publicado (bloques y despachos) con la escala
        salarial oficial. Monto por agente =
        <strong>Total en pesos + RC 2 y 6/22</strong>. La dieta de cada senador
        se estima en 4000 módulos × valor del módulo
        (<a
          :href="SENADO_DIETAS_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-2"
          >fuente dietas</a
        >). No incluye título, antigüedad ni presentismo (el listado no los
        informa).
      </p>
    </div>

    <AppDataSkeleton v-if="pending" variant="home" />

    <template v-else-if="!gasto">
      <UAlert
        color="warning"
        variant="subtle"
        title="Sin datos de gasto"
        description="La API aún no publica /v1/senado/gasto. Cuando argentina-datos despliegue el crawl, esta página se completa sola."
      />
    </template>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <UCard>
          <p class="text-xs text-muted">Personal de bloques</p>
          <p class="text-xl font-semibold">
            {{ formatMoney(gasto.totales.bloquesPersonalBruto) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">Personal de despachos</p>
          <p class="text-xl font-semibold">
            {{ formatMoney(gasto.totales.despachosPersonalBruto) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">Dietas (72 senadores)</p>
          <p class="text-xl font-semibold">
            {{ formatMoney(gasto.totales.dietasSenadoresBruto) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">Total estimado / mes</p>
          <p class="text-xl font-semibold">
            {{ formatMoney(gasto.totales.grandTotalEstimado) }}
          </p>
        </UCard>
      </div>

      <p class="text-sm text-muted">
        Valor módulo:
        {{
          gasto.valorModulo.toLocaleString("es-AR", {
            maximumFractionDigits: 6,
          })
        }}
        <template v-if="gasto.vigenciaEscala">
          · vigencia {{ gasto.vigenciaEscala }}
        </template>
        · dieta unitaria {{ formatMoney(gasto.dietaSenadorBrutoEstimado) }}
      </p>

      <SenadoFuentesLinks :links="fuentes" />

      <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

      <FilterSearch
        v-if="vista !== 'escala'"
        v-model="searchQuery"
        label="Buscar"
        placeholder="Bloque, senador..."
      />

      <template v-if="vista === 'bloques'">
        <p class="text-sm text-muted">
          {{ bloquesFiltered.length }} bloques · gasto = Σ (categoría ×
          brutoBase)
        </p>
        <DataTableCard :show-periodo-badge="false">
          <UTable
            v-model:sorting="sorting"
            :data="bloquesFiltered"
            :columns="bloqueColumns"
            :ui="{ tr: 'hover:bg-elevated/50' }"
            empty="Sin bloques"
          >
            <template #nombre-cell="{ row }">
              <span class="font-medium">{{
                (row.original as BloqueSenadoGasto).nombre
              }}</span>
            </template>
          </UTable>
        </DataTableCard>
      </template>

      <template v-else-if="vista === 'despachos'">
        <p class="text-sm text-muted">
          {{ senadoresFiltered.length }} senadores · dieta + personal del
          despacho
        </p>
        <DataTableCard :show-periodo-badge="false">
          <UTable
            v-model:sorting="sortingSenadores"
            :data="senadoresFiltered"
            :columns="senadorColumns"
            :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
            empty="Sin senadores"
            :on-select="onSenadorSelect"
          />
        </DataTableCard>
      </template>

      <template v-else-if="vista === 'escala'">
        <p class="text-sm text-muted" v-if="escala">
          Escala {{ escala.vigencia || "vigente" }} ·
          <a
            :href="escala.fuente"
            target="_blank"
            rel="noopener noreferrer"
            class="underline"
            >escala salarial oficial</a
          >
        </p>
        <DataTableCard v-if="escala" :show-periodo-badge="false">
          <UTable
            :data="escala.categorias"
            :columns="escalaColumns"
            empty="Sin escala"
          />
        </DataTableCard>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          title="Escala no disponible"
        />
      </template>

      <ul class="text-xs text-muted list-disc pl-5 space-y-1 max-w-3xl">
        <li v-for="(nota, i) in gasto.notas" :key="i">{{ nota }}</li>
        <li>
          RC (Resoluciones de Cámara 2 y 6/22) es un adicional fijo de 85,141
          módulos sobre todas las categorías.
        </li>
      </ul>
    </template>
  </div>
</template>
