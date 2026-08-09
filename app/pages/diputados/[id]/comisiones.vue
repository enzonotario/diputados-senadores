<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";

type MemberProfileResponse = {
  member: Diputado;
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
const comisiones = computed(() => diputado.value?.meta?.comisiones || []);

useChamberSeo(() => {
  const d = diputado.value;
  if (!d) {
    return {
      title: "Comisiones",
      description: "Comisiones de la Cámara de Diputados de la Nación Argentina.",
      og: { kind: "member", eyebrow: "comisiones" },
    };
  }
  const name = d.nombreCompleto || `${d.apellido}, ${d.nombre}`;
  return {
    title: `Comisiones · ${name}`,
    description: `Comisiones de Diputados en las que participa ${name}.`,
    og: {
      kind: "member",
      eyebrow: "comisiones",
      badge: d.bloque || undefined,
      photoSrc: d.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <SenadorComisionesCard
    v-if="diputado"
    :comisiones="comisiones"
    chamber="diputados"
    show-empty
  />
</template>
