import slugify from "slugify";
import type { Acta, Senador, Voto } from "./types";
import {
  calcularEstadisticasSenador,
  isSenadorActivo,
  parseNombreSenador,
} from "./utils";
import {
  averagePresentismo,
  buildPresentismoPorPeriodo,
} from "../utils/presentismo";
import {
  getSenadoresAliasMap,
  votoCoincideConSenador,
} from "./matchSenadorNombre";
import { normalizeResultado, normalizeVotoTipo } from "../utils/votoTipo";
import {
  fakeSenadoPeriodoKey,
  SIN_PERIODO_KEY,
} from "../utils/periodoLegislativo";

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
}

function getApiOrigin() {
  // Sin tryUseNuxtApp: este módulo también corre desde server/api (Nitro).
  const raw = String(
    process.env.NUXT_PUBLIC_API_URL ||
      process.env.NUXT_PUBLIC_API_BASE_URL ||
      "https://api.argentinadatos.com",
  );
  try {
    return new URL(raw).origin;
  } catch {
    return "https://api.argentinadatos.com";
  }
}

import { createSingleflight } from "./singleflight";

type Viajes12mRaw = {
  window: {
    hastaAnio: number;
    hastaMes: number;
    hastaIdx: number;
    desdeIdx: number;
    desdeAnio: number;
    desdeMes: number;
  };
  nacionales: any[];
  internacionales: any[];
};

export type ViajesExploreNacional = {
  senadorId: string | null;
  senadorNombre: string;
  anio: number;
  mes: number;
  mesNombre: string | null;
  origen: string;
  origenCodigo: string | null;
  destino: string;
  destinoCodigo: string | null;
  documentoId: string;
  documentoUrl: string;
};

export type ViajesExploreInternacional = {
  senadorId: string | null;
  senadorNombre: string;
  anio: number;
  mes: number | null;
  destino: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaTexto: string | null;
  motivo: string | null;
  expediente: string | null;
  documentoId: string;
  documentoUrl: string;
};

export type ViajesExploreRankingRow = {
  id: string;
  nombreCompleto: string;
  nombre: string;
  foto: string | null;
  provincia: string;
  partido: string;
  bloque: string | null;
  viajesUltimos12Meses: number;
};

export type ViajesExplorePayload = {
  ventana: {
    desde: { anio: number; mes: number };
    hasta: { anio: number; mes: number };
  };
  ranking: ViajesExploreRankingRow[];
  nacionales: ViajesExploreNacional[];
  internacionales: ViajesExploreInternacional[];
};

let _senadoresRaw = createSingleflight<any[]>();
let _senadores = createSingleflight<Senador[]>();
let _actas = createSingleflight<Acta[]>();
let _senadoresConActas = createSingleflight<Senador[]>();
const _viajesById = new Map<string, Promise<import("./types").SenadorViajes>>();
let _viajesConteo12m = createSingleflight<Record<string, number>>();
let _viajes12mRaw = createSingleflight<Viajes12mRaw>();
let _viajesExplore = createSingleflight<ViajesExplorePayload>();
let _comisiones = createSingleflight<import("./types").Comision[]>();
let _presidencia = createSingleflight<import("./types").PresidenciaSenado | null>();

function assertServerData() {
  if (import.meta.client) {
    throw new Error(
      "senadores-data: getActas/getSenadoresConActas solo en server. Usá /api/* (mini-API Nitro).",
    );
  }
}

/** Limpia caches en memoria. */
export function clearSenadoresDataCache() {
  _senadoresRaw.clear();
  _senadores.clear();
  _actas.clear();
  _senadoresConActas.clear();
  _viajesById.clear();
  _viajesConteo12m.clear();
  _viajes12mRaw.clear();
  _viajesExplore.clear();
  _comisiones.clear();
  _presidencia.clear();
}

function votoMatchesSenador(voto: Voto, senador: Senador): boolean {
  return votoCoincideConSenador({
    votoNombre: voto.senador || "",
    votoSlug: voto.senadorSlug || "",
    senadorId: senador.id,
    senadorNombre: senador.nombre || senador.nombreCompleto || "",
    senadorSlug: senador.nombreSlug || "",
    aliasMap: getSenadoresAliasMap(),
  });
}

function maxByPeriod(a: any, b: any) {
  const aLegal = new Date(a?.periodoLegal?.inicio || 0).getTime();
  const bLegal = new Date(b?.periodoLegal?.inicio || 0).getTime();
  if (aLegal !== bLegal) return bLegal - aLegal;
  const aReal = new Date(a?.periodoReal?.inicio || 0).getTime();
  const bReal = new Date(b?.periodoReal?.inicio || 0).getTime();
  if (aReal !== bReal) return bReal - aReal;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function mapSenador(raw: any): Senador {
  const parsed = parseNombreSenador(raw.nombre || "");
  return {
    id: String(raw.id),
    nombre: raw.nombre || "",
    apellido: parsed.apellido,
    nombreDePila: parsed.nombreDePila,
    nombreCompleto: parsed.nombreCompleto || raw.nombre || "",
    nombreSlug: slug(raw.nombre || ""),
    provincia: raw.provincia || "",
    partido: raw.partido || "Sin Especificar",
    bloque: raw.bloque ?? null,
    periodoLegal: {
      inicio: raw.periodoLegal?.inicio || "",
      fin: raw.periodoLegal?.fin ?? null,
    },
    periodoReal: {
      inicio: raw.periodoReal?.inicio || "",
      fin: raw.periodoReal?.fin ?? null,
    },
    reemplazo: raw.reemplazo ?? null,
    observaciones: raw.observaciones ?? null,
    foto: raw.foto || null,
    email: raw.email ?? null,
    telefono: raw.telefono ?? null,
    meta: raw.meta ?? null,
  };
}

function mapActa(raw: any): Acta {
  const fecha = raw.fecha || "";
  // La API del Senado no envía período legislativo; se deriva por fecha
  // (período ordinario mar–feb). Ver `fakeSenadoPeriodoKey`.
  const periodoRaw = String(raw.periodo || "").trim();
  const derived = fakeSenadoPeriodoKey(fecha);
  const periodo =
    periodoRaw ||
    (derived !== SIN_PERIODO_KEY ? derived : undefined);

  return {
    id: String(raw.actaId ?? raw.id),
    titulo: raw.titulo || "",
    proyecto: raw.proyecto || "",
    descripcion: raw.descripcion || "",
    quorumTipo: raw.quorumTipo || "",
    fecha,
    numeroActa: raw.acta != null ? String(raw.acta) : "",
    mayoria: raw.mayoria || "",
    miembros: raw.miembros ?? 0,
    votosAfirmativos: raw.afirmativos ?? 0,
    votosNegativos: raw.negativos ?? 0,
    abstenciones: raw.abstenciones ?? 0,
    presentes: raw.presentes ?? 0,
    ausentes: raw.ausentes ?? 0,
    amn: raw.amn ?? 0,
    resultado: normalizeResultado(raw.resultado),
    votacion: raw.votacion != null ? String(raw.votacion).trim() || null : null,
    presidente:
      raw.presidente != null ? String(raw.presidente).trim() || null : null,
    observaciones: raw.observaciones || [],
    periodo,
    votos: (raw.votos || []).map(
      (v: any): Voto => ({
        senador: v.nombre || "",
        senadorSlug: slug(v.nombre || ""),
        tipoVoto: normalizeVotoTipo(v.voto),
        banca: v.banca || "",
      }),
    ),
  };
}

export async function getSenadoresRaw(): Promise<any[]> {
  return _senadoresRaw.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<any[]>(`${origin}/v1/senado/senadores`);
    return Array.isArray(raw) ? raw : [];
  });
}

export async function getSenadores(): Promise<Senador[]> {
  return _senadores.get(async () => {
    const raw = await getSenadoresRaw();

    const byId = new Map<string, any>();
    [...raw].sort(maxByPeriod).forEach((d) => {
      const id = String(d.id);
      if (!byId.has(id)) byId.set(id, d);
    });

    const conteo = await getViajesConteo12mBySenadorId();

    return Array.from(byId.values())
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((row) => {
        const s = mapSenador(row);
        return {
          ...s,
          viajesUltimos12Meses: conteo[s.id] ?? 0,
        };
      });
  });
}

/**
 * Mapa senadorId → total de viajes (nac+intl) en los últimos 12 meses.
 * Prefiere el endpoint compacto (~8 KB); si aún no está en prod, calcula
 * desde los índices por año (ya publicados).
 */
export async function getViajesConteo12mBySenadorId(): Promise<
  Record<string, number>
> {
  assertServerData();
  return _viajesConteo12m.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(`${origin}/v1/senado/viajes/conteo-12m`);
      const por = raw?.porSenador;
      if (por && typeof por === "object" && Object.keys(por).length > 0) {
        const out: Record<string, number> = {};
        for (const [id, value] of Object.entries(por)) {
          if (typeof value === "number") {
            out[String(id)] = value;
            continue;
          }
          if (value && typeof value === "object") {
            const total = (value as any).total;
            out[String(id)] =
              typeof total === "number"
                ? total
                : Number((value as any).nacionales || 0) +
                  Number((value as any).internacionales || 0);
          }
        }
        return out;
      }
    } catch {
      // endpoint aún no publicado → fallback
    }
    return computeViajesConteo12mFromYearIndexes(origin);
  });
}

function viajes12mWindow(asOf = new Date()) {
  const hastaAnio = asOf.getUTCFullYear();
  const hastaMes = asOf.getUTCMonth() + 1;
  const hastaIdx = hastaAnio * 12 + hastaMes;
  const desdeIdx = hastaIdx - 11;
  const desdeAnio = Math.floor((desdeIdx - 1) / 12);
  const desdeMes = ((desdeIdx - 1) % 12) + 1;
  return {
    hastaAnio,
    hastaMes,
    hastaIdx,
    desdeIdx,
    desdeAnio,
    desdeMes,
  };
}

function viajeIn12mWindow(
  anio: number,
  mes: number | null | undefined,
  fechaInicio: string | null | undefined,
  desdeIdx: number,
  hastaIdx: number,
): boolean {
  if (fechaInicio && /^\d{4}-\d{2}/.test(fechaInicio)) {
    const y = Number(fechaInicio.slice(0, 4));
    const m = Number(fechaInicio.slice(5, 7));
    if (y > 0 && m >= 1 && m <= 12) {
      const idx = y * 12 + m;
      return idx >= desdeIdx && idx <= hastaIdx;
    }
  }
  if (!anio || anio < 1) return false;
  const m = mes != null && mes >= 1 && mes <= 12 ? mes : 1;
  const idx = anio * 12 + m;
  return idx >= desdeIdx && idx <= hastaIdx;
}

async function getViajes12mRaw(origin: string): Promise<Viajes12mRaw> {
  return _viajes12mRaw.get(async () => {
    const w = viajes12mWindow();
    const years = [...new Set([w.desdeAnio, w.hastaAnio])];
    const nacLists = await Promise.all(
      years.map((y) =>
        $fetch<any[]>(`${origin}/v1/senado/viajes/nacionales/${y}`).catch(
          () => [] as any[],
        ),
      ),
    );
    const intl = await $fetch<any[]>(
      `${origin}/v1/senado/viajes/internacionales`,
    ).catch(() => [] as any[]);

    const nacionales: any[] = [];
    for (const list of nacLists) {
      for (const v of list || []) {
        if (
          viajeIn12mWindow(
            Number(v?.anio),
            v?.mes,
            null,
            w.desdeIdx,
            w.hastaIdx,
          )
        ) {
          nacionales.push(v);
        }
      }
    }

    const internacionales = (intl || []).filter((v) =>
      viajeIn12mWindow(
        Number(v?.anio),
        v?.mes,
        v?.fechaInicio,
        w.desdeIdx,
        w.hastaIdx,
      ),
    );

    return { window: w, nacionales, internacionales };
  });
}

/** Fallback mientras prod no tenga `/viajes/conteo-12m`. */
async function computeViajesConteo12mFromYearIndexes(
  origin: string,
): Promise<Record<string, number>> {
  const raw = await getViajes12mRaw(origin);
  const out: Record<string, number> = {};
  const bump = (senadorId: unknown) => {
    if (senadorId == null || senadorId === "") return;
    const id = String(senadorId);
    out[id] = (out[id] || 0) + 1;
  };
  for (const v of raw.nacionales) bump(v?.senadorId);
  for (const v of raw.internacionales) bump(v?.senadorId);
  return out;
}

/** Explorador de viajes (últimos 12 meses) para todos los senadores. */
export async function getViajesExplore(): Promise<ViajesExplorePayload> {
  assertServerData();
  return _viajesExplore.get(async () => {
    const origin = getApiOrigin();
    const [senadores, raw] = await Promise.all([
      getSenadores(),
      getViajes12mRaw(origin),
    ]);

    const byId = new Map(senadores.map((s) => [String(s.id), s]));
    const nameOf = (id: unknown, fallback: string) => {
      if (id == null || id === "") return fallback || "—";
      const s = byId.get(String(id));
      return s?.nombreCompleto || s?.nombre || fallback || "—";
    };

    const ranking: ViajesExploreRankingRow[] = senadores
      .filter(isSenadorActivo)
      .map((s) => ({
        id: s.id,
        nombreCompleto: s.nombreCompleto || s.nombre,
        nombre: s.nombre,
        foto: s.foto || null,
        provincia: s.provincia,
        partido: s.partido,
        bloque: s.bloque ?? null,
        viajesUltimos12Meses: s.viajesUltimos12Meses ?? 0,
      }))
      .sort(
        (a, b) =>
          b.viajesUltimos12Meses - a.viajesUltimos12Meses ||
          a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
      );

    const nacionales: ViajesExploreNacional[] = raw.nacionales
      .map((v) => ({
        senadorId: v?.senadorId != null ? String(v.senadorId) : null,
        senadorNombre: nameOf(v?.senadorId, String(v?.nombre || "")),
        anio: Number(v?.anio) || 0,
        mes: Number(v?.mes) || 0,
        mesNombre: v?.mesNombre != null ? String(v.mesNombre) : null,
        origen: String(v?.origen || ""),
        origenCodigo: v?.origenCodigo != null ? String(v.origenCodigo) : null,
        destino: String(v?.destino || ""),
        destinoCodigo:
          v?.destinoCodigo != null ? String(v.destinoCodigo) : null,
        documentoId: String(v?.documentoId || ""),
        documentoUrl: String(v?.documentoUrl || ""),
      }))
      .sort((a, b) => {
        const ka = `${a.anio}-${String(a.mes).padStart(2, "0")}`;
        const kb = `${b.anio}-${String(b.mes).padStart(2, "0")}`;
        return kb.localeCompare(ka);
      });

    const internacionales: ViajesExploreInternacional[] = raw.internacionales
      .map((v) => ({
        senadorId: v?.senadorId != null ? String(v.senadorId) : null,
        senadorNombre: nameOf(v?.senadorId, String(v?.nombre || "")),
        anio: Number(v?.anio) || 0,
        mes: v?.mes != null ? Number(v.mes) : null,
        destino: String(v?.destino || ""),
        fechaInicio: v?.fechaInicio != null ? String(v.fechaInicio) : null,
        fechaFin: v?.fechaFin != null ? String(v.fechaFin) : null,
        fechaTexto: v?.fechaTexto != null ? String(v.fechaTexto) : null,
        motivo: v?.motivo != null ? String(v.motivo) : null,
        expediente: v?.expediente != null ? String(v.expediente) : null,
        documentoId: String(v?.documentoId || ""),
        documentoUrl: String(v?.documentoUrl || ""),
      }))
      .sort((a, b) => {
        const ka =
          (a.fechaInicio && String(a.fechaInicio).slice(0, 10)) ||
          `${a.anio}-${String(a.mes ?? 0).padStart(2, "0")}`;
        const kb =
          (b.fechaInicio && String(b.fechaInicio).slice(0, 10)) ||
          `${b.anio}-${String(b.mes ?? 0).padStart(2, "0")}`;
        return kb.localeCompare(ka);
      });

    return {
      ventana: {
        desde: { anio: raw.window.desdeAnio, mes: raw.window.desdeMes },
        hasta: { anio: raw.window.hastaAnio, mes: raw.window.hastaMes },
      },
      ranking,
      nacionales,
      internacionales,
    };
  });
}

export async function getActas(): Promise<Acta[]> {
  assertServerData();
  return _actas.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<any[]>(`${origin}/v1/senado/actas`);

    return raw
      .filter((a) => a.fecha && String(a.fecha).trim())
      .map(mapActa)
      .sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );
  });
}

export async function getSenadoresConActas(): Promise<Senador[]> {
  assertServerData();
  return _senadoresConActas.get(async () => {
    const senadores = await getSenadores();
    const actas = await getActas();

    return senadores.map((senador) => {
      const actasSenador = actas
        .filter((acta) =>
          acta.votos.some((v) => votoMatchesSenador(v, senador)),
        )
        .map((acta) => {
          const votoSenador = acta.votos.find((v) =>
            votoMatchesSenador(v, senador),
          );
          return {
            id: acta.id,
            titulo: acta.titulo,
            proyecto: acta.proyecto,
            descripcion: acta.descripcion,
            fecha: acta.fecha,
            periodo: acta.periodo,
            reunion: acta.reunion,
            resultado: acta.resultado,
            votosAfirmativos: acta.votosAfirmativos,
            votosNegativos: acta.votosNegativos,
            abstenciones: acta.abstenciones,
            ausentes: acta.ausentes,
            presentes: acta.presentes,
            miembros: acta.miembros,
            votoSenador,
            tipoVotoSenador: votoSenador?.tipoVoto,
          };
        });

      const estadisticas = calcularEstadisticasSenador(actasSenador);
      const estadisticasPorPeriodo = buildPresentismoPorPeriodo(
        actasSenador.map((a) => ({
          periodo: a.periodo,
          tipoVoto:
            a.tipoVotoSenador ||
            (a as any).votoSenador?.tipoVoto ||
            null,
        })),
      );
      return { ...senador, estadisticas, estadisticasPorPeriodo, actasSenador };
    });
  });
}

/** Param de ruta: id API, nombre completo (Next legacy) o nombreSlug. */
function normalizeSenadorParam(param: string): string {
  const raw = String(param || "").trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function getSenadorConActasById(
  idOrName: string,
): Promise<Senador | null> {
  const list = await getSenadoresConActas();
  const encoded = String(idOrName || "").trim();
  const decoded = normalizeSenadorParam(encoded);

  const byId = list.find((d) => d.id === encoded || d.id === decoded);
  if (byId) return byId;

  const byNombre = list.find(
    (d) => d.nombre === decoded || d.nombreCompleto === decoded,
  );
  if (byNombre) return byNombre;

  const slugParam = slug(decoded);
  return (
    list.find(
      (d) => d.nombreSlug === slugParam || d.nombreSlug === decoded,
    ) || null
  );
}

export async function getActaWithSenadoresById(
  id: string,
): Promise<Acta | null> {
  const actas = await getActas();
  const actaById = actas.find((a) => a.id === id) || null;
  if (!actaById) return null;

  const senadores = await getSenadores();

  return {
    ...actaById,
    votos: actaById.votos.map((v) => {
      const matched = senadores.find((s) => votoMatchesSenador(v, s));
      const parsed = parseNombreSenador(v.senador);

      return {
        ...v,
        senadorObj: {
          ...(matched || {
            id: v.senadorSlug || slug(v.senador),
            nombre: v.senador,
            apellido: parsed.apellido,
            nombreDePila: parsed.nombreDePila,
            nombreCompleto: parsed.nombreCompleto,
            nombreSlug: v.senadorSlug || slug(v.senador),
            provincia: "",
            partido: "",
            periodoLegal: { inicio: "", fin: null },
            periodoReal: { inicio: "", fin: null },
            foto: null,
          }),
          tipoVoto: v.tipoVoto,
        } as Senador,
      };
    }),
  };
}

const preassigned: Record<string, string> = {
  "Juntos por el Cambio": "#eab308",
  "Alianza la Libertad Avanza": "#a855f7",
  "La Libertad Avanza": "#a855f7",
  "Frente de Todos": "#3b82f6",
  "Alianza Unión por la Patria": "#2563eb",
  "Unión por la Patria": "#2563eb",
  "Unión Cívica Radical": "#ef4444",
  Justicialista: "#1d4ed8",
  "Frente Cívico por Santiago": "#0ea5e9",
  "Hacemos por Córdoba": "#22c55e",
  "Sin Especificar": "#6b7280",
};

const basePalette = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#dce775",
  "#fff176",
  "#ffd54f",
  "#ffb74d",
  "#ff8a65",
];

function colorForPartidoFactory() {
  let i = 0;
  return (partido: string) => {
    if (preassigned[partido]) return preassigned[partido];
    const c = basePalette[i % basePalette.length];
    i++;
    return c;
  };
}

export function getPartidoColores(partidos: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const getColor = colorForPartidoFactory();
  for (const p of partidos) {
    map[p] = getColor(p);
  }
  return map;
}

export async function getSenadoresPorPartidos() {
  const senadores = (await getSenadores()).filter(isSenadorActivo);
  const partidos = [...new Set(senadores.map((d) => d.partido))];
  return { senadores, partidoColores: getPartidoColores(partidos) };
}

export async function getPartidoSlugs() {
  const senadores = await getSenadores();
  const names = [
    ...new Set(
      senadores.map((d) => d.partido?.trim()).filter(Boolean) as string[],
    ),
  ];
  return names.map((nombre) => ({
    nombre,
    slug: slug(nombre) || "sin-partido",
  }));
}

export async function getPartidosIndex() {
  const senadores = await getSenadoresConActas();
  const byPartido = new Map<string, Senador[]>();

  for (const d of senadores) {
    if (!isSenadorActivo(d)) continue;
    const nombre = d.partido?.trim();
    if (!nombre) continue;
    const list = byPartido.get(nombre);
    if (list) list.push(d);
    else byPartido.set(nombre, [d]);
  }

  const colores = getPartidoColores([...byPartido.keys()]);

  return [...byPartido.entries()]
    .map(([nombre, activos]) => ({
      nombre,
      slug: slug(nombre) || "sin-partido",
      color: colores[nombre] ?? "#6b7280",
      activos: activos.length,
      presentismo: averagePresentismo(activos) ?? 0,
      senadores: activos,
    }))
    .sort(
      (a, b) =>
        b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"),
    );
}

export async function getPartidoBySlug(slugParam: string) {
  const senadores = await getSenadoresConActas();
  const target = String(slugParam || "").trim();
  if (!target) return null;

  const nombre =
    senadores.find((d) => (slug(d.partido || "") || "sin-partido") === target)
      ?.partido || null;
  if (!nombre) return null;

  const delPartido = senadores.filter((d) => d.partido === nombre);
  const color = getPartidoColores([nombre])[nombre] ?? "#6b7280";
  const activos = delPartido.filter(isSenadorActivo);
  const inactivos = delPartido.filter((d) => !isSenadorActivo(d));

  return {
    nombre,
    slug: target,
    color,
    senadores: delPartido,
    activos,
    inactivos,
    presentismo: averagePresentismo(activos.length ? activos : delPartido),
  };
}

export async function getSenadorViajes(
  id: string,
): Promise<import("./types").SenadorViajes> {
  assertServerData();
  const key = String(id);
  const existing = _viajesById.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(`${origin}/v1/senado/senadores/${key}/viajes`);
      return {
        senadorId: String(raw?.senadorId || key),
        nacionales: Array.isArray(raw?.nacionales) ? raw.nacionales : [],
        internacionales: Array.isArray(raw?.internacionales)
          ? raw.internacionales
          : [],
      };
    } catch {
      return { senadorId: key, nacionales: [], internacionales: [] };
    }
  })();

  _viajesById.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    _viajesById.delete(key);
    throw e;
  }
}

function mapComision(raw: any): import("./types").Comision {
  return {
    id: String(raw?.id || ""),
    nombre: String(raw?.nombre || "").trim(),
    tipo: raw?.tipo != null ? String(raw.tipo).trim() || null : null,
    url: String(raw?.url || "").trim(),
    integrantes: Array.isArray(raw?.integrantes)
      ? raw.integrantes.map((i: any) => ({
          nombre: String(i?.nombre || "").trim(),
          cargo: String(i?.cargo || "").trim(),
          camara:
            i?.camara === "senado" || i?.camara === "diputados"
              ? i.camara
              : null,
          senadorId: i?.senadorId != null ? String(i.senadorId) : null,
          senador: null,
        }))
      : [],
  };
}

async function enrichComision(
  comision: import("./types").Comision,
): Promise<import("./types").Comision> {
  const senadores = await getSenadores();
  const byId = new Map(senadores.map((s) => [String(s.id), s]));
  return {
    ...comision,
    integrantes: comision.integrantes.map((i) => ({
      ...i,
      senador: i.senadorId ? byId.get(String(i.senadorId)) || null : null,
    })),
  };
}

/** Listado de comisiones del Senado (con senadores resueltos). */
export async function getComisiones(): Promise<import("./types").Comision[]> {
  assertServerData();
  return _comisiones.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any[]>(`${origin}/v1/senado/comisiones`);
      const list = (Array.isArray(raw) ? raw : [])
        .map(mapComision)
        .filter((c) => c.id && c.nombre);
      return Promise.all(list.map(enrichComision));
    } catch {
      return [];
    }
  });
}

export async function getComisionById(
  id: string,
): Promise<import("./types").Comision | null> {
  assertServerData();
  const key = String(id).trim();
  if (!key) return null;

  const fromIndex = (await getComisiones()).find((c) => c.id === key);
  if (fromIndex) return fromIndex;

  const origin = getApiOrigin();
  try {
    const raw = await $fetch<any>(`${origin}/v1/senado/comisiones/${key}`);
    if (!raw?.id) return null;
    return enrichComision(mapComision(raw));
  } catch {
    return null;
  }
}

/** Presidencia actual del Senado (`/v1/senado/presidencia`). */
export async function getPresidencia(): Promise<
  import("./types").PresidenciaSenado | null
> {
  assertServerData();
  return _presidencia.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(`${origin}/v1/senado/presidencia`);
      const nombre = String(raw?.nombre || "").trim();
      if (!nombre) return null;
      return {
        nombre,
        cargo: raw?.cargo != null ? String(raw.cargo).trim() || null : null,
        periodoInicio:
          raw?.periodoInicio != null
            ? String(raw.periodoInicio).trim() || null
            : null,
        periodoFin:
          raw?.periodoFin != null
            ? String(raw.periodoFin).trim() || null
            : null,
        foto: raw?.foto != null ? String(raw.foto).trim() || null : null,
        email: raw?.email != null ? String(raw.email).trim() || null : null,
        telefono:
          raw?.telefono != null ? String(raw.telefono).trim() || null : null,
        direccion:
          raw?.direccion != null ? String(raw.direccion).trim() || null : null,
        curriculum:
          raw?.curriculum != null
            ? String(raw.curriculum).trim() || null
            : null,
        fuente: raw?.fuente != null ? String(raw.fuente).trim() || null : null,
      };
    } catch {
      return null;
    }
  });
}

