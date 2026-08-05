<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import type { Senador } from "@/lib/types";
import type { PoroteoMember } from "@/utils/poroteo";
import { isDiputadoActivo, isSenadorActivo } from "@/lib/utils";

const { isDiputados, chamberId } = useChamber();
const { localFetch } = useLocalApi();

const { data: membersData, pending } = useAsyncData(
  () => `poroteo-members-${chamberId.value}`,
  async () => {
    const res = await localFetch<{ members: (Diputado | Senador)[] }>(
      "/api/members",
    );
    return res.members || [];
  },
  { lazy: true, watch: [chamberId] },
);

/** Solo legisladores vigentes (mismo criterio que activos en listados / home). */
const members = computed<PoroteoMember[]>(() => {
  const raw = membersData.value || [];
  const activos = isDiputados.value
    ? (raw as Diputado[]).filter(isDiputadoActivo)
    : (raw as Senador[]).filter(isSenadorActivo);

  return activos.map((m) => ({
    id: m.id,
    foto: m.foto,
    nombreCompleto: m.nombreCompleto,
    apellido: m.apellido,
    nombre: m.nombre,
    provincia: m.provincia,
    bloque: "bloque" in m ? m.bloque : undefined,
    partido: "partido" in m ? m.partido : undefined,
  }));
});

const groupField = computed(() =>
  isDiputados.value ? ("bloque" as const) : ("partido" as const),
);

const membersLabel = computed(() =>
  isDiputados.value ? "Diputados" : "Senadores",
);

const memberBasePath = computed(() =>
  isDiputados.value ? "/diputados" : "/senadores",
);

const storageKey = computed(() => chamberId.value);

useChamberSeo(() => ({
  title: "Poroteo",
  description: `Simulá cómo votarían los ${membersLabel.value.toLowerCase()} y exportá una imagen para compartir.`,
  og: { kind: "list", eyebrow: "poroteo", badge: "Poroteo" },
}));
</script>

<template>
  <div class="page-container flex flex-col gap-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Poroteo</h1>
      <p class="text-muted max-w-2xl">
        Armá un escenario de votación con los
        {{ membersLabel.toLowerCase() }} vigentes: asigná a favor, en contra,
        abstención o indecisos por {{ groupField }}, y descargá una imagen lista
        para compartir.
      </p>
    </div>

    <PoroteoSimulator
      :members="members"
      :group-field="groupField"
      :members-label="membersLabel"
      :member-base-path="memberBasePath"
      :pending="pending"
      :storage-key="storageKey"
    />
  </div>
</template>
