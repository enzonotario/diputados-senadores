<script setup lang="ts">
import {
  getPartidoColores,
  getSenadorConActasById,
  getSenadoresConActas,
} from "@/lib/senadores-data";
import { isSenadorActivo } from "@/lib/utils";
import { partidoPath } from "@/utils/partido";
import {
  votesFromSenador,
  memberActasInWindow,
  type AffinityMemberInput,
} from "@/utils/votingAffinity";

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data } = await useAsyncData(
  "senador-afinidad",
  () => getSenadorConActasById(id.value),
  { watch: [id] },
);
const senador = computed(() => data.value || null);

if (senador.value && senador.value.id !== id.value) {
  await navigateTo(`/senadores/${senador.value.id}/afinidad`, {
    redirectCode: 301,
    replace: true,
  });
}

const { data: allSenadores } = await useAsyncData(
  "senadores-affinity-peers",
  async () => {
    const all = await getSenadoresConActas();
    return all.map((s) => ({
      id: s.id,
      name: s.nombreCompleto || s.nombre,
      group: s.partido,
      foto: s.foto,
      votes: memberActasInWindow(votesFromSenador(s)),
      activo: isSenadorActivo(s),
    }));
  },
  { server: false },
);

const affinityPeers = computed<AffinityMemberInput[]>(() => {
  const all = allSenadores.value || [];
  const byId = new Map<string, AffinityMemberInput>();
  for (const s of all) {
    if (s.activo) {
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        group: s.group,
        foto: s.foto,
        votes: s.votes,
      });
    }
  }
  const current = senador.value;
  if (current) {
    byId.set(current.id, {
      id: current.id,
      name: current.nombreCompleto || current.nombre,
      group: current.partido,
      foto: current.foto,
      votes: memberActasInWindow(votesFromSenador(current)),
    });
  }
  return [...byId.values()];
});

const affinityGroupPeers = computed(() => {
  const partido = senador.value?.partido;
  if (!partido) return [];
  return affinityPeers.value.filter((p) => p.group === partido);
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
  (senador.value?.actasSenador || []).map((a) => ({
    id: String(a.id),
    titulo: a.titulo,
    resultado: a.resultado,
    fecha: a.fecha,
    voto: a.tipoVotoSenador,
  })),
);

const memberName = computed(
  () => senador.value?.nombreCompleto || senador.value?.nombre || "Senador",
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
    title: `Con quién vota parecido · ${memberName.value}`,
    description: `Con quién coincide ${memberName.value}, con quién no, y cuántas veces se apartó de su partido.`,
    og: {
      kind: "afinidad",
      eyebrow: "afinidad",
      badge: senador.value.partido || undefined,
    },
  };
});
</script>

<template>
  <UCard v-if="!senador">
    <template #header>
      <h1 class="text-xl font-semibold">Senador no encontrado</h1>
    </template>
    <p class="text-gray-600 dark:text-gray-300">
      No se pudo encontrar información para el senador solicitado.
    </p>
  </UCard>

  <AnalisisMemberAffinityDetail
    v-else
    :member-id="senador.id"
    :member-name="memberName"
    :member-foto="senador.foto"
    :member-to="`/senadores/${senador.id}`"
    group-label="partido"
    :group-name="senador.partido"
    :group-to="partidoPath(senador.partido)"
    member-base-path="/senadores"
    :peers="affinityPeers"
    :group-peers="affinityGroupPeers"
    :actas="actas"
    :group-colors="groupColors"
  />
</template>
