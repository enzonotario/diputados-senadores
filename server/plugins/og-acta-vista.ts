import { buildOgImageUrl } from "#og-image/shared";
import {
  isChamberId,
  parseSiteId,
  resolveSiteFromHost,
  SITES,
} from "../../app/lib/chamber";
import { buildChamberOgProps } from "../../app/lib/og";
import { buildActaSeo, normalizeOgActaVista } from "../../app/lib/og-acta";
import { formatDate } from "../../app/lib/utils";

const ACTA_PATH = /^\/actas\/([^/]+)\/?$/;
const OG_IMAGE_META =
  /(<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content=")([^"]*)(")/g;

/**
 * Prerendered acta HTML is served by Nitro's static handler, which ignores
 * the query string — so `/actas/:id?vista=provincias` would share the
 * default OG. Patch og:image / twitter:image for those responses with the
 * vista-specific card (same props as the page builds during SSR).
 *
 * SSR responses already carry `vista_…` in the OG URL and are left as is.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", async (event, response) => {
    if (event.method !== "GET") return;
    const url = getRequestURL(event);
    const match = ACTA_PATH.exec(url.pathname);
    if (!match || !url.searchParams.has("vista")) return;
    if (getResponseHeader(event, "content-encoding")) return;

    const raw = response.body;
    const isBuffer = raw instanceof Uint8Array;
    if (typeof raw !== "string" && !isBuffer) return;
    const html = isBuffer ? Buffer.from(raw).toString("utf8") : raw;
    if (!html.includes("og:image")) return;

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

    const vista = normalizeOgActaVista(site, url.searchParams.get("vista"));
    if (!vista) return;
    // Already vista-specific (SSR render).
    if (html.includes(`vista_${vista}`)) return;

    try {
      // Lazy: keep the data layer out of plugin init (startup/healthcheck).
      const [{ buildActaDetail }, { getBloqueColores }, { getPartidoColores }] =
        await Promise.all([
          import("../utils/mini-api"),
          import("../../app/lib/diputados-data"),
          import("../../app/lib/senadores-data"),
        ]);
      const acta = await buildActaDetail(site, decodeURIComponent(match[1]!));
      if (!acta) return;
      const seo = buildActaSeo(
        site,
        acta,
        url.searchParams.get("vista"),
        formatDate,
        site === "diputados" ? getBloqueColores : getPartidoColores,
      );
      const props = buildChamberOgProps({
        pageTitle: seo.title,
        description: seo.description,
        site: SITES[site],
        og: seo.og,
      });
      const ogConfig = (config as any)["nuxt-og-image"] || {};
      const secret =
        (config as any).ogImage?.secret || ogConfig.security?.secret;
      const { url: ogPath } = buildOgImageUrl(
        {
          component: "Chamber.takumi",
          props,
          _path: url.pathname.replace(/\/$/, ""),
        },
        "png",
        false,
        ogConfig.defaults,
        secret || undefined,
      );
      const ogUrl = new URL(ogPath, SITES[site].siteUrl).href;
      const patched = html.replace(OG_IMAGE_META, `$1${ogUrl}$3`);
      if (patched === html) return;

      response.body = patched;
      removeResponseHeader(event, "etag");
      setResponseHeader(
        event,
        "content-length",
        Buffer.byteLength(patched, "utf8"),
      );
    } catch (err: any) {
      console.warn("[og] acta vista patch failed:", err?.message || err);
    }
  });
});
