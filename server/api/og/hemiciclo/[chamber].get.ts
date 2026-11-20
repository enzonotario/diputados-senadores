import { getOgHemicicloPhotosPng } from "../../../utils/og-hemiciclo-photos";

/**
 * Home OG hemiciclo composite (photos + party ring), consumed by
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
  const png = await getOgHemicicloPhotosPng(raw);
  if (!png) throw createError({ statusCode: 503 });
  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "no-store");
  return png;
});
