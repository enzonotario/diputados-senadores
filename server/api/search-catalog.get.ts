export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  return buildSearchCatalog(chamber);
});
