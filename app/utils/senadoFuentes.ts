/** Fuentes oficiales del Senado usadas en gasto / dieta / personal. */

export const SENADO_DIETAS_URL = "https://www.senado.gob.ar/dietas";

export const SENADO_DIETAS_MECANISMOS_PDF_URL =
  "https://www.senado.gob.ar/bundles/senadoportal/webNueva/pdf/dietas/mecanismos.pdf";

export const SENADO_ESCALA_SALARIAL_URL =
  "https://www.senado.gob.ar/prensa/adjunto/descargarArchivo/tipo/EscalaSalarial";

export const SENADO_BLOQUES_URL =
  "https://www.senado.gob.ar/senadores/listados/agrupados-por-bloques";

export const SENADO_COMPOSICION_PERSONAL_URL =
  "https://www.senado.gob.ar/recursos-humanos/agente/composicion";

export function senadoSenadorFichaUrl(id: string | number) {
  return `https://www.senado.gob.ar/senadores/senador/${id}`;
}

export type SenadoFuenteLink = {
  label: string;
  href: string;
};

/** Fuentes del cálculo de gasto agregado. */
export function gastoFuentesLinks(options?: {
  fuenteEscala?: string | null;
  fuenteBloques?: string | null;
  fuenteDietas?: string | null;
}): SenadoFuenteLink[] {
  return [
    {
      label: "Dietas y gastos de representación",
      href: options?.fuenteDietas || SENADO_DIETAS_URL,
    },
    {
      label: "Escala salarial",
      href: options?.fuenteEscala || SENADO_ESCALA_SALARIAL_URL,
    },
    {
      label: "Personal por bloques",
      href: options?.fuenteBloques || SENADO_BLOQUES_URL,
    },
    {
      label: "Composición de personal",
      href: SENADO_COMPOSICION_PERSONAL_URL,
    },
  ];
}

/** Fuentes en la ficha de un senador. */
export function senadorGastoFuentesLinks(options?: {
  senadorId?: string | number | null;
  personalFuente?: string | null;
}): SenadoFuenteLink[] {
  const links: SenadoFuenteLink[] = [
    { label: "Dietas (fórmula 4000 módulos)", href: SENADO_DIETAS_URL },
    { label: "Escala salarial", href: SENADO_ESCALA_SALARIAL_URL },
    {
      label: "Mecanismos (renuncia / donación / aportes)",
      href: SENADO_DIETAS_MECANISMOS_PDF_URL,
    },
  ];
  const ficha =
    options?.personalFuente ||
    (options?.senadorId != null
      ? senadoSenadorFichaUrl(options.senadorId)
      : null);
  if (ficha) {
    links.push({ label: "Personal del despacho (ficha)", href: ficha });
  }
  return links;
}
