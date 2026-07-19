export default defineNuxtPlugin(() => {
  const { chamber } = useChamber();

  useHead(() => ({
    titleTemplate: (title) => {
      const host = chamber.value.siteHost;
      if (!title) return `${chamber.value.siteName} | ${host}`;
      if (title.includes(host)) return title;
      return `${title} | ${host}`;
    },
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
