<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import type { DiputadoMisiones, MisionOficial } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import {
  MISIONES_FUENTE_URL_DIPUTADOS,
} from "@/utils/viajes";
import {
  buildMisionId,
  formatMisionMonto,
  misionMontoPrincipal,
  misionPath,
} from "@/utils/misiones";

type MemberProfileResponse = {
  member: Diputado;
  misiones?: DiputadoMisiones | null;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data } = await useAsyncData(
  () => `diputado-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);

const diputado = computed(() => data.value?.member || null);
const misiones = computed(() =>
  (data.value?.misiones?.misiones || []).map((m) => ({
    ...m,
    id: m.id || buildMisionId(m),
  })),
);

const { sorting } = useTableSorting("periodo", true, { syncQuery: false });

function periodoKey(anio: number, mes: number | null | undefined) {
  if (mes != null && mes >= 1 && mes <= 12) {
    return `${anio}-${String(mes).padStart(2, "0")}`;
  }
  return String(anio);
}

function fechasMision(v: MisionOficial) {
  if (v.fechaTexto) return v.fechaTexto;
  const a = v.fechaInicio ? formatDate(v.fechaInicio) : null;
  const b = v.fechaFin ? formatDate(v.fechaFin) : null;
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || null;
}

function rowId(v: MisionOficial) {
  return v.id || buildMisionId(v);
}

const columns = [
  {
    id: "periodo",
    accessorFn: (row: MisionOficial) => {
      if (row.fechaInicio) return String(row.fechaInicio).slice(0, 10);
      return periodoKey(row.anio, row.mes);
    },
    header: sortableHeader("Fecha"),
    meta: {
      class: { th: "whitespace-nowrap", td: "whitespace-nowrap" },
    },
  },
  {
    id: "destino",
    accessorKey: "destino",
    header: sortableHeader("Destino"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-44 truncate whitespace-nowrap",
      },
    },
  },
  {
    id: "monto",
    accessorFn: (row: MisionOficial) => {
      const m = misionMontoPrincipal(row);
      if (!m) return -1;
      const scale =
        m.currency === "USD" ? 1e12 : m.currency === "EUR" ? 1e9 : 1;
      return m.amount * scale;
    },
    header: sortableHeader("Monto"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
  {
    id: "motivo",
    accessorKey: "motivo",
    header: sortableHeader("Motivo"),
    meta: {
      class: { th: "whitespace-nowrap", td: "max-w-56 truncate" },
    },
  },
  {
    id: "institucion",
    accessorKey: "institucion",
    header: sortableHeader("Institución"),
    meta: {
      class: {
        th: "whitespace-nowrap",
        td: "max-w-40 truncate whitespace-nowrap",
      },
    },
  },
];

function onSelect(_e: Event, row: { original: MisionOficial }) {
  void navigateTo(misionPath(rowId(row.original)));
}

useChamberSeo(() => {
  const d = diputado.value;
  if (!d) {
    return {
      title: "Misiones oficiales",
      description: "Misiones oficiales de diputados.",
      og: { kind: "member", eyebrow: "misiones oficiales" },
    };
  }
  const name = d.nombreCompleto || `${d.apellido}, ${d.nombre}`;
  return {
    title: `Misiones oficiales · ${name}`,
    description: `Misiones oficiales al exterior de ${name} según datos abiertos de la HCDN.`,
    og: {
      kind: "member",
      eyebrow: "misiones oficiales",
      badge: d.bloque || undefined,
      photoSrc: d.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <DataTableCard v-if="diputado" :show-periodo-badge="false" :scrollable="false">
    <template #header>
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-lg font-semibold">Misiones oficiales</h2>
      </div>
    </template>

    <p v-if="!misiones.length" class="px-4 sm:px-6 py-6 text-sm text-muted">
      No hay misiones oficiales registradas para este diputado.
    </p>

    <UTable
      v-else
      v-model:sorting="sorting"
      :data="misiones"
      :columns="columns"
      :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
      empty="Sin misiones oficiales registradas."
      :on-select="onSelect"
    >
      <template #periodo-cell="{ row }">
        <div class="leading-tight">
          <p class="text-sm whitespace-nowrap">
            {{ fechasMision(row.original as MisionOficial) || "—" }}
          </p>
          <p class="text-xs text-muted tabular-nums">
            {{
              (row.original as MisionOficial).fechaInicio
                ? String((row.original as MisionOficial).fechaInicio).slice(
                    0,
                    7,
                  )
                : periodoKey(
                    (row.original as MisionOficial).anio,
                    (row.original as MisionOficial).mes,
                  )
            }}
          </p>
        </div>
      </template>
      <template #destino-cell="{ row }">
        <NuxtLink
          :to="misionPath(rowId(row.original as MisionOficial))"
          class="hover:underline"
          :title="(row.original as MisionOficial).destino"
          @click.stop
        >
          {{ (row.original as MisionOficial).destino }}
        </NuxtLink>
      </template>
      <template #monto-cell="{ row }">
        {{
          formatMisionMonto(
            misionMontoPrincipal(row.original as MisionOficial),
          )
        }}
      </template>
      <template #motivo-cell="{ row }">
        <NuxtLink
          :to="misionPath(rowId(row.original as MisionOficial))"
          class="hover:underline block truncate"
          :title="(row.original as MisionOficial).motivo || undefined"
          @click.stop
        >
          {{ (row.original as MisionOficial).motivo || "—" }}
        </NuxtLink>
      </template>
      <template #institucion-cell="{ row }">
        <span
          :title="(row.original as MisionOficial).institucion || undefined"
        >
          {{ (row.original as MisionOficial).institucion || "—" }}
        </span>
      </template>
    </UTable>
  </DataTableCard>
</template>
