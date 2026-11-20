import type { ChamberId } from "../../app/lib/chamber";
import {
  getActas as getActasDiputados,
  getBloqueColores,
  getDiputadosMisionesExplore,
  getDiputadosViajesExplore,
  getComisiones as getDiputadoComisiones,
} from "../../app/lib/diputados-data";
import {
  getActas as getActasSenadores,
  getBloquesSenado,
  getComisiones as getSenadoComisiones,
  getGastoSenado,
  getPartidoColores,
  getViajesExplore,
} from "../../app/lib/senadores-data";
import {
  OG_RESULTADO_ACCENT,
  OG_SUMMARY_KEYS,
  resultadoBadgeLabel,
  shortenOgActaTitle,
  type OgSummary,
  type OgSummaryKey,
} from "../../app/lib/og";
import {
  formatDate,
  isDiputadoActivo,
  isSenadorActivo,
} from "../../app/lib/utils";
import {
  filterActasByPeriodo,
  type PeriodosCatalog,
} from "../../app/utils/periodoLegislativo";
import { buildMembersList, buildPeriodos } from "./mini-api";

/**
 * Compact summaries for listing-page OG cards ("ranked list" layout in
 * `Chamber.takumi`): a few KPIs + the top rows the page shows by default.
 *
 * Built from the same cached data helpers as the pages' mini-API, then
 * memoized per chamber+key for a few minutes so OG renders stay cheap.
 */

export {
  OG_SUMMARY_KEYS,
  type OgSummary,
  type OgSummaryKey,
  type OgSummaryRow,
} from "../../app/lib/og";

const TOP = 3;
const TTL_MS = 10 * 60 * 1000;

const cache = new Map<
  string,
  { at: number; value: Promise<OgSummary | null> }
>();

export function clearOgSummaryCache() {
  cache.clear();
}

export function isOgSummaryKey(raw: unknown): raw is OgSummaryKey {
  return OG_SUMMARY_KEYS.includes(raw as OgSummaryKey);
}

const nf = new Intl.NumberFormat("es-AR");
function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}
function plural(n: number, one: string, many: string) {
  return `${nf.format(n)} ${n === 1 ? one : many}`;
}
function pct(n: number) {
  return `${Math.round(n)}%`;
}
function mesAnio(p: { anio: number; mes: number }) {
  return `${String(p.mes).padStart(2, "0")}/${p.anio}`;
}

const MEMBER = {
  diputados: { one: "diputado", many: "diputados", group: "bloques" },
  senadores: { one: "senador", many: "senadores", group: "partidos" },
} as const;

async function gasto(chamber: ChamberId): Promise<OgSummary | null> {
  if (chamber !== "senadores") return null;
  const [g, bloques] = await Promise.all([
    getGastoSenado(),
    getBloquesSenado(),
  ]);
  if (!g) return null;
  const top = [...bloques]
    .sort((a, b) => b.gasto.brutoMensualEstimado - a.gasto.brutoMensualEstimado)
    .slice(0, TOP);
  const max = top[0]?.gasto.brutoMensualEstimado || 1;
  const colors = getPartidoColores(top.map((b) => b.nombre));
  return {
    kpis: [
      {
        label: "Total estimado / mes",
        value: formatMoney(g.totales.grandTotalEstimado),
      },
      { label: "Dietas", value: formatMoney(g.totales.dietasSenadoresBruto) },
      {
        label: "Personal de bloques",
        value: formatMoney(g.totales.bloquesPersonalBruto),
      },
      {
        label: "Personal de despachos",
        value: formatMoney(g.totales.despachosPersonalBruto),
      },
    ],
    rowsTitle: "Bloques por gasto estimado / mes",
    rows: top.map((b) => ({
      label: b.nombre,
      sub: plural(b.integrantes, "senador", "senadores"),
      value: formatMoney(b.gasto.brutoMensualEstimado),
      ratio: b.gasto.brutoMensualEstimado / max,
      color: colors[b.nombre],
    })),
  };
}

async function dietas(chamber: ChamberId): Promise<OgSummary | null> {
  if (chamber !== "senadores") return null;
  const { members } = await buildMembersList("senadores");
  const activos = (members as any[]).filter((s) => isSenadorActivo(s));
  const conDieta = activos.filter((s) => s.meta?.dieta);
  const n = conDieta.length;
  if (!n) return null;
  const count = (k: "renunciaAlAumento" | "donacion" | "aportesPartidarios") =>
    conDieta.filter((s) => s.meta.dieta[k]).length;
  const rows = [
    {
      label: "Renunciaron al aumento",
      c: count("renunciaAlAumento"),
      color: "#14b8a6",
    },
    {
      label: "Donan parte de la dieta",
      c: count("donacion"),
      color: "#3b82f6",
    },
    {
      label: "Hacen aportes partidarios",
      c: count("aportesPartidarios"),
      color: "#f59e0b",
    },
  ];
  const bruto = conDieta.find((s) => s.meta.dieta.brutoEstimado)?.meta.dieta
    .brutoEstimado as number | undefined;
  const actualizado = conDieta.find((s) => s.meta.dieta.actualizado)?.meta.dieta
    .actualizado as string | undefined;
  return {
    kpis: [
      { label: "Senadores en funciones", value: nf.format(activos.length) },
      ...(bruto
        ? [{ label: "Dieta bruta estimada", value: formatMoney(bruto) }]
        : []),
      ...(actualizado
        ? [{ label: "Actualizado", value: formatDate(actualizado) }]
        : []),
    ],
    rowsTitle: "Qué hacen con la dieta",
    rows: rows.map((r) => ({
      label: r.label,
      sub: pct((r.c / n) * 100),
      value: `${r.c} de ${n}`,
      ratio: r.c / n,
      color: r.color,
    })),
  };
}

async function viajes(chamber: ChamberId): Promise<OgSummary | null> {
  const data =
    chamber === "diputados"
      ? await getDiputadosViajesExplore()
      : await getViajesExplore();
  const ranking = [...data.ranking]
    .filter((r) => r.viajesUltimos12Meses > 0)
    .sort(
      (a, b) =>
        b.viajesUltimos12Meses - a.viajesUltimos12Meses ||
        a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
    )
    .slice(0, TOP);
  const max = ranking[0]?.viajesUltimos12Meses || 1;
  // Same window as the ranking ("últimos 12 meses").
  const total = data.ranking.reduce(
    (sum, r) => sum + (r.viajesUltimos12Meses || 0),
    0,
  );
  return {
    kpis: [
      { label: "Viajes en los últimos 12 meses", value: nf.format(total) },
      {
        label: "Período",
        value: `${mesAnio(data.ventana.desde)} – ${mesAnio(data.ventana.hasta)}`,
      },
    ],
    rowsTitle: "Más viajes",
    rows: ranking.map((r) => ({
      label: r.nombreCompleto,
      sub: [
        "bloque" in r && chamber === "diputados"
          ? r.bloque
          : (r as any).partido,
        r.provincia,
      ]
        .filter(Boolean)
        .join(" · "),
      value: plural(r.viajesUltimos12Meses, "viaje", "viajes"),
      ratio: r.viajesUltimos12Meses / max,
      photo: r.foto || undefined,
    })),
  };
}

async function misiones(chamber: ChamberId): Promise<OgSummary | null> {
  if (chamber !== "diputados") return null;
  const data = await getDiputadosMisionesExplore();
  const ranking = [...data.ranking]
    .sort(
      (a, b) =>
        b.misionesCount - a.misionesCount ||
        b.viaticosUsd - a.viaticosUsd ||
        a.nombreCompleto.localeCompare(b.nombreCompleto, "es"),
    )
    .slice(0, TOP);
  const max = ranking[0]?.misionesCount || 1;
  const usd = data.ranking.reduce((s, r) => s + (r.viaticosUsd || 0), 0);
  return {
    kpis: [
      { label: "Misiones oficiales", value: nf.format(data.misiones.length) },
      ...(usd > 0
        ? [{ label: "Viáticos", value: `US$ ${nf.format(Math.round(usd))}` }]
        : []),
    ],
    rowsTitle: "Más misiones",
    rows: ranking.map((r) => ({
      label: r.nombreCompleto,
      sub: [r.bloque, r.provincia].filter(Boolean).join(" · "),
      value: plural(r.misionesCount, "misión", "misiones"),
      ratio: r.misionesCount / max,
      photo: r.foto || undefined,
    })),
  };
}

async function comisiones(chamber: ChamberId): Promise<OgSummary | null> {
  const list =
    chamber === "diputados"
      ? await getDiputadoComisiones()
      : await getSenadoComisiones();
  if (!list.length) return null;
  const top = [...list]
    .sort(
      (a, b) =>
        b.integrantes.length - a.integrantes.length ||
        a.nombre.localeCompare(b.nombre, "es"),
    )
    .slice(0, TOP);
  const tipos = new Map<string, number>();
  for (const c of list) {
    const t = c.tipo || "Sin tipo";
    tipos.set(t, (tipos.get(t) || 0) + 1);
  }
  const kpis = [
    { label: "Comisiones", value: nf.format(list.length) },
    ...(tipos.size > 1
      ? [{ label: "Tipos", value: nf.format(tipos.size) }]
      : []),
  ];
  const max = top[0]?.integrantes.length || 0;
  // Senado: the API has no integrantes yet → summarize by tipo instead.
  if (!max) {
    return {
      kpis,
      rowsTitle: "Comisiones por tipo",
      rows: [...tipos.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
        .slice(0, TOP)
        .map(([tipo, n]) => ({
          label: tipo,
          sub: pct((n / list.length) * 100),
          value: plural(n, "comisión", "comisiones"),
          ratio: n / list.length,
        })),
    };
  }
  return {
    kpis,
    rowsTitle: "Más integrantes",
    rows: top.map((c) => ({
      label: c.nombre,
      sub: c.tipo || undefined,
      value: plural(c.integrantes.length, "integrante", "integrantes"),
      ratio: c.integrantes.length / max,
    })),
  };
}

async function activeMembers(chamber: ChamberId) {
  const { members } = await buildMembersList(chamber);
  return (members as any[]).filter((m) =>
    chamber === "diputados" ? isDiputadoActivo(m) : isSenadorActivo(m),
  );
}

async function grupos(chamber: ChamberId): Promise<OgSummary | null> {
  const activos = await activeMembers(chamber);
  if (!activos.length) return null;
  const key = (m: any) =>
    String((chamber === "diputados" ? m.bloque : m.partido) || "").trim() ||
    "Sin grupo";
  const counts = new Map<string, number>();
  for (const m of activos) counts.set(key(m), (counts.get(key(m)) || 0) + 1);
  const names = [...counts.keys()];
  const colors =
    chamber === "diputados"
      ? getBloqueColores(names)
      : getPartidoColores(names);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, TOP);
  const total = activos.length;
  const m = MEMBER[chamber];
  return {
    kpis: [
      {
        label: `${m.group[0]!.toUpperCase()}${m.group.slice(1)} con bancas`,
        value: nf.format(counts.size),
      },
      {
        label: `${m.many[0]!.toUpperCase()}${m.many.slice(1)} en funciones`,
        value: nf.format(total),
      },
    ],
    rowsTitle:
      chamber === "diputados" ? "Bloques más grandes" : "Partidos más grandes",
    rows: top.map(([name, n]) => ({
      label: name,
      sub: `${pct((n / total) * 100)} de la cámara`,
      value: plural(n, m.one, m.many),
      ratio: n / total,
      color: colors[name],
    })),
  };
}

async function miembros(chamber: ChamberId): Promise<OgSummary | null> {
  const activos = await activeMembers(chamber);
  if (!activos.length) return null;
  const withStats = activos.filter(
    (m) =>
      m.estadisticas?.totalVotaciones > 0 &&
      m.estadisticas?.presentismo != null,
  );
  const avg = withStats.length
    ? withStats.reduce((s, m) => s + m.estadisticas.presentismo, 0) /
      withStats.length
    : null;
  const top = [...withStats]
    .sort(
      (a, b) =>
        b.estadisticas.presentismo - a.estadisticas.presentismo ||
        b.estadisticas.totalVotaciones - a.estadisticas.totalVotaciones ||
        String(a.nombreCompleto || "").localeCompare(
          String(b.nombreCompleto || ""),
          "es",
        ),
    )
    .slice(0, TOP);
  const m = MEMBER[chamber];
  return {
    kpis: [
      {
        label: `${m.many[0]!.toUpperCase()}${m.many.slice(1)} en funciones`,
        value: nf.format(activos.length),
      },
      ...(avg != null
        ? [{ label: "Presentismo promedio", value: pct(avg) }]
        : []),
    ],
    rowsTitle: "Mayor presentismo",
    rows: top.map((x) => ({
      label:
        chamber === "diputados"
          ? `${x.nombre} ${x.apellido}`.trim()
          : x.nombreCompleto || x.nombre,
      sub: [chamber === "diputados" ? x.bloque : x.partido, x.provincia]
        .filter(Boolean)
        .join(" · "),
      value: pct(x.estadisticas.presentismo),
      ratio: x.estadisticas.presentismo / 100,
      photo: x.foto || undefined,
    })),
  };
}

async function actas(chamber: ChamberId): Promise<OgSummary | null> {
  const [list, catalog] = await Promise.all([
    chamber === "diputados" ? getActasDiputados() : getActasSenadores(),
    buildPeriodos(chamber) as Promise<PeriodosCatalog>,
  ]);
  if (!list.length) return null;
  const enPeriodo = catalog.defaultKey
    ? filterActasByPeriodo(list as any[], [catalog.defaultKey], chamber)
    : list;
  const latest = [...list]
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    .slice(0, TOP);
  const periodo = catalog.periods.find((p) => p.key === catalog.defaultKey);
  return {
    kpis: [
      {
        label: periodo ? `Votaciones · ${periodo.label}` : "Votaciones",
        value: nf.format(enPeriodo.length),
      },
    ],
    rowsTitle: "Últimas votaciones",
    rows: latest.map((a) => {
      const key = resultadoBadgeLabel(a.resultado).toLowerCase();
      const color =
        (OG_RESULTADO_ACCENT as Record<string, string>)[
          key.normalize("NFD").replace(/\p{M}/gu, "")
        ] || "#6b7280";
      return {
        label: shortenOgActaTitle(String(a.titulo || "Votación"), 70),
        sub: a.fecha ? formatDate(a.fecha) : undefined,
        value: `${a.votosAfirmativos ?? 0} – ${a.votosNegativos ?? 0}`,
        badge: resultadoBadgeLabel(a.resultado),
        badgeColor: color,
      };
    }),
  };
}

const BUILDERS: Record<
  OgSummaryKey,
  (chamber: ChamberId) => Promise<OgSummary | null>
> = { gasto, dietas, viajes, misiones, comisiones, grupos, miembros, actas };

export function getOgSummary(
  chamber: ChamberId,
  key: OgSummaryKey,
): Promise<OgSummary | null> {
  const id = `${chamber}:${key}`;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = BUILDERS[key](chamber).catch((err) => {
    console.warn(`[og] summary ${id} failed:`, err?.message || err);
    cache.delete(id);
    return null;
  });
  cache.set(id, { at: Date.now(), value });
  return value;
}
