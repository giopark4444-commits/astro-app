# Despliegue — Aluna web (Next.js 15)

Runbook para desplegar `apps/web` (Next.js 15, App Router) desde el monorepo
pnpm + Turborepo. Cubre el target **recomendado** (servidor Node de larga vida vía
Docker) y la **alternativa** (Vercel/serverless). Termina con una checklist de
verificación post-deploy.

> Este documento describe la configuración. **Nadie ha desplegado todavía** (no hay
> cuentas conectadas). Todo lo marcado **[VERIFICAR EN EL PRIMER DEPLOY]** debe
> comprobarse la primera vez contra la plataforma real.

---

## 1. Por qué un servidor Node, no serverless puro

Las rutas API de cómputo (`/api/chart`, `/api/bazi`, `/api/synastry`, `/api/scores`,
`/api/chat`) corren con `runtime = "nodejs"` y usan **`@aluna/ephemeris`**, que carga:

1. el **addon nativo `sweph`** — un binario `.node` cargado con
   `node-gyp-build(__dirname)` (necesita un `__dirname` real en disco), y
2. los **archivos de datos Swiss Ephemeris** `packages/ephemeris/ephe/*.se1`
   (~1.9 MB), localizados en runtime con
   `setEphePath(process.cwd()/../../packages/ephemeris/ephe)`.

En `next.config.ts`, `sweph` está en `serverExternalPackages`, así que **Next no lo
empaqueta ni lo traza**. En un target **serverless puro**, el `.node` se quedaría
fuera de la función → la ruta fallaría en runtime. Por eso:

- **Recomendado:** un **contenedor / servidor Node de larga vida** (Render, Railway,
  Fly.io, o un VPS) que lleva `node_modules` COMPLETO (con el prebuild linux de
  `sweph`) y conserva el árbol del monorepo. Ahí el addon y los `.se1` resuelven
  solos, sin trucos. **Es el camino de este repo (Dockerfile + render.yaml).**
- **Alternativa (Vercel):** posible, con `outputFileTracingIncludes` ya añadido para
  forzar el `.node` dentro de la función — pero **frágil** y a verificar (§6).

Dato a favor del contenedor: `sweph@2.10.3-5` publica **prebuilds N-API** para
`linux-x64` y `linux-arm64`, así que la imagen **no necesita toolchain de C/C++**:
`node-gyp-build` carga el `.node` prebuilt. (Los prebuilds son **glibc** → usar una
base Debian/Ubuntu, **no Alpine/musl**.)

---

## 2. Prerrequisitos

| Requisito | Detalle |
|---|---|
| Node | **≥ 20** (la imagen usa `node:20-bookworm-slim`). |
| pnpm | **9.7.0** (campo `packageManager` del repo; la imagen lo activa con corepack). |
| Proyecto Supabase | Ya existe (`aluna`, ref `xcilrdpcanielalpfvld`). Necesitas su **URL**, la **anon/publishable key** y la **service_role key**. |
| Cuenta de despliegue | Render / Railway / Fly.io / VPS con Docker. (O Vercel para la alternativa.) |
| Llave de IA (opcional) | UNA de Anthropic / OpenAI / Gemini, para activar las lecturas largas. Sin ella el app funciona (cae a la "Esencia" escrita a mano). |
| Docker (build local opcional) | Para construir/probar la imagen antes de subirla. |

---

## 3. Variables de entorno

Copiar `.env.example` (raíz) a `.env.local` para desarrollo; en producción se definen
como variables de entorno de la plataforma. **Ningún secreto se versiona.**

| Variable | Dónde obtenerla | ¿Requerida? | Para qué |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | **Sí** | Cliente y servidor Supabase (auth SSR, lectura de perfiles con RLS). Pública. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon` / Publishable key | **Sí** | Cliente público/anon (respeta RLS). Pública. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` (**secreta**) | Opcional | Caché **durable** de lecturas IA (`public.reading_cache`). Sin ella → caché en memoria por proceso (se regenera en cada reinicio = más coste de IA). **Solo servidor; nunca al cliente.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Opcional* | Lecturas IA (Profunda/Completa) y chat "Pregúntale a Aluna" vía Claude. |
| `OPENAI_API_KEY` | platform.openai.com | Opcional* | Mismo rol, proveedor OpenAI. |
| `GEMINI_API_KEY` (o `GOOGLE_API_KEY`) | aistudio.google.com | Opcional* | Mismo rol, proveedor Gemini. |
| `READING_PROVIDER` | — (valor: `anthropic`\|`openai`\|`gemini`) | Opcional | Fuerza el proveedor. Sin él, usa el **primero con llave** en orden `anthropic > openai > gemini`. |
| `ANTHROPIC_READING_MODEL` | — | Opcional | Sobrescribe el modelo (default `claude-opus-4-8`). |
| `OPENAI_READING_MODEL` | — | Opcional | Default `gpt-4o`. |
| `GEMINI_READING_MODEL` | — | Opcional | Default `gemini-1.5-pro`. |
| `NODE_ENV` | — (`production`) | Recomendada | La fija el Dockerfile/render.yaml. |
| `NEXT_TELEMETRY_DISABLED` | — (`1`) | Opcional | Desactiva la telemetría de Next. |
| `PORT` | — | Auto | La plataforma la inyecta; `next start` la respeta (default 3000). |

\* **Opcional pero relacionada:** sin **ninguna** de las tres llaves de IA, las
lecturas largas quedan **latentes** y el cliente muestra la "Esencia" escrita a mano.
Con poner UNA, se activan. (El geocoding usa Open‑Meteo y **no** requiere llave.)

> El cómputo de cartas (Swiss Ephemeris) **no** necesita ninguna llave: corre local en
> el servidor. Las llaves solo activan la capa de IA y el caché durable.

---

## 4. Aplicar las migraciones de Supabase

El esquema ya está aplicado al proyecto `aluna` en vivo. Para un entorno nuevo
(o para reproducirlo), aplicar **en orden** los archivos de `supabase/migrations/`:

1. `0001_core_schema.sql` — tablas (`profiles_user`, `settings`, `birth_profiles`,
   `charts`) + trigger `handle_new_user`.
2. `0002_rls_policies.sql` — RLS + políticas (aislamiento por usuario).
3. `0003_secure_trigger_function.sql` — revoca `EXECUTE` público de la función del
   trigger (cierra el hallazgo del advisor de seguridad).
4. `0004_reading_cache.sql` — tabla `public.reading_cache` (caché durable de lecturas
   IA; la "palanca de costo").

Vía **Supabase CLI**:

```bash
# Enlazar el proyecto una vez (necesita el ref del proyecto):
supabase link --project-ref xcilrdpcanielalpfvld
# Aplicar las migraciones pendientes:
supabase db push
```

O pegar cada `.sql` en el **SQL Editor** del panel, en orden.

Tras aplicar, comprobar en Supabase → Advisors que **no hay hallazgos** de seguridad,
y que RLS está activo en las 4 tablas.

> Si regeneras tipos (`supabase gen types typescript`), revisa que cada tabla conserve
> `Relationships: [...]` o `SupabaseClient<Database>` colapsa a `never`. (Detalle en
> `supabase/README.md`.)

---

## 5. Camino recomendado — Docker / servidor Node

### 5.1 Construir y probar la imagen localmente (opcional)

```bash
# Desde la raíz del repo:
docker build -t aluna-web .

# Arrancar (sin llaves: el app levanta, las funciones de IA quedan latentes):
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-o-publishable> \
  aluna-web
# → http://localhost:3000
```

El `Dockerfile` (multi-stage):
- **builder:** instala todo con `pnpm install --frozen-lockfile` (trae los prebuilds
  de `sweph`) y corre `pnpm --filter @aluna/web build`.
- **runner:** copia el árbol COMPLETO ya construido (node_modules + `.next` +
  `packages/ephemeris/ephe`), arranca como usuario sin privilegios con
  **`WORKDIR=/app/apps/web`** y `pnpm start` (`next start`). Ese cwd es lo que hace
  que `process.cwd()/../../packages/ephemeris/ephe` resuelva los `.se1`.

> **Por qué no se poda `node_modules` en el runner:** los paquetes `@aluna/*` se
> consumen como **fuente TypeScript** (`transpilePackages`), no como `dist`. Podar a
> prod (p.ej. `pnpm deploy`) puede romper la cadena de transpile y/o la ruta relativa
> a `ephe`. Se prioriza **correctitud** sobre tamaño de imagen. (Optimización futura
> posible, pero a verificar con cuidado.)

### 5.2 Render (con `render.yaml`)

1. Subir el repo a GitHub (ya es privado).
2. En Render → **New → Blueprint**, apuntar al repo. Render lee `render.yaml`
   (servicio `aluna-web`, `runtime: docker`).
3. En el dashboard del servicio, definir los env vars marcados `sync: false`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y opcionalmente
   `SUPABASE_SERVICE_ROLE_KEY` + una llave de IA.
4. Deploy. Render construye con el `Dockerfile` y sirve en `$PORT`.
   - `plan: starter` evita el "sleep" del plan free (cold starts).
   - `healthCheckPath: /` (la home responde sin sesión).

### 5.3 Railway / Fly.io / VPS

Mismo principio: build con el `Dockerfile`, exponer `$PORT` (Fly: `internal_port`),
definir los env vars como secretos. En un VPS: `docker build` + `docker run` con
`--env-file` (un archivo de entorno **fuera de git**) y un reverse proxy (Caddy/Nginx)
para TLS.

### 5.4 Alternativa SIN Docker en Render (runtime: node)

Si se prefiere el runtime nativo de Node de Render (no Docker):
- **Root Directory:** raíz del repo.
- **Build Command:**
  `corepack enable && corepack prepare pnpm@9.7.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @aluna/web build`
- **Start Command (cwd = raíz):** `pnpm --filter @aluna/web start`
  - ⚠️ **[VERIFICAR EN EL PRIMER DEPLOY]** que el cwd efectivo permita resolver
    `process.cwd()/../../packages/ephemeris/ephe`. `next start` vía
    `--filter @aluna/web` corre con cwd = `apps/web` → resuelve. Si la plataforma
    cambia el cwd, ajustar a `cd apps/web && pnpm start`.
  - ⚠️ Verificar que el builder de Render trae el prebuild **linux** de `sweph`
    (lo hace `pnpm install` en su imagen linux). El **Docker es preferible** porque
    fija Node 20 + glibc + el cwd de forma determinista.

---

## 6. Alternativa — Vercel (serverless) · frágil, a verificar

Vercel es viable pero **no es el camino recomendado** por el addon nativo. Estado:

- `next.config.ts` ya incluye `outputFileTracingIncludes` que fuerza el `.node`
  prebuilt de `sweph` dentro del trace de cada ruta de motor
  (`/api/chart`, `/api/bazi`, `/api/synastry`, `/api/scores`, `/api/chat`).
  **Verificado en build local:** el prebuild `linux-x64`/`linux-arm64` aparece en el
  `.nft.json` de las rutas. Los `.se1` ya los traza Next automáticamente.
- Pasos: importar el repo en Vercel, **Root Directory = `apps/web`**, framework Next.js
  (autodetectado), definir los mismos env vars.

**[VERIFICAR EN EL PRIMER DEPLOY]** — caveats que SOLO se confirman ejecutando:
1. Que el `.node` incluido **carga** en el runtime de Vercel:
   `node-gyp-build(__dirname)` necesita un `__dirname` real; si el bundling de la
   función altera la estructura, puede fallar con "Cannot find module" del prebuild.
2. Que la **ruta relativa** `process.cwd()/../../packages/ephemeris/ephe` resuelve en
   el sandbox de la función (el cwd de las funciones de Vercel **no** es el root del
   monorepo). Es muy probable que **NO** resuelva tal cual → habría que ajustar el
   `setEphePath` (no incluido aquí; fuera de alcance de este runbook) o, mejor, usar
   el contenedor.
3. El **tamaño** de la función (los `.se1` ~1.9 MB + el `.node` ~0.9 MB) bajo el
   límite de Vercel.

> Conclusión práctica: si el equipo quiere robustez sin depurar el sandbox serverless,
> **usar el contenedor/servidor Node**. La ruta Vercel queda documentada y pre-cableada,
> pero su viabilidad depende de estas verificaciones.

---

## 7. Checklist de verificación post-deploy

Marcar tras el **primer** deploy real (la mayoría no se puede comprobar sin la
plataforma viva):

### Arranque y salud
- [ ] El servicio levanta y `GET /` responde 200 **[VERIFICAR EN EL PRIMER DEPLOY]**.
- [ ] No hay errores de arranque en los logs (especialmente nada de `sweph` /
      `node-gyp-build` / "Cannot find module").

### Auth (Supabase SSR)
- [ ] `/signup` crea una cuenta; el trigger `handle_new_user` crea su
      `profiles_user` + `settings` (verlo en Supabase).
- [ ] `/login` inicia sesión; la sesión persiste entre páginas (cookies SSR +
      middleware funcionando).
- [ ] Un usuario **no** ve datos de otro (RLS) — probar con dos cuentas.

### Cómputo de carta (la parte nativa — la clave)
- [ ] Completar onboarding (perfil de nacimiento) y abrir **`/carta`**: la rueda se
      dibuja → `POST /api/chart` devolvió una carta. **Esto confirma que el addon
      nativo `sweph` cargó y que los `.se1` resolvieron.** **[VERIFICAR EN EL PRIMER
      DEPLOY — es el riesgo principal.]**
- [ ] **`/hoy`** ("Tu Clima") carga (tránsitos) — usa el mismo motor.
- [ ] **`/pilares`** (Ba Zi/Saju) calcula → `POST /api/bazi` OK.
- [ ] **`/compatibilidad`** (sinastría) calcula → `POST /api/synastry` OK.

### Lecturas IA (latentes sin llave)
- [ ] **Sin** llave de IA: los niveles Profunda/Completa muestran la **"Esencia"**
      escrita a mano y **no** hay error (camino latente correcto).
- [ ] **Con** una llave de IA: una lectura larga (numerología) y el chat
      "Pregúntale a Aluna" (`/preguntar`) devuelven texto del modelo (stream).
- [ ] Con `SUPABASE_SERVICE_ROLE_KEY`: una segunda petición de la **misma** lectura
      vuelve del **caché** (`public.reading_cache` con filas; no se vuelve a pagar al
      modelo). Sin la service-role, el caché es solo en memoria (se pierde al
      reiniciar).

### i18n y temas
- [ ] El cambio ES/EN funciona (next-intl).
- [ ] Los temas / modo luz se aplican y persisten (`settings`).

---

## 8. Notas de licencia (antes del lanzamiento comercial)

- **Swiss Ephemeris** (`sweph` + los `.se1`) es **dual-licencia: AGPL o profesional**.
  Para un lanzamiento comercial de código cerrado se debe **adquirir la licencia
  profesional de Astrodienst antes de publicar**. Los archivos de datos `.se1` son de
  libre distribución, pero el uso de la librería en un producto cerrado **no** lo es
  bajo AGPL.
- Revisar también los términos de uso del proveedor de IA elegido (Anthropic / OpenAI
  / Gemini) y de Supabase para el plan de producción.
