# AGENTS.md

Instrucciones para agentes que trabajan en este repo.

## Qué es

Una sola app **Nuxt 4 (SSR)** que sirve **Diputados** y **Senadores** según el `Host`. Misma codebase, dos sitios.

| Cámara | Host local | Host prod |
|--------|------------|-----------|
| Diputados | `diputados.localhost:3200` | `diputados.argentinadatos.com` |
| Senadores | `senadores.localhost:3200` | `senadores.argentinadatos.com` |

`*.localhost` suele bastar (sin `/etc/hosts`). Alternativa: `*.localhost.test` (ver `vite.server.allowedHosts` en `nuxt.config.ts`).

## Arranque

```bash
pnpm install
pnpm dev          # :3200 --host
pnpm build        # SSR + ISR
pnpm build:cf     # preset Cloudflare Workers
pnpm preview
pnpm lint
pnpm lint:fix
```

Package manager: **pnpm**.

## Deploy / cache (ISR)

SSR + ISR (`routeRules /** → isr: true`, sin expiración). Primera visita genera; CDN cachea hasta el próximo deploy o revalidación.

**Payload:** las APIs de actas traen todos los `votos` (~64MB en diputados). El data layer **no** serializa esos arrays en listados/home (solo conteos + historial slim). Si ves `413 CONTENT_TOO_LARGE` o CF `Error 1102`, algo volvió a meter actas con `votos` en el HTML.

### Cloudflare Workers (recomendado)

```bash
pnpm build:cf   # NITRO_PRESET=cloudflare_module
npx wrangler deploy
```

Nitro genera el worker en `.output/server`. En el plan free, el cold start de diputados puede pegar el techo de CPU/RAM al parsear actas; plan pago o cache caliente ayuda. Un redeploy limpia ISR.

### Vercel

Env: `NUXT_REVALIDATE_SECRET` y `VERCEL_BYPASS_TOKEN` (mismo valor).

**Importante:** no subir un `vercel.json` con miles de redirects (límite 2048 routes). Los redirects legacy nombre→id van por `server/middleware/legacy-seo.ts`.

```bash
curl -X POST https://senadores.argentinadatos.com/api/revalidate \
  -H "Authorization: Bearer $NUXT_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"chamber":"all"}'
```

`generate` / `generate:*` solo para experimentos estáticos; prod = `nuxt build` / `build:cf`.

## Reglas duras

1. **No unificar paths entre cámaras.** Conservar `/diputados`, `/diputados/bloques`, `/senadores`, `/senadores/partidos`, `/actas`. El middleware solo *reescribe* rutas de la cámara equivocada.
2. **Cámara = Host**, no un flag de usuario. Entrypoint: `app/lib/chamber.ts` + `useChamber()` + `middleware/chamber.global.ts`.
3. **Datos separados.** No mezclar tipos ni caches:
   - Diputados → `app/lib/diputados-data.ts` + `types-diputados.ts` → API `/v1/diputados/`
   - Senadores → `app/lib/senadores-data.ts` + `types.ts` → API `/v1/senado/`
4. **UI compartida sí; dominio no.** `HemicicloChart`, filtros, tablas genéricas: OK. Labels/rutas/agrupación: por cámara (`bloque` ≠ `partido`).
5. **Estado de filtros en la URL** (`useRouteQuery` / `useMultiQuery`). No inventar stores para vistas listado.
6. Cambios de UI: preferir **Nuxt UI v4** + Tailwind ya configurados (`app.config.ts`).

## Mapa del código

```
app/
  pages/                 # rutas (diputados/*, senadores/*, actas wrappers)
  components/
    chamber/             # homes por cámara
    actas/               # listado/detalle actas por cámara
    Diputado* Senador*   # dominio
    HemicicloChart.vue   # hemiciclo compartido
  composables/           # useChamber, useMultiQuery, useTableSorting, useApiFetch
  lib/                   # chamber, *-data, types, utils
  utils/                 # bloque, partido, group*, votoTipo, presentismo
  middleware/            # chamber.global.ts
  plugins/               # chamber-seo.ts
server/
  api/revalidate.post.ts           # purge ISR (Vercel)
  middleware/legacy-seo.ts         # redirects SEO + nombre→id
  assets/legacy-senador-redirects.json  # mapa generado en prepare/build
```

`nuxt.config.ts` usa `appDir: "app"`.

### Rutas

| Path | Notas |
|------|--------|
| `/`, `/actas`, `/actas/[id]` | Wrappers: eligen componente diputados vs senadores vía `useChamber()` |
| `/diputados`, `/diputados/[id]` | Solo host diputados (si no, redirect) |
| `/diputados/bloques`, `/diputados/bloques/[slug]` | Agrupación = **bloque** |
| `/senadores`, `/senadores/[id]` | Solo host senadores |
| `/senadores/partidos`, `/senadores/partidos/[slug]` | Agrupación = **partido** |

### Dominio: diferencias que importan

| | Diputados | Senadores |
|---|-----------|-----------|
| Miembros | ~257 | ~72 |
| Grupo político | `bloque` | `partido` |
| Género en API | sí | no |
| Votos raw | afirmativo/negativo/… | `si`/`no` → normalizar en data layer |

Matching voto↔persona: slug del nombre; diputados tiene lista de aliases en `diputados-data.ts`.

## Dónde tocar qué

| Quiero… | Empiezo en… |
|---------|-------------|
| Cambiar brand/nav/footer/SEO por cámara | `lib/chamber.ts`, `AppNavbar`, `AppFooter`, `plugins/chamber-seo.ts` |
| Nueva página de miembros | `pages/diputados/*` o `pages/senadores/*` (no “genérica” que rompa URLs) |
| Home o actas distintas por cámara | `components/chamber/*`, `components/actas/*` + wrapper en `pages/` |
| Lógica de API / stats | `lib/*-data.ts`, `lib/utils.ts` |
| Hemiciclo / hover grupos | `HemicicloChart.vue` (+ wrappers `DiputadosChart` / `SenadoresChart`) |
| Colores de voto/resultado | `utils/votoTipo.ts`, badges existentes |

## Convenciones de código

- SFC: `<script>` → `<template>` → `<style>` (ESLint).
- `any` permitido (`no-explicit-any` off).
- Formato: Prettier vía ESLint.
- Prefijos de componentes por dominio (`Diputado*`, `Senador*`, `Acta*`).
- Auto-imports de `utils/`: evitar exports con el **mismo nombre** en dos archivos (rompe el auto-import). Helpers compartidos → un solo módulo (ej. `presentismo.ts`).

## Smoke rápido

```bash
curl -sI -H 'Host: diputados.localhost' http://127.0.0.1:3200/
curl -sI -H 'Host: senadores.localhost' http://127.0.0.1:3200/
# Cross-chamber debe 302:
curl -sI -H 'Host: diputados.localhost' http://127.0.0.1:3200/senadores
```
