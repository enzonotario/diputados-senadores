<script setup lang="ts">
import type {
  GastoSenadoSenadorRow,
  Senador,
  SenadorPersonalDetalle,
} from "@/lib/types";

type MemberProfileResponse = {
  member: Senador;
  gasto?: GastoSenadoSenadorRow | null;
  personal?: SenadorPersonalDetalle | null;
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
const gasto = computed(() => data.value?.gasto || null);
const personal = computed(() => data.value?.personal || null);

useChamberSeo(() => {
  const s = senador.value;
  if (!s) {
    return {
      title: "Gasto",
      description: "Gasto estimado de senadores según escala salarial.",
      og: { kind: "member", eyebrow: "gasto" },
    };
  }
  const name = s.nombreCompleto || s.nombre;
  return {
    title: `Gasto · ${name}`,
    description: `Dieta y personal del despacho de ${name}, estimados con la escala salarial del Senado.`,
    og: {
      kind: "member",
      eyebrow: "gasto",
      badge: s.bloque || s.partido || undefined,
      photoSrc: s.foto || "/placeholder-user.jpg",
    },
  };
});
</script>

<template>
  <SenadorGastoPanel
    v-if="senador"
    :gasto="gasto"
    :personal="personal"
    show-empty
  />
</template>
