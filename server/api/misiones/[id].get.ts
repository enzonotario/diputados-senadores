export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const id = String(getRouterParam(event, "id") || "").trim();
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Falta id de misión" });
  }
  const payload = await buildMisionById(chamber, id);
  if (!payload) {
    throw createError({ statusCode: 404, statusMessage: "Misión no encontrada" });
  }
  return payload;
});
