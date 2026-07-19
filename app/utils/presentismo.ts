/** Promedio de presentismo de miembros que tienen estadísticas. */
export function averagePresentismo(
  members: Array<{ estadisticas?: { presentismo?: number | null } }>,
): number | null {
  const values = members
    .map((d) => d.estadisticas?.presentismo)
    .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (!values.length) return null;
  const sum = values.reduce((s, n) => s + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
