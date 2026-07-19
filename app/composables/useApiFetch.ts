export const useApiFetch: typeof useFetch = (request, opts) => {
  const config = useRuntimeConfig();

  const baseURL = String(
    (config.public as any).apiUrl ||
      (config.public as any).apiBaseUrl ||
      "https://api.argentinadatos.com",
  );

  return useFetch(
    request as any,
    {
      baseURL,
      ...opts,
    } as any,
  );
};
