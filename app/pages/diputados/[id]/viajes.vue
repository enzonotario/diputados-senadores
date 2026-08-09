<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import type { DiputadoViajes, SenadorViajes } from "@/lib/types";

type MemberProfileResponse = {
  member: Diputado;
  viajes?: DiputadoViajes | null;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data } = await useAsyncData(
  () => `diputado-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);

const diputado = computed(() => data.value?.member || null);
const viajes = computed<SenadorViajes | null>(() => {
  const v = data.value?.viajes;
  if (!v) return null;
  return {
    senadorId: v.diputadoId,
    nacionales: v.nacionales || [],
    internacionales: v.internacionales || [],
  };
});

useChamberSeo(() => {
  const d = diputado.value;
  if (!d) {
    return {
      title: "Viajes",
      description: "Viajes nacionales de diputados.",
      og: { kind: "member", eyebrow: "viajes" },
    };
  }
  const name = d.nombreCompleto || `${d.apellido}, ${d.nombre}`;
  return {
    title: `Viajes · ${name}`,
    description: `Viajes nacionales de ${name} según datos abiertos de la HCDN.`,
    og: {
      kind: "member",
      eyebrow: "viajes",
      badge: d.bloque || undefined,
      photoSrc: d.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <SenadorViajesPanel
    v-if="diputado"
    :viajes="viajes"
    chamber="diputados"
    show-empty
  />
</template>
