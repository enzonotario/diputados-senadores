/** Healthcheck Coolify / Docker / load balancer. */
export default defineEventHandler(() => ({
  ok: true,
  service: "diputados-senadores",
  ts: new Date().toISOString(),
}));
