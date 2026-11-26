import {
  getOgHemicicloPhotosPng,
  getOgPoroteoHemicicloPhotosPng,
} from "../../../utils/og-hemiciclo-photos";

/**
 * Home, `?group=<slug>` (bloque/partido) o `?poroteo=<lz>` OG hemiciclo
 * composite (photos + party/vote ring), consumed by `Chamber.takumi` as an <img>.
 */
export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, "chamber") || "").replace(
    /\.png$/,
    "",
  );
  if (raw !== "diputados" && raw !== "senadores") {
    throw createError({ statusCode: 404 });
  }
  const query = getQuery(event);
  const poroteo = String(query.poroteo || "").trim();
  if (poroteo) {
    if (poroteo.length > 4096) {
      throw createError({ statusCode: 400 });
    }
    const png = await getOgPoroteoHemicicloPhotosPng(raw, poroteo);
    if (!png) throw createError({ statusCode: 400 });
    setHeader(event, "Content-Type", "image/png");
    setHeader(event, "Cache-Control", "public, max-age=3600");
    return png;
  }

  const group = String(query.group || "").trim();
  if (group && !/^[a-z0-9-]{1,120}$/.test(group)) {
    throw createError({ statusCode: 400 });
  }
  const png = await getOgHemicicloPhotosPng(raw, group || undefined);
  if (!png) throw createError({ statusCode: 503 });
  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "no-store");
  return png;
});
