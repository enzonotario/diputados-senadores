/**
 * Presidente de cámara a partir de actas (modo por nombre en `acta.presidente`).
 */

export function modePresidenteNombre(
  actas: Array<{ presidente?: string | null }>,
): string | null {
  const counts = new Map<string, number>();
  for (const a of actas) {
    const name = String(a.presidente || "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name;
      bestN = n;
    }
  }
  return best;
}

function normNombre(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type MemberLike = {
  id: string;
  nombreCompleto?: string | null;
  apellido?: string | null;
  nombre?: string | null;
};

/** Resuelve el presidente del período contra la lista de miembros. */
export function matchMemberByPresidenteNombre<T extends MemberLike>(
  members: T[],
  presidenteNombre: string | null | undefined,
): T | null {
  const raw = String(presidenteNombre || "").trim();
  if (!raw || !members.length) return null;
  const target = normNombre(raw);

  for (const m of members) {
    const full = normNombre(
      m.nombreCompleto || `${m.apellido || ""}, ${m.nombre || ""}`,
    );
    if (full && full === target) return m;
  }

  // Fallback: apellido + primer token del nombre
  const [apellidoRaw, ...rest] = raw.split(",");
  const apellido = normNombre(apellidoRaw || "");
  const nombreHead = normNombre(rest.join(",")).split(" ")[0] || "";
  if (!apellido) return null;

  for (const m of members) {
    const mApellido = normNombre(m.apellido || m.nombreCompleto?.split(",")[0] || "");
    if (mApellido !== apellido) continue;
    if (!nombreHead) return m;
    const mNombre = normNombre(
      m.nombre || m.nombreCompleto?.split(",")[1] || "",
    );
    if (mNombre.startsWith(nombreHead) || nombreHead.startsWith(mNombre.split(" ")[0] || "")) {
      return m;
    }
  }

  return null;
}
