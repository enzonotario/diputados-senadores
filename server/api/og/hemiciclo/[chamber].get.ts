import { getOgHemicicloPhotosPng } from "../../../utils/og-hemiciclo-photos";

/**
 * Home (or `?group=<slug>` bloque/partido) OG hemiciclo composite (photos + party ring), consumed by
 * `Chamber.takumi` as an <img>. Dots-only until photos are cached.
 */
export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, "chamber") || "").replace(
    /\.png$/,
    "",
  );
  if (raw !== "diputados" && raw !== "senadores") {
    throw createError({ statusCode: 404 });
  }
  const group = String(getQuery(event).group || "").trim();
  if (group && !/^[a-z0-9-]{1,120}$/.test(group)) {
    throw createError({ statusCode: 400 });
  }
  const png = await getOgHemicicloPhotosPng(raw, group || undefined);
  if (!png) throw createError({ statusCode: 503 });
  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "no-store");
  return png;
});
