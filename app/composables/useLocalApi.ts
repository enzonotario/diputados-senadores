/**
 * $fetch hacia `/api/*` de esta app (mini-API Nitro).
 *
 * - Por defecto: same-origin (`/api/...`).
 * - Con `NUXT_PUBLIC_APP_API_BASE_URL`: absolute URL a esa base.
 *
 * En SSR adjunta `chamber` (query + header): el Host del usuario no se
 * reenvía en el fetch interno y sin eso la mini-API elige la cámara default.
 */
export function useLocalApi() {
  const { chamberId } = useChamber();
  const config = useRuntimeConfig();
  const requestFetch = useRequestFetch();

  const appApiBase = String(
    (config.public as { appApiBaseUrl?: string }).appApiBaseUrl || "",
  ).replace(/\/$/, "");

  function localFetch<T = unknown>(
    url: string,
    opts?: Parameters<typeof $fetch<T>>[1],
  ): Promise<T> {
    const chamber = chamberId.value;
    const prevQuery =
      opts && typeof opts === "object" && opts.query
        ? (opts.query as Record<string, unknown>)
        : {};
    const prevHeaders =
      opts && typeof opts === "object" && opts.headers
        ? (opts.headers as Record<string, string>)
        : {};

    const path = url.startsWith("/") ? url : `/${url}`;
    const target = appApiBase ? `${appApiBase}${path}` : path;
    // Absolute URL → $fetch directo (no reescribe al origen del request SSR).
    const fetcher = appApiBase ? $fetch : requestFetch;

    return fetcher<T>(target, {
      ...opts,
      query: {
        ...prevQuery,
        chamber,
      },
      headers: {
        ...prevHeaders,
        "x-chamber": chamber,
      },
    } as any);
  }

  return { localFetch };
}
