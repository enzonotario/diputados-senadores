import { getPresidencia } from "../../app/lib/senadores-data";

export default defineEventHandler(async (event) => {
  const chamber = resolveChamberFromEvent(event);
  if (chamber !== "senadores") {
    throw createError({
      statusCode: 404,
      statusMessage: "Presidencia solo disponible en senadores",
    });
  }

  return {
    chamber: "senadores" as const,
    presidencia: await getPresidencia(),
  };
});
