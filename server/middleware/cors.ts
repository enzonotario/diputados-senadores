/**
 * CORS para `/api/*` (opt-in vía `NUXT_CORS_ORIGINS`, comma-separated).
 * - `*` → refleja cualquier Origin
 * - `https://ejemplo.com` → exacto
 * - `.ejemplo.com` → sufijo
 */
function parseOriginRules(raw: string): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function originAllowed(origin: string, rules: string[]): boolean {
  if (rules.includes("*")) return true;
  for (const rule of rules) {
    if (rule.startsWith(".") && origin.endsWith(rule)) return true;
    if (origin === rule) return true;
  }
  return false;
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api")) return;

  const config = useRuntimeConfig();
  const rules = parseOriginRules(String(config.corsOrigins || ""));
  if (!rules.length) return;

  const origin = getRequestHeader(event, "origin");
  if (!origin || !originAllowed(origin, rules)) return;

  setResponseHeader(event, "Access-Control-Allow-Origin", origin);
  setResponseHeader(event, "Access-Control-Allow-Credentials", "true");
  setResponseHeader(
    event,
    "Access-Control-Allow-Methods",
    "GET,HEAD,POST,OPTIONS",
  );
  setResponseHeader(
    event,
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-chamber",
  );
  setResponseHeader(event, "Access-Control-Max-Age", "86400");
  appendResponseHeader(event, "Vary", "Origin");

  if (getMethod(event) === "OPTIONS") {
    setResponseStatus(event, 204);
    return "";
  }
});
