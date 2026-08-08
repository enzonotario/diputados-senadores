<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { formatDate, isSenadorActivo } from "@/lib/utils";
import { partidoPath } from "@/utils/partido";
import { type ProfileFactSection } from "@/utils/memberProfile";
import type { CareerCargo } from "@/utils/memberCareer";

const props = defineProps<{
  senador: Senador;
  career?: CareerCargo[];
}>();

const profileSections = computed<ProfileFactSection[]>(() => {
  const s = props.senador;
  const legalInicio = s.periodoLegal?.inicio
    ? formatDate(s.periodoLegal.inicio)
    : "—";
  const legalFin = s.periodoLegal?.fin ? formatDate(s.periodoLegal.fin) : "—";
  const dieta = s.meta?.dieta;

  const sections: ProfileFactSection[] = [
    {
      title: "Identidad",
      items: [
        { label: "Provincia", value: s.provincia },
        {
          label: "Partido",
          value: s.partido || "—",
          to: partidoPath(s.partido),
        },
        {
          label: "Bloque",
          value: s.bloque || null,
        },
      ],
    },
    {
      title: "Mandato",
      items: [
        {
          label: "Período legal",
          value: `${legalInicio} – ${legalFin}`,
        },
        {
          label: "Inicio real",
          value: s.periodoReal?.inicio
            ? formatDate(s.periodoReal.inicio)
            : null,
        },
        {
          label: "Cese",
          value: s.periodoReal?.fin
            ? formatDate(s.periodoReal.fin)
            : isSenadorActivo(s)
              ? "En funciones"
              : null,
        },
      ],
    },
    {
      title: "Contacto",
      items: [
        {
          label: "Email",
          value: s.email || null,
          href: s.email ? `mailto:${s.email}` : null,
        },
      ],
    },
  ];

  if (dieta) {
    sections.push({
      title: "Dieta",
      items: [
        {
          label: "Donación",
          value: dieta.donacion ? "Sí" : "No",
          hideEmpty: false,
        },
        {
          label: "Renuncia al aumento",
          value: dieta.renunciaAlAumento ? "Sí" : "No",
          hideEmpty: false,
        },
        {
          label: "Aportes partidarios",
          value: dieta.aportesPartidarios ? "Sí" : "No",
          hideEmpty: false,
        },
        {
          label: "Ver listado",
          value: "Todas las dietas",
          to: "/senadores/dietas",
          hideEmpty: false,
        },
      ],
    });
  }

  sections.push({
    title: "Notas",
    items: [
      { label: "Reemplazo", value: s.reemplazo || null },
      { label: "Observaciones", value: s.observaciones || null },
    ],
  });

  return sections;
});
</script>

<template>
  <UCard :ui="{ body: 'p-0!' }" class="overflow-hidden">
    <div class="flex flex-col md:flex-row md:items-start">
      <div
        class="w-40 sm:w-48 md:w-52 shrink-0 mx-auto md:mx-0 aspect-square overflow-hidden bg-elevated self-center md:self-start"
      >
        <NuxtImg
          :src="senador.foto || '/placeholder-user.jpg'"
          :alt="senador.nombreCompleto || senador.nombre"
          width="208"
          height="208"
          sizes="160px sm:192px md:208px"
          densities="x1"
          class="w-full h-full object-cover object-top"
          loading="eager"
        />
      </div>

      <div class="flex flex-col gap-5 flex-1 p-6">
        <div
          class="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap"
        >
          <h1 class="text-2xl font-bold min-w-0">
            {{ senador.nombreCompleto || senador.nombre }}
          </h1>
          <PartidoLogo
            :partido="senador.partido"
            img-class="h-10 w-auto max-w-28 object-contain shrink-0"
          />
        </div>

        <MemberProfileFacts :sections="profileSections" />

        <MemberCareerTimeline
          v-if="career?.length"
          :cargos="career"
          chamber="senadores"
        />
      </div>
    </div>
  </UCard>
</template>
