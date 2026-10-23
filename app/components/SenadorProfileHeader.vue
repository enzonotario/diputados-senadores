<script setup lang="ts">
import type { Senador } from "@/lib/types";
import { formatDate, isSenadorActivo } from "@/lib/utils";
import { partidoPath } from "@/utils/partido";
import { senadorMemberTabPath } from "@/utils/senadorMemberTabs";
import {
  careerHighlights,
  comisionesHighlight,
  type ProfileFactSection,
  type ProfileHighlight,
} from "@/utils/memberProfile";
import type { CareerCargo } from "@/utils/memberCareer";
import { SENADO_DIETAS_MECANISMOS_PDF_URL } from "@/utils/senadoFuentes";

const props = defineProps<{
  senador: Senador;
  career?: CareerCargo[];
}>();

const activo = computed(() => isSenadorActivo(props.senador));

// La API del Senado no trae género; el historial lo infiere ("Senadora").
const cargo = computed(() =>
  props.career?.find((c) => c.isCurrentMember)?.label === "Senadora"
    ? "Senadora Nacional"
    : "Senador Nacional",
);

const highlights = computed<ProfileHighlight[]>(() => {
  const s = props.senador;
  const comisiones = comisionesHighlight(
    s.meta?.comisiones,
    senadorMemberTabPath(s.id, "comisiones"),
  );
  const personal = s.meta?.personal;
  const despacho = personal?.agentes
    ? {
        label: "Personal de despacho",
        value: String(personal.agentes),
        hint: `${personal.brutoMensualEstimado.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        })} / mes`,
        to: senadorMemberTabPath(s.id, "gasto"),
      }
    : null;
  return [
    ...(comisiones ? [comisiones] : []),
    ...careerHighlights(props.career || []),
    ...(despacho ? [despacho] : []),
  ];
});

const profileSections = computed<ProfileFactSection[]>(() => {
  const s = props.senador;
  const dieta = s.meta?.dieta;

  const sections: ProfileFactSection[] = [
    {
      title: "Datos",
      items: [
        { label: "Bloque", value: s.bloque || null },
        {
          label: "Inicio real",
          value:
            s.periodoReal?.inicio &&
            s.periodoReal.inicio !== s.periodoLegal?.inicio
              ? formatDate(s.periodoReal.inicio)
              : null,
        },
        {
          label: "Cese",
          value:
            s.periodoReal?.fin && s.periodoReal.fin !== s.periodoLegal?.fin
              ? formatDate(s.periodoReal.fin)
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
          href: SENADO_DIETAS_MECANISMOS_PDF_URL,
        },
        {
          label: "Renuncia al aumento",
          value: dieta.renunciaAlAumento ? "Sí" : "No",
          hideEmpty: false,
          href: SENADO_DIETAS_MECANISMOS_PDF_URL,
        },
        {
          label: "Aportes partidarios",
          value: dieta.aportesPartidarios ? "Sí" : "No",
          hideEmpty: false,
          href: SENADO_DIETAS_MECANISMOS_PDF_URL,
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
  <MemberProfileCard
    :name="senador.nombreCompleto || senador.nombre"
    :foto="senador.foto"
    small-foto
    :cargo="cargo"
    :provincia="senador.provincia"
    :group="
      senador.partido
        ? { label: senador.partido, to: partidoPath(senador.partido) }
        : null
    "
    :activo="activo"
    :mandato="senador.periodoLegal"
    :highlights="highlights"
    :sections="profileSections"
    :career="career"
    chamber="senadores"
  >
    <template #logo>
      <PartidoLogo
        :partido="senador.partido"
        img-class="h-12 w-auto max-w-32 object-contain shrink-0"
      />
    </template>
  </MemberProfileCard>
</template>
