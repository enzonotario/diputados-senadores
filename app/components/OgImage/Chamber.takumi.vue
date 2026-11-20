<script setup lang="ts">
/**
 * Template OG Takumi — Nuxt OG Image (ver https://takumi.kane.tw/docs/integration/nuxt).
 *
 * `votes` es `afirmativos:negativos:abstenciones:ausentes`.
 * `hemiciclo` agrupado: `45:14b8a6,30:ef4444` o recinto diputados: `r:aann...`.
 *
 * Lienzo 1200×600 (2:1, X). X superpone el dominio abajo a la izquierda
 * (~480×70 px): esa zona queda siempre vacía; la marca va abajo a la derecha.
 */
import {
  decodeOgHemiciclo,
  layoutOgHemiciclo,
  type OgHemicicloLayout,
} from "@/lib/hemiciclo-layout";
import {
  isOgRecintoHemiciclo,
  layoutOgRecintoHemiciclo,
} from "@/lib/og-recinto";
import { decodeOgVotes, OG_BAR_ACCENT, wrapOgActaTitle } from "@/lib/og";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    brand?: string;
    logoSrc?: string;
    eyebrow?: string;
    badge?: string;
    accent?: string;
    kind?: string;
    footerLeft?: string;
    votes?: string;
    photoSrc?: string;
    hemiciclo?: string;
  }>(),
  {
    title: "ArgentinaDatos.com",
    description: "",
    brand: "senadores",
    logoSrc: "",
    eyebrow: "",
    badge: "",
    accent: OG_BAR_ACCENT,
    kind: "",
    footerLeft: "",
    votes: "",
    photoSrc: "",
    hemiciclo: "",
  },
);

const CELESTE = "#75AADB";
const INK = "#111111";

/**
 * `#rrggbb` con opacidad `alpha`, ya mezclado sobre blanco → `rgb()` sólido.
 * Takumi con devicePixelRatio 2 pinta mal los colores con alpha (hex de 8
 * dígitos o rgba) en gradientes y texto: usar siempre colores opacos.
 */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * alpha);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

const VOTE_COLORS = {
  afirmativo: "#14b8a6",
  negativo: "#ef4444",
  abstencion: "#3b82f6",
  ausente: "#6b7280",
} as const;

const isActa = computed(() => props.kind === "acta");

const resolvedLogo = computed(() => {
  const explicit = (props.logoSrc || "").trim();
  if (explicit) return explicit;
  const brand = (props.brand || "").toLowerCase();
  if (brand.includes("diput")) return "/assets/diputados.png";
  if (brand.includes("congreso") || brand.includes("argentina")) {
    return "/assets/argentinadatos.png";
  }
  return "/assets/senado.png";
});

const resolvedPhoto = computed(() => (props.photoSrc || "").trim());

/** Escala el layout para que entre en `maxW × maxH` (sin deformar). */
function fitLayout(
  layout: OgHemicicloLayout | null,
  maxW: number,
  maxH: number,
): OgHemicicloLayout | null {
  if (!layout?.seats.length) return null;
  const k = Math.min(maxW / layout.width, maxH / layout.height);
  return {
    width: Math.round(layout.width * k),
    height: Math.round(layout.height * k),
    seats: layout.seats.map((seat) => ({
      ...seat,
      x: seat.x * k,
      y: seat.y * k,
      r: seat.r * k,
    })),
  };
}

const hemicicloLayout = computed(() => {
  const raw = props.hemiciclo;
  const [maxW, maxH] = isActa.value ? [520, 250] : [440, 260];
  if (isOgRecintoHemiciclo(raw)) {
    return fitLayout(layoutOgRecintoHemiciclo(raw, maxH), maxW, maxH);
  }
  const groups = decodeOgHemiciclo(raw);
  if (!groups.length) return null;
  return fitLayout(layoutOgHemiciclo(groups), maxW, maxH);
});

const voteRows = computed(() => {
  const decoded = decodeOgVotes(props.votes);
  if (!decoded) return [];
  const rows = [
    {
      key: "afirmativo",
      label: "A favor",
      count: decoded.afirmativos,
      color: VOTE_COLORS.afirmativo,
    },
    {
      key: "negativo",
      label: "En contra",
      count: decoded.negativos,
      color: VOTE_COLORS.negativo,
    },
    {
      key: "abstencion",
      label: "Abstención",
      count: decoded.abstenciones,
      color: VOTE_COLORS.abstencion,
    },
  ];
  if (isActa.value || decoded.ausentes > 0) {
    rows.push({
      key: "ausente",
      label: "Ausentes",
      count: decoded.ausentes,
      color: VOTE_COLORS.ausente,
    });
  }
  return rows;
});

const showVotes = computed(() => voteRows.value.length > 0);

const actaTitleLines = computed(() =>
  isActa.value ? wrapOgActaTitle(props.title, 3, 58) : [props.title],
);
</script>

<template>
  <div
    class="relative flex h-full w-full overflow-hidden"
    :style="{
      background: `linear-gradient(135deg, #ffffff 0%, #ffffff 45%, ${rgba(CELESTE, 0.08)} 75%, ${rgba(CELESTE, 0.18)} 100%)`,
      color: INK,
    }"
  >
    <div
      class="absolute bottom-0 left-0 top-0 w-3"
      :style="{ background: accent }"
    />

    <!-- Marca: siempre abajo a la derecha (abajo-izq. lo tapa X) -->
    <div
      class="absolute bottom-9 right-14 flex items-baseline text-[26px] font-semibold"
    >
      <span :style="{ color: INK }">{{ brand }}</span>
      <span :style="{ color: `${rgba(INK, 0.5)}` }">.argentinadatos.com</span>
    </div>

    <!-- Acta: título arriba, conteos a la izquierda, hemiciclo a la derecha -->
    <div
      v-if="isActa"
      class="relative flex h-full w-full flex-col pb-[92px] pl-[4.25rem] pr-14 pt-10"
    >
      <div class="flex w-full items-center justify-between">
        <div class="flex items-center gap-4">
          <img
            :src="resolvedLogo"
            :alt="brand"
            width="64"
            height="64"
            class="h-16 w-16 object-contain"
          />
          <div
            v-if="eyebrow"
            class="text-[22px] font-semibold uppercase tracking-[0.08em]"
            :style="{ color: `${rgba(INK, 0.6)}` }"
          >
            {{ eyebrow }}
          </div>
        </div>
        <div
          v-if="badge"
          class="rounded-full px-5 py-2 text-[24px] font-bold tracking-wide text-white"
          :style="{ background: accent }"
        >
          {{ badge }}
        </div>
      </div>

      <div class="mt-5 flex w-full flex-col">
        <div
          v-for="(line, i) in actaTitleLines"
          :key="i"
          class="w-full text-[30px] font-bold leading-[1.18] tracking-tight"
          :style="{ color: INK }"
        >
          {{ line }}
        </div>
        <div
          v-if="footerLeft"
          class="mt-2 text-[20px] font-semibold tabular-nums"
          :style="{ color: `${rgba(INK, 0.6)}` }"
        >
          {{ footerLeft }}
        </div>
      </div>

      <div class="mt-4 flex w-full flex-1 items-center justify-between gap-8">
        <div v-if="showVotes" class="flex w-[460px] flex-wrap gap-x-8 gap-y-4">
          <div
            v-for="row in voteRows"
            :key="row.key"
            class="flex w-[200px] items-center gap-3"
          >
            <div
              class="h-5 w-5 shrink-0 rounded-full"
              :style="{ background: row.color }"
            />
            <div class="flex flex-col">
              <div
                class="text-[44px] font-extrabold leading-none tabular-nums"
                :style="{ color: row.color }"
              >
                {{ row.count }}
              </div>
              <div
                class="mt-1 text-[15px] font-semibold uppercase tracking-[0.06em]"
                :style="{ color: `${rgba(INK, 0.6)}` }"
              >
                {{ row.label }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="hemicicloLayout"
          class="relative shrink-0"
          :style="{
            width: `${hemicicloLayout.width}px`,
            height: `${hemicicloLayout.height}px`,
          }"
        >
          <div
            v-for="(seat, i) in hemicicloLayout.seats"
            :key="i"
            class="absolute rounded-full"
            :style="{
              left: `${seat.x - seat.r}px`,
              top: `${seat.y - seat.r}px`,
              width: `${seat.r * 2}px`,
              height: `${seat.r * 2}px`,
              backgroundColor: seat.color,
            }"
          />
        </div>
      </div>
    </div>

    <!-- General (home, miembro, listado, …) -->
    <div
      v-else
      class="relative flex h-full w-full items-center justify-between gap-10 pb-[92px] pl-[4.25rem] pr-14 pt-10"
    >
      <div class="flex h-full min-w-0 flex-1 flex-col">
        <div class="flex items-center gap-4">
          <img
            :src="resolvedLogo"
            :alt="brand"
            width="72"
            height="72"
            class="h-[72px] w-[72px] object-contain"
          />
          <div
            v-if="eyebrow"
            class="text-[24px] font-semibold uppercase tracking-[0.08em]"
            :style="{ color: `${rgba(INK, 0.6)}` }"
          >
            {{ eyebrow }}
          </div>
        </div>

        <div class="flex flex-1 flex-col justify-center gap-4">
          <div
            class="text-[54px] font-extrabold leading-[1.08] tracking-tight"
            :style="{ color: INK }"
          >
            {{ title }}
          </div>

          <div v-if="badge" class="flex">
            <div
              class="rounded-full px-5 py-2 text-[24px] font-bold tracking-wide text-white"
              :style="{ background: accent }"
            >
              {{ badge }}
            </div>
          </div>

          <div v-if="showVotes" class="mt-2 flex items-end gap-9">
            <div
              v-for="row in voteRows"
              :key="row.key"
              class="flex items-center gap-3"
            >
              <div
                class="h-5 w-5 rounded-full"
                :style="{ background: row.color }"
              />
              <div class="flex flex-col">
                <div
                  class="text-[40px] font-extrabold leading-none tabular-nums"
                  :style="{ color: row.color }"
                >
                  {{ row.count }}
                </div>
                <div
                  class="mt-1 text-[16px] font-semibold uppercase tracking-[0.06em]"
                  :style="{ color: `${rgba(INK, 0.6)}` }"
                >
                  {{ row.label }}
                </div>
              </div>
            </div>
          </div>
          <div
            v-else-if="description && !resolvedPhoto"
            class="text-[24px] font-medium leading-snug"
            :style="{ color: `${rgba(INK, 0.7)}` }"
          >
            {{ description }}
          </div>

          <div
            v-if="footerLeft"
            class="text-[22px] font-semibold"
            :style="{ color: `${rgba(INK, 0.6)}` }"
          >
            {{ footerLeft }}
          </div>
        </div>
      </div>

      <img
        v-if="resolvedPhoto"
        :src="resolvedPhoto"
        :alt="title"
        width="380"
        height="380"
        class="mb-[-52px] h-[380px] w-[380px] shrink-0 rounded-full object-cover"
        :style="{
          border: `8px solid #ffffff`,
          boxShadow: `0 24px 60px ${rgba(INK, 0.18)}`,
        }"
      />

      <div
        v-else-if="hemicicloLayout"
        class="relative mb-[-52px] shrink-0"
        :style="{
          width: `${hemicicloLayout.width}px`,
          height: `${hemicicloLayout.height}px`,
        }"
      >
        <div
          v-for="(seat, i) in hemicicloLayout.seats"
          :key="i"
          class="absolute rounded-full"
          :style="{
            left: `${seat.x - seat.r}px`,
            top: `${seat.y - seat.r}px`,
            width: `${seat.r * 2}px`,
            height: `${seat.r * 2}px`,
            backgroundColor: seat.color,
          }"
        />
      </div>
    </div>
  </div>
</template>
