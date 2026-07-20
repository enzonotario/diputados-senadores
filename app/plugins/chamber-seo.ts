export default defineNuxtPlugin(() => {
  const { chamber } = useChamber();

  // Absolute og:image / site meta deben seguir el Host (no DEFAULT_CHAMBER).
  updateSiteConfig({
    url: chamber.value.siteUrl,
    name: chamber.value.siteName,
    description: chamber.value.siteDescription,
  });

  // Defaults de cámara. Título / description / og:image → useChamberSeo + Takumi.
  useHead(() => ({
    meta: [
      { name: "keywords", content: chamber.value.keywords },
      { property: "og:site_name", content: chamber.value.siteName },
    ],
  }));
});
