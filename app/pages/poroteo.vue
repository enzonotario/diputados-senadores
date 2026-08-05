<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import type { Senador } from "@/lib/types";
import type { PoroteoMember } from "@/utils/poroteo";
import { filterMembersByPeriodo } from "@/utils/periodoLegislativo";

const { isDiputados, chamberId } = useChamber();
const { catalog, defaultKey, pending: pendingPeriodos } = usePeriodoFilter();
const { localFetch } = useLocalApi();

const { data: membersData, pending: pendingMembers } = useAsyncData(
  () => `poroteo-members-${chamberId.value}`,
  async () => {
    const res = await localFetch<{ members: (Diputado | Senador)[] }>(
      "/api/members",
    );
    return (res.members || []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      apellido: m.apellido,
      nombreCompleto: m.nombreCompleto,
      provincia: m.provincia,
      bloque: "bloque" in m ? m.bloque : undefined,
      partido: "partido" in m ? m.partido : undefined,
      foto: m.foto,
      periodoMandato: "periodoMandato" in m ? m.periodoMandato : undefined,
      periodoLegal: "periodoLegal" in m ? m.periodoLegal : undefined,
      ceseFecha: "ceseFecha" in m ? m.ceseFecha : undefined,
      juramentoFecha: "juramentoFecha" in m ? m.juramentoFecha : undefined,
    }));
  },
  { lazy: true, watch: [chamberId] },
);

/** Siempre el período vigente; el Poroteo no admite cambiar período. */
const vigenteKeys = computed(() =>
  defaultKey.value ? [defaultKey.value] : [],
);

const inPeriodo = computed(() =>
  filterMembersByPeriodo(
    membersData.value || [],
    vigenteKeys.value,
    catalog.value,
  ),
);

const members = computed<PoroteoMember[]>(() =>
  inPeriodo.value.map((m) => ({
    id: m.id,
    foto: m.foto,
    nombreCompleto: m.nombreCompleto,
    apellido: m.apellido,
    nombre: m.nombre,
    provincia: m.provincia,
    bloque: "bloque" in m ? (m as any).bloque : undefined,
    partido: "partido" in m ? (m as any).partido : undefined,
  })),
);

const groupField = computed(() =>
  isDiputados.value ? ("bloque" as const) : ("partido" as const),
);

const membersLabel = computed(() =>
  isDiputados.value ? "Diputados" : "Senadores",
);

const memberBasePath = computed(() =>
  isDiputados.value ? "/diputados" : "/senadores",
);

const storageKey = computed(
  () => `${chamberId.value}:${defaultKey.value || "vigente"}`,
);

const pending = computed(
  () => pendingMembers.value || pendingPeriodos.value,
);

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
        {{ membersLabel.toLowerCase() }} del período vigente: asigná a favor, en
        contra, abstención o indecisos por {{ groupField }}, y descargá una
        imagen lista para compartir.
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
