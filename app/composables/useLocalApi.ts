/**
 * $fetch hacia `/api/*` de esta app.
 * En SSR adjunta `chamber` (query + header): el Host del usuario no se
 * reenvía en el fetch interno y sin eso la mini-API elige la cámara default.
 */
export function useLocalApi() {
  const { chamber } = useChamber();
  const requestFetch = useRequestFetch();

  function localFetch<T = unknown>(
    url: string,
    opts?: Parameters<typeof $fetch<T>>[1],
  ): Promise<T> {
    const chamberId = chamber.value.id;
    const prevQuery =
      opts && typeof opts === "object" && opts.query
        ? (opts.query as Record<string, unknown>)
        : {};
    const prevHeaders =
      opts && typeof opts === "object" && opts.headers
        ? (opts.headers as Record<string, string>)
        : {};

    return requestFetch<T>(url, {
      ...opts,
      query: {
        ...prevQuery,
        chamber: chamberId,
      },
      headers: {
        ...prevHeaders,
        "x-chamber": chamberId,
      },
    } as any);
  }

  return { localFetch };
}
