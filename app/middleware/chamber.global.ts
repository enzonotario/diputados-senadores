import { rewritePathForChamber, type ChamberId } from "@/lib/chamber";

/**
 * Asegura que las rutas de miembros coincidan con la cámara del host.
 * /actas es compartida (el data layer elige API según cámara).
 */
export default defineNuxtRouteMiddleware((to) => {
  const { id } = useChamber();
  const rewritten = rewritePathForChamber(to.fullPath, id.value as ChamberId);
  if (rewritten && rewritten !== to.fullPath) {
    return navigateTo(rewritten, { redirectCode: 302 });
  }
});
