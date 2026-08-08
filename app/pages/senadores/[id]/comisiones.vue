<script setup lang="ts">
import type { Senador } from "@/lib/types";

type MemberProfileResponse = {
  member: Senador;
};

const route = useRoute();
const id = computed(() => String(route.params.id));
const { localFetch } = useLocalApi();

const { data } = await useAsyncData(
  () => `senador-${id.value}`,
  () => localFetch<MemberProfileResponse>(`/api/members/${id.value}`),
  { watch: [id] },
);

const senador = computed(() => data.value?.member || null);
const comisiones = computed(() => senador.value?.meta?.comisiones || []);

useChamberSeo(() => {
  const s = senador.value;
  if (!s) {
    return {
      title: "Comisiones",
      description: "Comisiones del Senado de la Nación Argentina.",
      og: { kind: "member", eyebrow: "comisiones" },
    };
  }
  const name = s.nombreCompleto || s.nombre;
  return {
    title: `Comisiones · ${name}`,
    description: `Comisiones del Senado en las que participa ${name}.`,
    og: {
      kind: "member",
      eyebrow: "comisiones",
      badge: s.bloque || s.partido || undefined,
      photoSrc: s.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <SenadorComisionesCard
    v-if="senador"
    :comisiones="comisiones"
    show-empty
  />
</template>
