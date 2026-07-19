import {
  buildChamberAbsoluteUrl,
  getChamberConfig,
  otherChamberId,
  resolveChamberFromHost,
  rewritePathForChamber,
  type ChamberConfig,
  type ChamberId,
} from "@/lib/chamber";

/**
 * Cámara activa según Host (runtime) o DEFAULT_CHAMBER (prerender/SSG).
 * Local: diputados.localhost.test / senadores.localhost.test (o *.localhost).
 */
export function useChamber() {
  const config = useRuntimeConfig();
  const route = useRoute();
  const fallback = (config.public.defaultChamber as ChamberId) || "senadores";

  const id = useState<ChamberId>("chamber-id", () => fallback);

  // En generate el hostname del crawler no es el de prod: fijar cámara del build.
  if (import.meta.prerender) {
    id.value = fallback;
  } else {
    try {
      const hostname = import.meta.server
        ? useRequestURL().hostname
        : window.location.hostname;
      id.value = resolveChamberFromHost(hostname, fallback);
    } catch {
      id.value = fallback;
    }
  }

  const chamber = computed<ChamberConfig>(() => getChamberConfig(id.value));
  const isDiputados = computed(() => id.value === "diputados");
  const isSenadores = computed(() => id.value === "senadores");

  const otherId = computed(() => otherChamberId(id.value));
  const otherChamber = computed(() => getChamberConfig(otherId.value));

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
        hostname: getChamberConfig(id.value).siteHost,
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

  return {
    id,
    chamber,
    isDiputados,
    isSenadores,
    otherId,
    otherChamber,
    otherChamberUrl,
    otherChamberUrlForCurrentPath,
  };
}
