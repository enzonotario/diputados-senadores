/**
 * Matching voto↔diputado: slug, tildes, nombres parciales y aliases locales.
 *
 * Editá los overrides permanentes en `manual` de:
 *   app/data/diputados-alias-nombres.json
 *
 * `auto` son sugerencias ya detectadas (2º nombre, tildes, apóstrofes).
 * Si un caso nuevo falla, agregalo en `manual` con el id HCDN.
 */

import aliasesFile from "../data/diputados-alias-nombres.json";
import {
  type AliasNombresFile,
  claveApellidoNombre,
  flattenAliasMap,
  foldNombre,
} from "./matchSenadorNombre";

let _aliasMap: Map<string, string> | null = null;

export function getDiputadosAliasMap(): Map<string, string> {
  if (!_aliasMap) {
    _aliasMap = flattenAliasMap(aliasesFile as AliasNombresFile);
  }
  return _aliasMap;
}

/** Para tests / hot-reload de aliases en memoria. */
export function clearDiputadosAliasMapCache() {
  _aliasMap = null;
}

export function votoCoincideConDiputado(options: {
  votoNombre: string;
  votoSlug: string;
  diputadoId: string;
  diputadoNombre: string;
  diputadoSlug: string;
  aliasMap?: Map<string, string>;
}): boolean {
  const {
    votoNombre,
    votoSlug,
    diputadoId,
    diputadoNombre,
    diputadoSlug,
    aliasMap = getDiputadosAliasMap(),
  } = options;

  if (votoSlug && diputadoSlug && votoSlug === diputadoSlug) {
    return true;
  }

  if (foldNombre(votoNombre) === foldNombre(diputadoNombre)) {
    return true;
  }

  const aliasId =
    aliasMap.get(votoNombre) || aliasMap.get(foldNombre(votoNombre));
  if (aliasId && aliasId === String(diputadoId)) {
    return true;
  }

  // Apóstrofe / puntuación: "D'alessandro" ↔ "D Alessandro"
  const votoSlugSoft = String(votoSlug || "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const dipSlugSoft = String(diputadoSlug || "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (votoSlugSoft && dipSlugSoft && votoSlugSoft === dipSlugSoft) {
    return true;
  }

  const claveVoto = claveApellidoNombre(votoNombre);
  const claveDip = claveApellidoNombre(diputadoNombre);
  if (claveVoto && claveDip && claveVoto === claveDip) {
    // Evitar falsos positivos "Juan Carlos" ↔ "Juan Manuel":
    // si ambos tienen 2º nombre y difieren, no matchear solo por clave.
    const foldV = foldNombre(votoNombre);
    const foldD = foldNombre(diputadoNombre);
    const nosV = foldV.includes(",")
      ? foldV.split(",")[1]!.trim().split(/\s+/).filter(Boolean)
      : foldV.split(/\s+/).slice(1);
    const nosD = foldD.includes(",")
      ? foldD.split(",")[1]!.trim().split(/\s+/).filter(Boolean)
      : foldD.split(/\s+/).slice(1);
    if (nosV[1] && nosD[1] && nosV[1] !== nosD[1]) {
      return false;
    }
    return true;
  }

  return false;
}
