export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const slug = getRouterParam(event, "slug");
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Missing slug" });
  }
  const group = await buildGroupBySlug(chamber, slug);
  if (!group) {
    throw createError({ statusCode: 404, statusMessage: "Group not found" });
  }
  return group;
});
