import { siteOgLogoSrc, type ChamberId, type SiteConfig } from "./chamber";
import { encodeOgHemiciclo } from "./hemiciclo-layout";
import { encodeOgRecintoActa } from "./og-recinto";
import { getVotoTipoConfig } from "../utils/votoTipo";

/** Barra lateral / badge por defecto (sin color de resultado). */
export const OG_BAR_ACCENT = "#232D4F";

/** Color de marca OG (barra cuando no hay resultado). */
export const OG_CHAMBER_ACCENT: Record<ChamberId, string> = {
  diputados: OG_BAR_ACCENT,
  senadores: OG_BAR_ACCENT,
};

/** Colores por resultado de acta. */
export const OG_RESULTADO_ACCENT = {
  afirmativo: "#14b8a6",
  negativo: "#ef4444",
  abstencion: "#3b82f6",
  empate: "#f59e0b",
  cancelada: "#6b7280",
} satisfies Record<string, string>;

export type OgKind = "home" | "list" | "member" | "group" | "acta" | "afinidad";

export type ChamberOgInput = {
  eyebrow?: string;
  badge?: string;
  /** Hex o clave de resultado (`afirmativo` → verde). */
  accent?: string;
  kind?: OgKind;
  /** Texto abajo a la izquierda (p. ej. fecha de votación). */
  footerLeft?: string;
  /** Conteos para actas — se muestran como indicador coloreado en la OG. */
  votosAfirmativos?: number;
  votosNegativos?: number;
  abstenciones?: number;
  ausentes?: number;
  /** Foto/avatar del miembro (URL absoluta o path público). */
  photoSrc?: string;
  /**
   * Hemiciclo compacto para homes/listados:
   * `45:14b8a6,30:ef4444` (count:hex sin #).
   */
  hemiciclo?: string;
  /** Acta view (`resultados` | `grupos` | `provincias`); empty = default. */
  vista?: string;
  /** Compact per-view data (see `app/lib/og-acta.ts`). */
  breakdown?: string;
};

/** Props for `Chamber.takumi` — shared by `useChamberSeo` and server patches. */
export function buildChamberOgProps(input: {
  pageTitle: string;
  description: string;
  site: SiteConfig;
  og?: ChamberOgInput;
}): Record<string, string> {
  const { pageTitle, description, site, og } = input;
  return {
    title: og?.kind === "acta" ? pageTitle : truncateOgText(pageTitle, 110),
    description: truncateOgText(description, 160),
    brand: site.brand,
    // Public path: the OG island resolves it on the same server. Do not use
    // the request origin (Host without port → :80 and the logo fetch fails).
    logoSrc: siteOgLogoSrc(site),
    eyebrow: og?.eyebrow || site.brand,
    badge: og?.badge || "",
    accent: resolveOgAccent(og?.accent, site.id as ChamberId),
    footerLeft: og?.footerLeft || "",
    kind: og?.kind || "",
    votes: encodeOgVotes(og),
    photoSrc: og?.photoSrc || "",
    hemiciclo: og?.hemiciclo || "",
    chamber: site.id,
    vista: og?.vista || "",
    breakdown: og?.breakdown || "",
  };
}

/** Serializa conteos para props OG (`144:102:9:1`). */
export function encodeOgVotes(input?: {
  votosAfirmativos?: number;
  votosNegativos?: number;
  abstenciones?: number;
  ausentes?: number;
}): string {
  if (!input) return "";
  const { votosAfirmativos, votosNegativos, abstenciones, ausentes } = input;
  if (
    votosAfirmativos == null &&
    votosNegativos == null &&
    abstenciones == null &&
    ausentes == null
  ) {
    return "";
  }
  return `${votosAfirmativos ?? 0}:${votosNegativos ?? 0}:${abstenciones ?? 0}:${ausentes ?? 0}`;
}

/** Parsea `144:102:9:1` → conteos (3 o 4 segmentos). */
export function decodeOgVotes(raw?: string | null): {
  afirmativos: number;
  negativos: number;
  abstenciones: number;
  ausentes: number;
} | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => Number(p));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return {
    afirmativos: parts[0]!,
    negativos: parts[1]!,
    abstenciones: parts[2]!,
    ausentes: parts[3] ?? 0,
  };
}

/** Hemiciclo OG coloreado por tipo de voto (actas). */
export function encodeOgActaHemiciclo(input: {
  votosAfirmativos?: number | null;
  votosNegativos?: number | null;
  abstenciones?: number | null;
  ausentes?: number | null;
  sinVotar?: number | null;
}): string {
  const groups: { count: number; color: string }[] = [];
  const push = (count: number | null | undefined, tipo: string) => {
    const n = Number(count) || 0;
    if (n > 0) {
      groups.push({ count: n, color: getVotoTipoConfig(tipo).color });
    }
  };
  push(input.votosAfirmativos, "afirmativo");
  push(input.votosNegativos, "negativo");
  push(input.abstenciones, "abstencion");
  push(input.ausentes, "ausente");
  push(input.sinVotar, "presidente");
  return encodeOgHemiciclo(groups);
}

export function buildActaOgFooter(input: {
  fecha?: string | null;
  numeroActa?: string | null;
  formatDate?: (fecha: string) => string;
}): string {
  const parts: string[] = [];
  const fecha = String(input.fecha || "").trim();
  if (fecha) {
    parts.push(input.formatDate ? input.formatDate(fecha) : fecha);
  }
  const acta = String(input.numeroActa || "").trim();
  if (acta) parts.push(`Acta ${acta}`);
  return parts.join(" · ");
}

export function buildActaChamberOg(
  acta: {
    titulo?: string | null;
    resultado?: string | null;
    fecha?: string | null;
    numeroActa?: string | null;
    votosAfirmativos?: number | null;
    votosNegativos?: number | null;
    abstenciones?: number | null;
    ausentes?: number | null;
    sinVotar?: number | null;
  },
  formatDate: (fecha: string) => string,
): ChamberOgInput {
  return {
    kind: "acta",
    eyebrow: "votación",
    badge: resultadoBadgeLabel(acta.resultado),
    accent: acta.resultado || undefined,
    footerLeft: buildActaOgFooter({
      fecha: acta.fecha,
      numeroActa: acta.numeroActa,
      formatDate,
    }),
    votosAfirmativos: acta.votosAfirmativos ?? 0,
    votosNegativos: acta.votosNegativos ?? 0,
    abstenciones: acta.abstenciones ?? 0,
    ausentes: acta.ausentes ?? 0,
    hemiciclo: encodeOgActaHemiciclo({
      votosAfirmativos: acta.votosAfirmativos,
      votosNegativos: acta.votosNegativos,
      abstenciones: acta.abstenciones,
      ausentes: acta.ausentes,
      sinVotar: acta.sinVotar,
    }),
  };
}

/** OG de acta diputados: hemiciclo por banca real del recinto. */
export function buildDiputadosActaChamberOg(
  acta: {
    titulo?: string | null;
    resultado?: string | null;
    fecha?: string | null;
    numeroActa?: string | null;
    presidente?: string | null;
    votosAfirmativos?: number | null;
    votosNegativos?: number | null;
    abstenciones?: number | null;
    ausentes?: number | null;
    sinVotar?: number | null;
    votos?: Array<{
      tipoVoto?: string | null;
      diputadoObj?: { banca?: number | null } | null;
    }>;
  },
  formatDate: (fecha: string) => string,
): ChamberOgInput {
  const base = buildActaChamberOg(acta, formatDate);
  const votos = (acta.votos || []).map((v) => ({
    banca: v.diputadoObj?.banca ?? null,
    tipoVoto: v.tipoVoto ?? null,
  }));
  const recinto = encodeOgRecintoActa({
    votos,
    hasPresidente: Boolean(String(acta.presidente || "").trim()),
  });
  return {
    ...base,
    hemiciclo: recinto,
  };
}

export function resolveOgAccent(
  accent: string | undefined,
  chamber: ChamberId,
): string {
  if (!accent) return OG_CHAMBER_ACCENT[chamber];
  const raw = accent.trim();
  if (raw.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;

  const key = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (key.startsWith("afirmativ")) return OG_RESULTADO_ACCENT.afirmativo;
  if (key.startsWith("negativ")) return OG_RESULTADO_ACCENT.negativo;
  if (key.includes("abstenc")) return OG_RESULTADO_ACCENT.abstencion;
  if (key.includes("empate")) return OG_RESULTADO_ACCENT.empate;
  if (key.includes("cancel")) return OG_RESULTADO_ACCENT.cancelada;

  return OG_CHAMBER_ACCENT[chamber];
}

export function resultadoBadgeLabel(resultado?: string | null): string {
  const raw = String(resultado || "")
    .toLowerCase()
    .trim();
  if (raw.startsWith("afirmativ")) return "Afirmativo";
  if (raw.startsWith("negativ")) return "Negativo";
  if (raw.includes("abstenc")) return "Abstención";
  if (raw.includes("empate")) return "Empate";
  if (raw.includes("cancel")) return "Cancelada";
  if (!resultado) return "Votación";
  return String(resultado);
}

export function truncateOgText(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Quita cola procedimental típica de títulos de acta HCDN/Senado. */
export function shortenOgActaTitle(raw: string, maxTotal = 84): string {
  let t = raw.replace(/\s+/g, " ").trim();

  const cutAt = (re: RegExp) => {
    const m = re.exec(t);
    if (m && m.index > 12) t = t.slice(0, m.index).trim();
  };

  cutAt(/\.\s*DICT\.?\s+DE\b/i);
  cutAt(/\.\s*VOT\.?\s+EN\b/i);
  cutAt(/\.\s*(?:CAPÍTULO|ARTÍCULO|ART\.|TÍTULO|TITULO)\b/i);

  t = t
    .replace(/\.\s*(?:CREACIÓN|MODIFICACIÓN|APROBACIÓN|RECHAZO)\s*\.?\s*$/i, "")
    .trim();

  return truncateOgText(t, maxTotal);
}

/** Parte el título en hasta 2 líneas (Satori no soporta line-clamp). */
export function wrapOgActaTitle(
  raw: string,
  maxLines = 2,
  charsPerLine = 40,
): string[] {
  const short = shortenOgActaTitle(raw, maxLines * charsPerLine);
  const words = short.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > charsPerLine && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (!lines.length) return [short];

  const used = lines.join(" ");
  if (short.length > used.length && !lines[lines.length - 1]!.endsWith("…")) {
    // Siempre marcar el corte: la última línea suele ser más corta que el límite.
    const last = lines[lines.length - 1]!.replace(/[\s,.;:]+$/, "");
    lines[lines.length - 1] =
      last.length >= charsPerLine
        ? truncateOgText(last, charsPerLine)
        : `${last}…`;
  }

  return lines.slice(0, maxLines);
}

/** Member card: career vote counts + attendance line. */
export function buildMemberOgStats(
  stats?: {
    totalVotaciones?: number | null;
    votosAfirmativos?: number | null;
    votosNegativos?: number | null;
    abstenciones?: number | null;
    ausencias?: number | null;
    presentismo?: number | null;
  } | null,
  provincia?: string | null,
): Partial<ChamberOgInput> {
  const parts: string[] = [];
  if (provincia) parts.push(provincia);
  if (!stats?.totalVotaciones) {
    return parts.length ? { footerLeft: parts.join(" · ") } : {};
  }
  if (stats.presentismo != null) {
    parts.push(`Presentismo ${Math.round(stats.presentismo)}%`);
  }
  parts.push(
    `${stats.totalVotaciones} ${stats.totalVotaciones === 1 ? "votación" : "votaciones"}`,
  );
  return {
    votosAfirmativos: stats.votosAfirmativos ?? 0,
    votosNegativos: stats.votosNegativos ?? 0,
    abstenciones: stats.abstenciones ?? 0,
    ausentes: stats.ausencias ?? 0,
    footerLeft: parts.join(" · "),
  };
}
