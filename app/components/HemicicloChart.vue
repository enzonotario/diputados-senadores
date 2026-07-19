<script setup lang="ts">
import { bloquePath } from "@/utils/bloque";
import { partidoPath } from "@/utils/partido";

/** Miembro mínimo para hemiciclo (diputado o senador). */
export type HemicicloMember = {
  id: string;
  foto?: string | null;
  nombreCompleto?: string;
  apellido?: string;
  nombre?: string;
  nombreDePila?: string;
  provincia?: string;
  bloque?: string;
  partido?: string;
  tipoVoto?: string;
};

const props = withDefaults(
  defineProps<{
    /** Preferido: lista unificada */
    members?: HemicicloMember[];
    /** Alias cámara Diputados */
    diputados?: HemicicloMember[];
    /** Alias cámara Senadores */
    senadores?: HemicicloMember[];
    groupColors: Record<string, string>;
    groupBy?: "bloque" | "partido" | "tipoVoto" | ((d: HemicicloMember) => string);
    groupOrder?: string[];
    groupLabel?: (key: string) => string;
    clickable?: boolean;
    showLegend?: boolean;
    groupTo?: (key: string) => string | null | undefined;
    /** Base path para ficha: /diputados | /senadores */
    memberBasePath?: string;
  }>(),
  {
    groupBy: "partido",
    clickable: true,
    showLegend: true,
    memberBasePath: "/senadores",
  },
);

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");
const uid = useId();

const items = computed(
  () => props.members || props.diputados || props.senadores || [],
);

function groupKey(d: HemicicloMember): string {
  if (typeof props.groupBy === "function") return props.groupBy(d);
  if (props.groupBy === "tipoVoto") {
    return (d.tipoVoto || "ausente").toLowerCase();
  }
  if (props.groupBy === "bloque") {
    return d.bloque || "Sin bloque";
  }
  return d.partido || "Sin partido";
}

function colorFor(d: HemicicloMember): string {
  return props.groupColors[groupKey(d)] ?? "#6b7280";
}

function labelFor(key: string): string {
  return props.groupLabel?.(key) ?? key;
}

function groupMeta(d: HemicicloMember) {
  return d.bloque || d.partido || "";
}

function groupMetaPath(d: HemicicloMember) {
  if (d.bloque) return bloquePath(d.bloque);
  if (d.partido) return partidoPath(d.partido);
  return null;
}

const groupConteo = computed(() => {
  const map: Record<string, number> = {};
  for (const d of items.value) {
    const k = groupKey(d);
    map[k] = (map[k] || 0) + 1;
  }
  return map;
});

const groupsOrdenados = computed(() => {
  const keys = Object.keys(groupConteo.value);
  if (props.groupOrder?.length) {
    const order = props.groupOrder;
    return keys.sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      const ra = ia === -1 ? 999 : ia;
      const rb = ib === -1 ? 999 : ib;
      if (ra !== rb) return ra - rb;
      return (groupConteo.value[b] || 0) - (groupConteo.value[a] || 0);
    });
  }
  return keys.sort(
    (a, b) => (groupConteo.value[b] || 0) - (groupConteo.value[a] || 0),
  );
});

// --- Geometría del hemiciclo (escala según cantidad de bancas) ---
const isDesktop = useMediaQuery("(min-width: 768px)");

const geom = computed(() => {
  const n = Math.max(1, items.value.length);
  const desktop = isDesktop.value;

  // Senado (~72) → pocas filas y bancas grandes; más miembros → más filas
  const targetRows = n <= 36 ? 3 : n <= 90 ? 4 : n <= 150 ? 6 : n <= 220 ? 7 : 8;
  const compact = n <= 100;

  const W = desktop ? (compact ? 1080 : 1280) : compact ? 880 : 1000;
  const H = desktop ? (compact ? 580 : 680) : compact ? 440 : 500;
  const cx = W / 2;
  const cy = H - 8;

  const angleMargin =
    (((desktop ? (compact ? 6 : 4) : 8) * Math.PI) / 180);
  const aLeft = Math.PI - angleMargin;
  const aRight = angleMargin;
  const sweep = aLeft - aRight;

  const maxDot = desktop ? (compact ? 30 : 17) : compact ? 22 : 13;
  const minDot = desktop ? (compact ? 18 : 14) : compact ? 14 : 11;

  type Geom = {
    W: number;
    H: number;
    cx: number;
    cy: number;
    innerR: number;
    outerR: number;
    numRows: number;
    dotR: number;
    pitch: number;
    aLeft: number;
    aRight: number;
    sweep: number;
  };

  function tryGeom(dotR: number, outerScale = 1): Geom | null {
    const gap = Math.max(3, Math.round(dotR * 0.22));
    const pitch = 2 * dotR + gap;
    const pad = dotR + 12;
    const outerRMax = Math.min(cx - pad, cy - pad);
    const outerR = outerRMax * outerScale;

    let numRows = targetRows;
    // Evitar hemiciclo demasiado "grueso" radialmente
    while (numRows > 2 && (numRows - 1) * pitch > outerR * 0.5) {
      numRows -= 1;
    }

    const innerR = outerR - (numRows - 1) * pitch;
    if (innerR < Math.max(56, pad + 16)) return null;

    const radii = Array.from({ length: numRows }, (_, row) =>
      numRows === 1
        ? innerR
        : innerR + ((outerR - innerR) * row) / (numRows - 1),
    );
    const capacity = radii.reduce(
      (sum, r) => sum + Math.max(1, Math.floor((r * sweep) / pitch) + 1),
      0,
    );
    if (capacity < n) return null;

    return {
      W,
      H,
      cx,
      cy,
      innerR,
      outerR,
      numRows,
      dotR,
      pitch,
      aLeft,
      aRight,
      sweep,
    };
  }

  function capacityOf(g: Geom): number {
    const radii = Array.from({ length: g.numRows }, (_, row) =>
      g.numRows === 1
        ? g.innerR
        : g.innerR + ((g.outerR - g.innerR) * row) / (g.numRows - 1),
    );
    return radii.reduce(
      (sum, r) => sum + Math.max(1, Math.floor((r * g.sweep) / g.pitch) + 1),
      0,
    );
  }

  // La banca más grande que todavía entra a escala completa
  let best: Geom | null = null;
  for (let dotR = maxDot; dotR >= minDot; dotR -= 1) {
    const g = tryGeom(dotR, 1);
    if (g) {
      best = g;
      break;
    }
  }

  if (best) {
    // Compactar el radio si sobra mucha capacidad (evita huecos con pocos senadores)
    const idealCap = Math.ceil(n * 1.1);
    if (capacityOf(best) > idealCap) {
      let lo = 0.55;
      let hi = 1;
      let tight = best;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        const g = tryGeom(best.dotR, mid);
        if (g && capacityOf(g) >= n) {
          tight = g;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      best = tight;
    }
    return best;
  }

  // Fallback: forzar minDot aunque quede un poco justo
  const gap = Math.max(3, Math.round(minDot * 0.22));
  const pitch = 2 * minDot + gap;
  const pad = minDot + 12;
  const outerR = Math.min(cx - pad, cy - pad);
  const numRows = Math.max(2, targetRows);
  const innerR = Math.max(pad + 24, outerR - (numRows - 1) * pitch);

  return {
    W,
    H,
    cx,
    cy,
    innerR,
    outerR,
    numRows,
    dotR: minDot,
    pitch,
    aLeft,
    aRight,
    sweep,
  };
});

const W = computed(() => geom.value.W);
const H = computed(() => geom.value.H);
const DOT_R = computed(() => geom.value.dotR);

function seatXY(r: number, p: number, g = geom.value) {
  const angle = g.aLeft - p * (g.aLeft - g.aRight);
  return {
    x: g.cx + r * Math.cos(angle),
    y: g.cy - r * Math.sin(angle),
  };
}

function rowRadii(g = geom.value) {
  return Array.from({ length: g.numRows }, (_, row) =>
    g.numRows === 1
      ? g.innerR
      : g.innerR + ((g.outerR - g.innerR) * row) / (g.numRows - 1),
  );
}

/** Capacidad máxima de una fila sin solapar (arco / pitch) */
function rowCapacity(r: number, g = geom.value) {
  const arc = r * g.sweep;
  return Math.max(1, Math.floor(arc / g.pitch) + 1);
}

const seatsPerRow = computed(() => {
  const g = geom.value;
  const total = items.value.length;
  const radii = rowRadii(g);
  const caps = radii.map((r) => rowCapacity(r, g));
  const counts = Array(g.numRows).fill(0) as number[];

  if (!total) return counts;

  // Reparto proporcional al radio, respetando capacidad de cada fila
  const totalR = radii.reduce((s, r) => s + r, 0);
  let remaining = total;

  for (let i = 0; i < g.numRows; i++) {
    const ideal = Math.round((total * (radii[i] ?? 0)) / totalR);
    const n = Math.min(caps[i] ?? 1, Math.max(0, ideal));
    counts[i] = n;
    remaining -= n;
  }

  // Excedentes → filas con capacidad libre (de afuera hacia adentro)
  for (let i = g.numRows - 1; i >= 0 && remaining > 0; i--) {
    const room = (caps[i] ?? 0) - (counts[i] ?? 0);
    const add = Math.min(room, remaining);
    counts[i] = (counts[i] ?? 0) + add;
    remaining -= add;
  }

  // Si aún sobran (muy densos), forzar en las filas exteriores
  for (let i = g.numRows - 1; i >= 0 && remaining > 0; i--) {
    counts[i] = (counts[i] ?? 0) + 1;
    remaining -= 1;
  }

  // Ajuste fino si nos pasamos por el redondeo
  let diff = total - counts.reduce((s, n) => s + n, 0);
  for (let i = g.numRows - 1; i >= 0 && diff !== 0; i--) {
    if (diff > 0) {
      const room = (caps[i] ?? Infinity) - (counts[i] ?? 0);
      if (room <= 0 && caps[i] !== undefined) continue;
      counts[i] = (counts[i] ?? 0) + 1;
      diff -= 1;
    } else if ((counts[i] ?? 0) > 0) {
      counts[i] = (counts[i] ?? 0) - 1;
      diff += 1;
    }
  }

  return counts;
});

const allSeats = computed(() => {
  type Seat = { x: number; y: number; p: number };
  const g = geom.value;
  const seats: Seat[] = [];
  const counts = seatsPerRow.value;
  const radii = rowRadii(g);

  for (let row = 0; row < g.numRows; row++) {
    const r = radii[row] ?? g.innerR;
    const n = counts[row] ?? 0;
    for (let j = 0; j < n; j++) {
      const p = n > 1 ? j / (n - 1) : 0.5;
      const { x, y } = seatXY(r, p, g);
      seats.push({ x, y, p });
    }
  }

  return seats.sort((a, b) => a.p - b.p);
});

const membersSorted = computed(() => {
  const order: Record<string, number> = {};
  groupsOrdenados.value.forEach((g, i) => {
    order[g] = i;
  });
  return [...items.value].sort((a, b) => {
    const diff = (order[groupKey(a)] ?? 999) - (order[groupKey(b)] ?? 999);
    if (diff !== 0) return diff;
    return (a.nombreCompleto ?? "").localeCompare(b.nombreCompleto ?? "");
  });
});

type Punto = {
  x: number;
  y: number;
  p: number;
  member: HemicicloMember;
};

const puntos = computed<Punto[]>(() =>
  allSeats.value.map((s, i) => ({
    ...s,
    member: membersSorted.value[i]!,
  })),
);

const bgPath = computed(() => {
  const g = geom.value;
  const { cx, cy, outerR, innerR, aLeft, aRight } = g;
  const lx = cx + outerR * Math.cos(aLeft);
  const ly = cy - outerR * Math.sin(aLeft);
  const rx = cx + outerR * Math.cos(aRight);
  const ry = cy - outerR * Math.sin(aRight);
  const ilx = cx + innerR * Math.cos(aLeft);
  const ily = cy - innerR * Math.sin(aLeft);
  const irx = cx + innerR * Math.cos(aRight);
  const iry = cy - innerR * Math.sin(aRight);
  return [
    `M ${lx} ${ly}`,
    `A ${outerR} ${outerR} 0 0 1 ${rx} ${ry}`,
    `L ${irx} ${iry}`,
    `A ${innerR} ${innerR} 0 0 0 ${ilx} ${ily}`,
    "Z",
  ].join(" ");
});

type GroupRange = { group: string; from: number; to: number };

const groupRanges = computed<GroupRange[]>(() => {
  const ranges: GroupRange[] = [];
  let i = 0;
  for (const group of groupsOrdenados.value) {
    const count = groupConteo.value[group] ?? 0;
    if (count > 0) {
      ranges.push({ group, from: i, to: i + count - 1 });
      i += count;
    }
  }
  return ranges;
});

const separadores = computed(() => {
  const g = geom.value;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const pts = puntos.value;
  const ranges = groupRanges.value;

  for (let r = 0; r < ranges.length - 1; r++) {
    const lastIdx = ranges[r]!.to;
    const nextIdx = ranges[r + 1]!.from;
    if (lastIdx < 0 || nextIdx >= pts.length) continue;

    const pMid = (pts[lastIdx]!.p + pts[nextIdx]!.p) / 2;
    const inner = seatXY(g.innerR - 8, pMid, g);
    const outer = seatXY(g.outerR + 8, pMid, g);
    lines.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y });
  }
  return lines;
});

function initials(d: HemicicloMember): string {
  const apellido = (d.apellido || d.nombreCompleto || "").charAt(0);
  const nombre = (d.nombreDePila || "").charAt(0);
  return (apellido + nombre).toUpperCase();
}

type Tooltip = { member: HemicicloMember; x: number; y: number };
const tooltip = ref<Tooltip | null>(null);
/** Bloque/partido resaltado (leyenda o banca). */
const hoveredGroup = ref<string | null>(null);

function onEnter(p: Punto) {
  tooltip.value = { member: p.member, x: p.x, y: p.y };
  hoveredGroup.value = groupKey(p.member);
}
function onLeave() {
  tooltip.value = null;
  hoveredGroup.value = null;
}

function onLegendEnter(group: string) {
  hoveredGroup.value = group;
}
function onLegendLeave() {
  hoveredGroup.value = null;
}

function seatOpacity(d: HemicicloMember): number {
  if (!hoveredGroup.value) return 1;
  return groupKey(d) === hoveredGroup.value ? 1 : 0.22;
}

function onClick(d: HemicicloMember) {
  if (!props.clickable) return;
  navigateTo(`${props.memberBasePath}/${d.id}`);
}

const tooltipStyle = computed(() => {
  if (!tooltip.value) return {};
  const xPct = (tooltip.value.x / W.value) * 100;
  const yPct = (tooltip.value.y / H.value) * 100;
  const isTop = tooltip.value.y < H.value * 0.3;
  return {
    left: `${xPct}%`,
    top: `${yPct}%`,
    transform: isTop
      ? "translate(-50%, 16px)"
      : "translate(-50%, calc(-100% - 10px))",
  };
});

function clipId(i: number) {
  return `hemiciclo-clip-${uid}-${i}`;
}
</script>

<template>
  <div>
    <slot name="header" />

    <div class="relative mx-auto w-full max-w-3xl md:max-w-4xl">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="w-full"
        style="overflow: visible"
        @mouseleave="onLeave"
      >
        <path
          :d="bgPath"
          :fill="isDark ? '#1e293b' : '#f1f5f9'"
          stroke="none"
        />

        <defs>
          <clipPath
            v-for="(p, i) in puntos"
            :id="clipId(i)"
            :key="clipId(i)"
          >
            <circle :cx="p.x" :cy="p.y" :r="DOT_R - 1" />
          </clipPath>
        </defs>

        <line
          v-for="(sep, i) in separadores"
          :key="`sep-${i}`"
          :x1="sep.x1"
          :y1="sep.y1"
          :x2="sep.x2"
          :y2="sep.y2"
          :stroke="isDark ? '#0f172a' : '#ffffff'"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.6"
        />

        <g
          v-for="(p, i) in puntos"
          :key="i"
          :class="clickable ? 'cursor-pointer' : 'cursor-default'"
          :style="{
            opacity: seatOpacity(p.member),
            transition: 'opacity 0.15s ease',
          }"
          @mouseenter="onEnter(p)"
          @click="onClick(p.member)"
        >
          <circle
            :cx="p.x"
            :cy="p.y"
            :r="DOT_R"
            :fill="colorFor(p.member)"
          />
          <text
            v-if="!p.member.foto"
            :x="p.x"
            :y="p.y"
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            :font-size="DOT_R * 0.75"
            font-weight="700"
            pointer-events="none"
          >
            {{ initials(p.member) }}
          </text>
          <image
            v-if="p.member.foto"
            :clip-path="`url(#${clipId(i)})`"
            :href="p.member.foto"
            :x="p.x - DOT_R"
            :y="p.y - DOT_R"
            :width="DOT_R * 2"
            :height="DOT_R * 2"
            preserveAspectRatio="xMidYMid slice"
            pointer-events="none"
          />
          <circle
            :cx="p.x"
            :cy="p.y"
            :r="DOT_R"
            fill="none"
            :stroke="colorFor(p.member)"
            stroke-width="2.5"
            pointer-events="none"
          />
        </g>

        <circle
          v-if="tooltip"
          :cx="tooltip.x"
          :cy="tooltip.y"
          :r="DOT_R + 4"
          fill="none"
          :stroke="isDark ? 'white' : '#1e293b'"
          stroke-width="2"
          opacity="0.9"
          pointer-events="none"
        />
      </svg>

      <Transition name="fade">
        <div
          v-if="tooltip"
          class="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          :style="tooltipStyle"
        >
          <slot name="tooltip" :member="tooltip.member">
            <div class="flex items-center gap-2.5">
              <div
                class="size-9 flex-shrink-0 overflow-hidden rounded-full"
                :style="{
                  border: `2.5px solid ${colorFor(tooltip.member)}`,
                  background: colorFor(tooltip.member),
                }"
              >
                <img
                  v-if="tooltip.member.foto"
                  :src="tooltip.member.foto"
                  :alt="tooltip.member.nombreCompleto"
                  class="size-full object-cover"
                />
                <span
                  v-else
                  class="flex size-full items-center justify-center text-xs font-bold text-white"
                >
                  {{ initials(tooltip.member) }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-tight">
                  {{ tooltip.member.nombreCompleto }}
                </p>
                <p
                  class="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  <span
                    class="inline-block size-2 flex-shrink-0 rounded-full"
                    :style="{ backgroundColor: colorFor(tooltip.member) }"
                  />
                  <NuxtLink
                    v-if="groupTo?.(groupKey(tooltip.member))"
                    :to="groupTo(groupKey(tooltip.member))!"
                    class="hover:underline pointer-events-auto"
                  >
                    {{ labelFor(groupKey(tooltip.member)) }}
                  </NuxtLink>
                  <template v-else>
                    {{ labelFor(groupKey(tooltip.member)) }}
                  </template>
                </p>
                <p
                  v-if="
                    groupMeta(tooltip.member) &&
                    groupKey(tooltip.member) !== groupMeta(tooltip.member)
                  "
                  class="text-xs text-gray-500 dark:text-gray-400"
                >
                  <NuxtLink
                    v-if="groupMetaPath(tooltip.member)"
                    :to="groupMetaPath(tooltip.member)!"
                    class="hover:underline pointer-events-auto"
                  >
                    {{ groupMeta(tooltip.member) }}
                  </NuxtLink>
                  <template v-else>{{ groupMeta(tooltip.member) }}</template>
                </p>
                <p
                  v-if="tooltip.member.provincia"
                  class="text-xs text-gray-400 dark:text-gray-500"
                >
                  {{ tooltip.member.provincia }}
                </p>
              </div>
            </div>
          </slot>
        </div>
      </Transition>
    </div>

    <div
      v-if="showLegend"
      class="mx-auto flex w-full max-w-3xl md:max-w-4xl flex-wrap justify-center gap-x-4 gap-y-2"
    >
      <template v-for="group in groupsOrdenados" :key="group">
        <NuxtLink
          v-if="groupTo?.(group)"
          :to="groupTo(group)!"
          class="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-opacity hover:underline underline-offset-2"
          :class="
            hoveredGroup && hoveredGroup !== group ? 'opacity-40' : 'opacity-100'
          "
          @mouseenter="onLegendEnter(group)"
          @mouseleave="onLegendLeave"
        >
          <span
            class="inline-block size-3 flex-shrink-0 rounded-full"
            :style="{ backgroundColor: groupColors[group] ?? '#6b7280' }"
          />
          <span class="text-xs text-gray-700 dark:text-gray-300">
            {{ labelFor(group) }}
            <span class="text-gray-400">({{ groupConteo[group] }})</span>
          </span>
        </NuxtLink>
        <div
          v-else
          class="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-opacity"
          :class="
            hoveredGroup && hoveredGroup !== group ? 'opacity-40' : 'opacity-100'
          "
          @mouseenter="onLegendEnter(group)"
          @mouseleave="onLegendLeave"
        >
          <span
            class="inline-block size-3 flex-shrink-0 rounded-full"
            :style="{ backgroundColor: groupColors[group] ?? '#6b7280' }"
          />
          <span class="text-xs text-gray-700 dark:text-gray-300">
            {{ labelFor(group) }}
            <span class="text-gray-400">({{ groupConteo[group] }})</span>
          </span>
        </div>
      </template>
    </div>

    <slot name="footer" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
