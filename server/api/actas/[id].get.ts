export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  const acta = await buildActaDetail(chamber, id);
  if (!acta) {
    throw createError({ statusCode: 404, statusMessage: "Acta not found" });
  }
  return acta;
});
