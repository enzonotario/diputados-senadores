type ChamberSeoInput = {
  /** Título corto de la página (sin host). El template agrega `| siteHost`. */
  title: string;
  description: string;
};

/**
 * SEO por cámara: document title vía titleTemplate; og/twitter con título completo.
 */
export function useChamberSeo(input: MaybeRefOrGetter<ChamberSeoInput>) {
  const { chamber } = useChamber();

  useSeoMeta(() => {
    const { title, description } = toValue(input);
    const fullTitle = title
      ? `${title} | ${chamber.value.siteHost}`
      : `${chamber.value.siteName} | ${chamber.value.siteHost}`;

    return {
      title: title || chamber.value.siteName,
      description,
      ogTitle: fullTitle,
      ogDescription: description,
      ogImage: "/og.png",
      twitterCard: "summary_large_image" as const,
      twitterTitle: fullTitle,
      twitterDescription: description,
      twitterImage: "/og.png",
    };
  });
}
