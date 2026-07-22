import {
  buildChamberAbsoluteUrl,
  buildSiteAbsoluteUrl,
  getChamberConfig,
  getSiteConfig,
  isChamberId,
  otherChamberId,
  parseSiteId,
  resolveSiteFromHost,
  rewritePathForChamber,
  type ChamberConfig,
  type ChamberId,
  type SiteConfig,
  type SiteId,
} from "@/lib/chamber";

/**
 * Sitio activo según Host (runtime) o DEFAULT_CHAMBER (prerender).
 * Local: diputados|senadores|congreso.localhost(.test).
 */
export function useChamber() {
  const config = useRuntimeConfig();
  const route = useRoute();
  const fallbackSite = parseSiteId(config.public.defaultChamber, "senadores");
  const fallbackChamber: ChamberId = isChamberId(fallbackSite)
    ? fallbackSite
    : "senadores";

  const id = useState<SiteId>("site-id", () => fallbackSite);

  // En generate el hostname del crawler no es el de prod: fijar sitio del build.
  if (import.meta.prerender) {
    id.value = fallbackSite;
  } else {
    try {
      const hostname = import.meta.server
        ? useRequestURL().hostname
        : window.location.hostname;
      id.value = resolveSiteFromHost(hostname, fallbackSite);
    } catch {
      id.value = fallbackSite;
    }
  }

  const site = computed<SiteConfig>(() => getSiteConfig(id.value));
  /** Alias de `site` para SEO/brand (incluye congreso). */
  const chamber = site;

  const isDiputados = computed(() => id.value === "diputados");
  const isSenadores = computed(() => id.value === "senadores");
  const isCongreso = computed(() => id.value === "congreso");
  const isLegislative = computed(() => isChamberId(id.value));

  const chamberId = computed<ChamberId>(() =>
    isChamberId(id.value) ? id.value : fallbackChamber,
  );

  const otherId = computed(() => otherChamberId(chamberId.value));
  const otherChamber = computed<ChamberConfig>(() =>
    getChamberConfig(otherId.value),
  );

  function currentLocation() {
    try {
      const url = import.meta.server
        ? useRequestURL()
        : new URL(window.location.href);
      return {
        hostname: url.hostname,
        protocol: url.protocol,
        port: url.port,
      };
    } catch {
      return {
        hostname: getSiteConfig(id.value).siteHost,
        protocol: "https:",
        port: "",
      };
    }
  }

  /** Home de la otra cámara (local ↔ local, prod ↔ prod). */
  const otherChamberUrl = computed(() =>
    buildChamberAbsoluteUrl(otherId.value, {
      ...currentLocation(),
      path: "/",
    }),
  );

  /**
   * Misma ruta en la otra cámara cuando es comparable (/actas, home),
   * o home si el path es específico de esta cámara.
   */
  const otherChamberUrlForCurrentPath = computed(() => {
    const path = route.path;
    const rewritten = rewritePathForChamber(path, otherId.value);
    const targetPath =
      rewritten ||
      (path === "/" || path.startsWith("/actas") ? path : "/");
    return buildChamberAbsoluteUrl(otherId.value, {
      ...currentLocation(),
      path: targetPath,
    });
  });

  /** URL absoluta al home de una cámara (útil desde congreso). */
  function chamberHomeUrl(to: ChamberId) {
    return buildSiteAbsoluteUrl(to, {
      ...currentLocation(),
      path: "/",
    });
  }

  const diputadosUrl = computed(() => chamberHomeUrl("diputados"));
  const senadoresUrl = computed(() => chamberHomeUrl("senadores"));

  return {
    id,
    site,
    chamber,
    chamberId,
    isDiputados,
    isSenadores,
    isCongreso,
    isLegislative,
    otherId,
    otherChamber,
    otherChamberUrl,
    otherChamberUrlForCurrentPath,
    diputadosUrl,
    senadoresUrl,
    chamberHomeUrl,
  };
}
