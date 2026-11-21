import { getOgHemicicloPhotosPng } from "../utils/og-hemiciclo-photos";

/**
 * During prerender, nuxt-og-image does not call dynamic routes for relative
 * `<img src>`: it only looks them up in the public-dir storage, then rewrites
 * them to `http://localhost/...`, which its SSRF guard blocks. So the home OG
 * (`/api/og/hemiciclo/:chamber`) silently rendered without the hemiciclo.
 *
 * Before any `/_og/*` prerender request, render the composite once and seed
 * it into that storage under the exact key the image transformer reads
 * (`<publicStoragePath>:api:og:hemiciclo:<chamber>`), backed by memory so no
 * file is written to `public/`. Runtime is unaffected (relative src there is
 * fetched through Nitro as usual).
 */
/** Minimal in-memory unstorage driver (unstorage isn't a direct dep). */
function memoryDriver() {
  const data = new Map<string, unknown>();
  return {
    name: "og-prerender-memory",
    hasItem: (key: string) => data.has(key),
    getItem: (key: string) => (data.get(key) ?? null) as any,
    getItemRaw: (key: string) => (data.get(key) ?? null) as any,
    setItem: (key: string, value: unknown) => void data.set(key, value),
    setItemRaw: (key: string, value: unknown) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    getKeys: () => [...data.keys()],
    clear: () => data.clear(),
  };
}

export default defineNitroPlugin((nitroApp) => {
  if (!import.meta.prerender) return;

  let seeded: Promise<void> | null = null;

  const seed = async () => {
    const config = useRuntimeConfig() as Record<string, any>;
    const chamber = config.public?.defaultChamber;
    if (chamber !== "diputados" && chamber !== "senadores") return;
    const base = config["nuxt-og-image"]?.publicStoragePath;
    if (!base) return;
    const mountKey = `${base}:api:og:hemiciclo`;
    const storage = useStorage();
    storage.mount(mountKey, memoryDriver());
    const png = await getOgHemicicloPhotosPng(chamber);
    if (png) await storage.setItemRaw(`${mountKey}:${chamber}`, png);
    console.info(
      `[og] prerender hemiciclo seeded for ${chamber}: ${png ? `${png.length} B` : "none"}`,
    );
  };

  nitroApp.hooks.hook("request", async (event) => {
    if (!event.path.startsWith("/_og/")) return;
    seeded ||= seed().catch((err) => {
      console.warn(
        "[og] prerender hemiciclo seed failed:",
        err?.message || err,
      );
    });
    await seeded;
  });
});
