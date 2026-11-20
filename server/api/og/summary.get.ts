import { getOgSummary, isOgSummaryKey } from "../../utils/og-summary";

/**
 * Listing-page OG summary (KPIs + top rows), consumed server-side by
 * `Chamber.takumi`. `?chamber=diputados|senadores&key=<OgSummaryKey>`.
 */
export default defineEventHandler(async (event) => {
  const { chamber, key } = getQuery(event);
  if (chamber !== "diputados" && chamber !== "senadores") {
    throw createError({ statusCode: 400 });
  }
  if (!isOgSummaryKey(key)) throw createError({ statusCode: 400 });
  const summary = await getOgSummary(chamber, key);
  if (!summary) throw createError({ statusCode: 404 });
  return summary;
});
