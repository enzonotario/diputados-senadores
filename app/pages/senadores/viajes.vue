<script setup lang="ts">
import { useRouteQuery } from "@vueuse/router";
import { formatDate } from "@/lib/utils";
import { sortableHeader } from "@/utils/sortableHeader";
import { partidoPath } from "@/utils/partido";
import type {
  ViajesExploreInternacional,
  ViajesExploreNacional,
  ViajesExplorePayload,
  ViajesExploreRankingRow,
} from "@/lib/senadores-data";
import { VIAJES_FUENTE_URL } from "@/utils/viajes";
import { viajePdfUrl } from "@/utils/staticPdf";

const { localFetch } = useLocalApi();
const vista = useRouteQuery("vista", "ranking");
const searchQuery = useRouteQuery("q", "");

const { data, pending } = useAsyncData(
  "senadores-viajes-explore",
  () => localFetch<ViajesExplorePayload>("/api/viajes"),
  { lazy: true },
);

const vistaItems = computed(() => [
  { label: "Ranking", value: "ranking" },
  {
    label: `Nacionales (${data.value?.nacionales.length ?? "…"})`,
    value: "nacionales",
  },
  {
    label: `Internacionales (${data.value?.internacionales.length ?? "…"})`,
    value: "internacionales",
  },
]);

const { sorting: sortingRanking } = useTableSorting(
  "viajesUltimos12Meses",
  true,
);
const { sorting: sortingNac } = useTableSorting("periodo", true, {
  syncQuery: false,
});
const { sorting: sortingIntl } = useTableSorting("periodo", true, {
  syncQuery: false,
});

function periodoKey(anio: number, mes: number | null | undefined) {
  if (mes != null && mes >= 1 && mes <= 12) {
    return `${anio}-${String(mes).padStart(2, "0")}`;
  }
  return String(anio);
}

function periodoLabel(
  anio: number,
  mes: number | null | undefined,
  mesNombre: string | null | undefined,
) {
  const nombre = String(mesNombre || "").trim();
  if (nombre) return `${nombre} de ${anio}`;
  if (mes != null && mes >= 1 && mes <= 12) {
    const fallback = new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
      month: "long",
    });
    const capitalized = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    return `${capitalized} de ${anio}`;
  }
  return String(anio);
}

function lugarLabel(nombre: string, codigo: string | null) {
  return codigo ? `${nombre} (${codigo})` : nombre;
}

function fechasIntl(v: ViajesExploreInternacional) {
  if (v.fechaTexto) return v.fechaTexto;
  const a = v.fechaInicio ? formatDate(v.fechaInicio) : null;
  const b = v.fechaFin ? formatDate(v.fechaFin) : null;
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || null;
}

const q = computed(() => searchQuery.value.trim().toLowerCase());

const rankingDisplayed = computed(() => {
  const list = data.value?.ranking || [];
  if (!q.value) return list;
  return list.filter((s) => {
    const hay = [
      s.nombreCompleto,
      s.nombre,
      s.provincia,
      s.partido,
      s.bloque || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.value);
  });
});

const nacionalesDisplayed = computed(() => {
  const list = data.value?.nacionales || [];
  if (!q.value) return list;
  return list.filter((v) => {
    const hay = [
      v.senadorNombre,
      v.origen,
      v.destino,
      v.origenCodigo || "",
      v.destinoCodigo || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.value);
  });
});

const internacionalesDisplayed = computed(() => {
  const list = data.value?.internacionales || [];
  if (!q.value) return list;
  return list.filter((v) => {
    const hay = [v.senadorNombre, v.destino, v.motivo || "", v.expediente || ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.value);
  });
});

const stats = computed(() => {
  const ranking = data.value?.ranking || [];
  const nac = data.value?.nacionales.length || 0;
  const intl = data.value?.internacionales.length || 0;
  const conViajes = ranking.filter((s) => s.viajesUltimos12Meses > 0).length;
  return {
    total: nac + intl,
    nacionales: nac,
    internacionales: intl,
    conViajes,
  };
});

const hasActiveFilters = computed(() => !!searchQuery.value.trim());

function clearFilters() {
  searchQuery.value = "";
}

const rankingColumns = [
  {
    id: "foto",
    accessorKey: "foto",
    header: "",
    enableSorting: false,
    meta: { class: { th: "w-14", td: "w-14" } },
  },
  {
    id: "nombreCompleto",
    accessorKey: "nombreCompleto",
    header: sortableHeader("Senador"),
  },
  {
    id: "provincia",
    accessorKey: "provincia",
    header: sortableHeader("Provincia"),
  },
  {
    id: "partido",
    accessorKey: "partido",
    header: sortableHeader("Partido"),
  },
  {
    id: "viajesUltimos12Meses",
    accessorKey: "viajesUltimos12Meses",
    header: sortableHeader("Viajes 12m"),
    meta: {
      class: {
        th: "text-right",
        td: "text-right tabular-nums font-medium",
      },
    },
  },
];

const nacionalesColumns = [
  {
    id: "periodo",
    accessorFn: (row: ViajesExploreNacional) => periodoKey(row.anio, row.mes),
    header: sortableHeader("Período"),
    meta: {
      class: { th: "whitespace-nowrap", td: "whitespace-nowrap" },
    },
  },
  {
    id: "senadorNombre",
    accessorKey: "senadorNombre",
    header: sortableHeader("Senador"),
  },
  {
    id: "origen",
    accessorFn: (row: ViajesExploreNacional) =>
      lugarLabel(row.origen, row.origenCodigo),
    header: sortableHeader("Origen"),
  },
  {
    id: "destino",
    accessorFn: (row: ViajesExploreNacional) =>
      lugarLabel(row.destino, row.destinoCodigo),
    header: sortableHeader("Destino"),
  },
];

const internacionalesColumns = [
  {
    id: "periodo",
    accessorFn: (row: ViajesExploreInternacional) => {
      if (row.fechaInicio) return String(row.fechaInicio).slice(0, 10);
      return periodoKey(row.anio, row.mes);
    },
    header: sortableHeader("Fecha"),
    meta: {
      class: { th: "whitespace-nowrap", td: "whitespace-nowrap" },
    },
  },
  {
    id: "senadorNombre",
    accessorKey: "senadorNombre",
    header: sortableHeader("Senador"),
  },
  {
    id: "destino",
    accessorKey: "destino",
    header: sortableHeader("Destino"),
  },
  {
    id: "motivo",
    accessorKey: "motivo",
    header: sortableHeader("Motivo"),
    meta: {
      class: { td: "max-w-xs whitespace-normal" },
    },
  },
];

function onRankingSelect(
  _e: Event,
  row: { original: ViajesExploreRankingRow },
) {
  void navigateTo(`/senadores/${row.original.id}/viajes`);
}

function onNacSelect(_e: Event, row: { original: ViajesExploreNacional }) {
  const id = row.original.senadorId;
  if (id) void navigateTo(`/senadores/${id}/viajes`);
}

function onIntlSelect(
  _e: Event,
  row: { original: ViajesExploreInternacional },
) {
  const id = row.original.senadorId;
  if (id) void navigateTo(`/senadores/${id}/viajes`);
}

useChamberSeo(() => ({
  title: "Viajes",
  description:
    "Viajes nacionales e internacionales declarados por los senadores.",
  og: { kind: "list", eyebrow: "viajes", badge: "Viajes" },
}));
</script>

<template>
  <div class="page-container space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Viajes del Senado</h1>
      <p class="text-muted max-w-3xl">
        Explorá los viajes nacionales e internacionales declarados por los
        senadores.
      </p>
    </div>

    <SegmentedTabs v-model="vista" :items="vistaItems" :center="false" />

    <div
      v-if="!pending && data"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Total viajes</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats.total }}</p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Nacionales</p>
        <p class="text-2xl font-semibold tabular-nums">
          {{ stats.nacionales }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Internacionales</p>
        <p class="text-2xl font-semibold tabular-nums">
          {{ stats.internacionales }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-3">
        <p class="text-xs text-muted">Senadores con viajes</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats.conViajes }}</p>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-toned">Filtros</h2>
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          label="Limpiar"
          @click="clearFilters"
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FilterSearch
          v-model="searchQuery"
          label="Buscar"
          :placeholder="
            vista === 'ranking'
              ? 'Nombre, provincia, partido...'
              : 'Senador, destino, origen...'
          "
        />
      </div>
    </div>

    <AppDataSkeleton v-if="pending" variant="list" />

    <template v-else>
      <p v-if="vista === 'ranking'" class="text-sm text-muted">
        {{ rankingDisplayed.length }}
        {{ rankingDisplayed.length === 1 ? "senador" : "senadores" }}
      </p>
      <p v-else-if="vista === 'nacionales'" class="text-sm text-muted">
        {{ nacionalesDisplayed.length }}
        {{ nacionalesDisplayed.length === 1 ? "viaje" : "viajes" }} nacionales
      </p>
      <p v-else class="text-sm text-muted">
        {{ internacionalesDisplayed.length }}
        {{
          internacionalesDisplayed.length === 1 ? "viaje" : "viajes"
        }}
        internacionales
      </p>

      <DataTableCard
        v-if="vista === 'ranking'"
        :show-periodo-badge="false"
      >
        <UTable
          v-model:sorting="sortingRanking"
          :data="rankingDisplayed"
          :columns="rankingColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron senadores con los filtros aplicados."
          :on-select="onRankingSelect"
        >
          <template #foto-cell="{ row }">
            <SenadorTableAvatar
              :src="(row.original as ViajesExploreRankingRow).foto"
              :alt="(row.original as ViajesExploreRankingRow).nombreCompleto"
            />
          </template>
          <template #nombreCompleto-cell="{ row }">
            <NuxtLink
              :to="`/senadores/${(row.original as ViajesExploreRankingRow).id}/viajes`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as ViajesExploreRankingRow).nombreCompleto }}
            </NuxtLink>
          </template>
          <template #partido-cell="{ row }">
            <NuxtLink
              v-if="partidoPath((row.original as ViajesExploreRankingRow).partido)"
              :to="partidoPath((row.original as ViajesExploreRankingRow).partido)!"
              class="inline-flex"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
              >
                {{ (row.original as ViajesExploreRankingRow).partido }}
              </UBadge>
            </NuxtLink>
            <UBadge
              v-else
              variant="outline"
              color="neutral"
              class="w-[max-content] max-w-32 whitespace-break-spaces"
            >
              {{ (row.original as ViajesExploreRankingRow).partido || "—" }}
            </UBadge>
          </template>
        </UTable>
      </DataTableCard>

      <DataTableCard
        v-else-if="vista === 'nacionales'"
        :show-periodo-badge="false"
      >
        <UTable
          v-model:sorting="sortingNac"
          :data="nacionalesDisplayed"
          :columns="nacionalesColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron viajes nacionales."
          :on-select="onNacSelect"
        >
          <template #periodo-cell="{ row }">
            <div class="flex items-center gap-1">
              <span>
                {{
                  periodoLabel(
                    (row.original as ViajesExploreNacional).anio,
                    (row.original as ViajesExploreNacional).mes,
                    (row.original as ViajesExploreNacional).mesNombre,
                  )
                }}
              </span>
              <FuentePdfButton
                :href="
                  viajePdfUrl(
                    'nacional',
                    (row.original as ViajesExploreNacional).documentoId,
                  )
                "
              />
            </div>
          </template>
          <template #senadorNombre-cell="{ row }">
            <NuxtLink
              v-if="(row.original as ViajesExploreNacional).senadorId"
              :to="`/senadores/${(row.original as ViajesExploreNacional).senadorId}/viajes`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as ViajesExploreNacional).senadorNombre }}
            </NuxtLink>
            <span v-else>
              {{ (row.original as ViajesExploreNacional).senadorNombre }}
            </span>
          </template>
          <template #origen-cell="{ row }">
            {{
              lugarLabel(
                (row.original as ViajesExploreNacional).origen,
                (row.original as ViajesExploreNacional).origenCodigo,
              )
            }}
          </template>
          <template #destino-cell="{ row }">
            {{
              lugarLabel(
                (row.original as ViajesExploreNacional).destino,
                (row.original as ViajesExploreNacional).destinoCodigo,
              )
            }}
          </template>
        </UTable>
      </DataTableCard>

      <DataTableCard v-else :show-periodo-badge="false">
        <UTable
          v-model:sorting="sortingIntl"
          :data="internacionalesDisplayed"
          :columns="internacionalesColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No se encontraron viajes internacionales."
          :on-select="onIntlSelect"
        >
          <template #periodo-cell="{ row }">
            <div class="flex items-center gap-1">
              <span>
                {{
                  fechasIntl(row.original as ViajesExploreInternacional) || "—"
                }}
              </span>
              <FuentePdfButton
                :href="
                  viajePdfUrl(
                    'internacional',
                    (row.original as ViajesExploreInternacional).documentoId,
                  )
                "
              />
            </div>
          </template>
          <template #senadorNombre-cell="{ row }">
            <NuxtLink
              v-if="(row.original as ViajesExploreInternacional).senadorId"
              :to="`/senadores/${(row.original as ViajesExploreInternacional).senadorId}/viajes`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as ViajesExploreInternacional).senadorNombre }}
            </NuxtLink>
            <span v-else>
              {{ (row.original as ViajesExploreInternacional).senadorNombre }}
            </span>
          </template>
          <template #destino-cell="{ row }">
            {{ (row.original as ViajesExploreInternacional).destino }}
          </template>
          <template #motivo-cell="{ row }">
            {{ (row.original as ViajesExploreInternacional).motivo || "—" }}
          </template>
        </UTable>
      </DataTableCard>

      <p class="text-xs text-muted">
        Fuente:
        <a
          :href="VIAJES_FUENTE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-highlighted"
        >
          viajes del Senado
        </a>
      </p>
    </template>
  </div>
</template>
