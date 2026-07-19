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
pnpm build        # SSR + ISR (Vercel); no usar generate en prod
pnpm preview
pnpm lint
pnpm lint:fix
```

Package manager: **pnpm**.

## Deploy / cache (ISR)

En Vercel: **SSR + ISR** (`routeRules /** → isr` sin expiración). La página se genera en el primer hit y queda cacheada en CDN hasta el próximo deploy o revalidación manual.

Env requerido en el proyecto Vercel (mismo valor en ambos):

- `NUXT_REVALIDATE_SECRET` — secreto para el endpoint
- `VERCEL_BYPASS_TOKEN` — mismo valor (Nitro lo usa como `bypassToken` de Vercel)

Forzar refresh cuando haya movimiento en las cámaras:

```bash
# Seeds (home, actas, listados) en ambos hosts
curl -X POST https://senadores.argentinadatos.com/api/revalidate \
  -H "Authorization: Bearer $NUXT_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"chamber":"all"}'

# Una ruta puntual (repetir por host si hace falta)
curl -X POST https://senadores.argentinadatos.com/api/revalidate \
  -H "Authorization: Bearer $NUXT_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/actas/1234"],"hosts":["https://senadores.argentinadatos.com"]}'
```

`generate` / `generate:*` quedan solo para experimentos estáticos locales; el build de prod es `nuxt build`.

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
  api/revalidate.post.ts # purge ISR on-demand (secret)
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
