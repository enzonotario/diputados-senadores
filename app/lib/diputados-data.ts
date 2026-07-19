import slugify from "slugify";
import type { Acta, Diputado, Voto } from "@/lib/types-diputados";
import { calcularEstadisticasDiputado, isDiputadoActivo } from "@/lib/utils";
import { averagePresentismo } from "@/utils/presentismo";

const diputadosAliases = [
  {
    nombreCompleto: "Acevedo, Sergio",
    aliases: ["Acevedo, Sergio Edgardo", "Acevedo, Sergio"],
  },
  {
    nombreCompleto: "Moreau, Leopoldo Raul Guido",
    aliases: ["Moreau, Leopoldo Raul Guido", "Moreau, Leopoldo"],
  },
  {
    nombreCompleto: "Reyes, Roxana Nahir",
    aliases: ["Reyes, Roxana Nahir", "Reyes, Roxana"],
  },
];

function slug(value: string) {
  return slugify(value || "", { lower: true, strict: true, trim: true });
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
  const nuxtApp = tryUseNuxtApp();
  const publicConfig = (nuxtApp?.$config?.public || {}) as Record<
    string,
    unknown
  >;
  const raw = String(
    publicConfig.apiUrl ||
      publicConfig.apiBaseUrl ||
      "https://api.argentinadatos.com",
  );
  try {
    return new URL(raw).origin;
  } catch {
    return "https://api.argentinadatos.com";
  }
}

let _diputados: Diputado[] | null = null;
/** Actas sin array `votos` (listados / home). */
let _actasIndex: Acta[] | null = null;
/** Actas con votos; joins + detalle. */
let _actasFull: Acta[] | null = null;
let _diputadosConActas: Diputado[] | null = null;

function withoutVotos(acta: Acta): Acta {
  return { ...acta, votos: [] };
}

function slimActaForMember(
  acta: Acta,
  extra: { votoDiputado?: Voto; tipoVotoDiputado?: string },
): Acta {
  return {
    ...withoutVotos(acta),
    ...extra,
  };
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

export async function getDiputados(): Promise<Diputado[]> {
  if (_diputados) return _diputados;

  const origin = getApiOrigin();
  const raw = await $fetch<any[]>(`${origin}/v1/diputados/diputados`);

  const byId = new Map<string, any>();
  raw.sort(maxByPeriod).forEach((d) => {
    const id = String(d.id);
    if (!byId.has(id)) byId.set(id, d);
  });

  const list = Array.from(byId.values())
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((d) => ({
      ...d,
      nombreCompleto: `${d.apellido}, ${d.nombre}`,
    })) as Diputado[];

  _diputados = list;
  return list;
}

async function loadActasFull(): Promise<Acta[]> {
  if (_actasFull) return _actasFull;

  const origin = getApiOrigin();
  const raw = await $fetch<Acta[]>(`${origin}/v1/diputados/actas`);

  _actasFull = raw.map((acta) => ({
    ...acta,
    votos: (acta.votos || []).filter((v) => v.tipoVoto !== "presidente"),
  }));
  _actasIndex = _actasFull.map(withoutVotos);

  return _actasFull;
}

/** Listados / home: sin `votos` (~0.5MB vs ~64MB de la API cruda). */
export async function getActas(): Promise<Acta[]> {
  if (_actasIndex) return _actasIndex;
  await loadActasFull();
  return _actasIndex!;
}

export async function getActasWithVotos(): Promise<Acta[]> {
  return loadActasFull();
}

export async function getDiputadosConActas(): Promise<Diputado[]> {
  if (_diputadosConActas) return _diputadosConActas;

  const diputados = (await getDiputados()).map((d) => ({
    ...d,
    nombreSlug: slug(`${d.apellido}, ${d.nombre}`),
  }));

  const actas = (await getActasWithVotos()).map((a) => ({
    ...a,
    votos: (a.votos || []).map(
      (v) =>
        ({
          ...v,
          diputadoSlug: slug(v.diputado),
        }) as Voto,
    ),
  }));

  _diputadosConActas = diputados.map((diputado) => {
    const actasDiputado = actas
      .filter((acta) => {
        const direct = acta.votos.some(
          (v) => v.diputadoSlug === diputado.nombreSlug,
        );
        if (direct) return true;
        return acta.votos.some((v) => {
          const alias = diputadosAliases.find((a) =>
            a.aliases.includes(v.diputado),
          );
          return Boolean(
            alias && alias.nombreCompleto === diputado.nombreCompleto,
          );
        });
      })
      .map((acta) => {
        let votoDiputado = acta.votos.find(
          (v) => v.diputadoSlug === diputado.nombreSlug,
        );
        if (!votoDiputado) {
          votoDiputado = acta.votos.find((v) => {
            const alias = diputadosAliases.find((a) =>
              a.aliases.includes(v.diputado),
            );
            return Boolean(
              alias && alias.nombreCompleto === diputado.nombreCompleto,
            );
          });
        }

        return slimActaForMember(acta, {
          votoDiputado,
          tipoVotoDiputado: votoDiputado?.tipoVoto,
        });
      });

    const estadisticas = calcularEstadisticasDiputado(actasDiputado as any);
    return { ...diputado, estadisticas, actasDiputado };
  });

  // Tras el join no hace falta retener ~60MB de votos en memoria (Workers).
  _actasFull = null;

  return _diputadosConActas;
}

/** Listados: estadísticas sin historial de actas en el payload. */
export async function getDiputadosConEstadisticas(): Promise<Diputado[]> {
  const list = await getDiputadosConActas();
  return list.map(({ actasDiputado: _a, ...rest }) => rest);
}

/** Peers de afinidad: historial mínimo (id/fecha/voto). */
export async function getDiputadosAffinityPeers(): Promise<Diputado[]> {
  const list = await getDiputadosConActas();
  return list.map((d) => ({
    ...d,
    actasDiputado: (d.actasDiputado || []).map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipoVotoDiputado: a.tipoVotoDiputado,
      votos: [] as Voto[],
      votosAfirmativos: 0,
      votosNegativos: 0,
      abstenciones: 0,
      ausentes: 0,
      resultado: "",
      titulo: "",
      periodo: a.periodo,
      reunion: a.reunion,
    })),
  }));
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
  const actas = await getActasWithVotos();
  const actaById = actas.find((a) => a.id === id) || null;
  if (!actaById) return null;

  const acta = {
    ...actaById,
    votos: (actaById.votos || []).map((v) => ({
      ...v,
      diputadoSlug: slug(v.diputado),
    })),
  } as Acta;

  const diputados = (await getDiputados()).map((d) => ({
    ...d,
    nombreSlug: slug(d.nombreCompleto || `${d.apellido}, ${d.nombre}`),
  }));

  return {
    ...acta,
    votos: acta.votos.map((v) => {
      let diputado = diputados.find(
        (d) => d.nombreSlug === (v as any).diputadoSlug,
      );

      if (!diputado) {
        const alias = diputadosAliases.find((a) =>
          a.aliases.includes(v.diputado),
        );
        if (alias)
          diputado = diputados.find(
            (d) => d.nombreCompleto === alias.nombreCompleto,
          );
      }

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
    }),
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

function withoutActasDiputado(d: Diputado): Diputado {
  const { actasDiputado: _a, ...rest } = d;
  return rest;
}

export async function getBloquesIndex() {
  const diputados = await getDiputadosConEstadisticas();
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
  const activosFull = delBloque.filter(isDiputadoActivo);
  const inactivos = delBloque.filter((d) => !isDiputadoActivo(d));

  const actasMeta: Record<
    string,
    { id: string; titulo?: string | null; resultado?: string | null }
  > = {};
  for (const d of activosFull) {
    for (const a of d.actasDiputado || []) {
      if (!a?.id || actasMeta[a.id]) continue;
      actasMeta[a.id] = {
        id: String(a.id),
        titulo: a.titulo,
        resultado: a.resultado,
      };
    }
  }

  const toAffinity = (d: Diputado): Diputado => ({
    ...withoutActasDiputado(d),
    actasDiputado: (d.actasDiputado || []).map((a) => ({
      id: a.id,
      fecha: a.fecha,
      tipoVotoDiputado: a.tipoVotoDiputado,
      votos: [] as Voto[],
      votosAfirmativos: 0,
      votosNegativos: 0,
      abstenciones: 0,
      ausentes: 0,
      resultado: "",
      titulo: "",
      periodo: a.periodo,
      reunion: a.reunion,
    })),
    estadisticas: d.estadisticas,
  });

  return {
    nombre,
    slug: target,
    color,
    diputados: delBloque.map(withoutActasDiputado),
    activos: activosFull.map(toAffinity),
    inactivos: inactivos.map(withoutActasDiputado),
    actasMeta,
    presentismo: averagePresentismo(
      activosFull.length ? activosFull : delBloque,
    ),
  };
}
