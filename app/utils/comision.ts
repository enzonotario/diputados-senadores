/** Ruta canónica de una comisión según cámara. */
export function comisionPath(
  id: string | number | null | undefined,
  chamber: "senadores" | "diputados" = "senadores",
) {
  const raw = String(id || "").trim();
  if (!raw) return null;
  return `/${chamber}/comisiones/${raw}`;
}

const CARGO_RANK: Record<string, number> = {
  presidente: 0,
  presidenta: 0,
  vicepresidente: 1,
  vicepresidenta: 1,
  secretario: 2,
  secretaria: 2,
  vocal: 3,
};

export function comisionCargoRank(cargo: string | null | undefined) {
  const key = String(cargo || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return CARGO_RANK[key] ?? 50;
}

export function sortComisionIntegrantes<
  T extends { cargo?: string | null; nombre?: string | null },
>(integrantes: T[]): T[] {
  return [...integrantes].sort((a, b) => {
    const rank =
      comisionCargoRank(a.cargo) - comisionCargoRank(b.cargo);
    if (rank !== 0) return rank;
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });
}
