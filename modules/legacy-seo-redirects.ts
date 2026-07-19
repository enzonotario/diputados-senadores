import { defineNuxtModule, logger } from "@nuxt/kit";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type RedirectRule = { from: string; to: string; status: 301 | 302 };

function maxByPeriod(a: any, b: any) {
  const aLegal = new Date(a?.periodoLegal?.inicio || 0).getTime();
  const bLegal = new Date(b?.periodoLegal?.inicio || 0).getTime();
  if (aLegal !== bLegal) return bLegal - aLegal;
  const aReal = new Date(a?.periodoReal?.inicio || 0).getTime();
  const bReal = new Date(b?.periodoReal?.inicio || 0).getTime();
  if (aReal !== bReal) return bReal - aReal;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function toRouteRules(redirects: RedirectRule[]) {
  const rules: Record<
    string,
    { redirect: { to: string; statusCode: number } }
  > = {};
  for (const r of redirects) {
    rules[r.from] = { redirect: { to: r.to, statusCode: r.status } };
  }
  return rules;
}

function toNetlifyRedirects(redirects: RedirectRule[]) {
  return (
    redirects
      .map(
        (r) =>
          `${r.from.replace(/\/\*\*$/, "/*")}\t${r.to.replace(/\/\*\*$/, "/:splat")}\t${r.status}`,
      )
      .join("\n") + "\n"
  );
}

function toVercelRedirects(redirects: RedirectRule[]) {
  return {
    redirects: redirects.map((r) => ({
      source: r.from.replace(/\/\*\*$/, "/:path*"),
      destination: r.to.replace(/\/\*\*$/, "/:path*"),
      permanent: r.status === 301,
    })),
  };
}

async function fetchSenadorNameRedirects(
  apiOrigin: string,
): Promise<RedirectRule[]> {
  const res = await fetch(`${apiOrigin}/v1/senado/senadores`, {
    headers: { "user-agent": "diputados-senadores-legacy-seo-redirects" },
  });
  if (!res.ok) {
    throw new Error(`senadores API ${res.status}`);
  }
  const list = (await res.json()) as any[];
  const byNombre = new Map<string, any>();
  for (const raw of list) {
    const nombre = String(raw?.nombre || "").trim();
    if (!nombre) continue;
    const prev = byNombre.get(nombre);
    if (!prev || maxByPeriod(prev, raw) > 0) {
      byNombre.set(nombre, raw);
    }
  }

  const redirects: RedirectRule[] = [];
  for (const [nombre, raw] of byNombre) {
    const id = String(raw.id);
    if (!id) continue;
    const encoded = encodeURIComponent(nombre);
    redirects.push({
      from: `/senadores/${encoded}`,
      to: `/senadores/${id}`,
      status: 301,
    });
  }
  return redirects;
}

export default defineNuxtModule({
  meta: {
    name: "legacy-seo-redirects",
  },
  async setup(_options, nuxt) {
    const chamber =
      process.env.NUXT_PUBLIC_DEFAULT_CHAMBER ||
      (nuxt.options.runtimeConfig?.public as any)?.defaultChamber ||
      "senadores";

    if (chamber !== "senadores") {
      return;
    }

    const apiOrigin = (
      process.env.NUXT_PUBLIC_API_URL ||
      process.env.NUXT_PUBLIC_API_BASE_URL ||
      "https://api.argentinadatos.com"
    ).replace(/\/$/, "");

    const redirects: RedirectRule[] = [
      { from: "/votaciones", to: "/actas", status: 301 },
      { from: "/votaciones/**", to: "/actas/**", status: 301 },
      { from: "/afinidad", to: "/", status: 301 },
      { from: "/comparativa", to: "/senadores", status: 301 },
    ];

    try {
      const nameRedirects = await fetchSenadorNameRedirects(apiOrigin);
      redirects.push(...nameRedirects);
      logger.info(
        `[legacy-seo-redirects] ${nameRedirects.length} redirects nombre→id`,
      );
    } catch (error) {
      logger.warn(
        `[legacy-seo-redirects] no se pudieron generar redirects por nombre: ${error}`,
      );
    }

    nuxt.options.routeRules = {
      ...nuxt.options.routeRules,
      ...toRouteRules(redirects),
    };

    nuxt.hooks.hook("nitro:init", (nitro) => {
      nitro.hooks.hook("compiled", async () => {
        const publicDir = nitro.options.output.publicDir;
        await mkdir(publicDir, { recursive: true });

        const netlify = toNetlifyRedirects(redirects);
        await writeFile(join(publicDir, "_redirects"), netlify, "utf8");

        const vercel = toVercelRedirects(redirects);
        const vercelJson = `${JSON.stringify(vercel, null, 2)}\n`;
        await writeFile(join(publicDir, "vercel.json"), vercelJson, "utf8");
        // Root: útil si el deploy de Vercel usa el repo y Output Directory = .output/public
        await writeFile(join(nuxt.options.rootDir, "vercel.json"), vercelJson, "utf8");

        logger.success(
          `[legacy-seo-redirects] wrote ${redirects.length} redirects (_redirects + vercel.json)`,
        );
      });
    });
  },
});
