<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { sortableHeader } from "@/utils/sortableHeader";
import { bloquePath } from "@/utils/bloque";

type IntegranteRow = {
  nombre: string;
  cargo: string;
  camara: "senado" | "diputados" | null;
  diputadoId: string | null;
  diputado: Diputado | null;
};

type ComisionDetail = {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string;
  integrantes: IntegranteRow[];
};

const route = useRoute();
const id = computed(() => String(route.params.id || ""));
const { localFetch } = useLocalApi();
const integrantesVista = useLocalStorage<"lista" | "grilla">(
  "comision-integrantes-vista",
  "lista",
  { initOnMounted: true },
);

const { data, pending } = await useAsyncData(
  () => `comision-diputados-${id.value}`,
  () => localFetch<ComisionDetail>(`/api/comisiones/${id.value}`),
  { watch: [id] },
);

const comision = computed(() => data.value || null);

const integrantes = computed(() => comision.value?.integrantes || []);

const { sorting } = useTableSorting("cargo", false, { syncQuery: false });

const tableColumns = [
  {
    id: "foto",
    accessorKey: "diputado.foto",
    header: "",
    enableSorting: false,
    meta: {
      class: {
        th: "w-12 px-2",
        td: "w-12 px-2",
      },
    },
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: sortableHeader("Integrante"),
  },
  {
    id: "cargo",
    accessorKey: "cargo",
    header: sortableHeader("Cargo"),
  },
  {
    id: "bloque",
    accessorKey: "diputado.bloque",
    header: sortableHeader("Bloque"),
  },
  {
    id: "provincia",
    accessorKey: "diputado.provincia",
    header: sortableHeader("Provincia"),
  },
  {
    id: "viajesUltimos12Meses",
    accessorKey: "diputado.viajesUltimos12Meses",
    header: sortableHeader("Viajes 12m"),
    meta: {
      class: {
        th: "text-right whitespace-nowrap",
        td: "text-right tabular-nums whitespace-nowrap",
      },
    },
  },
];

function onRowSelect(_e: Event, row: { original: IntegranteRow }) {
  if (row.original.diputadoId) {
    void navigateTo(`/diputados/${row.original.diputadoId}`);
  }
}

useChamberSeo(() => {
  const c = comision.value;
  if (!c) {
    return {
      title: "Comisión",
      description: "Comisiones de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "group", eyebrow: "comisión" },
    };
  }
  const n = c.integrantes.length;
  return {
    title: c.nombre,
    description: `Comisión ${c.nombre}${c.tipo ? ` (${c.tipo})` : ""}: ${n} ${
      n === 1 ? "integrante" : "integrantes"
    } en Diputados.`,
    og: {
      kind: "group",
      eyebrow: "comisión",
      badge: `${n} ${n === 1 ? "integrante" : "integrantes"}`,
    },
  };
});
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        to="/diputados/comisiones"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Todas las comisiones
      </UButton>
    </div>

    <AppDataSkeleton v-if="pending && !comision" variant="member" />

    <UCard v-else-if="!comision">
      <template #header>
        <h1 class="text-xl font-semibold">Comisión no encontrada</h1>
      </template>
      <p class="text-gray-600 dark:text-gray-300">
        No se pudo encontrar información para la comisión solicitada.
      </p>
    </UCard>

    <template v-else>
      <UCard>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Comisión</p>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ comision.nombre }}
            </h1>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge v-if="comision.tipo" color="neutral" variant="subtle">
                {{ comision.tipo }}
              </UBadge>
              <UBadge color="neutral" variant="outline">
                {{ integrantes.length }}
                {{ integrantes.length === 1 ? "integrante" : "integrantes" }}
              </UBadge>
            </div>
          </div>
          <UButton
            v-if="comision.url"
            :to="comision.url"
            target="_blank"
            external
            color="neutral"
            variant="outline"
            icon="i-lucide-external-link"
            label="Ver en Diputados"
            size="sm"
          />
        </div>
      </UCard>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">
          {{ integrantes.length }}
          {{
            integrantes.length === 1 ? "integrante" : "integrantes"
          }}
        </p>
        <ClientOnly>
          <UFieldGroup size="sm">
            <UButton
              color="neutral"
              :variant="integrantesVista === 'lista' ? 'solid' : 'outline'"
              icon="i-lucide-table"
              label="Tabla"
              @click="integrantesVista = 'lista'"
            />
            <UButton
              color="neutral"
              :variant="integrantesVista === 'grilla' ? 'solid' : 'outline'"
              icon="i-lucide-layout-grid"
              label="Grid"
              @click="integrantesVista = 'grilla'"
            />
          </UFieldGroup>
          <template #fallback>
            <div class="h-8 w-36 animate-pulse rounded-md bg-elevated" />
          </template>
        </ClientOnly>
      </div>

      <DataTableCard v-if="integrantesVista === 'lista'" :show-periodo-badge="false">
        <UTable
          v-model:sorting="sorting"
          :data="integrantes"
          :columns="tableColumns"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          empty="No hay integrantes en esta comisión."
          :on-select="onRowSelect"
        >
          <template #foto-cell="{ row }">
            <SenadorTableAvatar
              v-if="(row.original as IntegranteRow).diputado"
              :src="(row.original as IntegranteRow).diputado!.foto"
              :alt="(row.original as IntegranteRow).nombre"
            />
            <span v-else class="inline-block size-8 rounded-full bg-elevated" />
          </template>
          <template #nombre-cell="{ row }">
            <NuxtLink
              v-if="(row.original as IntegranteRow).diputadoId"
              :to="`/diputados/${(row.original as IntegranteRow).diputadoId}`"
              class="hover:underline"
              @click.stop
            >
              {{ (row.original as IntegranteRow).nombre }}
            </NuxtLink>
            <span v-else>{{ (row.original as IntegranteRow).nombre }}</span>
            <p
              v-if="(row.original as IntegranteRow).camara === 'senado'"
              class="text-xs text-muted"
            >
              Senador/a
            </p>
          </template>
          <template #cargo-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ (row.original as IntegranteRow).cargo || "—" }}
            </UBadge>
          </template>
          <template #bloque-cell="{ row }">
            <NuxtLink
              v-if="
                (row.original as IntegranteRow).diputado &&
                bloquePath((row.original as IntegranteRow).diputado!.bloque)
              "
              :to="
                bloquePath((row.original as IntegranteRow).diputado!.bloque)!
              "
              class="inline-flex"
              @click.stop
            >
              <UBadge
                variant="outline"
                color="neutral"
                class="w-[max-content] max-w-32 whitespace-break-spaces hover:bg-elevated"
              >
                {{ (row.original as IntegranteRow).diputado!.bloque }}
              </UBadge>
            </NuxtLink>
            <span v-else class="text-muted">—</span>
          </template>
          <template #provincia-cell="{ row }">
            {{ (row.original as IntegranteRow).diputado?.provincia || "—" }}
          </template>
          <template #viajesUltimos12Meses-cell="{ row }">
            <NuxtLink
              v-if="(row.original as IntegranteRow).diputadoId"
              :to="`/diputados/${(row.original as IntegranteRow).diputadoId}/viajes`"
              class="tabular-nums hover:underline"
              title="Viajes 12m"
              @click.stop
            >
              {{
                (row.original as IntegranteRow).diputado?.viajesUltimos12Meses ??
                0
              }}
            </NuxtLink>
            <span v-else class="tabular-nums text-muted">—</span>
          </template>
        </UTable>
      </DataTableCard>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <UCard
          v-for="row in integrantes"
          :key="`${row.diputadoId || row.nombre}-${row.cargo}`"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-start gap-3">
            <SenadorTableAvatar
              v-if="row.diputado"
              :src="row.diputado.foto"
              :alt="row.nombre"
            />
            <div class="min-w-0 flex-1 space-y-1">
              <NuxtLink
                v-if="row.diputadoId"
                :to="`/diputados/${row.diputadoId}`"
                class="font-medium hover:underline block truncate"
              >
                {{ row.nombre }}
              </NuxtLink>
              <p v-else class="font-medium truncate">{{ row.nombre }}</p>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ row.cargo || "—" }}
              </UBadge>
              <p v-if="row.diputado" class="text-xs text-muted truncate">
                {{
                  [row.diputado.bloque, row.diputado.provincia]
                    .filter(Boolean)
                    .join(" · ")
                }}
              </p>
              <p
                v-else-if="row.camara === 'senado'"
                class="text-xs text-muted"
              >
                Senador/a
              </p>
            </div>
          </div>
        </UCard>
        <p
          v-if="!integrantes.length"
          class="text-sm text-muted col-span-full"
        >
          No hay integrantes en esta comisión.
        </p>
      </div>
    </template>
  </div>
</template>
