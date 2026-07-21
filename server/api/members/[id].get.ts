export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  const query = getQuery(event);
  const profile = await buildMemberProfile(
    chamber,
    id,
    query as Record<string, unknown>,
  );
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "Member not found" });
  }
  return profile;
});
