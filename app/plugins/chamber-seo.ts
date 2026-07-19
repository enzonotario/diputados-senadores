export default defineNuxtPlugin(() => {
  const { chamber } = useChamber();

  // Defaults de cámara. Los títulos/descriptions de página van en useChamberSeo
  // (titleTemplate de nuxt-seo-utils queda anulado ahí con titleTemplate: "%s").
  useHead(() => ({
    meta: [
      { name: "keywords", content: chamber.value.keywords },
      { property: "og:site_name", content: chamber.value.siteName },
      {
        property: "og:image",
        content: `${chamber.value.siteUrl}/og.png`,
      },
    ],
  }));
});
