export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  if (chamber !== "senadores") {
    throw createError({
      statusCode: 404,
      statusMessage: "Comisiones solo disponibles en senadores",
    });
  }
  return buildComisionesList();
});
