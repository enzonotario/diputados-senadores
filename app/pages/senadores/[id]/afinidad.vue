<script setup lang="ts">
import { getPartidoColores } from "@/lib/senadores-data";
import { partidoPath } from "@/utils/partido";
import {
  memberActasInWindow,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";
import type { CareerCargo } from "@/utils/memberCareer";
import { mandatoRangesForChamber } from "@/utils/memberCareer";
import type { Senador } from "@/lib/types";

type MemberProfileResponse = {
  member: Senador;
  chartActas: Array<{
    id: string;
    fecha?: string | null;
    titulo?: string | null;
    resultado?: string | null;
    tipoVotoSenador?: string | null;
  }>;
  career?: CareerCargo[];
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();
const { filterActas: filterByPeriodo } = usePeriodoFilter();

const { data, pending } = await useAsyncData(
  () => `senador-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);
const senador = computed(() => data.value?.member || null);
const chartActas = computed(() => data.value?.chartActas || []);
const mandatoRanges = computed(() =>
  mandatoRangesForChamber(data.value?.career, "senadores"),
);

const { data: peersPayload, pending: peersPending } = useAffinityPeers(
  "senadores-affinity-peers",
);

const affinityGroupName = computed(
  () => senador.value?.bloque || senador.value?.partido || "",
);

const { peers: affinityPeers } = usePeriodFilteredPeers({
  getSource: () => {
    const current = senador.value;
    const ensure: AffinityMemberInput | null = current
      ? {
          id: current.id,
          name: current.nombreCompleto || current.nombre,
          group: current.bloque || current.partido,
          foto: current.foto,
          votes: memberActasInWindow(
            chartActas.value.map((a) => ({
              id: a.id,
              fecha: String(a.fecha || ""),
              voto: a.tipoVotoSenador,
            })),
          ),
        }
      : null;
    return peersToAffinityInputs(peersPayload.value?.peers, { ensure });
  },
  deps: () => [
    peersPayload.value,
    senador.value?.id,
    senador.value?.bloque,
    senador.value?.partido,
    chartActas.value,
  ],
});

const affinityGroupPeers = computed(() => {
  const group = affinityGroupName.value;
  if (!group) return [];
  return affinityPeers.value.filter((p) => p.group === group);
});

const groupColors = computed(() => {
  const names = [
    ...new Set(
      affinityPeers.value.map((p) => p.group).filter(Boolean) as string[],
    ),
  ];
  return getPartidoColores(names);
});

const actas = computed(() =>
  filterByPeriodo(
    chartActas.value.map((a) => ({
      id: String(a.id),
      titulo: a.titulo,
      resultado: a.resultado,
      fecha: a.fecha,
      voto: a.tipoVotoSenador,
    })),
  ),
);

const memberName = computed(
  () => senador.value?.nombreCompleto || senador.value?.nombre || "Senador",
);

const groupLabel = computed(() =>
  senador.value?.bloque ? "bloque" : "partido",
);

useChamberSeo(() => {
  if (!senador.value) {
    return {
      title: "Con quién vota parecido",
      description: "Quién vota parecido a quién en el Senado.",
      og: { kind: "afinidad", eyebrow: "afinidad" },
    };
  }
  return {
    title: `Afinidad · ${memberName.value}`,
    description: `Con quién coincide ${memberName.value}, con quién no, y cuántas veces se apartó de su ${groupLabel.value}.`,
    og: {
      kind: "afinidad",
      eyebrow: "afinidad",
      badge: affinityGroupName.value || undefined,
    },
  };
});
</script>

<template>
  <div v-if="senador">
    <ClientOnly>
      <FilterPeriodo class="mb-6" />
      <AppDataSkeleton v-if="pending || peersPending" variant="affinity" />
      <AnalisisMemberAffinityDetail
        v-else
        :member-id="senador.id"
        :member-name="memberName"
        :member-foto="senador.foto"
        :member-to="`/senadores/${senador.id}`"
        :group-label="groupLabel"
        :group-name="affinityGroupName"
        :group-to="senador.bloque ? null : partidoPath(senador.partido)"
        member-base-path="/senadores"
        :peers="affinityPeers"
        :group-peers="affinityGroupPeers"
        :actas="actas"
        :group-colors="groupColors"
        :mandatos="mandatoRanges"
      />
      <template #fallback>
        <AppDataSkeleton variant="affinity" />
      </template>
    </ClientOnly>
  </div>
</template>
