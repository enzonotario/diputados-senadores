type ChamberSeoInput = {
  /** Título corto de la página (sin host). */
  title: string;
  description: string;
};

/**
 * SEO por cámara.
 *
 * Importante: no pasar un getter a `useSeoMeta(() => …)` — Unhead 2 destruye
 * el argumento y `title` queda undefined. Usar `useHead(() => …)` o getters
 * por propiedad.
 */
export function useChamberSeo(input: MaybeRefOrGetter<ChamberSeoInput>) {
  const { chamber } = useChamber();

  useHead(() => {
    const { title, description } = toValue(input);
    const pageTitle = (title || "").trim() || chamber.value.siteName;
    const fullTitle = `${pageTitle} | ${chamber.value.siteHost}`;

    return {
      // Título ya completo: anula el `%s %separator %siteName` de nuxt-seo-utils.
      title: fullTitle,
      titleTemplate: "%s",
      meta: [
        { name: "description", content: description },
        { property: "og:title", content: fullTitle },
        { property: "og:description", content: description },
        { property: "og:image", content: "/og.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: fullTitle },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "/og.png" },
      ],
    };
  });
}
