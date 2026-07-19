<script setup lang="ts">
import {
  AFFINITY_FROM_DATE,
  allPairAffinities,
  buildVoteMap,
  formatAffinityPct,
  pairAffinity,
  type AffinityMemberInput,
  type AffinityPair,
} from "@/utils/votingAffinity";
import { useChartPalette } from "@/composables/useChartPalette";

const props = withDefaults(
  defineProps<{
    members: AffinityMemberInput[];
    memberBasePath: string;
    /** Si se setea, layout radial CSS centrado en este miembro. */
    centerId?: string | null;
    groupColors?: Record<string, string>;
    /** "bloque" | "partido" — para fallback "Sin …" */
    groupLabel?: string;
    minCompared?: number;
    /** Máximo de nodos por anillo (alta / media / baja). */
    maxPerRing?: number;
    /** Máximo de nodos en el grafo circular de grupo. */
    maxNodes?: number;
    height?: string;
  }>(),
  {
    centerId: null,
    groupColors: () => ({}),
    groupLabel: "grupo",
    minCompared: 10,
    maxPerRing: 16,
    maxNodes: 36,
    height: "36rem",
  },
);

const palette = useChartPalette();
const hoveredId = ref<string | null>(null);

/** Umbrales de afinidad para los anillos. */
const RING_HIGH = 0.7;
const RING_MID = 0.4;

const RING_RADIUS = {
  high: 26,
  mid: 36,
  low: 46,
} as const;

type AffinityBand = keyof typeof RING_RADIUS;

type RadialPeer = AffinityPair & {
  angle: number;
  /** % del radio del contenedor (0–50) */
  radiusPct: number;
  band: AffinityBand;
};

function shortName(name: string, max = 14) {
  const raw = String(name || "").trim();
  if (!raw) return "—";
  if (raw.includes(",")) {
    const apellido = raw.split(",")[0]?.trim() || raw;
    return apellido.length > max ? `${apellido.slice(0, max - 1)}…` : apellido;
  }
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function memberTo(id: string) {
  return `${props.memberBasePath}/${id}`;
}

function bandOf(rate: number): AffinityBand {
  if (rate >= RING_HIGH) return "high";
  if (rate >= RING_MID) return "mid";
  return "low";
}

function sortPeersForRing(peers: AffinityPair[]) {
  return [...peers].sort((a, b) => {
    const g = String(a.group || "").localeCompare(String(b.group || ""));
    if (g !== 0) return g;
    return a.name.localeCompare(b.name);
  });
}

function placeRing(peers: AffinityPair[], band: AffinityBand): RadialPeer[] {
  const placed = sortPeersForRing(peers);
  const n = placed.length;
  if (!n) return [];
  const radiusPct = RING_RADIUS[band];
  // Desfasar anillos para que no se alineen radialmente
  const phase =
    band === "high" ? -Math.PI / 2 : band === "mid" ? -Math.PI / 2 + 0.2 : -Math.PI / 2 + 0.4;
  return placed.map((pair, i) => ({
    ...pair,
    band,
    radiusPct,
    angle: phase + (i / n) * Math.PI * 2,
  }));
}

const centerMember = computed(() =>
  props.centerId
    ? props.members.find((m) => m.id === props.centerId) || null
    : null,
);

/** Tres anillos: alta (≥70%), media (40–70%), baja (<40%). */
const radialPeers = computed<RadialPeer[]>(() => {
  if (!props.centerId) return [];
  const pairs = allPairAffinities(props.centerId, props.members, {
    fromDate: AFFINITY_FROM_DATE,
    minCompared: props.minCompared,
  });
  if (!pairs.length) return [];

  const cap = props.maxPerRing;
  const high = pairs.filter((p) => p.rate >= RING_HIGH).slice(0, cap);
  const mid = pairs
    .filter((p) => p.rate >= RING_MID && p.rate < RING_HIGH)
    .slice(0, cap);
  // Más opuestos primero en el anillo externo
  const low = [...pairs]
    .filter((p) => p.rate < RING_MID)
    .sort((a, b) => a.rate - b.rate || b.compared - a.compared)
    .slice(0, cap);

  return [
    ...placeRing(high, "high"),
    ...placeRing(mid, "mid"),
    ...placeRing(low, "low"),
  ];
});

const ringGuides = computed(() =>
  (Object.keys(RING_RADIUS) as AffinityBand[]).filter((band) =>
    radialPeers.value.some((p) => p.band === band),
  ),
);

const hasRadial = computed(
  () => Boolean(props.centerId && centerMember.value && radialPeers.value.length),
);

function edgeColor(rate: number) {
  const p = palette.value;
  if (rate >= 0.7) return p.presentismo;
  if (rate <= 0.4) return p.negativo;
  return p.isDark ? "#6b7280" : "#a1a1aa";
}

function groupOf(group?: string | null) {
  const g = String(group || "").trim();
  return g || `Sin ${props.groupLabel}`;
}

const tooltipUi = {
  content:
    "h-auto max-w-72 flex-col items-stretch gap-0 rounded-lg px-3 py-2.5 text-left shadow-lg ring ring-default bg-default",
};

function peerStyle(peer: RadialPeer) {
  const x = 50 + Math.cos(peer.angle) * peer.radiusPct;
  const y = 50 + Math.sin(peer.angle) * peer.radiusPct;
  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

function linePath(peer: RadialPeer) {
  const x2 = 50 + Math.cos(peer.angle) * peer.radiusPct;
  const y2 = 50 + Math.sin(peer.angle) * peer.radiusPct;
  return `M 50 50 L ${x2} ${y2}`;
}

// ——— Modo grupo: círculo CSS (sin ECharts) ———

type CircleNode = AffinityMemberInput & {
  angle: number;
  radiusPct: number;
};

type CircleEdge = {
  id: string;
  source: string;
  target: string;
  rate: number;
  compared: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const GROUP_RADIUS = 40;
const GROUP_EDGE_MIN_RATE = 0.7;
const GROUP_MAX_EDGES = 80;

const groupCircle = computed(() => {
  if (props.centerId) {
    return {
      nodes: [] as CircleNode[],
      edges: [] as CircleEdge[],
      totalMembers: 0,
      truncated: false,
    };
  }

  const fromDate = AFFINITY_FROM_DATE;
  const minCompared = props.minCompared;
  const maxNodes = props.maxNodes;
  const members = props.members;
  if (members.length < 2) {
    return {
      nodes: [] as CircleNode[],
      edges: [] as CircleEdge[],
      totalMembers: members.length,
      truncated: false,
    };
  }

  const maps = members.map((m) => buildVoteMap(m.votes, fromDate));
  const strength = members.map(() => 0);
  const pairRates: {
    i: number;
    j: number;
    rate: number;
    compared: number;
  }[] = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const { compared, rate } = pairAffinity(maps[i]!, maps[j]!);
      if (rate == null || compared < minCompared) continue;
      strength[i]! += compared;
      strength[j]! += compared;
      pairRates.push({ i, j, rate, compared });
    }
  }

  const rankedIdx = members
    .map((_, i) => i)
    .filter((i) => (strength[i] || 0) > 0)
    .sort(
      (a, b) =>
        (strength[b] || 0) - (strength[a] || 0) ||
        members[a]!.name.localeCompare(members[b]!.name),
    );

  const selectedIdx = (
    rankedIdx.length ? rankedIdx : members.map((_, i) => i)
  ).slice(0, maxNodes);
  const selectedSet = new Set(selectedIdx);
  const indexOnCircle = new Map<number, number>();
  selectedIdx.forEach((memberIdx, pos) => indexOnCircle.set(memberIdx, pos));

  const n = selectedIdx.length;
  const nodes: CircleNode[] = selectedIdx.map((memberIdx, pos) => {
    const m = members[memberIdx]!;
    const angle = -Math.PI / 2 + (pos / Math.max(n, 1)) * Math.PI * 2;
    return {
      ...m,
      angle,
      radiusPct: GROUP_RADIUS,
    };
  });

  const posOf = (memberIdx: number) => {
    const pos = indexOnCircle.get(memberIdx);
    if (pos == null) return null;
    const angle = -Math.PI / 2 + (pos / Math.max(n, 1)) * Math.PI * 2;
    return {
      x: 50 + Math.cos(angle) * GROUP_RADIUS,
      y: 50 + Math.sin(angle) * GROUP_RADIUS,
    };
  };

  const edges: CircleEdge[] = pairRates
    .filter(
      (p) =>
        selectedSet.has(p.i) &&
        selectedSet.has(p.j) &&
        p.rate >= GROUP_EDGE_MIN_RATE,
    )
    .sort((a, b) => b.rate - a.rate || b.compared - a.compared)
    .slice(0, GROUP_MAX_EDGES)
    .flatMap((p) => {
      const a = posOf(p.i);
      const b = posOf(p.j);
      const ma = members[p.i]!;
      const mb = members[p.j]!;
      if (!a || !b) return [];
      return [
        {
          id: `${ma.id}-${mb.id}`,
          source: ma.id,
          target: mb.id,
          rate: p.rate,
          compared: p.compared,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        },
      ];
    });

  return {
    nodes,
    edges,
    totalMembers: members.length,
    truncated: members.length > nodes.length,
  };
});

const hasGroupCircle = computed(
  () => !props.centerId && groupCircle.value.nodes.length >= 2,
);

const hasGraph = computed(() => hasRadial.value || hasGroupCircle.value);

function circleNodeStyle(node: CircleNode) {
  const x = 50 + Math.cos(node.angle) * node.radiusPct;
  const y = 50 + Math.sin(node.angle) * node.radiusPct;
  return { left: `${x}%`, top: `${y}%` };
}

function edgeTouches(edge: CircleEdge, id: string | null) {
  if (!id) return true;
  return edge.source === id || edge.target === id;
}
</script>

<template>
  <!-- Radial CSS: avatares perfectamente circulares -->
  <div
    v-if="hasRadial && centerMember"
    class="relative mx-auto w-full select-none"
    :style="{ maxWidth: 'min(100%, 44rem)', aspectRatio: '1 / 1' }"
    role="img"
    :aria-label="`Mapa de coincidencias de ${centerMember.name}`"
  >
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <circle
        v-for="band in ringGuides"
        :key="`ring-${band}`"
        cx="50"
        cy="50"
        :r="RING_RADIUS[band]"
        fill="none"
        class="stroke-default"
        stroke-width="0.25"
        stroke-dasharray="1.2 1.4"
        opacity="0.45"
      />
      <path
        v-for="peer in radialPeers"
        :key="`edge-${peer.id}`"
        :d="linePath(peer)"
        fill="none"
        :stroke="edgeColor(peer.rate)"
        :stroke-width="0.35 + peer.rate * 0.55"
        :opacity="hoveredId && hoveredId !== peer.id ? 0.12 : 0.3 + peer.rate * 0.35"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <NuxtLink
      v-for="peer in radialPeers"
      :key="peer.id"
      :to="memberTo(peer.id)"
      class="absolute z-[1] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-center transition-transform hover:z-10 hover:scale-110"
      :class="
        peer.band === 'high'
          ? 'w-14 sm:w-16'
          : peer.band === 'mid'
            ? 'w-12 sm:w-14'
            : 'w-11 sm:w-12'
      "
      :style="peerStyle(peer)"
      @mouseenter="hoveredId = peer.id"
      @mouseleave="hoveredId = null"
    >
      <UTooltip
        :delay-duration="100"
        :content="{ side: 'top', align: 'center', sideOffset: 8 }"
        :ui="tooltipUi"
      >
        <UAvatar
          :src="peer.foto || undefined"
          :alt="peer.name"
          :size="peer.band === 'high' ? 'lg' : peer.band === 'mid' ? 'md' : 'sm'"
          :ui="{
            root: 'ring-2 ring-default shadow-sm bg-elevated',
          }"
        />
        <template #content>
          <div class="space-y-2">
            <div class="flex items-center gap-2.5">
              <UAvatar
                :src="centerMember.foto || undefined"
                :alt="centerMember.name"
                size="md"
              />
              <div class="min-w-0 space-y-0.5">
                <p class="text-sm font-semibold leading-snug text-highlighted">
                  {{ centerMember.name }}
                </p>
                <p class="text-xs leading-snug text-toned">
                  {{ groupOf(centerMember.group) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 border-t border-default pt-2">
              <UAvatar
                :src="peer.foto || undefined"
                :alt="peer.name"
                size="md"
              />
              <div class="min-w-0 space-y-0.5">
                <p class="text-sm font-semibold leading-snug text-highlighted">
                  {{ peer.name }}
                </p>
                <p class="text-xs leading-snug text-toned">
                  {{ groupOf(peer.group) }}
                </p>
              </div>
            </div>
            <p class="border-t border-default pt-2 text-xs text-muted">
              Coincidencia
              <span class="font-medium text-highlighted">{{
                formatAffinityPct(peer.rate)
              }}</span>
              · {{ peer.compared }} votaciones juntas
            </p>
          </div>
        </template>
      </UTooltip>
      <span
        class="line-clamp-2 leading-tight text-highlighted"
        :class="
          peer.band === 'low'
            ? 'max-w-11 text-[9px] sm:max-w-12 sm:text-[10px]'
            : 'max-w-14 text-[10px] sm:max-w-16 sm:text-xs'
        "
      >
        {{ shortName(peer.name, peer.band === 'low' ? 10 : 12) }}
      </span>
    </NuxtLink>

    <NuxtLink
      :to="memberTo(centerMember.id)"
      class="absolute left-1/2 top-1/2 z-[2] flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center sm:w-24"
    >
      <UTooltip
        :delay-duration="100"
        :content="{ side: 'top', align: 'center', sideOffset: 8 }"
        :ui="tooltipUi"
      >
        <UAvatar
          :src="centerMember.foto || undefined"
          :alt="centerMember.name"
          size="3xl"
          :ui="{
            root: 'ring-[3px] ring-teal-500 shadow-md bg-elevated dark:ring-teal-400',
          }"
        />
        <template #content>
          <div class="flex items-center gap-2.5">
            <UAvatar
              :src="centerMember.foto || undefined"
              :alt="centerMember.name"
              size="md"
            />
            <div class="min-w-0 space-y-0.5">
              <p class="text-sm font-semibold leading-snug text-highlighted">
                {{ centerMember.name }}
              </p>
              <p class="text-xs leading-snug text-toned">
                {{ groupOf(centerMember.group) }}
              </p>
            </div>
          </div>
        </template>
      </UTooltip>
      <span class="text-xs font-semibold leading-tight text-highlighted sm:text-sm">
        {{ shortName(centerMember.name, 16) }}
      </span>
    </NuxtLink>
  </div>

  <!-- Grupo: círculo CSS -->
  <div v-else-if="hasGroupCircle" class="mx-auto w-full max-w-[44rem]">
    <div
      class="relative w-full select-none"
      :style="{ aspectRatio: '1 / 1' }"
      role="img"
      aria-label="Mapa de coincidencias dentro del grupo"
    >
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          :r="GROUP_RADIUS"
          fill="none"
          class="stroke-default"
          stroke-width="0.25"
          stroke-dasharray="1.2 1.4"
          opacity="0.45"
        />
        <line
          v-for="edge in groupCircle.edges"
          :key="edge.id"
          :x1="edge.x1"
          :y1="edge.y1"
          :x2="edge.x2"
          :y2="edge.y2"
          :stroke="edgeColor(edge.rate)"
          :stroke-width="0.25 + edge.rate * 0.45"
          :opacity="
            edgeTouches(edge, hoveredId) ? 0.25 + edge.rate * 0.45 : 0.06
          "
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <NuxtLink
        v-for="node in groupCircle.nodes"
        :key="node.id"
        :to="memberTo(node.id)"
        class="absolute z-[1] flex w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center transition-transform hover:z-10 hover:scale-110 sm:w-14"
        :class="hoveredId && hoveredId !== node.id ? 'opacity-40' : ''"
        :style="circleNodeStyle(node)"
        @mouseenter="hoveredId = node.id"
        @mouseleave="hoveredId = null"
      >
        <UTooltip
          :delay-duration="100"
          :content="{ side: 'top', align: 'center', sideOffset: 8 }"
          :ui="tooltipUi"
        >
          <UAvatar
            :src="node.foto || undefined"
            :alt="node.name"
            size="md"
            :ui="{
              root: 'ring-2 ring-default shadow-sm bg-elevated',
            }"
          />
          <template #content>
            <div class="flex items-center gap-2.5">
              <UAvatar
                :src="node.foto || undefined"
                :alt="node.name"
                size="md"
              />
              <div class="min-w-0 space-y-0.5">
                <p class="text-sm font-semibold leading-snug text-highlighted">
                  {{ node.name }}
                </p>
                <p class="text-xs leading-snug text-toned">
                  {{ groupOf(node.group) }}
                </p>
              </div>
            </div>
          </template>
        </UTooltip>
        <span
          class="line-clamp-2 max-w-12 text-[9px] leading-tight text-highlighted sm:max-w-14 sm:text-[10px]"
        >
          {{ shortName(node.name, 10) }}
        </span>
      </NuxtLink>
    </div>
    <p
      v-if="groupCircle.truncated"
      class="mt-2 text-center text-xs text-muted"
    >
      Mostrando {{ groupCircle.nodes.length }} de
      {{ groupCircle.totalMembers }} integrantes (los que más votaron juntos).
    </p>
  </div>

  <p v-else-if="!hasGraph" class="text-sm text-muted">
    No hay suficientes coincidencias para armar el mapa.
  </p>
</template>
