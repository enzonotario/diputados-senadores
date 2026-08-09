import slugify from "slugify";
import type { Acta, Diputado, Voto } from "./types-diputados";
import { calcularEstadisticasDiputado, isDiputadoActivo } from "./utils";
import {
  averagePresentismo,
  buildPresentismoPorPeriodo,
} from "../utils/presentismo";
import {
  buildDiputadoVotoResolver,
  clearDiputadosAliasMapCache,
} from "./matchDiputadoNombre";
import { buildMisionId } from "../utils/misiones";

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
}

function diputadoNombreCompleto(d: {
  nombreCompleto?: string;
  apellido?: string;
  nombre?: string;
}) {
  return d.nombreCompleto || `${d.apellido || ""}, ${d.nombre || ""}`.trim();
}

/** Parsea "Apellido, Nombre" típico de actas HCDN. */
function parseNombreVoto(raw: string) {
  const full = String(raw || "").trim();
  if (!full) {
    return { apellido: "", nombre: "", nombreCompleto: "" };
  }
  if (full.includes(",")) {
    const [apellido, ...rest] = full.split(",");
    return {
      apellido: apellido.trim(),
      nombre: rest.join(",").trim(),
      nombreCompleto: full,
    };
  }
  return { apellido: "", nombre: full, nombreCompleto: full };
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

let _diputadosRaw = createSingleflight<any[]>();
let _diputados = createSingleflight<Diputado[]>();
let _actas = createSingleflight<Acta[]>();
let _diputadosConActas = createSingleflight<Diputado[]>();
let _viajesConteo12m = createSingleflight<Record<string, number>>();
let _viajesExplore = createSingleflight<DiputadosViajesExplorePayload>();
let _misionesExplore = createSingleflight<DiputadosMisionesExplorePayload>();
let _comisiones = createSingleflight<import("./types").Comision[]>();
let _periodosOficiales = createSingleflight<
  Array<{ periodo: string; inicio: string; fin: string; sesiones: string | null }>
>();
const _viajesById = new Map<string, Promise<import("./types").DiputadoViajes>>();
const _misionesById = new Map<
  string,
  Promise<import("./types").DiputadoMisiones>
>();

function assertServerData() {
  if (import.meta.client) {
    throw new Error(
      "diputados-data: getActas/getDiputadosConActas solo en server. Usá /api/* (mini-API Nitro).",
    );
  }
}

/** Limpia caches en memoria. */
export function clearDiputadosDataCache() {
  _diputadosRaw.clear();
  _diputados.clear();
  _actas.clear();
  _diputadosConActas.clear();
  _viajesConteo12m.clear();
  _viajesExplore.clear();
  _misionesExplore.clear();
  _comisiones.clear();
  _periodosOficiales.clear();
  _viajesById.clear();
  _misionesById.clear();
  clearDiputadosAliasMapCache();
}

function maxByPeriod(a: any, b: any) {
  const aBloque = new Date(a?.periodoBloque?.inicio || 0).getTime();
  const bBloque = new Date(b?.periodoBloque?.inicio || 0).getTime();
  if (aBloque !== bBloque) return bBloque - aBloque;

  const aMandato = new Date(a?.periodoMandato?.inicio || 0).getTime();
  const bMandato = new Date(b?.periodoMandato?.inicio || 0).getTime();
  if (aMandato !== bMandato) return bMandato - aMandato;

  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

/** Todas las filas de la API (varios mandatos / bloques por id si existen). */
export async function getDiputadosRaw(): Promise<any[]> {
  return _diputadosRaw.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<any[]>(`${origin}/v1/diputados/diputados`);
    return Array.isArray(raw) ? raw : [];
  });
}

export async function getDiputados(): Promise<Diputado[]> {
  return _diputados.get(async () => {
    const raw = await getDiputadosRaw();

    const byId = new Map<string, any>();
    [...raw].sort(maxByPeriod).forEach((d) => {
      const id = String(d.id);
      if (!byId.has(id)) byId.set(id, d);
    });

    const conteo = await getViajesConteo12mByDiputadoId();

    return Array.from(byId.values())
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((d) => ({
        ...d,
        nombreCompleto: `${d.apellido}, ${d.nombre}`,
        viajesUltimos12Meses: conteo[String(d.id)] ?? 0,
      })) as Diputado[];
  });
}

export async function getActas(): Promise<Acta[]> {
  assertServerData();
  return _actas.get(async () => {
    const origin = getApiOrigin();
    const raw = await $fetch<Acta[]>(`${origin}/v1/diputados/actas`);

    return raw.map((acta) => ({
      ...acta,
      votos: (acta.votos || []).filter((v) => v.tipoVoto !== "presidente"),
    }));
  });
}

export async function getDiputadosConActas(): Promise<Diputado[]> {
  assertServerData();
  return _diputadosConActas.get(async () => {
    const diputados = (await getDiputados()).map((d) => {
      const nombreCompleto = diputadoNombreCompleto(d);
      return {
        ...d,
        nombreCompleto,
        nombreSlug: slug(`${d.apellido}, ${d.nombre}`),
      };
    });

    const resolve = buildDiputadoVotoResolver(
      diputados.map((d) => ({
        id: String(d.id),
        nombreCompleto: d.nombreCompleto || "",
        nombreSlug: d.nombreSlug || "",
      })),
    );

    const actas = (await getActas()).map((a) => ({
      ...a,
      votos: (a.votos || []).map(
        (v) =>
          ({
            ...v,
            diputadoSlug: slug(v.diputado),
          }) as Voto,
      ),
    }));

    const actasByDiputadoId = new Map<
      string,
      Array<{
        id: string;
        titulo: string;
        proyecto: string;
        descripcion: string;
        fecha: string;
        periodo: string;
        reunion: string;
        resultado: string;
        votosAfirmativos: number;
        votosNegativos: number;
        abstenciones: number;
        ausentes: number;
        presentes?: number;
        miembros?: number;
        votoDiputado: Voto;
        tipoVotoDiputado: string;
      }>
    >();

    for (const acta of actas) {
      const votoByDiputadoId = new Map<string, Voto>();
      for (const v of acta.votos) {
        const matched = resolve(v.diputado, (v as any).diputadoSlug || "");
        if (!matched || votoByDiputadoId.has(matched.id)) continue;
        votoByDiputadoId.set(matched.id, v);
      }

      // Quien preside asiste aunque no emita voto (tipo "presidente" se filtra
      // de `votos` para el hemiciclo). Contar presencia vía `acta.presidente`.
      const presidenteNombre = String((acta as any).presidente || "").trim();
      if (presidenteNombre) {
        const matched = resolve(
          presidenteNombre,
          slug(presidenteNombre),
        );
        if (matched && !votoByDiputadoId.has(matched.id)) {
          votoByDiputadoId.set(matched.id, {
            diputado: presidenteNombre,
            diputadoSlug: slug(presidenteNombre),
            tipoVoto: "presidente",
            imagen: "",
            videoDiscurso: "",
          } as Voto);
        }
      }

      for (const [diputadoId, votoDiputado] of votoByDiputadoId) {
        let list = actasByDiputadoId.get(diputadoId);
        if (!list) {
          list = [];
          actasByDiputadoId.set(diputadoId, list);
        }
        list.push({
          id: acta.id,
          titulo: acta.titulo,
          proyecto: (acta as any).proyecto,
          descripcion: (acta as any).descripcion,
          fecha: acta.fecha,
          periodo: acta.periodo,
          reunion: (acta as any).reunion,
          resultado: acta.resultado,
          votosAfirmativos: acta.votosAfirmativos,
          votosNegativos: acta.votosNegativos,
          abstenciones: acta.abstenciones,
          ausentes: acta.ausentes,
          presentes: (acta as any).presentes,
          miembros: (acta as any).miembros,
          votoDiputado,
          tipoVotoDiputado: votoDiputado.tipoVoto,
        });
      }
    }

    return diputados.map((diputado) => {
      const actasDiputado = actasByDiputadoId.get(String(diputado.id)) || [];
      const estadisticas = calcularEstadisticasDiputado(actasDiputado as any);
      const estadisticasPorPeriodo = buildPresentismoPorPeriodo(
        actasDiputado.map((a) => ({
          periodo: a.periodo,
          tipoVoto:
            a.tipoVotoDiputado ||
            (a as any).votoDiputado?.tipoVoto ||
            null,
        })),
      );
      return { ...diputado, estadisticas, estadisticasPorPeriodo, actasDiputado };
    });
  });
}

export async function getDiputadoConActasById(
  id: string,
): Promise<Diputado | null> {
  const list = await getDiputadosConActas();
  return list.find((d) => d.id === id) || null;
}

export async function getActaWithDiputadosById(
  id: string,
): Promise<Acta | null> {
  const actas = await getActas();
  const actaById = actas.find((a) => a.id === id) || null;
  if (!actaById) return null;

  const acta = {
    ...actaById,
    votos: (actaById.votos || []).map((v) => ({
      ...v,
      diputadoSlug: slug(v.diputado),
    })),
  } as Acta;

  const diputados = (await getDiputados()).map((d) => {
    const nombreCompleto = diputadoNombreCompleto(d);
    return {
      ...d,
      nombreCompleto,
      nombreSlug: slug(`${d.apellido}, ${d.nombre}`),
    };
  });
  const diputadosById = new Map(
    diputados.map((d) => [String(d.id), d] as const),
  );

  const resolve = buildDiputadoVotoResolver(
    diputados.map((d) => ({
      id: String(d.id),
      nombreCompleto: d.nombreCompleto || "",
      nombreSlug: d.nombreSlug || "",
    })),
  );

  const votos = acta.votos.map((v) => {
    const matched = resolve(v.diputado, (v as any).diputadoSlug || "");
    const diputado = matched
      ? diputadosById.get(matched.id)
      : undefined;

    const parsed = parseNombreVoto(v.diputado);

    return {
      ...v,
      diputadoObj: {
        ...(diputado || {
          id: (v as any).diputadoSlug,
          nombre: parsed.nombre,
          apellido: parsed.apellido,
          nombreCompleto: parsed.nombreCompleto,
          nombreSlug: (v as any).diputadoSlug,
          genero: "",
          provincia: "",
          periodoMandato: { inicio: "", fin: "" },
          juramentoFecha: "",
          ceseFecha: null,
          bloque: "",
          periodoBloque: { inicio: "", fin: "" },
          foto: v.imagen || "",
        }),
        tipoVoto: v.tipoVoto,
      } as Diputado,
    };
  });

  const presidenteNombre = String(acta.presidente || "").trim();
  let presidenteObj: Diputado | null = null;
  if (presidenteNombre) {
    const matched = resolve(presidenteNombre, slug(presidenteNombre));
    const diputado = matched ? diputadosById.get(matched.id) : undefined;
    const parsed = parseNombreVoto(presidenteNombre);
    presidenteObj = {
      ...(diputado || {
        id: slug(presidenteNombre),
        nombre: parsed.nombre,
        apellido: parsed.apellido,
        nombreCompleto: parsed.nombreCompleto,
        nombreSlug: slug(presidenteNombre),
        genero: "",
        provincia: "",
        periodoMandato: { inicio: "", fin: "" },
        juramentoFecha: "",
        ceseFecha: null,
        bloque: "",
        periodoBloque: { inicio: "", fin: "" },
        foto: "",
      }),
      tipoVoto: "presidente",
    } as Diputado;
  }

  return {
    ...acta,
    votos,
    presidenteObj,
  } as Acta;
}

const preassigned: Record<string, string> = {
  "Movimiento Popular  Neuquino": "#3b82f6",
  "La Libertad Avanza": "#a855f7",
  Independencia: "#ef4444",
  "Hacemos Coalicion Federal": "#22c55e",
  "Frente de Izquierda y de Trabajadores Unidad": "#60a5fa",
  "Sin Bloque": "#6b7280",
  "Produccion y Trabajo": "#eab308",
  Pro: "#eab308",
  "Ucr - Union Civica Radical": "#ef4444",
  "Union por la Patria": "#3b82f6",
  Creo: "#3b82f6",
  "La Union Mendocina": "#3b82f6",
  "Innovacion Federal": "#93c5fd",
  "Buenos Aires Libre": "#bfdbfe",
  "Por Santa Cruz": "#2563eb",
  "Avanza Libertad": "#9333ea",
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

function colorForBloqueFactory() {
  let i = 0;
  return (bloque: string) => {
    if (preassigned[bloque]) return preassigned[bloque];
    const c = basePalette[i % basePalette.length];
    i++;
    return c;
  };
}

export function getBloqueColores(bloques: string[]): Record<string, string> {
  const bloqueColores: Record<string, string> = {};
  const getColor = colorForBloqueFactory();
  for (const b of bloques) {
    bloqueColores[b] = getColor(b);
  }
  return bloqueColores;
}

export async function getDiputadosPorBloques() {
  const diputados = (await getDiputados()).filter(isDiputadoActivo);
  const bloques = [...new Set(diputados.map((d) => d.bloque))];
  return { diputados, bloqueColores: getBloqueColores(bloques) };
}

export async function getBloqueSlugs() {
  const diputados = await getDiputados();
  const names = [
    ...new Set(
      diputados.map((d) => d.bloque?.trim()).filter(Boolean) as string[],
    ),
  ];
  return names.map((nombre) => ({
    nombre,
    slug: slug(nombre) || "sin-bloque",
  }));
}

export async function getBloquesIndex() {
  const diputados = await getDiputadosConActas();
  const byBloque = new Map<string, Diputado[]>();

  for (const d of diputados) {
    if (!isDiputadoActivo(d)) continue;
    const nombre = d.bloque?.trim();
    if (!nombre) continue;
    const list = byBloque.get(nombre);
    if (list) list.push(d);
    else byBloque.set(nombre, [d]);
  }

  const colores = getBloqueColores([...byBloque.keys()]);

  return [...byBloque.entries()]
    .map(([nombre, activos]) => ({
      nombre,
      slug: slug(nombre) || "sin-bloque",
      color: colores[nombre] ?? "#6b7280",
      activos: activos.length,
      presentismo: averagePresentismo(activos) ?? 0,
      diputados: activos,
    }))
    .sort(
      (a, b) =>
        b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"),
    );
}

export async function getBloqueBySlug(slugParam: string) {
  const diputados = await getDiputadosConActas();
  const target = String(slugParam || "").trim();
  if (!target) return null;

  const nombre =
    diputados.find((d) => (slug(d.bloque || "") || "sin-bloque") === target)
      ?.bloque || null;
  if (!nombre) return null;

  const delBloque = diputados.filter((d) => d.bloque === nombre);
  const color = getBloqueColores([nombre])[nombre] ?? "#6b7280";
  const activos = delBloque.filter(isDiputadoActivo);
  const inactivos = delBloque.filter((d) => !isDiputadoActivo(d));

  return {
    nombre,
    slug: target,
    color,
    diputados: delBloque,
    activos,
    inactivos,
    presentismo: averagePresentismo(activos.length ? activos : delBloque),
  };
}

export type DiputadosViajesExploreNacional = {
  anio: number;
  mes: number;
  mesNombre: string;
  nombre: string;
  diputadoId: string | null;
  tipoSolicitud: string | null;
  origen: string;
  origenCodigo: string | null;
  destino: string;
  destinoCodigo: string | null;
  recursoId: string;
  recursoUrl: string;
};

export type DiputadosViajesExploreRankingRow = {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  foto: string | null;
  provincia: string;
  bloque: string;
  viajesUltimos12Meses: number;
};

export type DiputadosViajesExplorePayload = {
  ventana: {
    desde: { anio: number; mes: number };
    hasta: { anio: number; mes: number };
  };
  ranking: DiputadosViajesExploreRankingRow[];
  nacionales: DiputadosViajesExploreNacional[];
};

export type DiputadosMisionesExploreRow = {
  id: string;
  diputadoId: string | null;
  diputadoNombre: string;
  anio: number;
  mes: number | null;
  mesNombre: string | null;
  destino: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaTexto: string | null;
  motivo: string | null;
  institucion: string | null;
  bloque: string | null;
  recursoNombre: string | null;
  viaticos: boolean | null;
  viaticosUsd: number | null;
  viaticosEuro: number | null;
  viaticosArs: number | null;
  documentoId: string;
  documentoUrl: string;
  recursoId?: string;
  recursoUrl?: string;
};

export type DiputadosMisionesExploreRankingRow = {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  foto: string | null;
  provincia: string;
  bloque: string;
  misionesCount: number;
  viaticosUsd: number;
  viaticosArs: number;
};

export type DiputadosMisionesExplorePayload = {
  ranking: DiputadosMisionesExploreRankingRow[];
  misiones: DiputadosMisionesExploreRow[];
};

export async function getDiputadosPeriodosOficiales(): Promise<
  Array<{ periodo: string; inicio: string; fin: string; sesiones: string | null }>
> {
  assertServerData();
  return _periodosOficiales.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(`${origin}/v1/diputados/periodos`);
      const list = Array.isArray(raw?.periodos)
        ? raw.periodos
        : Array.isArray(raw)
          ? raw
          : [];
      return list
        .map((p: any) => ({
          periodo: String(p?.periodo || "").trim(),
          inicio: String(p?.inicio || "").slice(0, 10),
          fin: String(p?.fin || "").slice(0, 10),
          sesiones: p?.sesiones ? String(p.sesiones).slice(0, 10) : null,
        }))
        .filter((p: { periodo: string; inicio: string; fin: string }) =>
          Boolean(p.periodo && p.inicio && p.fin),
        );
    } catch {
      return [];
    }
  });
}

export async function getViajesConteo12mByDiputadoId(): Promise<
  Record<string, number>
> {
  assertServerData();
  return _viajesConteo12m.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(`${origin}/v1/diputados/viajes/conteo-12m`);
      const por = raw?.porDiputado;
      if (por && typeof por === "object") {
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
                : Number((value as any).nacionales || 0);
          }
        }
        return out;
      }
    } catch {
      // endpoint aún no en prod
    }
    return {};
  });
}

export async function getDiputadosViajesExplore(): Promise<DiputadosViajesExplorePayload> {
  assertServerData();
  return _viajesExplore.get(async () => {
    const origin = getApiOrigin();
    const [conteo, diputados, nacRaw] = await Promise.all([
      getViajesConteo12mByDiputadoId(),
      getDiputados(),
      $fetch<any[]>(`${origin}/v1/diputados/viajes/nacionales`).catch(
        () => [] as any[],
      ),
    ]);

    const now = new Date();
    const hastaAnio = now.getUTCFullYear();
    const hastaMes = now.getUTCMonth() + 1;
    const hastaIdx = hastaAnio * 12 + hastaMes;
    const desdeIdx = hastaIdx - 11;
    const desdeAnio = Math.floor((desdeIdx - 1) / 12);
    const desdeMes = ((desdeIdx - 1) % 12) + 1;

    const nacionales: DiputadosViajesExploreNacional[] = [];
    for (const v of nacRaw || []) {
      const anio = Number(v?.anio);
      const mes = Number(v?.mes);
      if (!anio || mes < 1 || mes > 12) continue;
      nacionales.push({
        anio,
        mes,
        mesNombre: String(v?.mesNombre || ""),
        nombre: String(v?.nombre || ""),
        diputadoId: v?.diputadoId ? String(v.diputadoId) : null,
        tipoSolicitud: v?.tipoSolicitud != null ? String(v.tipoSolicitud) : null,
        origen: String(v?.origen || ""),
        origenCodigo: v?.origenCodigo != null ? String(v.origenCodigo) : null,
        destino: String(v?.destino || ""),
        destinoCodigo: v?.destinoCodigo != null ? String(v.destinoCodigo) : null,
        recursoId: String(v?.recursoId || ""),
        recursoUrl: String(v?.recursoUrl || ""),
      });
    }
    nacionales.sort((a, b) => {
      const ka = `${a.anio}-${String(a.mes).padStart(2, "0")}`;
      const kb = `${b.anio}-${String(b.mes).padStart(2, "0")}`;
      return kb.localeCompare(ka);
    });

    const byIdForRanking = new Map(diputados.map((d) => [String(d.id), d]));
    const ranking: DiputadosViajesExploreRankingRow[] = Object.entries(conteo)
      .map(([id, n]) => {
        const d = byIdForRanking.get(id);
        if (!d) return null;
        return {
          id,
          nombreCompleto: diputadoNombreCompleto(d),
          nombre: d.nombre,
          apellido: d.apellido,
          foto: d.foto || null,
          provincia: d.provincia,
          bloque: d.bloque,
          viajesUltimos12Meses: n,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b!.viajesUltimos12Meses - a!.viajesUltimos12Meses ||
          a!.nombreCompleto.localeCompare(b!.nombreCompleto, "es"),
      ) as DiputadosViajesExploreRankingRow[];

    return {
      ventana: {
        desde: { anio: desdeAnio, mes: desdeMes },
        hasta: { anio: hastaAnio, mes: hastaMes },
      },
      ranking,
      nacionales,
    };
  });
}

export async function getDiputadosMisionesExplore(): Promise<DiputadosMisionesExplorePayload> {
  assertServerData();
  return _misionesExplore.get(async () => {
    const origin = getApiOrigin();
    const [diputados, rawLista] = await Promise.all([
      getDiputados(),
      $fetch<any>(`${origin}/v1/diputados/misiones/lista`).catch(() => [] as any[]),
    ]);

    const list = Array.isArray(rawLista)
      ? rawLista
      : Array.isArray(rawLista?.misiones)
        ? rawLista.misiones
        : [];

    const byId = new Map(diputados.map((d) => [String(d.id), d]));
    const nameOf = (id: unknown, fallback: string) => {
      if (id == null || id === "") return fallback || "—";
      const d = byId.get(String(id));
      return (
        d?.nombreCompleto ||
        `${d?.apellido || ""}, ${d?.nombre || ""}`.trim() ||
        fallback ||
        "—"
      );
    };

    const counts = new Map<string, number>();
    const usdById = new Map<string, number>();
    const arsById = new Map<string, number>();
    const misiones: DiputadosMisionesExploreRow[] = [];
    for (const v of list) {
      const diputadoId = v?.diputadoId != null ? String(v.diputadoId) : null;
      const viaticosUsd =
        v?.viaticosUsd != null && Number.isFinite(Number(v.viaticosUsd))
          ? Number(v.viaticosUsd)
          : null;
      const viaticosEuro =
        v?.viaticosEuro != null && Number.isFinite(Number(v.viaticosEuro))
          ? Number(v.viaticosEuro)
          : null;
      const viaticosArs =
        v?.viaticosArs != null && Number.isFinite(Number(v.viaticosArs))
          ? Number(v.viaticosArs)
          : null;
      if (diputadoId) {
        counts.set(diputadoId, (counts.get(diputadoId) || 0) + 1);
        if (viaticosUsd != null) {
          usdById.set(diputadoId, (usdById.get(diputadoId) || 0) + viaticosUsd);
        }
        if (viaticosArs != null) {
          arsById.set(diputadoId, (arsById.get(diputadoId) || 0) + viaticosArs);
        }
      }
      const diputadoNombre = nameOf(v?.diputadoId, String(v?.nombre || ""));
      const documentoId = String(v?.documentoId || v?.recursoId || "");
      const documentoUrl = String(v?.documentoUrl || v?.recursoUrl || "");
      const rowBase = {
        diputadoId,
        diputadoNombre,
        anio: Number(v?.anio) || 0,
        mes: v?.mes != null ? Number(v.mes) : null,
        mesNombre: v?.mesNombre != null ? String(v.mesNombre) : null,
        destino: String(v?.destino || ""),
        fechaInicio: v?.fechaInicio != null ? String(v.fechaInicio) : null,
        fechaFin: v?.fechaFin != null ? String(v.fechaFin) : null,
        fechaTexto: v?.fechaTexto != null ? String(v.fechaTexto) : null,
        motivo: v?.motivo != null ? String(v.motivo) : null,
        institucion:
          v?.institucion != null
            ? String(v.institucion)
            : v?.expediente != null
              ? String(v.expediente)
              : null,
        bloque: v?.bloque != null ? String(v.bloque) : null,
        recursoNombre:
          v?.recursoNombre != null ? String(v.recursoNombre) : null,
        viaticos: typeof v?.viaticos === "boolean" ? v.viaticos : null,
        viaticosUsd,
        viaticosEuro,
        viaticosArs,
        documentoId,
        documentoUrl,
        recursoId: v?.recursoId != null ? String(v.recursoId) : undefined,
        recursoUrl: v?.recursoUrl != null ? String(v.recursoUrl) : undefined,
      };
      misiones.push({
        ...rowBase,
        id: buildMisionId({
          documentoId,
          recursoId: rowBase.recursoId,
          fechaInicio: rowBase.fechaInicio,
          anio: rowBase.anio,
          nombre: String(v?.nombre || "").trim() || diputadoNombre,
          destino: rowBase.destino,
        }),
      });
    }
    misiones.sort((a, b) => {
      const ka =
        (a.fechaInicio && String(a.fechaInicio).slice(0, 10)) ||
        `${a.anio}-${String(a.mes ?? 0).padStart(2, "0")}`;
      const kb =
        (b.fechaInicio && String(b.fechaInicio).slice(0, 10)) ||
        `${b.anio}-${String(b.mes ?? 0).padStart(2, "0")}`;
      return kb.localeCompare(ka);
    });

    const ranking: DiputadosMisionesExploreRankingRow[] = [...counts.entries()]
      .map(([id, n]) => {
        const d = byId.get(id);
        if (!d) return null;
        return {
          id,
          nombreCompleto: diputadoNombreCompleto(d),
          nombre: d.nombre,
          apellido: d.apellido,
          foto: d.foto || null,
          provincia: d.provincia,
          bloque: d.bloque,
          misionesCount: n,
          viaticosUsd: usdById.get(id) || 0,
          viaticosArs: arsById.get(id) || 0,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b!.misionesCount - a!.misionesCount ||
          b!.viaticosUsd - a!.viaticosUsd ||
          a!.nombreCompleto.localeCompare(b!.nombreCompleto, "es"),
      ) as DiputadosMisionesExploreRankingRow[];

    return { ranking, misiones };
  });
}

export async function getMisionById(
  id: string,
): Promise<DiputadosMisionesExploreRow | null> {
  assertServerData();
  const key = String(id || "").trim();
  if (!key) return null;
  const { misiones } = await getDiputadosMisionesExplore();
  return misiones.find((m) => m.id === key) || null;
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
              : "diputados",
          senadorId: i?.senadorId != null ? String(i.senadorId) : null,
          diputadoId: i?.diputadoId != null ? String(i.diputadoId) : null,
          senador: null,
          diputado: null,
        }))
      : [],
  };
}

async function enrichComision(
  comision: import("./types").Comision,
): Promise<import("./types").Comision> {
  const diputados = await getDiputados();
  const byId = new Map(diputados.map((d) => [String(d.id), d]));
  return {
    ...comision,
    integrantes: comision.integrantes.map((i) => ({
      ...i,
      diputado: i.diputadoId ? byId.get(String(i.diputadoId)) || null : null,
    })),
  };
}

/** Listado de comisiones de Diputados (con diputados resueltos). */
export async function getComisiones(): Promise<import("./types").Comision[]> {
  assertServerData();
  return _comisiones.get(async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any[]>(`${origin}/v1/diputados/comisiones`);
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
    const raw = await $fetch<any>(`${origin}/v1/diputados/comisiones/${key}`);
    if (!raw?.id) return null;
    return enrichComision(mapComision(raw));
  } catch {
    return null;
  }
}

export async function getDiputadoViajes(
  id: string,
): Promise<import("./types").DiputadoViajes> {
  assertServerData();
  const key = String(id || "").trim();
  if (!key) {
    return { diputadoId: "", nacionales: [] };
  }
  const existing = _viajesById.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(
        `${origin}/v1/diputados/diputados/${encodeURIComponent(key)}/viajes`,
      );
      return {
        diputadoId: String(raw?.diputadoId || key),
        nacionales: Array.isArray(raw?.nacionales) ? raw.nacionales : [],
      };
    } catch {
      return { diputadoId: key, nacionales: [] };
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

export async function getDiputadoMisiones(
  id: string,
): Promise<import("./types").DiputadoMisiones> {
  assertServerData();
  const key = String(id || "").trim();
  if (!key) {
    return { diputadoId: "", misiones: [] };
  }
  const existing = _misionesById.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const origin = getApiOrigin();
    try {
      const raw = await $fetch<any>(
        `${origin}/v1/diputados/diputados/${encodeURIComponent(key)}/misiones`,
      );
      return {
        diputadoId: String(raw?.diputadoId || key),
        misiones: (Array.isArray(raw?.misiones) ? raw.misiones : []).map(
          (m: any) => ({
            ...m,
            id: buildMisionId({
              documentoId: m?.documentoId,
              recursoId: m?.recursoId,
              fechaInicio: m?.fechaInicio,
              anio: m?.anio,
              nombre: m?.nombre,
              destino: m?.destino,
            }),
          }),
        ),
      };
    } catch {
      return { diputadoId: key, misiones: [] };
    }
  })();

  _misionesById.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    _misionesById.delete(key);
    throw e;
  }
}
