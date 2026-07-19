export default defineNuxtPlugin(() => {
  const { chamber } = useChamber();

  useHead(() => ({
    titleTemplate: (title) =>
      title
        ? `${title}`
        : `${chamber.value.siteName} | ${chamber.value.siteHost}`,
    meta: [
      { name: "description", content: chamber.value.siteDescription },
      { name: "keywords", content: chamber.value.keywords },
      { property: "og:site_name", content: chamber.value.siteName },
      {
        property: "og:image",
        content: `${chamber.value.siteUrl}/og.png`,
      },
    ],
  }));
});
