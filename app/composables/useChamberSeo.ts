import { buildChamberOgProps, type ChamberOgInput } from "@/lib/og";

export type ChamberSeoInput = {
  /** Título corto de la página (sin host). */
  title: string;
  description: string;
  /** Props de la tarjeta OG Takumi (`Chamber.takumi`). */
  og?: ChamberOgInput;
};

/**
 * SEO por cámara + OG dinámica con Nuxt OG Image / Takumi.
 *
 * @see https://takumi.kane.tw/docs/integration/nuxt
 *
 * Importante: no pasar un getter a `useSeoMeta(() => …)` — Unhead 2 destruye
 * el argumento y `title` queda undefined.
 *
 * X/Twitter: la tarjeta Takumi ya lleva título/descripción en la imagen.
 * X pinta `og:title` encima → usamos ZWSP en og/twitter title para que la
 * card se vea como imagen, no como banner con texto duplicado.
 */
const OG_TITLE_ZWSP = "\u200B";

export function useChamberSeo(input: MaybeRefOrGetter<ChamberSeoInput>) {
  const { chamber } = useChamber();
  const requestURL = useRequestURL();

  const seo = computed(() => {
    const value = toValue(input);
    const pageTitle = (value.title || "").trim() || chamber.value.siteName;
    const description = (value.description || "").trim();
    return {
      pageTitle,
      fullTitle: `${pageTitle} | ${chamber.value.siteHost}`,
      description,
      imageAlt: description ? `${pageTitle} — ${description}` : pageTitle,
      og: value.og,
    };
  });

  const pageUrl = computed(() => {
    // Host canónico de la cámara (prod); path del request actual.
    try {
      return new URL(
        requestURL.pathname + requestURL.search,
        chamber.value.siteUrl,
      ).href;
    } catch {
      return chamber.value.siteUrl;
    }
  });

  useHead(() => ({
    title: seo.value.fullTitle,
    titleTemplate: "%s",
    meta: [
      { name: "description", content: seo.value.description },
      // Open Graph: título invisible (imagen lleva el copy); description sí.
      // tagPriority alto: Nuxt SEO / Unhead suelen rellenar og:title desde <title>.
      {
        property: "og:title",
        content: OG_TITLE_ZWSP,
        tagPriority: 10,
      },
      { property: "og:description", content: seo.value.description },
      { property: "og:url", content: pageUrl.value },
      { property: "og:image:alt", content: seo.value.imageAlt },
      // X / Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@enzonotario_" },
      { name: "twitter:creator", content: "@enzonotario_" },
      {
        name: "twitter:title",
        content: OG_TITLE_ZWSP,
        tagPriority: 10,
      },
      { name: "twitter:description", content: seo.value.description },
      { name: "twitter:image:alt", content: seo.value.imageAlt },
    ],
  }));

  // Takumi via Nuxt OG Image — defineOgImage setea og:image / twitter:image.
  // Props compartidas con el patch server de actas prerenderizadas (`?vista=`).
  const buildId = useRuntimeConfig().app.buildId;
  const ogProps = computed(() =>
    buildChamberOgProps({
      pageTitle: seo.value.pageTitle,
      description: seo.value.description,
      site: chamber.value,
      og: seo.value.og,
      rev: buildId,
    }),
  );
  const prop = (key: string) => computed(() => ogProps.value[key] || "");
  defineOgImage("Chamber.takumi", {
    title: prop("title"),
    description: prop("description"),
    brand: prop("brand"),
    logoSrc: prop("logoSrc"),
    eyebrow: prop("eyebrow"),
    badge: prop("badge"),
    accent: prop("accent"),
    footerLeft: prop("footerLeft"),
    kind: prop("kind"),
    votes: prop("votes"),
    photoSrc: prop("photoSrc"),
    hemiciclo: prop("hemiciclo"),
    chamber: prop("chamber"),
    vista: prop("vista"),
    breakdown: prop("breakdown"),
    group: prop("group"),
    summary: prop("summary"),
    poroteo: prop("poroteo"),
    rev: prop("rev"),
  });
}
