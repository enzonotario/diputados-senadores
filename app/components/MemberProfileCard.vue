<script setup lang="ts">
import type { ChamberId } from "@/lib/chamber";
import { formatDate } from "@/lib/utils";
import type { CareerCargo } from "@/utils/memberCareer";
import {
  formatDuration,
  type ProfileFactSection,
  type ProfileHighlight,
} from "@/utils/memberProfile";

const props = defineProps<{
  name: string;
  foto?: string | null;
  /** Foto chica (p. ej. GIF 88×88 del Senado): centrada, sin estirar. */
  smallFoto?: boolean;
  /** "Diputado Nacional", "Senadora Nacional", … */
  cargo: string;
  provincia?: string | null;
  group?: { label: string; to?: string | null } | null;
  activo: boolean;
  mandato?: { inicio?: string | null; fin?: string | null } | null;
  highlights?: ProfileHighlight[];
  sections?: ProfileFactSection[];
  career?: CareerCargo[];
  chamber: ChamberId;
}>();

const DAY_MS = 86_400_000;

const mandatoProgress = computed(() => {
  const inicio = props.mandato?.inicio ? new Date(props.mandato.inicio) : null;
  const fin = props.mandato?.fin ? new Date(props.mandato.fin) : null;
  if (!inicio || !fin || Number.isNaN(+inicio) || Number.isNaN(+fin)) {
    return null;
  }
  if (fin <= inicio) return null;

  const now = Date.now();
  const pct = Math.min(
    100,
    Math.max(0, ((now - +inicio) / (+fin - +inicio)) * 100),
  );
  const restanDias = Math.ceil((+fin - now) / DAY_MS);

  let status: string;
  if (now < +inicio) status = `Asume el ${formatDate(props.mandato!.inicio!)}`;
  else if (!props.activo || restanDias <= 0) status = "Mandato finalizado";
  else status = `Restan ${formatDuration(restanDias)}`;

  return {
    pct: props.activo ? pct : 100,
    inicio: formatDate(props.mandato!.inicio!),
    fin: formatDate(props.mandato!.fin!),
    status,
  };
});

const visibleHighlights = computed(() =>
  (props.highlights || []).filter((h) => h.value),
);
</script>

<template>
  <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
    <div class="grid md:grid-cols-[15rem_1fr] lg:grid-cols-[17rem_1fr]">
      <div
        v-if="smallFoto"
        class="flex items-center justify-center bg-elevated p-8"
      >
        <NuxtImg
          :src="foto || '/placeholder-user.jpg'"
          :alt="name"
          width="128"
          height="128"
          class="size-32 rounded-full object-cover shadow-md ring-4 ring-default"
          loading="eager"
        />
      </div>
      <div
        v-else
        class="relative h-80 sm:h-96 md:h-auto md:min-h-80 overflow-hidden bg-elevated"
      >
        <NuxtImg
          :src="foto || '/placeholder-user.jpg'"
          :alt="name"
          width="544"
          height="680"
          sizes="100vw md:240px lg:272px"
          class="absolute inset-0 size-full object-cover object-top"
          loading="eager"
        />
        <div
          class="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/50 to-transparent md:hidden"
        />
      </div>

      <div class="flex min-w-0 flex-col gap-6 p-6 lg:p-8">
        <header class="flex items-start justify-between gap-4">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="text-xs font-semibold uppercase tracking-wider text-primary"
              >
                {{ cargo }}
              </span>
              <UBadge
                :color="activo ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
                :icon="activo ? 'i-lucide-circle-check' : 'i-lucide-history'"
              >
                {{ activo ? "En funciones" : "Mandato cumplido" }}
              </UBadge>
            </div>

            <h1
              class="text-3xl font-bold tracking-tight text-highlighted text-balance"
            >
              {{ name }}
            </h1>

            <p
              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted"
            >
              <span v-if="provincia" class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-4" />
                {{ provincia }}
              </span>
              <span v-if="provincia && group" aria-hidden="true">·</span>
              <template v-if="group">
                <NuxtLink
                  v-if="group.to"
                  :to="group.to"
                  class="font-medium text-toned hover:underline"
                >
                  {{ group.label }}
                </NuxtLink>
                <span v-else class="font-medium text-toned">
                  {{ group.label }}
                </span>
              </template>
            </p>
          </div>

          <slot name="logo" />
        </header>

        <dl
          v-if="visibleHighlights.length"
          class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4"
        >
          <div
            v-for="item in visibleHighlights"
            :key="item.label"
            class="min-w-0"
          >
            <dt class="text-xs text-muted">{{ item.label }}</dt>
            <dd class="text-2xl font-semibold tabular-nums text-highlighted">
              <NuxtLink v-if="item.to" :to="item.to" class="hover:underline">
                {{ item.value }}
              </NuxtLink>
              <template v-else>{{ item.value }}</template>
            </dd>
            <dd
              v-if="item.hint"
              class="text-xs text-toned line-clamp-2"
              :title="item.hint"
            >
              {{ item.hint }}
            </dd>
          </div>
        </dl>

        <div v-if="mandatoProgress" class="space-y-2">
          <div class="flex items-baseline justify-between gap-3 text-xs">
            <span class="font-medium text-toned">Mandato</span>
            <span class="text-muted">{{ mandatoProgress.status }}</span>
          </div>
          <UProgress
            :model-value="mandatoProgress.pct"
            size="sm"
            :color="activo ? 'primary' : 'neutral'"
          />
          <div
            class="flex justify-between gap-3 text-xs tabular-nums text-muted"
          >
            <span>{{ mandatoProgress.inicio }}</span>
            <span>{{ mandatoProgress.fin }}</span>
          </div>
        </div>

        <MemberProfileFacts
          v-if="sections?.length"
          :sections="sections"
          class="border-t border-default pt-6"
        />

        <MemberCareerTimeline
          v-if="career?.length"
          :cargos="career"
          :chamber="chamber"
          class="border-t border-default pt-6"
        />
      </div>
    </div>
  </UCard>
</template>
