export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  return buildAffinityPeers(chamber);
});
