<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { formatDate, isDiputadoActivo } from "@/lib/utils";
import { bloquePath } from "@/utils/bloque";
import { formatGenero, type ProfileFactSection } from "@/utils/memberProfile";
import type { CareerCargo } from "@/utils/memberCareer";

const props = defineProps<{
  diputado: Diputado;
  career?: CareerCargo[];
}>();

const profileSections = computed<ProfileFactSection[]>(() => {
  const d = props.diputado;

  const mandatoFin = d.periodoMandato?.fin
    ? formatDate(d.periodoMandato.fin)
    : "—";
  const mandatoInicio = d.periodoMandato?.inicio
    ? formatDate(d.periodoMandato.inicio)
    : "—";

  const bloqueInicio = d.periodoBloque?.inicio
    ? formatDate(d.periodoBloque.inicio)
    : "";
  const bloqueFin = d.periodoBloque?.fin
    ? formatDate(d.periodoBloque.fin)
    : "hoy";
  const periodoBloque = bloqueInicio && `${bloqueInicio} – ${bloqueFin}`;

  return [
    {
      title: "Identidad",
      items: [
        { label: "Provincia", value: d.provincia },
        { label: "Género", value: formatGenero(d.genero) },
      ],
    },
    {
      title: "Bloque",
      items: [
        {
          label: "Bloque",
          value: d.bloque || "—",
          to: bloquePath(d.bloque),
        },
        {
          label: "En el bloque",
          value: periodoBloque || null,
        },
      ],
    },
    {
      title: "Mandato",
      items: [
        {
          label: "Período",
          value: `${mandatoInicio} – ${mandatoFin}`,
        },
        {
          label: "Juramento",
          value: d.juramentoFecha ? formatDate(d.juramentoFecha) : null,
        },
        {
          label: "Cese",
          value: d.ceseFecha
            ? formatDate(d.ceseFecha)
            : isDiputadoActivo(d)
              ? "En funciones"
              : null,
        },
      ],
    },
  ];
});
</script>

<template>
  <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
    <div class="flex flex-col md:flex-row md:items-start">
      <div
        class="w-40 sm:w-48 md:w-52 shrink-0 mx-auto md:mx-0 aspect-square overflow-hidden bg-elevated self-center md:self-start"
      >
        <NuxtImg
          :src="diputado.foto || '/placeholder-user.jpg'"
          :alt="`${diputado.nombre} ${diputado.apellido}`"
          width="208"
          height="208"
          sizes="160px sm:192px md:208px"
          densities="x1"
          class="w-full h-full object-cover object-top"
          loading="eager"
        />
      </div>

      <div class="flex flex-col gap-5 flex-1 p-6">
        <h1 class="text-2xl font-bold">
          {{ diputado.nombre }} {{ diputado.apellido }}
        </h1>

        <MemberProfileFacts :sections="profileSections" />

        <MemberCareerTimeline
          v-if="career?.length"
          :cargos="career"
          chamber="diputados"
        />
      </div>
    </div>
  </UCard>
</template>
