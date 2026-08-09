export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  const comision = await buildComisionById(chamber, id);
  if (!comision) {
    throw createError({ statusCode: 404, statusMessage: "Comisión no encontrada" });
  }
  return comision;
});
