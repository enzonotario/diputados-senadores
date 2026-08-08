export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  if (chamber !== "senadores") {
    throw createError({
      statusCode: 404,
      statusMessage: "Viajes solo disponibles en senadores",
    });
  }
  return buildViajesExplore();
});
