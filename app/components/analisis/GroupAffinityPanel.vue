<script setup lang="ts">
import {
  AFFINITY_FROM_DATE,
  formatAffinityPct,
  groupActasWithQuorum,
  topInterGroupAffinities,
  type AffinityMemberInput,
  type InterGroupPair,
} from "@/utils/votingAffinity";

const props = withDefaults(
  defineProps<{
    groupLabel: string;
    groupName: string;
    /** Todos los miembros activos (con `group` seteado). */
    allMembers: AffinityMemberInput[];
    /** Base path del índice de grupos, ej. `/diputados/bloques`. */
    groupBasePath: string;
    /** slug por nombre de grupo, para links. */
    groupSlugs?: Record<string, string>;
    topN?: number;
    /** Ruta a la página dedicada de afinidad. */
    detailTo?: string;
    actasMeta?: Record<
      string,
      { id: string; titulo?: string | null; resultado?: string | null }
    >;
  }>(),
  {
    groupSlugs: () => ({}),
    topN: 8,
    detailTo: undefined,
    actasMeta: () => ({}),
  },
);

const affinity = computed(() =>
  topInterGroupAffinities(props.groupName, props.allMembers, {
    fromDate: AFFINITY_FROM_DATE,
    topN: props.topN,
    minCompared: 20,
    minGroupVoters: 1,
    groupMeta: Object.fromEntries(
      Object.entries(props.groupSlugs).map(([name, slug]) => [
        name,
        { id: name, slug },
      ]),
    ),
  }),
);

const groupMembers = computed(() =>
  props.allMembers.filter((m) => m.group === props.groupName),
);

const quorumRows = computed(() =>
  groupActasWithQuorum(groupMembers.value, {
    fromDate: AFFINITY_FROM_DATE,
    minGroupVoters: 1,
  }).map((row) => {
    const meta = props.actasMeta?.[row.id];
    return {
      ...row,
      titulo: meta?.titulo || row.id,
      resultado: meta?.resultado || null,
    };
  }),
);

const hasData = computed(
  () =>
    affinity.value.allies.length > 0 || affinity.value.opponents.length > 0,
);

function groupTo(pair: InterGroupPair) {
  const slug = pair.slug || props.groupSlugs[pair.name];
  if (!slug) return null;
  return `${props.groupBasePath}/${slug}`;
}

function pairMeta(pair: InterGroupPair) {
  return `${formatAffinityPct(pair.rate)} · ${pair.compared} votaciones donde ambos tenían un voto mayoritario`;
}
</script>

<template>
  <ChartsChartCard
    v-if="hasData"
    :title="`Con qué otros ${groupLabel}s coinciden`"
    :description="`Cuánto coincide el voto más común de ${groupName} con el de otros ${groupLabel}s (votaciones desde ${AFFINITY_FROM_DATE.slice(0, 4)}).`"
  >
    <template v-if="quorumRows.length || detailTo" #actions>
      <AnalisisQuorumActasButton
        v-if="quorumRows.length"
        :actas="quorumRows"
        :group-label="groupLabel"
      />
      <UButton
        v-if="detailTo"
        :to="detailTo"
        size="sm"
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-arrow-right"
      >
        Ver más
      </UButton>
    </template>
    <ClientOnly>
      <div class="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-highlighted">Más parecidos</h4>
          <ul v-if="affinity.allies.length" class="space-y-1.5">
            <li
              v-for="pair in affinity.allies"
              :key="`ally-g-${pair.name}`"
              class="flex items-start justify-between gap-2 text-sm"
            >
              <NuxtLink
                v-if="groupTo(pair)"
                :to="groupTo(pair)!"
                class="min-w-0 hover:underline"
              >
                <span class="line-clamp-2">{{ pair.name }}</span>
              </NuxtLink>
              <span v-else class="min-w-0 line-clamp-2">{{ pair.name }}</span>
              <span
                class="shrink-0 tabular-nums font-medium text-teal-700 dark:text-teal-300"
                :title="pairMeta(pair)"
              >
                {{ formatAffinityPct(pair.rate) }}
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted">Sin datos suficientes.</p>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-medium text-highlighted">Más opuestos</h4>
          <ul v-if="affinity.opponents.length" class="space-y-1.5">
            <li
              v-for="pair in affinity.opponents"
              :key="`opp-g-${pair.name}`"
              class="flex items-start justify-between gap-2 text-sm"
            >
              <NuxtLink
                v-if="groupTo(pair)"
                :to="groupTo(pair)!"
                class="min-w-0 hover:underline"
              >
                <span class="line-clamp-2">{{ pair.name }}</span>
              </NuxtLink>
              <span v-else class="min-w-0 line-clamp-2">{{ pair.name }}</span>
              <span
                class="shrink-0 tabular-nums font-medium text-red-700 dark:text-red-300"
                :title="pairMeta(pair)"
              >
                {{ formatAffinityPct(pair.rate) }}
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted">Sin datos suficientes.</p>
        </div>
      </div>
      <template #fallback>
        <div class="h-40 animate-pulse rounded-lg bg-elevated" />
      </template>
    </ClientOnly>
  </ChartsChartCard>
</template>
