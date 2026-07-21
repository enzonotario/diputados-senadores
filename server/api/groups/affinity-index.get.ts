export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  const query = getQuery(event);
  const rowsOnly =
    query.rowsOnly === "1" ||
    query.rowsOnly === "true" ||
    query.rowsOnly === "yes";
  return buildGroupsAffinityIndex(chamber, { rowsOnly });
});
