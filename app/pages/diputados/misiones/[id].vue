<script setup lang="ts">
import type { DiputadosMisionesExploreRow } from "@/lib/diputados-data";
import { formatDate } from "@/lib/utils";
import {
  MISIONES_FUENTE_URL_DIPUTADOS,
} from "@/utils/viajes";
import {
  formatMisionMonto,
  misionCsvUrl,
  misionMontoPrincipal,
  misionRecursoPageUrl,
} from "@/utils/misiones";

type MisionDetailResponse = {
  chamber: "diputados";
  mision: DiputadosMisionesExploreRow;
};

const route = useRoute();
const id = computed(() => String(route.params.id || ""));
const { localFetch } = useLocalApi();

const { data, pending } = await useAsyncData(
  () => `mision-${id.value}`,
  () => localFetch<MisionDetailResponse>(`/api/misiones/${id.value}`),
  { watch: [id] },
);

const mision = computed(() => data.value?.mision || null);

const recursoPageUrl = computed(() =>
  mision.value ? misionRecursoPageUrl(mision.value) : null,
);
const csvUrl = computed(() => (mision.value ? misionCsvUrl(mision.value) : null));
const monto = computed(() =>
  mision.value ? misionMontoPrincipal(mision.value) : null,
);

function fechasLabel(v: DiputadosMisionesExploreRow) {
  if (v.fechaTexto) return v.fechaTexto;
  const a = v.fechaInicio ? formatDate(v.fechaInicio) : null;
  const b = v.fechaFin ? formatDate(v.fechaFin) : null;
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || String(v.anio || "—");
}

useChamberSeo(() => {
  const m = mision.value;
  if (!m) {
    return {
      title: "Misión oficial",
      description: "Detalle de misión oficial de diputados (HCDN).",
      og: { kind: "list", eyebrow: "misión oficial" },
    };
  }
  const titleParts = [m.destino, m.diputadoNombre].filter(Boolean);
  return {
    title: titleParts.join(" · ") || "Misión oficial",
    description:
      m.motivo ||
      `Misión oficial de ${m.diputadoNombre} a ${m.destino} (${fechasLabel(m)}).`,
    og: {
      kind: "list",
      eyebrow: "misión oficial",
      badge: m.anio ? String(m.anio) : undefined,
    },
  };
});
</script>

<template>
  <div class="page-container flex flex-col gap-8">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
        to="/diputados/misiones"
        variant="ghost"
        color="neutral"
        size="sm"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Todas las misiones oficiales
      </UButton>
    </div>

    <AppDataSkeleton v-if="pending && !mision" variant="member" />

    <UCard v-else-if="!mision">
      <template #header>
        <h1 class="text-xl font-semibold">Misión oficial no encontrada</h1>
      </template>
      <p class="text-muted">
        No se pudo encontrar la misión oficial solicitada.
      </p>
    </UCard>

    <template v-else>
      <UCard>
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="min-w-0 space-y-2">
            <p class="text-sm text-toned">Misión oficial</p>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              {{ mision.destino || "Sin destino" }}
            </h1>
            <p class="text-muted">
              <NuxtLink
                v-if="mision.diputadoId"
                :to="`/diputados/${mision.diputadoId}/misiones`"
                class="hover:underline text-highlighted"
              >
                {{ mision.diputadoNombre }}
              </NuxtLink>
              <span v-else>{{ mision.diputadoNombre }}</span>
              <span class="text-muted"> · {{ fechasLabel(mision) }}</span>
            </p>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <UBadge v-if="mision.anio" color="neutral" variant="subtle">
                {{ mision.anio }}
              </UBadge>
              <UBadge v-if="mision.bloque" color="neutral" variant="outline">
                {{ mision.bloque }}
              </UBadge>
              <UBadge
                v-if="formatMisionMonto(monto) !== '—'"
                color="neutral"
                variant="soft"
              >
                {{ formatMisionMonto(monto) }}
              </UBadge>
            </div>
          </div>

          <div v-if="recursoPageUrl" class="shrink-0">
            <UButton
              :to="recursoPageUrl"
              target="_blank"
              external
              color="neutral"
              variant="outline"
              icon="i-lucide-external-link"
              label="Ver en datos HCDN"
              size="sm"
            />
          </div>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UCard class="lg:col-span-2">
          <template #header>
            <h2 class="text-base font-semibold">Detalle</h2>
          </template>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt class="text-muted">Fecha</dt>
              <dd class="font-medium whitespace-nowrap">
                {{ fechasLabel(mision) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">Diputado/a</dt>
              <dd class="font-medium">
                <NuxtLink
                  v-if="mision.diputadoId"
                  :to="`/diputados/${mision.diputadoId}`"
                  class="hover:underline"
                >
                  {{ mision.diputadoNombre }}
                </NuxtLink>
                <span v-else>{{ mision.diputadoNombre }}</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">Destino</dt>
              <dd class="font-medium">{{ mision.destino || "—" }}</dd>
            </div>
            <div>
              <dt class="text-muted">Monto / viáticos</dt>
              <dd class="font-medium tabular-nums">
                {{ formatMisionMonto(monto) }}
              </dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-muted">Motivo</dt>
              <dd class="font-medium whitespace-normal">
                {{ mision.motivo || "—" }}
              </dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-muted">Institución que invita</dt>
              <dd class="font-medium whitespace-normal">
                {{ mision.institucion || "—" }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">Bloque (al momento)</dt>
              <dd class="font-medium">{{ mision.bloque || "—" }}</dd>
            </div>
            <div>
              <dt class="text-muted">Recurso HCDN</dt>
              <dd class="font-medium">
                {{ mision.recursoNombre || "—" }}
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">Fuente oficial</h2>
          </template>
          <div class="space-y-3 text-sm">
            <p class="text-muted">
              Los datos salen del dataset abierto de misiones oficiales de la
              HCDN. No hay PDF individual: el original es un CSV por semestre.
            </p>
            <ul class="space-y-2">
              <li v-if="recursoPageUrl">
                <a
                  :href="recursoPageUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 underline hover:text-highlighted"
                >
                  <UIcon name="i-lucide-external-link" class="size-3.5" />
                  Página del recurso en datos.hcdn.gob.ar
                </a>
              </li>
              <li v-if="csvUrl">
                <a
                  :href="csvUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 underline hover:text-highlighted"
                >
                  <UIcon name="i-lucide-file-spreadsheet" class="size-3.5" />
                  CSV original
                </a>
              </li>
              <li>
                <a
                  :href="MISIONES_FUENTE_URL_DIPUTADOS"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 underline hover:text-highlighted"
                >
                  <UIcon name="i-lucide-database" class="size-3.5" />
                  Dataset misiones-oficiales
                </a>
              </li>
            </ul>
            <div v-if="mision.diputadoId" class="pt-2 border-t border-default">
              <NuxtLink
                :to="`/diputados/${mision.diputadoId}/misiones`"
                class="inline-flex items-center gap-1.5 text-sm hover:underline"
              >
                Ver todas las misiones oficiales de
                {{ mision.diputadoNombre }}
                <UIcon name="i-lucide-arrow-right" class="size-3.5" />
              </NuxtLink>
            </div>
            <p class="text-xs text-muted break-all">
              Id: {{ mision.id }}
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
