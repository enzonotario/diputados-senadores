/**
 * Redirects SEO de la app Next de senadores → rutas Nuxt (navegación client).
 * El 301 en el request inicial lo hace `server/middleware/legacy-seo.ts`
 * (incluye mapa nombre→id).
 */
export default defineNuxtRouteMiddleware((to) => {
  const { id } = useChamber();
  if (id.value !== "senadores") return;

  const path = to.path.replace(/\/$/, "") || "/";

  if (path === "/votaciones") {
    return navigateTo(
      { path: "/actas", query: to.query, hash: to.hash },
      { redirectCode: 301 },
    );
  }

  const votacion = path.match(/^\/votaciones\/([^/]+)$/);
  if (votacion) {
    return navigateTo(
      { path: `/actas/${votacion[1]}`, query: to.query, hash: to.hash },
      { redirectCode: 301 },
    );
  }

  if (path === "/afinidad") {
    return navigateTo(
      { path: "/", query: to.query, hash: to.hash },
      { redirectCode: 301 },
    );
  }

  if (path === "/comparativa") {
    return navigateTo(
      { path: "/senadores", query: to.query, hash: to.hash },
      { redirectCode: 301 },
    );
  }
});
