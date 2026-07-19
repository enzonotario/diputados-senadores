import { CHAMBERS, type ChamberId } from "../../app/lib/chamber";

type RevalidateBody = {
  /** Paths a revalidar (default: seeds por cámara). */
  paths?: string[];
  /** Hosts absolutos; default: ambos dominios de prod. */
  hosts?: string[];
  /** Si se pasa, usa seeds de esa cámara (o ambas). */
  chamber?: ChamberId | "all";
};

const SEED_PATHS: Record<ChamberId, string[]> = {
  diputados: ["/", "/actas", "/diputados", "/diputados/bloques"],
  senadores: ["/", "/actas", "/senadores", "/senadores/partidos"],
};

function defaultHosts(): string[] {
  return [CHAMBERS.senadores.siteUrl, CHAMBERS.diputados.siteUrl];
}

function resolvePaths(body: RevalidateBody): string[] {
  if (body.paths?.length) {
    return [...new Set(body.paths.map((p) => (p.startsWith("/") ? p : `/${p}`)))];
  }

  const chamber = body.chamber ?? "all";
  if (chamber === "diputados") return SEED_PATHS.diputados;
  if (chamber === "senadores") return SEED_PATHS.senadores;
  return [...new Set([...SEED_PATHS.senadores, ...SEED_PATHS.diputados])];
}

function resolveHosts(body: RevalidateBody): string[] {
  if (body.hosts?.length) return body.hosts;
  if (body.chamber === "diputados") return [CHAMBERS.diputados.siteUrl];
  if (body.chamber === "senadores") return [CHAMBERS.senadores.siteUrl];
  return defaultHosts();
}

/**
 * Invalida cache ISR on-demand (Vercel).
 *
 * Auth: `Authorization: Bearer <NUXT_REVALIDATE_SECRET>`
 * o header `x-revalidate-token`.
 *
 * Body JSON opcional:
 * `{ "paths": ["/actas/123"], "chamber": "senadores", "hosts": ["https://..."] }`
 *
 * Sin paths: revalida seeds (home, actas, listados). Para una acta/miembro
 * concreto, pasá su path. Un deploy nuevo también limpia todo el ISR.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = String(config.revalidateSecret || "");

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "NUXT_REVALIDATE_SECRET (o VERCEL_BYPASS_TOKEN) no configurado",
    });
  }

  const auth = getHeader(event, "authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = getHeader(event, "x-revalidate-token")?.trim();
  const token = bearer || headerToken;

  if (!token || token !== secret) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = ((await readBody(event)) || {}) as RevalidateBody;
  const paths = resolvePaths(body);
  const hosts = resolveHosts(body);

  const results: Array<{
    url: string;
    status: number;
    vercelCache: string | null;
  }> = [];

  for (const host of hosts) {
    for (const path of paths) {
      const url = new URL(path, host.endsWith("/") ? host : `${host}/`).href;
      try {
        const res = await $fetch.raw(url, {
          method: "HEAD",
          headers: {
            "x-prerender-revalidate": secret,
          },
          ignoreResponseError: true,
        });
        results.push({
          url,
          status: res.status,
          vercelCache:
            res.headers.get("x-vercel-cache") ||
            res.headers.get("x-now-cache") ||
            null,
        });
      } catch (err: any) {
        results.push({
          url,
          status: err?.statusCode || err?.status || 0,
          vercelCache: null,
        });
      }
    }
  }

  return {
    ok: true,
    revalidated: results.length,
    results,
  };
});
