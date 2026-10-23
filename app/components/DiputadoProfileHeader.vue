<script setup lang="ts">
import type { Diputado } from "@/lib/types-diputados";
import { formatDate, isDiputadoActivo } from "@/lib/utils";
import { bloquePath } from "@/utils/bloque";
import { diputadoMemberTabPath } from "@/utils/diputadoMemberTabs";
import {
  careerHighlights,
  comisionesHighlight,
  formatGenero,
  type ProfileFactSection,
  type ProfileHighlight,
} from "@/utils/memberProfile";
import type { CareerCargo } from "@/utils/memberCareer";

const props = defineProps<{
  diputado: Diputado;
  career?: CareerCargo[];
}>();

const activo = computed(() => isDiputadoActivo(props.diputado));

const cargo = computed(() =>
  formatGenero(props.diputado.genero) === "Femenino"
    ? "Diputada Nacional"
    : "Diputado Nacional",
);

const highlights = computed<ProfileHighlight[]>(() => {
  const d = props.diputado;
  const comisiones = comisionesHighlight(
    d.meta?.comisiones,
    diputadoMemberTabPath(d.id, "comisiones"),
  );
  const banca =
    d.banca != null && Number.isFinite(Number(d.banca))
      ? { label: "Banca", value: String(d.banca) }
      : null;
  return [
    ...(comisiones ? [comisiones] : []),
    ...careerHighlights(props.career || []),
    ...(banca ? [banca] : []),
  ];
});

const profileSections = computed<ProfileFactSection[]>(() => {
  const d = props.diputado;
  const bloqueInicio = d.periodoBloque?.inicio
    ? formatDate(d.periodoBloque.inicio)
    : null;
  const finMandato = d.periodoMandato?.fin;
  // El cese solo aporta si difiere del fin natural del mandato.
  const ceseAnticipado =
    d.ceseFecha && finMandato && d.ceseFecha.slice(0, 10) !== finMandato.slice(0, 10);

  return [
    {
      title: "Datos",
      items: [
        { label: "Género", value: formatGenero(d.genero) },
        {
          label: "Juramento",
          value: d.juramentoFecha ? formatDate(d.juramentoFecha) : null,
        },
        {
          label: "En el bloque desde",
          value: bloqueInicio,
        },
        {
          label: "Cese",
          value: ceseAnticipado ? formatDate(d.ceseFecha!) : null,
        },
      ],
    },
  ];
});
</script>

<template>
  <MemberProfileCard
    :name="`${diputado.nombre} ${diputado.apellido}`"
    :foto="diputado.foto"
    :cargo="cargo"
    :provincia="diputado.provincia"
    :group="
      diputado.bloque
        ? { label: diputado.bloque, to: bloquePath(diputado.bloque) }
        : null
    "
    :activo="activo"
    :mandato="diputado.periodoMandato"
    :highlights="highlights"
    :sections="profileSections"
    :career="career"
    chamber="diputados"
  />
</template>
