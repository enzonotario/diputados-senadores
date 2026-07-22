import {
  isChamberId,
  rewritePathForChamber,
  type ChamberId,
} from "@/lib/chamber";

/**
 * - Congreso: solo `/`; cualquier otra ruta vuelve al home.
 * - Cámaras: rutas de miembros coinciden con el Host (/actas es compartida).
 */
export default defineNuxtRouteMiddleware((to) => {
  const { id } = useChamber();

  if (id.value === "congreso") {
    const path = to.path.replace(/\/$/, "") || "/";
    if (path !== "/") {
      return navigateTo(
        { path: "/", query: to.query, hash: to.hash },
        { redirectCode: 302 },
      );
    }
    return;
  }

  if (!isChamberId(id.value)) return;

  const rewritten = rewritePathForChamber(
    to.fullPath,
    id.value as ChamberId,
  );
  if (rewritten && rewritten !== to.fullPath) {
    return navigateTo(rewritten, { redirectCode: 302 });
  }
});
