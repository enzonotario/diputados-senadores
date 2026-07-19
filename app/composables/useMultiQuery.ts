import { useRouteQuery } from "@vueuse/router";

/**
 * Query param multi-valor: ?provincia=Salta,Jujuy ↔ string[]
 */
export function useMultiQuery(key: string) {
  return useRouteQuery(key, [] as string[], {
    transform: {
      get: (raw) => {
        if (raw == null || raw === "") return [];
        if (Array.isArray(raw)) {
          return raw.flatMap((v) => String(v).split(",")).map((s) => s.trim()).filter(Boolean);
        }
        return String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      },
      set: (value: string[]) =>
        value?.length ? value.join(",") : null,
    },
  });
}
