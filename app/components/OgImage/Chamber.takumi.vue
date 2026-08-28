<script setup lang="ts">
/**
 * Template OG Takumi — Nuxt OG Image (ver https://takumi.kane.tw/docs/integration/nuxt).
 *
 * `votes` es `afirmativos:negativos:abstenciones:ausentes`.
 * `hemiciclo` agrupado: `45:14b8a6,30:ef4444` o recinto diputados: `r:aann...`.
 */
import {
  decodeOgHemiciclo,
  layoutOgHemiciclo,
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

const hemicicloLayout = computed(() => {
  const raw = props.hemiciclo;
  if (isOgRecintoHemiciclo(raw)) {
    return layoutOgRecintoHemiciclo(raw, isActa.value ? 248 : 280);
  }
  const groups = decodeOgHemiciclo(raw);
  if (!groups.length) return null;
  return layoutOgHemiciclo(groups);
});

const showHemiciclo = computed(() => Boolean(hemicicloLayout.value?.seats.length));

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
  isActa.value ? wrapOgActaTitle(props.title) : [props.title],
);
</script>

<template>
  <div
    class="relative flex h-full w-full overflow-hidden"
    :style="{
      background: `linear-gradient(135deg, #ffffff 0%, #ffffff 42%, ${CELESTE}14 72%, ${CELESTE}28 100%)`,
      color: INK,
    }"
  >
    <div
      class="absolute bottom-0 left-0 top-0 w-3"
      :style="{ background: accent }"
    />

    <!-- Layout acta: columna (título ancho completo + hemiciclo abajo) -->
    <div
      v-if="isActa"
      class="relative flex h-full w-full flex-col pl-[4.25rem] pr-14 py-7"
    >
      <div class="flex w-full items-center justify-between">
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
            class="text-[22px] font-semibold uppercase tracking-[0.08em]"
            :style="{ color: `${INK}99` }"
          >
            {{ eyebrow }}
          </div>
        </div>
        <div
          v-if="badge"
          class="rounded-full px-4 py-2 text-[22px] font-bold tracking-wide text-white"
          :style="{ background: accent }"
        >
          {{ badge }}
        </div>
      </div>

      <div class="mt-3 w-full">
        <div class="flex w-full flex-col gap-0.5">
          <div
            v-for="(line, i) in actaTitleLines"
            :key="i"
            class="w-full text-[20px] font-bold leading-[1.2] tracking-tight"
            :style="{ color: INK }"
          >
            {{ line }}
          </div>
        </div>
        <div
          v-if="footerLeft"
          class="mt-1.5 text-[16px] font-semibold tabular-nums"
          :style="{ color: `${INK}99` }"
        >
          {{ footerLeft }}
        </div>
      </div>

      <div
        v-if="hemicicloLayout"
        class="mt-2 flex w-full flex-1 items-center justify-center"
      >
        <div
          class="relative"
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
              boxShadow: `0 0 0 0.5px ${INK}1a`,
            }"
          />
        </div>
      </div>

      <div class="mt-auto flex w-full flex-col gap-4">
        <div v-if="showVotes" class="flex items-end gap-7">
          <div
            v-for="row in voteRows"
            :key="row.key"
            class="flex items-center gap-2.5"
          >
            <div
              class="h-4 w-4 rounded-full"
              :style="{ background: row.color }"
            />
            <div class="flex flex-col">
              <div
                class="text-[28px] font-extrabold leading-none tabular-nums"
                :style="{ color: row.color }"
              >
                {{ row.count }}
              </div>
              <div
                class="mt-0.5 text-[14px] font-semibold uppercase tracking-[0.05em]"
                :style="{ color: `${INK}99` }"
              >
                {{ row.label }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex w-full justify-end">
          <div
            class="flex items-baseline gap-0 text-[24px] font-semibold"
          >
            <span :style="{ color: INK }">{{ brand }}</span>
            <span :style="{ color: `${INK}80` }">.argentinadatos.com</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout general (home, miembro, listado, …) -->
    <div
      v-else
      class="relative flex h-full w-full flex-col justify-between px-16 py-10 pl-[4.25rem]"
    >
      <div class="flex w-full flex-col gap-6">
        <div class="flex w-full items-center justify-between">
          <div class="flex items-center gap-5">
            <img
              :src="resolvedLogo"
              :alt="brand"
              width="96"
              height="96"
              class="h-24 w-24 object-contain"
            />
            <div
              v-if="eyebrow"
              class="text-[26px] font-semibold uppercase tracking-[0.08em]"
              :style="{ color: `${INK}99` }"
            >
              {{ eyebrow }}
            </div>
          </div>
          <div
            v-if="badge"
            class="rounded-full px-5 py-2.5 text-[24px] font-bold tracking-wide text-white"
            :style="{ background: accent }"
          >
            {{ badge }}
          </div>
        </div>

        <div
          class="flex w-full items-start gap-10"
          :class="resolvedPhoto || showHemiciclo ? 'justify-between' : ''"
        >
          <div
            class="flex min-w-0 flex-col gap-4"
            :class="
              resolvedPhoto || showHemiciclo ? 'max-w-[520px]' : 'max-w-[1020px]'
            "
          >
            <div
              class="text-[48px] font-extrabold leading-[1.12] tracking-tight"
              :style="{ color: INK }"
            >
              {{ title }}
            </div>

            <div
              v-if="!showVotes && description"
              class="text-[24px] font-medium leading-snug"
              :style="{ color: `${INK}b3` }"
            >
              {{ description }}
            </div>
          </div>

          <img
            v-if="resolvedPhoto"
            :src="resolvedPhoto"
            :alt="title"
            width="280"
            height="280"
            class="h-[280px] w-[280px] shrink-0 rounded-full object-cover"
            :style="{
              border: `6px solid ${INK}1a`,
              boxShadow: `0 18px 40px ${INK}26`,
            }"
          />

          <div
            v-else-if="hemicicloLayout"
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

      <div class="flex w-full flex-col gap-7">
        <div v-if="showVotes" class="flex items-end gap-10">
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
                class="text-[40px] font-extrabold leading-none tracking-tight tabular-nums"
                :style="{ color: row.color }"
              >
                {{ row.count }}
              </div>
              <div
                class="mt-1 text-[18px] font-semibold uppercase tracking-[0.06em]"
                :style="{ color: `${INK}99` }"
              >
                {{ row.label }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex w-full items-baseline justify-between gap-8">
          <div
            class="min-w-0 text-[26px] font-semibold"
            :style="{ color: `${INK}b3` }"
          >
            {{ footerLeft }}
          </div>
          <div
            class="flex shrink-0 items-baseline gap-0 text-[28px] font-semibold"
          >
            <span :style="{ color: INK }">{{ brand }}</span>
            <span :style="{ color: `${INK}80` }">.argentinadatos.com</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
