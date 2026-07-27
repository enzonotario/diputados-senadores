/**
 * Preferencia compartida tabla|grid en vistas “Por provincia”
 * (listados de miembros y detalle de acta).
 */
export function useProvinciasMembersLayout() {
  return useLocalStorage<"tabla" | "grid">("provincias-members-layout", "tabla", {
    initOnMounted: true,
  });
}
