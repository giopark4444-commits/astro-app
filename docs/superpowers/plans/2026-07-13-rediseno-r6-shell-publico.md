# R6 — Piso de calidad + shell público: plan de implementación

> **Para ejecutores:** SUB-SKILL: subagent-driven-development. Cada tarea con su entregable verificable.

**Goal:** cerrar los huecos de "app de juguete" antes del primer usuario real: anti-FOUC de tema, favicon/OG/metadata, páginas 404/500 con alma, robots, y un par de pulidos (fecha con locale).

**Arquitectura:** todo sigue el sistema existente (R3 primitivos `card`/`card--elevated`, tokens, shell de auth con Starfield+mark). Anti-FOUC = extender el patrón de cookie que el locale YA usa: un script inline en `<head>` lee una cookie de tema/modo y aplica `data-theme`/`data-mode` (resolviendo `auto` con matchMedia) ANTES del primer paint; `persistSettings` escribe esa cookie (hoy solo escribe la BD). Favicon + OG se generan de la MARCA existente (glifo enso de `components/icon.tsx` + wordmark "Aluna" + noche #0f1330 + oro #e7c986) con `next/og` — versión buena-suficiente, Gio la refina con arte "Luna en Enso" real.

**Tech:** Next 16 App Router (metadata API, `next/og` ImageResponse, file-based `app/icon.tsx`/`opengraph-image.tsx`/`not-found.tsx`/`error.tsx`/`global-error.tsx`/`robots.ts`), CSS Modules + tokens.

## Global Constraints
- Sin CSP en el repo (verificado: sin `headers()` en next.config, sin middleware de headers) → el script inline es seguro.
- Las páginas 404/500 siguen el shell de auth (`components/auth.module.css` `.shell`/`.sky`+Starfield/`.mark`/`.glyph`/`.brand`/`.tag` + `card card--elevated`) — NO dirección visual nueva, se extiende el patrón. i18n vía next-intl (`getTranslations`).
- `global-error.tsx` (convención Next) REEMPLAZA el root layout → debe renderizar su propio `<html data-theme="observatory" data-mode="dark"><body>` + importar globals.css; no depende del root layout.
- Favicon/OG = marca existente, versión buena-suficiente; comentar que Gio reemplaza con arte real.
- El `data-theme="observatory" data-mode="dark"` hardcodeado del root layout se queda como fallback no-JS/sin-cookie; el script inline lo corrige antes del paint.

---

### Task 1: Anti-FOUC — cookie de tema/modo + script inline

**Files:** Modify `apps/web/app/(app)/actions.ts` (`persistSettings`), `apps/web/app/layout.tsx`; Create `apps/web/lib/theme/fouc-script.ts` (el string del script + un helper puro testeable) + test.

- [ ] **Step 1:** `lib/theme/fouc-script.ts` — exportar `THEME_COOKIE` ("theme"), `MODE_COOKIE` ("light_mode"), y `FOUC_SCRIPT` (string IIFE): lee las 2 cookies (`document.cookie`), si `mode==="auto"` (o ausente) resuelve `matchMedia("(prefers-color-scheme: dark)")` → "dark"/"light", y hace `document.documentElement.dataset.theme = theme || "observatory"` + `.dataset.mode = resolvedMode`. Defensivo (try/catch, defaults). Además un helper PURO `resolveMode(mode, prefersDark): "light"|"dark"` testeable (auto+prefersDark→dark, auto+!prefersDark→light, "light"→light, "dark"→dark). Test primero.
- [ ] **Step 2:** en `persistSettings` (`app/(app)/actions.ts`), tras el update de BD, escribir las cookies `THEME_COOKIE`/`MODE_COOKIE` (parallel a como `setLanguage` escribe `LOCALE_COOKIE`) con los valores del patch (theme y/o light_mode presentes). `cookies()` de next/headers. (Mantener el DB write.)
- [ ] **Step 3:** en `app/layout.tsx`, dentro de `<head>` (o antes de `</body>`... en `<head>` es mejor para pre-paint), inyectar `<script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />`. El `data-theme`/`data-mode` hardcodeados del `<html>` se quedan como fallback. Verificar que el script corre antes del paint (está en head).
- [ ] **Step 4:** gate `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` verde. Commit. (El controlador verifica el no-flash en navegador en Fase 5.)

---

### Task 2: Metadata + themeColor + OG metadata + robots

**Files:** Modify `apps/web/app/layout.tsx` (metadata + viewport); Create `apps/web/app/robots.ts`.

- [ ] **Step 1:** expandir el `metadata` export del root layout: `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002")`, `title: { default: "Aluna", template: "%s · Aluna" }`, `description` (voz Aluna, autoconocimiento: carta astral, numerología, Ba Zi/Saju), `openGraph` (title/description/type "website"/locale/siteName "Aluna"; la imagen la aporta `opengraph-image.tsx` de Task 3 automáticamente), `applicationName: "Aluna"`. (Next enlaza `app/icon`/`opengraph-image` automáticamente — no hace falta declararlos en `icons`/`openGraph.images`.)
- [ ] **Step 2:** `viewport` export (Next 15+ separa viewport de metadata): `themeColor` con el par light/dark (`[{ media: "(prefers-color-scheme: dark)", color: "#0f1330" }, { media: "(prefers-color-scheme: light)", color: "#fdf3ec" }]`).
- [ ] **Step 3:** `app/robots.ts` — `export default function robots(): MetadataRoute.Robots` = allow-all (`rules: { userAgent: "*", allow: "/" }`), opcional `sitemap`. Las rutas de app tras auth no son indexables de todos modos.
- [ ] **Step 4:** gate tsc + next build verde. Commit.

---

### Task 3: Favicon + OG image desde la marca (next/og)

**Files:** Create `apps/web/app/icon.tsx`, `apps/web/app/apple-icon.tsx`, `apps/web/app/opengraph-image.tsx`.

- [ ] **Step 1:** obtener el `<path>` del glifo enso de `apps/web/components/icon.tsx` (name "enso") — reusar ese path data.
- [ ] **Step 2:** `app/icon.tsx` — `ImageResponse` (de `next/og`) 32×32 (o `size` export): el glifo enso en oro `#e7c986` sobre fondo noche `#0f1330` (o transparente). `export const size = { width: 32, height: 32 }`, `contentType = "image/png"`. `apple-icon.tsx` = 180×180 mismo diseño.
- [ ] **Step 3:** `app/opengraph-image.tsx` — `ImageResponse` 1200×630: fondo gradiente noche (radial `#28316b`→`#0a0d24` como `--bg` de observatorio), el glifo enso en oro + "Aluna" (serif, si se puede cargar Cormorant vía fetch de la fuente, si no una serif del sistema) + tagline "Tu mapa de autoconocimiento". `export const alt = "Aluna"`, `size = { width: 1200, height: 630 }`, `contentType = "image/png"`. Comentario: versión de marca buena-suficiente, Gio reemplaza con arte "Luna en Enso".
- [ ] **Step 4:** gate tsc + next build verde (el build renderiza estos ImageResponse). Commit. (El controlador verifica el favicon en la pestaña + la OG en Fase 5.)

---

### Task 4: Páginas de error — not-found, error, global-error

**Files:** Create `apps/web/app/not-found.tsx`, `apps/web/app/error.tsx`, `apps/web/app/global-error.tsx`. Reusar `components/auth.module.css` + `components/starfield`.

- [ ] **Step 1:** `not-found.tsx` (Server Component) — shell de auth (`.shell` + `.sky` Starfield + `.mark`/enso/`.brand`/`.tag`) + `card card--elevated` con: título ("Esta constelación no existe" o similar, voz Aluna) + copy + `<Link href="/hoy">` volver. i18n vía `getTranslations` (namespace nuevo `errors` o reusar). Claves ES+EN.
- [ ] **Step 2:** `error.tsx` (`"use client"`, recibe `{ error, reset }`) — mismo shell; título ("Algo se nubló"), copy, botón `onClick={reset}` (reintentar) + Link a /hoy. NO exponer `error.message` crudo al usuario (loguearlo).
- [ ] **Step 3:** `global-error.tsx` (`"use client"`, `{ error, reset }`) — DEBE renderizar su propio `<html data-theme="observatory" data-mode="dark"><body>` + importar globals.css (reemplaza el root layout). Estilos inline mínimos (o la clase del módulo) para el mensaje + reset. Mensaje genérico.
- [ ] **Step 4:** claves i18n `errors` (notFoundTitle/notFoundBody/errorTitle/errorBody/retry/backHome) ES+EN, paridad. gate tsc + vitest + next build verde. Commit.

---

### Task 5: Pulidos — fecha con locale + loading skeleton básico

**Files:** Modify `apps/web/app/(app)/ajustes/plan-card.tsx`; Create `apps/web/app/(app)/loading.tsx`.

- [ ] **Step 1:** `plan-card.tsx:70` — añadir `const locale = useLocale()` (ya importa next-intl) y `new Date(row.current_period_end).toLocaleDateString(locale)`.
- [ ] **Step 2:** `app/(app)/loading.tsx` — skeleton básico con el sistema R3 (tokens + `card`): unos bloques placeholder (shimmer opcional con keyframe simple) que aparecen mientras el (app)/layout resuelve la query de auth+settings+profiles (hoy bloquea sin placeholder). Reduced-motion: sin shimmer bajo el bloque global. Mantenerlo simple (no reproducir cada pantalla, un placeholder genérico del shell).
- [ ] **Step 3:** gate tsc + vitest + next build verde. Commit.

---

## Self-Review
- Cobertura §R6: anti-FOUC (T1) · metadata/OG/themeColor/robots (T2) · favicon/OG-image (T3) · 404/500/global-error (T4) · fecha locale + loading skeleton (T5). El `.seg` wrapper y el copy de past_due YA estaban resueltos (exploración) — no se tocan. El "gate anti-valores-crudos" se OMITE de este plan (bajo valor; el grep de R3 ya está documentado en el ledger) — anotar como deuda opcional.
- Verificable por el controlador en navegador (Fase 5): 404 (navegar a ruta inexistente) + error boundary + favicon en la pestaña + `<meta>` OG/themeColor en el HTML + **anti-FOUC (cargar en un tema/modo no-default y confirmar SIN flash)** + robots.txt. global-error es difícil de disparar (error en el root layout) — verificar por código.
- Latente en Gio: reemplazar favicon/OG con arte "Luna en Enso" real (la versión de marca es buena-suficiente, no un placeholder genérico).
