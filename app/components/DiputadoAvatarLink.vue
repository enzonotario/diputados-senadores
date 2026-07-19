<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { bloquePath } from "@/utils/bloque";
import { getVotoTipoConfig } from "@/utils/votoTipo";

const props = withDefaults(
  defineProps<{
    diputado: Diputado;
    labelMode?: "apellido" | "nombreCompleto";
    size?: "md" | "lg" | "xl";
    /** Anillo de color según tipoVoto (vistas de acta) */
    showVotoHalo?: boolean;
  }>(),
  {
    labelMode: "apellido",
    size: "xl",
    showVotoHalo: false,
  },
);

const displayName = computed(() => {
  const d = props.diputado;
  const full =
    d.nombreCompleto?.trim() ||
    [d.apellido, d.nombre].filter(Boolean).join(", ").trim();

  if (props.labelMode === "nombreCompleto") {
    return full || "—";
  }

  if (d.apellido?.trim()) return d.apellido.trim();
  if (full.includes(",")) return full.split(",")[0].trim();
  return full || "—";
});

const fullName = computed(() => {
  const d = props.diputado;
  return (
    d.nombreCompleto?.trim() ||
    [d.apellido, d.nombre].filter(Boolean).join(", ").trim() ||
    displayName.value
  );
});

const voto = computed(() => getVotoTipoConfig(props.diputado.tipoVoto));
const hasVoto = computed(() => Boolean(props.diputado.tipoVoto));
</script>

<template>
  <NuxtLink
    :to="`/diputados/${diputado.id}`"
    class="flex flex-col items-center gap-1.5 group w-full max-w-24"
  >
    <UTooltip
      :delay-duration="150"
      :content="{ side: 'top', align: 'center', sideOffset: 10 }"
      :ui="{
        content:
          'h-auto max-w-64 flex-col items-stretch gap-0 rounded-lg px-3 py-2.5 text-left shadow-lg ring ring-default bg-default',
      }"
    >
      <span
        class="relative inline-flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
        :class="showVotoHalo ? ['p-[3px]', voto.haloClass] : ''"
        aria-hidden="true"
      >
        <UAvatar
          :src="diputado.foto || '/placeholder-user.jpg'"
          :alt="
            diputado.nombreCompleto || `${diputado.nombre} ${diputado.apellido}`
          "
          :size="size"
          :class="showVotoHalo ? 'relative ring-2 ring-default' : ''"
        />
      </span>

      <template #content>
        <div class="space-y-1.5">
          <p class="text-sm font-semibold leading-snug text-highlighted">
            {{ fullName }}
          </p>
          <p
            v-if="diputado.bloque"
            class="text-xs leading-snug text-toned"
          >
            <NuxtLink
              v-if="bloquePath(diputado.bloque)"
              :to="bloquePath(diputado.bloque)!"
              class="hover:underline"
              @click.stop
            >
              {{ diputado.bloque }}
            </NuxtLink>
            <template v-else>{{ diputado.bloque }}</template>
          </p>
          <p
            v-if="diputado.provincia"
            class="text-xs leading-snug text-muted"
          >
            {{ diputado.provincia }}
          </p>
          <div
            v-if="hasVoto"
            class="flex items-center gap-1.5 border-t border-default pt-1.5"
          >
            <UIcon
              :name="voto.icon"
              class="size-4 shrink-0"
              :class="voto.iconClass"
            />
            <span
              class="text-xs font-medium"
              :class="voto.textClass"
            >
              {{ voto.label }}
            </span>
          </div>
        </div>
      </template>
    </UTooltip>

    <span class="text-xs text-center truncate w-full">
      {{ displayName }}
    </span>
  </NuxtLink>
</template>
