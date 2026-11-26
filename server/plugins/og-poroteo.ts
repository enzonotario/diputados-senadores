import { buildOgImageUrl } from "#og-image/shared";
import {
  isChamberId,
  parseSiteId,
  resolveSiteFromHost,
  SITES,
} from "../../app/lib/chamber";
import { buildChamberOgProps } from "../../app/lib/og";
import { buildPoroteoSeo } from "../../app/lib/og-poroteo";
import { POROTEO_SHARE_QUERY } from "../../app/utils/poroteoShare";

const POROTEO_PATH = /^\/poroteo\/?$/;
const OG_IMAGE_META =
  /(<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content=")([^"]*)(")/g;
const OG_DESC_META =
  /(<meta[^>]+(?:property="og:description"|name="twitter:description"|name="description")[^>]+content=")([^"]*)(")/g;
const OG_ALT_META =
  /(<meta[^>]+(?:property="og:image:alt"|name="twitter:image:alt")[^>]+content=")([^"]*)(")/g;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * `/poroteo` is prerendered, so Nitro's static handler serves the default
 * HTML ignoring `?s=…&titulo=…`. Patch the OG image (with per-legislator
 * photo hemiciclo + vote counts) and descriptions for shared poroteo links.
 *
 * SSR renders already include `kind_poroteo` in the OG URL and are left as is.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", async (event, response) => {
    if (event.method !== "GET") return;
    const url = getRequestURL(event);
    if (!POROTEO_PATH.test(url.pathname)) return;
    const share = String(
      url.searchParams.get(POROTEO_SHARE_QUERY) || "",
    ).trim();
    if (!share) return;
    if (getResponseHeader(event, "content-encoding")) return;

    const raw = response.body;
    const isBuffer = raw instanceof Uint8Array;
    if (typeof raw !== "string" && !isBuffer) return;
    const html = isBuffer ? Buffer.from(raw).toString("utf8") : raw;
    if (!html.includes("og:image")) return;
    // Already poroteo-specific (SSR render).
    if (html.includes("kind_poroteo")) return;

    const host =
      getRequestHeader(event, "x-forwarded-host") ||
      getRequestHeader(event, "host") ||
      "";
    const config = useRuntimeConfig(event);
    const site = resolveSiteFromHost(
      String(host).split(",")[0]!.trim().split(":")[0]!,
      parseSiteId(config.public.defaultChamber, "senadores"),
    );
    if (!isChamberId(site)) return;

    try {
      const members =
        site === "diputados"
          ? await import("../../app/lib/diputados-data").then(
              async ({ getDiputadosPorBloques }) =>
                (await getDiputadosPorBloques()).diputados.map((d) => ({
                  id: d.id,
                  foto: d.foto,
                  nombreCompleto: d.nombreCompleto,
                  apellido: d.apellido,
                  nombre: d.nombre,
                  provincia: d.provincia,
                  bloque: d.bloque || undefined,
                  banca: d.banca ?? null,
                })),
            )
          : await import("../../app/lib/senadores-data").then(
              async ({ getSenadoresPorPartidos }) =>
                (await getSenadoresPorPartidos()).senadores.map((s) => ({
                  id: s.id,
                  foto: s.foto,
                  nombreCompleto: s.nombreCompleto,
                  apellido: s.apellido,
                  nombre: s.nombreDePila || s.nombre,
                  provincia: s.provincia,
                  partido: s.partido,
                })),
            );

      const seo = buildPoroteoSeo(site, members, {
        s: share,
        titulo: url.searchParams.get("titulo"),
      });
      if (seo.og.kind !== "poroteo") return;

      const props = buildChamberOgProps({
        pageTitle: seo.title,
        description: seo.description,
        site: SITES[site],
        og: seo.og,
        rev: config.app.buildId,
      });
      const ogConfig = (config as any)["nuxt-og-image"] || {};
      const secret =
        (config as any).ogImage?.secret || ogConfig.security?.secret;
      const { url: ogPath } = buildOgImageUrl(
        {
          component: "Chamber.takumi",
          props,
          _path: "/poroteo",
        },
        "png",
        false,
        ogConfig.defaults,
        secret || undefined,
      );
      const ogUrl = new URL(ogPath, SITES[site].siteUrl).href;
      const alt = seo.description
        ? `${seo.title} — ${seo.description}`
        : seo.title;

      let patched = html.replace(OG_IMAGE_META, `$1${escapeAttr(ogUrl)}$3`);
      patched = patched.replace(
        OG_DESC_META,
        `$1${escapeAttr(seo.description)}$3`,
      );
      patched = patched.replace(OG_ALT_META, `$1${escapeAttr(alt)}$3`);
      if (patched === html) return;

      response.body = patched;
      removeResponseHeader(event, "etag");
      setResponseHeader(
        event,
        "content-length",
        Buffer.byteLength(patched, "utf8"),
      );
    } catch (err: any) {
      console.warn("[og] poroteo patch failed:", err?.message || err);
    }
  });
});
