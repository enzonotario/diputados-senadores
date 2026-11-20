/**
 * Matching voto↔senador: tildes, nombres parciales y aliases locales.
 *
 * Mapa editable en `app/data/senadores-alias-nombres.json`
 * (nombre-en-acta → id). Claves que empiezan con `_` se ignoran.
 */

import aliasesFile from "../data/senadores-alias-nombres.json";

/** JSON plano: nombre → id; claves `_…` (p. ej. `_comment`) se ignoran. */
export type AliasNombresFile = Record<string, string | undefined>;

export function foldNombre(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/[^a-z0-9,\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function claveApellidoNombre(nombre: string): string | null {
  const folded = foldNombre(nombre);
  if (!folded) return null;

  let apellidos: string[];
  let nombres: string[];
  if (folded.includes(",")) {
    const [apellidoRaw, ...rest] = folded.split(",");
    apellidos = apellidoRaw.trim().split(/\s+/).filter(Boolean);
    nombres = rest.join(",").trim().split(/\s+/).filter(Boolean);
  } else {
    const tokens = folded.split(/\s+/).filter(Boolean);
    apellidos = tokens.slice(0, 1);
    nombres = tokens.slice(1);
  }

  if (!apellidos[0] || !nombres[0]) return null;
  return `${apellidos[0]}|${nombres[0]}`;
}

export function flattenAliasMap(
  aliases: AliasNombresFile | null | undefined = aliasesFile as AliasNombresFile,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!aliases) return map;

  for (const [nombre, id] of Object.entries(aliases)) {
    if (!nombre || nombre.startsWith("_") || !id) continue;
    const idStr = String(id);
    map.set(nombre, idStr);
    map.set(foldNombre(nombre), idStr);
  }
  return map;
}

let _aliasMap: Map<string, string> | null = null;

export function getSenadoresAliasMap(): Map<string, string> {
  if (!_aliasMap) {
    _aliasMap = flattenAliasMap(aliasesFile as AliasNombresFile);
  }
  return _aliasMap;
}

/** Para tests / hot-reload de aliases en memoria. */
export function clearSenadoresAliasMapCache() {
  _aliasMap = null;
}

/**
 * Index equivalent to `votoCoincideConSenador` but O(1) per vote: every rule
 * is a key equality, so senadores are bucketed by key once. Returns indices
 * into `senadores` in ascending order (same "first match" as `Array.find`).
 */
export function buildSenadorVotoMatcher(
  senadores: Array<{ id: string; nombre: string; nombreSlug: string }>,
  aliasMap: Map<string, string> = getSenadoresAliasMap(),
): (votoNombre: string, votoSlug: string) => number[] {
  const bySlug = new Map<string, number[]>();
  const byFold = new Map<string, number[]>();
  const byClave = new Map<string, number[]>();
  const byId = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, k: string, i: number) => {
    const list = m.get(k);
    if (list) list.push(i);
    else m.set(k, [i]);
  };

  senadores.forEach((s, i) => {
    if (s.nombreSlug) push(bySlug, s.nombreSlug, i);
    push(byFold, foldNombre(s.nombre), i);
    const clave = claveApellidoNombre(s.nombre);
    if (clave) push(byClave, clave, i);
    push(byId, String(s.id), i);
  });

  const cache = new Map<string, number[]>();
  return (votoNombre, votoSlug) => {
    const cacheKey = `${votoSlug}\u0000${votoNombre}`;
    const hit = cache.get(cacheKey);
    if (hit) return hit;

    const folded = foldNombre(votoNombre);
    const out = new Set<number>();
    for (const i of (votoSlug && bySlug.get(votoSlug)) || []) out.add(i);
    for (const i of byFold.get(folded) || []) out.add(i);
    const aliasId = aliasMap.get(votoNombre) || aliasMap.get(folded);
    if (aliasId) for (const i of byId.get(aliasId) || []) out.add(i);
    const clave = claveApellidoNombre(votoNombre);
    if (clave) for (const i of byClave.get(clave) || []) out.add(i);

    const result = [...out].sort((a, b) => a - b);
    cache.set(cacheKey, result);
    return result;
  };
}

export function votoCoincideConSenador(options: {
  votoNombre: string;
  votoSlug: string;
  senadorId: string;
  senadorNombre: string;
  senadorSlug: string;
  aliasMap?: Map<string, string>;
}): boolean {
  const {
    votoNombre,
    votoSlug,
    senadorId,
    senadorNombre,
    senadorSlug,
    aliasMap = getSenadoresAliasMap(),
  } = options;

  if (votoSlug && senadorSlug && votoSlug === senadorSlug) {
    return true;
  }

  if (foldNombre(votoNombre) === foldNombre(senadorNombre)) {
    return true;
  }

  const aliasId =
    aliasMap.get(votoNombre) || aliasMap.get(foldNombre(votoNombre));
  if (aliasId && aliasId === String(senadorId)) {
    return true;
  }

  const claveVoto = claveApellidoNombre(votoNombre);
  const claveSenador = claveApellidoNombre(senadorNombre);
  if (claveVoto && claveSenador && claveVoto === claveSenador) {
    return true;
  }

  return false;
}
