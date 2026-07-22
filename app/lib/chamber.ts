/** Cámaras legislativas (datos /actas /miembros). */
export type ChamberId = "diputados" | "senadores";

/** Sitios servidos por Host: cámaras + landing Congreso. */
export type SiteId = ChamberId | "congreso";

type SiteBase = {
  siteHost: string;
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  keywords: string;
  /** Nav brand text before .argentinadatos.com */
  brand: string;
  /** Logo en /public (navbar + home), modo claro. Vacío = solo texto. */
  logoSrc: string;
  /** Logo para dark mode. */
  logoSrcDark: string;
  githubUrl: string;
};

export type ChamberConfig = SiteBase & {
  id: ChamberId;
  slug: ChamberId;
  membersLabel: string;
  membersPath: string;
  groupsLabel: string;
  groupsPath: string;
  officialUrl: string;
  officialLabel: string;
  bodyName: string;
};

export type CongresoConfig = SiteBase & {
  id: "congreso";
  slug: "congreso";
};

export type SiteConfig = ChamberConfig | CongresoConfig;

export const CHAMBERS: Record<ChamberId, ChamberConfig> = {
  diputados: {
    id: "diputados",
    slug: "diputados",
    siteHost: "diputados.argentinadatos.com",
    siteUrl: "https://diputados.argentinadatos.com",
    siteName: "Cómo votan los diputados",
    siteDescription:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada diputado en cada proyecto de ley de la Cámara de Diputados.",
    keywords:
      "diputados, cámara de diputados, votaciones, actas, argentina, bloques",
    brand: "diputados",
    logoSrc: "/assets/diputados.png",
    logoSrcDark: "/assets/diputados-dark.png",
    membersLabel: "Diputados",
    membersPath: "/diputados",
    groupsLabel: "Bloques",
    groupsPath: "/diputados/bloques",
    officialUrl: "https://www.diputados.gob.ar/",
    officialLabel: "diputados.gob.ar",
    githubUrl: "https://github.com/enzonotario/diputados",
    bodyName: "la Cámara de Diputados de la Nación Argentina",
  },
  senadores: {
    id: "senadores",
    slug: "senadores",
    siteHost: "senadores.argentinadatos.com",
    siteUrl: "https://senadores.argentinadatos.com",
    siteName: "Cómo votan los senadores",
    siteDescription:
      "Actas, hemiciclo y perfiles: mirá cómo votó cada senador en cada proyecto de ley del Senado de la Nación.",
    keywords:
      "senadores, senado, votaciones, actas, argentina, partidos políticos",
    brand: "senadores",
    logoSrc: "/assets/senado.png",
    logoSrcDark: "/assets/senado-dark.png",
    membersLabel: "Senadores",
    membersPath: "/senadores",
    groupsLabel: "Partidos",
    groupsPath: "/senadores/partidos",
    officialUrl: "https://www.senadores.gob.ar/",
    officialLabel: "senadores.gob.ar",
    githubUrl: "https://github.com/enzonotario/diputados-senadores",
    bodyName: "el Senado de la Nación Argentina",
  },
};

export const CONGRESO: CongresoConfig = {
  id: "congreso",
  slug: "congreso",
  siteHost: "congreso.argentinadatos.com",
  siteUrl: "https://congreso.argentinadatos.com",
  siteName: "Cómo votan en el Congreso",
  siteDescription:
    "Elegí Cámara de Diputados o Senado y mirá cómo votan en el Congreso de la Nación Argentina.",
  keywords:
    "congreso, diputados, senadores, votaciones, actas, argentina, cámara",
  brand: "congreso",
  logoSrc: "",
  logoSrcDark: "",
  githubUrl: "https://github.com/enzonotario/senadores",
};

export const SITES: Record<SiteId, SiteConfig> = {
  ...CHAMBERS,
  congreso: CONGRESO,
};

export function isChamberId(id: SiteId): id is ChamberId {
  return id === "diputados" || id === "senadores";
}

/** Local + prod host patterns. Prefer explicit site markers in hostname. */
export function resolveSiteFromHost(
  hostname: string,
  fallback: SiteId = "senadores",
): SiteId {
  const host = String(hostname || "")
    .toLowerCase()
    .split(":")[0];

  if (host.includes("diputados")) return "diputados";
  if (host.includes("senadores")) return "senadores";
  if (host.includes("congreso")) return "congreso";

  return fallback;
}

/**
 * Cámara legislativa desde Host.
 * En host congreso (o desconocido) usa `fallback` de cámara.
 */
export function resolveChamberFromHost(
  hostname: string,
  fallback: ChamberId = "senadores",
): ChamberId {
  const site = resolveSiteFromHost(hostname, fallback);
  return isChamberId(site) ? site : fallback;
}

export function getChamberConfig(id: ChamberId): ChamberConfig {
  return CHAMBERS[id];
}

export function getSiteConfig(id: SiteId): SiteConfig {
  return SITES[id];
}

export function otherChamberId(id: ChamberId): ChamberId {
  return id === "diputados" ? "senadores" : "diputados";
}

/**
 * Hostname de otro sitio, preservando el entorno local
 * (p.ej. diputados.localhost.test → senadores.localhost.test).
 */
export function swapSiteHostname(hostname: string, to: SiteId): string {
  const host = String(hostname || "")
    .toLowerCase()
    .split(":")[0];

  const markers: SiteId[] = ["diputados", "senadores", "congreso"];
  for (const from of markers) {
    if (from === to) continue;
    if (host.includes(from)) {
      return host.replace(from, to);
    }
  }
  if (host.includes(to)) return host;
  return SITES[to].siteHost;
}

/** @deprecated Prefer swapSiteHostname */
export function swapChamberHostname(
  hostname: string,
  to: ChamberId,
): string {
  return swapSiteHostname(hostname, to);
}

/** URL absoluta a un sitio (misma ruta opcional). */
export function buildSiteAbsoluteUrl(
  to: SiteId,
  opts: {
    hostname: string;
    protocol?: string;
    port?: string;
    path?: string;
  },
): string {
  const host = swapSiteHostname(opts.hostname, to);
  const protocol = opts.protocol || "https:";
  const isLocal =
    host.includes("localhost") ||
    host.endsWith(".test") ||
    host === "127.0.0.1";
  const port =
    opts.port && isLocal && !["80", "443", ""].includes(opts.port)
      ? `:${opts.port}`
      : "";
  const path = opts.path?.startsWith("/") ? opts.path : `/${opts.path || ""}`;
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "") || "/";
  return `${protocol}//${host}${port}${normalizedPath}`;
}

/** URL absoluta a la otra cámara (misma ruta opcional). */
export function buildChamberAbsoluteUrl(
  to: ChamberId,
  opts: {
    hostname: string;
    protocol?: string;
    port?: string;
    path?: string;
  },
): string {
  return buildSiteAbsoluteUrl(to, opts);
}

/**
 * Redirect wrong-chamber member routes to the active chamber.
 * Shared routes like /actas stay as-is (data differs by chamber).
 * No-op for congreso (middleware manda todo a /).
 */
export function rewritePathForChamber(
  path: string,
  chamber: ChamberId,
): string | null {
  if (chamber === "diputados") {
    if (path === "/senadores" || path.startsWith("/senadores/")) {
      return path.replace(/^\/senadores/, "/diputados").replace(
        /\/partidos\b/,
        "/bloques",
      );
    }
  }
  if (chamber === "senadores") {
    if (path === "/diputados" || path.startsWith("/diputados/")) {
      return path.replace(/^\/diputados/, "/senadores").replace(
        /\/bloques\b/,
        "/partidos",
      );
    }
  }
  return null;
}
