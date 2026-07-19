/**
 * Logos de partidos (Senado).
 *
 * Assets en `/public/assets/partidos/`. Para agregar o corregir un logo:
 * 1. Poner el archivo en `public/assets/partidos/`
 * 2. Agregar (o actualizar) la clave normalizada en `PARTIDO_LOGO_BY_KEY`
 *
 * La clave es el nombre del partido normalizado con `normalizePartidoLogoKey`
 * (minúsculas, sin acentos, espacios/`-` → `_`, `+` → `mas`).
 * Podés mapear varias claves (aliases) al mismo archivo.
 */

const LOGOS_BASE = "/assets/partidos";

/** Clave normalizada → nombre de archivo en `public/assets/partidos/` */
export const PARTIDO_LOGO_BY_KEY: Record<string, string> = {
  // Aliases → archivo
  alianza_cambiemos: "Cambiemos_logo.png",
  cambiemos: "Cambiemos_logo.png",

  alianza_frente_de_todos: "alianza_frente_de_todos.svg",
  frente_de_todos: "frente_de_todos.jpg",

  alianza_la_libertad_avanza: "alianza_la_libertad_avanza.png",
  la_libertad_avanza: "alianza_la_libertad_avanza.png",

  alianza_union_por_la_patria: "union_por_la_patria.png",
  union_por_la_patria: "union_por_la_patria.png",

  alianza_frente_para_la_victoria: "frente_para_la_victoria.png",
  frente_para_la_victoria: "frente_para_la_victoria.png",

  alianza_union_pro: "union_pro.png",
  union_pro: "union_pro.png",

  union_por_cordoba: "union_por_cordoba.jpg",
  alianza_union_por_cordoba: "union_por_cordoba.jpg",

  hacemos_por_cordoba: "hacemos_por_cordoba.png",

  frente_renovador_de_la_concordia: "frente_renovador_de_la_concordia.png",
  frente_renovador_de_la_concordia_innovacion_federal:
    "frente_renovador_de_la_concordia.png",

  juntos_por_el_cambio: "juntos_por_el_cambio.png",
  juntos_por_el_cambio_chubut: "juntos_por_el_cambio_chubut.png",
  juntos_por_el_cambio_tierra_del_fuego:
    "juntos_por_el_cambio_tierra_del_fuego.jpeg",

  union_civica_radical: "union_civica_radical.png",
  unidad_ciudadana: "unidad_ciudadana.png",

  frente_civico_por_santiago: "frente_civico_por_santiago.png",
  frente_civico_y_social_de_catamarca:
    "frente_civico_y_social_de_catamarca.webp",
  alianza_frente_civico: "alianza_frente_civico.png",

  frente_cambia_mendoza: "frente_cambia_mendoza.png",
  alianza_frente_progresista: "alianza_frente_progresista.png",
  frente_amplio_progresista: "frente_amplio_progresista.png",

  eco_mas_vamos_corrientes: "eco_mas_vamos_corrientes.jpg",

  alianza_por_santa_cruz: "alianza_por_santa_cruz.png",
  blanco_de_los_trabaj_jujuy: "blanco_de_los_trabaj_jujuy.jpg",
  chubut_somos_todos: "chubut_somos_todos.png",
  partido_renovador_federal: "partido_renovador_federal.jpg",
  alianza_frente_justicialista: "alianza_frente_justicialista.png",
  movimiento_popular_neuquino: "movimiento_popular_neuquino.png",
  movimiento_popular_fueguino: "movimiento_popular_fueguino.png",
  juntos_somos_rio_negro: "juntos_somos_rio_negro.png",
};

/** Normaliza el nombre de partido a clave de lookup del mapa. */
export function normalizePartidoLogoKey(partido: string): string {
  return partido
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " mas ")
    .replace(/[.\u00b7]/g, "")
    .replace(/[-/\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Ruta pública del logo del partido, o `null` si no hay mapeo.
 * Actualizar `PARTIDO_LOGO_BY_KEY` para sumar partidos / renombrar archivos.
 */
export function partidoLogoPath(partido?: string | null): string | null {
  if (!partido) return null;
  const key = normalizePartidoLogoKey(partido);
  if (!key) return null;

  const file = PARTIDO_LOGO_BY_KEY[key];
  if (file) return `${LOGOS_BASE}/${file}`;

  // Fallback por inclusión (ej. nombre provincial con sufijo). Preferí
  // entradas explícitas en el mapa; acá gana la clave más larga que matchee.
  let bestKey: string | null = null;
  for (const mapKey of Object.keys(PARTIDO_LOGO_BY_KEY)) {
    const hit =
      key.includes(mapKey) || (key.length >= 8 && mapKey.includes(key));
    if (!hit) continue;
    if (!bestKey || mapKey.length > bestKey.length) bestKey = mapKey;
  }
  if (bestKey) return `${LOGOS_BASE}/${PARTIDO_LOGO_BY_KEY[bestKey]}`;

  return null;
}
