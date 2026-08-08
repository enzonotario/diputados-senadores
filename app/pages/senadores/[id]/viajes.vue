<script setup lang="ts">
import type { Senador, SenadorViajes } from "@/lib/types";

type MemberProfileResponse = {
  member: Senador;
  viajes?: SenadorViajes | null;
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
const viajes = computed(() => data.value?.viajes || null);

useChamberSeo(() => {
  const s = senador.value;
  if (!s) {
    return {
      title: "Viajes",
      description: "Viajes nacionales e internacionales de senadores.",
      og: { kind: "member", eyebrow: "viajes" },
    };
  }
  const name = s.nombreCompleto || s.nombre;
  return {
    title: `Viajes · ${name}`,
    description: `Viajes nacionales e internacionales de ${name} según el Senado de la Nación.`,
    og: {
      kind: "member",
      eyebrow: "viajes",
      badge: s.bloque || s.partido || undefined,
      photoSrc: s.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <SenadorViajesPanel v-if="senador" :viajes="viajes" show-empty />
</template>
