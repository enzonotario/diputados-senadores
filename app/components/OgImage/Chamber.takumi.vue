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
import {
  decodeOgGrupos,
  decodeOgProvincias,
  OG_PROVINCIAS,
} from "@/lib/og-acta";
import { OG_PROVINCIA_PATHS } from "@/lib/og-provincias-paths";

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
    chamber?: string;
    vista?: string;
    breakdown?: string;
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
    chamber: "",
    vista: "",
    breakdown: "",
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

/**
 * Home: hemiciclo with every legislator's photo, pre-rendered server-side
 * (`/api/og/hemiciclo/:chamber`, dots fallback until photos are cached).
 */
const homeHemicicloSrc = computed(() =>
  props.kind === "home" &&
  (props.chamber === "diputados" || props.chamber === "senadores")
    ? `/api/og/hemiciclo/${props.chamber}`
    : "",
);

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
  const rows: { key: string; label: string; count: number; color: string }[] = [
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

const actaVista = computed(() => (isActa.value ? props.vista : ""));

const actaTitleLines = computed(() => {
  if (!isActa.value) return [props.title];
  if (actaVista.value === "provincias")
    return wrapOgActaTitle(props.title, 4, 32);
  if (actaVista.value) return wrapOgActaTitle(props.title, 2, 58);
  return wrapOgActaTitle(props.title, 3, 58);
});

const VOTE_KEYS = ["afirmativo", "negativo", "abstencion", "ausente"] as const;

/** Stacked segments for 4 counts (a, n, b, u); zero counts dropped. */
function segments(counts: readonly number[]) {
  return VOTE_KEYS.map((key, i) => ({
    key,
    count: counts[i] ?? 0,
    color: VOTE_COLORS[key],
  })).filter((seg) => seg.count > 0);
}

const voteTotal = computed(() =>
  voteRows.value.reduce((sum, row) => sum + row.count, 0),
);

function pct(count: number, total: number) {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
}

const grupos = computed(() => {
  if (actaVista.value !== "grupos") return [];
  const rows = decodeOgGrupos(props.breakdown);
  const max = Math.max(1, ...rows.map((r) => r.counts.reduce((a, b) => a + b)));
  return rows.map((r) => {
    const total = r.counts.reduce((a, b) => a + b, 0);
    return {
      ...r,
      total,
      width: `${Math.max(2, (total / max) * 100)}%`,
      segments: segments(r.counts),
    };
  });
});

/** Tile map: 5 cols × 9 rows (see `OG_PROVINCIAS`). */
const TILE = { w: 98, h: 46, gapX: 6, gapY: 6 };
const tiles = computed(() => {
  if (actaVista.value !== "provincias") return [];
  const data = decodeOgProvincias(props.breakdown);
  return Object.values(OG_PROVINCIAS).map((p) => {
    const counts = data.get(p.abbr) || [0, 0, 0, 0];
    let top = -1;
    counts.forEach((n, i) => {
      if (n > 0 && (top < 0 || n > counts[top]!)) top = i;
    });
    const color = top >= 0 ? VOTE_COLORS[VOTE_KEYS[top]!] : "#d1d5db";
    return {
      abbr: p.abbr,
      left: p.col * (TILE.w + TILE.gapX),
      top: p.row * (TILE.h + TILE.gapY),
      color,
      background: rgba(color, top >= 0 ? 0.14 : 0.4),
      path: OG_PROVINCIA_PATHS[p.abbr] || "",
      segments: segments(counts),
    };
  });
});
const tileMapSize = {
  width: 5 * TILE.w + 4 * TILE.gapX,
  height: 9 * TILE.h + 8 * TILE.gapY,
};
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
    <!-- Acta por provincia: tile map a la derecha (fuera de la zona de X) -->
    <div
      v-if="tiles.length"
      class="absolute right-14 top-9 flex"
      :style="{
        width: `${tileMapSize.width}px`,
        height: `${tileMapSize.height}px`,
      }"
    >
      <div
        v-for="tile in tiles"
        :key="tile.abbr"
        class="absolute flex items-center gap-[6px] rounded-lg py-[3px] pl-1 pr-2"
        :style="{
          left: `${tile.left}px`,
          top: `${tile.top}px`,
          width: `${TILE.w}px`,
          height: `${TILE.h}px`,
          background: tile.background,
          border: `2px solid ${tile.color}`,
        }"
      >
        <!-- Silueta (Terrane, MIT) coloreada por el voto mayoritario -->
        <svg
          v-if="tile.path"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="38"
          height="38"
        >
          <path fill-rule="evenodd" :fill="tile.color" :d="tile.path" />
        </svg>
        <div
          class="flex h-full min-w-0 flex-1 flex-col justify-center gap-[6px]"
        >
          <div
            class="text-[14px] font-extrabold leading-none tracking-wide"
            :style="{ color: INK }"
          >
            {{ tile.abbr }}
          </div>
          <div
            class="flex h-[7px] w-full overflow-hidden rounded-full"
            :style="{ background: '#ffffff' }"
          >
            <div
              v-for="seg in tile.segments"
              :key="seg.key"
              class="h-full"
              :style="{
                flexGrow: seg.count,
                flexBasis: 0,
                background: seg.color,
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isActa"
      class="relative flex h-full w-full flex-col pb-[92px] pl-[4.25rem] pr-14 pt-10"
      :style="
        tiles.length ? { paddingRight: `${tileMapSize.width + 96}px` } : {}
      "
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
          class="w-full font-bold leading-[1.18] tracking-tight"
          :class="tiles.length ? 'text-[26px]' : 'text-[30px]'"
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

      <!-- Por tipo de voto: barra 100% + conteos con % -->
      <div
        v-if="actaVista === 'resultados' && voteTotal > 0"
        class="mt-8 flex w-full flex-col gap-6"
      >
        <div class="flex h-[64px] w-full overflow-hidden rounded-2xl">
          <div
            v-for="row in voteRows.filter((r) => r.count > 0)"
            :key="row.key"
            class="h-full"
            :style="{
              flexGrow: row.count,
              flexBasis: 0,
              background: row.color,
            }"
          />
        </div>
        <div class="flex w-full justify-between">
          <div
            v-for="row in voteRows"
            :key="row.key"
            class="flex items-center gap-3"
          >
            <div
              class="h-5 w-5 shrink-0 rounded-full"
              :style="{ background: row.color }"
            />
            <div class="flex flex-col">
              <div class="flex items-baseline gap-2">
                <div
                  class="text-[44px] font-extrabold leading-none tabular-nums"
                  :style="{ color: row.color }"
                >
                  {{ row.count }}
                </div>
                <div
                  class="text-[22px] font-bold tabular-nums"
                  :style="{ color: `${rgba(INK, 0.5)}` }"
                >
                  {{ pct(row.count, voteTotal) }}
                </div>
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
      </div>

      <!-- Por bloque / partido: barras apiladas por grupo -->
      <div
        v-else-if="grupos.length"
        class="mt-4 flex w-full flex-col gap-[10px]"
      >
        <div class="flex w-full items-center gap-6">
          <div
            v-for="row in voteRows"
            :key="row.key"
            class="flex items-center gap-2 text-[16px] font-semibold"
            :style="{ color: `${rgba(INK, 0.7)}` }"
          >
            <div
              class="h-3 w-3 rounded-full"
              :style="{ background: row.color }"
            />
            <span>{{ row.label }} {{ row.count }}</span>
          </div>
        </div>
        <div
          v-for="g in grupos"
          :key="g.name"
          class="flex h-[26px] w-full items-center gap-4"
        >
          <div class="flex w-[360px] shrink-0 items-center gap-3">
            <div
              class="h-4 w-4 shrink-0 rounded"
              :style="{ background: g.color }"
            />
            <div
              class="text-[19px] font-semibold leading-none"
              :style="{ color: INK }"
            >
              {{
                g.name.length > 30
                  ? `${g.name.slice(0, 29).trimEnd()}…`
                  : g.name
              }}
            </div>
          </div>
          <div class="flex h-full flex-1 items-center gap-3">
            <div
              class="flex h-full overflow-hidden rounded-md"
              :style="{ width: g.width }"
            >
              <div
                v-for="seg in g.segments"
                :key="seg.key"
                class="h-full"
                :style="{
                  flexGrow: seg.count,
                  flexBasis: 0,
                  background: seg.color,
                }"
              />
            </div>
            <div
              class="w-[44px] shrink-0 text-[18px] font-bold tabular-nums"
              :style="{ color: `${rgba(INK, 0.6)}` }"
            >
              {{ g.total }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="mt-4 flex w-full flex-1 items-center justify-between gap-8"
      >
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
            v-else-if="description && !resolvedPhoto && !homeHemicicloSrc"
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
        v-if="homeHemicicloSrc"
        :src="homeHemicicloSrc"
        :alt="title"
        width="600"
        height="316"
        class="mb-[-40px] h-[316px] w-[600px] shrink-0 object-contain"
      />

      <img
        v-else-if="resolvedPhoto"
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
