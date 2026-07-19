import { CHAMBERS, type ChamberId } from "./app/lib/chamber";

const defaultChamber: ChamberId =
  (process.env.NUXT_PUBLIC_DEFAULT_CHAMBER as ChamberId) || "senadores";
const chamberSite = CHAMBERS[defaultChamber];

/** Entrypoints de la cámara del build; las dinámicas las aporta prerenderRoutes. */
const chamberPrerenderRoutes =
  defaultChamber === "diputados"
    ? ["/", "/actas", "/diputados", "/diputados/bloques"]
    : ["/", "/actas", "/senadores", "/senadores/partidos"];

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // SSG: HTML en build (`nuxt generate`). Un generate por cámara (DEFAULT_CHAMBER).
  ssr: true,
  nitro: {
    preset: "static",
    compressPublicAssets: true,
    minify: true,
    prerender: {
      crawlLinks: true,
      routes: [...chamberPrerenderRoutes, "/sitemap.xml"],
      ignore:
        defaultChamber === "diputados"
          ? ["/senadores", "/senadores/**"]
          : ["/diputados", "/diputados/**"],
    },
  },

  routeRules: {
    "/**": { prerender: true },
  },

  build: {
    transpile: ["vue"],
  },

  appDir: "app",

  modules: [
    "@nuxt/ui",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxtjs/sitemap",
    "@nuxt/eslint",
    "nuxt-gtag",
    "nuxt-echarts",
  ],

  echarts: {
    renderer: "canvas",
    charts: [
      "LineChart",
      "BarChart",
      "PieChart",
      "HeatmapChart",
      "SankeyChart",
      "GraphChart",
    ],
    components: [
      "GridComponent",
      "TooltipComponent",
      "LegendComponent",
      "DataZoomComponent",
      "ToolboxComponent",
      "DatasetComponent",
      "TitleComponent",
      "VisualMapComponent",
    ],
    features: ["LabelLayout", "UniversalTransition"],
  },

  sitemap: {
    enabled: true,
    sitemapName: "sitemap.xml",
  },

  site: {
    url: chamberSite.siteUrl,
    name: chamberSite.siteName,
    description: chamberSite.siteDescription,
  },

  ui: {
    theme: {
      defaultVariants: {
        color: "neutral",
      },
      colors: [
        "primary",
        "secondary",
        "success",
        "info",
        "warning",
        "error",
        "neutral",
      ],
    },
  },

  colorMode: {
    preference: "light",
    fallback: "light",
    storage: "cookie",
    globalName: "__NUXT_COLOR_MODE__",
    componentName: "ColorScheme",
    classPrefix: "",
    classSuffix: "",
    storageKey: "nuxt-color-mode",
  },

  css: ["@/assets/css/main.css"],

  vite: {
    server: {
      // Subdominios locales para elegir cámara por Host
      allowedHosts: [
        ".localhost",
        ".localhost.test",
        "diputados.localhost.test",
        "senadores.localhost.test",
      ],
    },
  },

  image: {
    domains: [
      "api.argentinadatos.com",
      "www.senadores.gob.ar",
      "www.diputados.gob.ar",
    ],
    format: ["avif", "webp"],
    quality: 80,
  },

  runtimeConfig: {
    public: {
      defaultChamber,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || chamberSite.siteUrl,
      siteUrl: chamberSite.siteUrl,
      siteName: chamberSite.siteName,
      siteDescription: chamberSite.siteDescription,
      apiUrl:
        process.env.NUXT_PUBLIC_API_URL ||
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "es",
      },
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "Votaciones | argentinadatos.com",
      meta: [
        {
          name: "description",
          content:
            "Explora y analiza las votaciones del Congreso de la Nación Argentina.",
        },
        { name: "author", content: "Argentina Datos" },
        { name: "format-detection", content: "telephone=no" },
        { name: "theme-color", content: "#000000" },
        { name: "msapplication-TileColor", content: "#000000" },
        { name: "robots", content: "index, follow" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "es_AR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:creator", content: "@enzonotario_" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.ico" },
        { rel: "preconnect", href: "https://api.argentinadatos.com" },
        { rel: "dns-prefetch", href: "https://api.argentinadatos.com" },
        { rel: "preconnect", href: "https://www.googletagmanager.com" },
        { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      ],
    },
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GTAG_ID || "G-F4L9NTC3WW",
  },
});