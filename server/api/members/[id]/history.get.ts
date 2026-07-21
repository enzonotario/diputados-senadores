export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  const query = getQuery(event);
  const history = await buildMemberHistory(chamber, id, query as Record<string, unknown>);
  if (!history) {
    throw createError({ statusCode: 404, statusMessage: "Member not found" });
  }
  return history;
});
