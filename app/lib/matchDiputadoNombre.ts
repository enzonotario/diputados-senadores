/**
 * Matching voto↔diputado: slug, tildes, nombres parciales y aliases locales.
 *
 * Mapa editable en `app/data/diputados-alias-nombres.json`
 * (nombre-en-acta → id HCDN). Claves que empiezan con `_` se ignoran.
 *
 * Para unir miles de votos, usá `buildDiputadoVotoResolver` (índice O(1))
 * en vez de `votoCoincideConDiputado` en un nested loop.
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

function softSlug(value: string): string {
  return String(value || "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function nombresDespuesApellido(folded: string): string[] {
  if (folded.includes(",")) {
    return folded.split(",")[1]!.trim().split(/\s+/).filter(Boolean);
  }
  return folded.split(/\s+/).slice(1);
}

/** True si la clave apellido+1er nombre no choca por 2º nombre distinto. */
function claveCompatible(votoNombre: string, diputadoNombre: string): boolean {
  const foldV = foldNombre(votoNombre);
  const foldD = foldNombre(diputadoNombre);
  const nosV = nombresDespuesApellido(foldV);
  const nosD = nombresDespuesApellido(foldD);
  if (nosV[1] && nosD[1] && nosV[1] !== nosD[1]) return false;
  return true;
}

export type DiputadoMatchInput = {
  id: string;
  nombreCompleto: string;
  nombreSlug: string;
};

/**
 * Índice para resolver voto → diputado en O(1) amortizado.
 * Preferí esto frente a N×M con `votoCoincideConDiputado`.
 */
export function buildDiputadoVotoResolver(
  diputados: DiputadoMatchInput[],
  aliasMap: Map<string, string> = getDiputadosAliasMap(),
): (votoNombre: string, votoSlug: string) => DiputadoMatchInput | undefined {
  const byId = new Map<string, DiputadoMatchInput>();
  const bySlug = new Map<string, DiputadoMatchInput>();
  const bySoftSlug = new Map<string, DiputadoMatchInput>();
  const byFold = new Map<string, DiputadoMatchInput>();
  const byClave = new Map<string, DiputadoMatchInput[]>();

  for (const d of diputados) {
    byId.set(String(d.id), d);
    if (d.nombreSlug) {
      bySlug.set(d.nombreSlug, d);
      const soft = softSlug(d.nombreSlug);
      if (soft) bySoftSlug.set(soft, d);
    }
    const fold = foldNombre(d.nombreCompleto);
    if (fold) byFold.set(fold, d);
    const clave = claveApellidoNombre(d.nombreCompleto);
    if (clave) {
      const list = byClave.get(clave);
      if (list) list.push(d);
      else byClave.set(clave, [d]);
    }
  }

  return (votoNombre: string, votoSlug: string) => {
    if (votoSlug) {
      const byS = bySlug.get(votoSlug);
      if (byS) return byS;
      const soft = softSlug(votoSlug);
      if (soft) {
        const bySoft = bySoftSlug.get(soft);
        if (bySoft) return bySoft;
      }
    }

    const fold = foldNombre(votoNombre);
    if (fold) {
      const byF = byFold.get(fold);
      if (byF) return byF;
    }

    const aliasId =
      aliasMap.get(votoNombre) || (fold ? aliasMap.get(fold) : undefined);
    if (aliasId) {
      const byA = byId.get(aliasId);
      if (byA) return byA;
    }

    const clave = claveApellidoNombre(votoNombre);
    if (!clave) return undefined;
    const cands = byClave.get(clave);
    if (!cands?.length) return undefined;
    for (const d of cands) {
      if (claveCompatible(votoNombre, d.nombreCompleto)) return d;
    }
    return undefined;
  };
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

  if (
    votoSlug &&
    diputadoSlug &&
    softSlug(votoSlug) === softSlug(diputadoSlug)
  ) {
    return true;
  }

  const claveVoto = claveApellidoNombre(votoNombre);
  const claveDip = claveApellidoNombre(diputadoNombre);
  if (claveVoto && claveDip && claveVoto === claveDip) {
    return claveCompatible(votoNombre, diputadoNombre);
  }

  return false;
}
