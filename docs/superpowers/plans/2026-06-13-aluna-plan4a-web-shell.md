# Aluna · Plan 4a (Web) — Cimientos del shell (scaffold + temas + i18n + auth)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Al construir CADA pantalla/UI, invocar primero los skills de diseño (frontend-design / impeccable)** — es regla del proyecto.

**Goal:** Levantar el cliente web (`apps/web`, Next.js 15 App Router) con el **sistema de temas** aprobado (3 temas × claro/oscuro, tokens CSS), **i18n ES/EN**, y **auth Supabase (SSR por cookies)**, dejando un shell autenticado y navegable. Entregable: registrarse, entrar, ver una app temada/localizada y cambiar tema/idioma en vivo.

**Architecture:** App "delgada" en el monorepo pnpm. El tema vive en **CSS custom properties** conmutadas por `data-theme`/`data-mode` en `<html>` (cero runtime de tema). Auth usa **`@supabase/ssr`** (clientes browser/server por cookies + middleware que refresca con `getUser()`), tipado con el `Database` de `@aluna/supabase`. i18n con **`next-intl`** sin i18n-routing (locale por cookie, desde `settings.language`). El cómputo nativo (`@aluna/ephemeris`/`@aluna/compute`) **no** entra a este corte (es Corte 2, solo en route handlers).

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript strict, Vitest + @testing-library/react + jsdom, `@supabase/ssr`, `next-intl`, `next/font` (Cormorant Garamond + Quicksand), CSS Modules + tokens.css. Consume `@aluna/supabase` (workspace).

**Spec:** `docs/superpowers/specs/2026-06-13-aluna-plan4-web-corte1-design.md` (este plan cubre la mitad "cimientos del shell"; onboarding + numerología = Plan 4b).

---

## Patrones verificados (context7, 2026-06-13) — usar EXACTAMENTE estos

**`@supabase/ssr` (Next 15, cookies async):**
- Browser: `createBrowserClient(url, key)`.
- Server: `await cookies()` → `createServerClient(url, key, { cookies: { getAll(), setAll() } })`.
- Middleware: `updateSession()` con `getAll/setAll`; **no correr código entre `createServerClient` y `supabase.auth.getUser()`**; usar `getUser()` (verifica con el servidor), no `getSession()`.

**`next-intl` (App Router, sin routing, locale por cookie):**
- `i18n/request.ts` → `getRequestConfig(async () => { const locale = (await cookies()).get('locale')?.value || 'es'; return { locale, messages: (await import(\`../messages/${locale}.json\`)).default }; })`.
- `next.config` envuelto con `createNextIntlPlugin()` (apunta a `./i18n/request.ts` por defecto).
- `<NextIntlClientProvider>` en el root layout; `useTranslations()` en componentes.

---

## Estructura de archivos (se crea en este plan)

```
apps/web/
├── package.json            # next, react, @supabase/ssr, next-intl, @aluna/supabase; scripts dev/build/test/lint/typecheck
├── next.config.ts          # withNextIntl + transpilePackages([@aluna/core,@aluna/supabase])
├── tsconfig.json           # extiende base; jsx; paths "@/*"
├── vitest.config.ts        # environment jsdom, setup testing-library
├── vitest.setup.ts         # @testing-library/jest-dom
├── .env.local              # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (gitignored)
├── .env.example
├── middleware.ts           # updateSession
├── messages/{es,en}.json   # catálogos i18n
├── i18n/request.ts         # getRequestConfig (locale por cookie)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # createBrowserClient typed
│   │   ├── server.ts       # createServerClient typed (await cookies)
│   │   └── middleware.ts   # updateSession
│   └── theme/
│       ├── themes.ts       # THEMES, MODES, tipos, resolveMode, nextTheme (lógica pura, TDD)
│       ├── tokens.css      # vars: base + [data-theme][data-mode] (3 temas × claro/oscuro)
│       └── theme-provider.tsx  # client: aplica data-attrs en <html>, persiste en settings
├── components/
│   └── icon.tsx            # <Icon name> SVG de línea (enso, wheel, grid3, sun, pillars, moon, cog)
├── app/
│   ├── globals.css         # @import tokens.css + reset/base
│   ├── layout.tsx          # root: fonts, <html data-theme/data-mode> (SSR desde cookie), providers
│   ├── page.tsx            # redirige a /hoy o /login según sesión
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── auth/actions.ts     # server actions: signIn, signUp, signOut
│   └── (app)/
│       ├── layout.tsx      # shell autenticado: guard + BottomNav + avatar Perfil
│       ├── hoy/page.tsx    # hub mínimo
│       └── ajustes/page.tsx# controles de tema/modo/idioma
```

---

## Task 1: Scaffold `apps/web` (Next.js 15 en el workspace)

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/.env.example`, `apps/web/.env.local`
- Modify: none (pnpm-workspace ya globa `apps/*`)

- [ ] **Step 1: Crear `apps/web/package.json`**

```json
{
  "name": "@aluna/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aluna/core": "workspace:*",
    "@aluna/supabase": "workspace:*",
    "@supabase/ssr": "^0.5.2",
    "next": "^15.1.0",
    "next-intl": "^3.26.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^25.9.3",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.1.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Crear `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "types": ["node"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Crear `apps/web/next.config.ts`**

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aluna/core", "@aluna/supabase"],
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Crear el layout y la página raíz mínimos** (se enriquecen en tasks siguientes)

`apps/web/app/layout.tsx`:
```tsx
export const metadata = { title: "Aluna", description: "Autoconocimiento: carta astral y numerología" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return <main>Aluna 🌙</main>;
}
```

- [ ] **Step 5: Crear `.env.example` y `.env.local`**

`apps/web/.env.example`:
```
# Aluna web — públicas (seguras para el navegador). Copiar a .env.local.
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy-anon-jwt-o-publishable>
```

`apps/web/.env.local` (con los valores reales del proyecto `aluna`, ya en el `.env.local` raíz del repo):
```
NEXT_PUBLIC_SUPABASE_URL=https://xcilrdpcanielalpfvld.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<pegar anon/publishable del .env.local raíz>
```

- [ ] **Step 6: Instalar y verificar que la app arranca y compila**

Run: `cd ~/astro-app && pnpm install`
Expected: registra `@aluna/web`, baja next/react/etc., sin errores.

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec next build`
Expected: build exitoso (genera `.next`, sin errores de tipos). Si `next lint` pide config, aceptar la base de `eslint-config-next`.

- [ ] **Step 7: Commit**

```bash
cd ~/astro-app && git add apps/web pnpm-lock.yaml && git commit -m "feat(web): scaffold @aluna/web (Next.js 15 App Router) en el workspace"
```

---

## Task 2: Lógica de temas (pura, TDD) + tokens CSS + fuentes

**Files:**
- Create: `apps/web/lib/theme/themes.ts`, `apps/web/lib/theme/tokens.css`, `apps/web/app/globals.css`
- Create: `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`
- Test: `apps/web/lib/theme/__tests__/themes.test.ts`
- Modify: `apps/web/app/layout.tsx` (importar globals.css + fuentes)

- [ ] **Step 1: Crear `apps/web/vitest.config.ts` y `vitest.setup.ts`**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

Añadir `@vitejs/plugin-react` a devDependencies: `cd ~/astro-app && pnpm --filter @aluna/web add -D @vitejs/plugin-react`

- [ ] **Step 2: Escribir el test de la lógica de temas (falla primero)**

`apps/web/lib/theme/__tests__/themes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { THEMES, MODES, DEFAULT_THEME, DEFAULT_MODE, resolveMode, nextTheme } from "../themes";

describe("themes", () => {
  it("expone los 3 temas y los 3 modos", () => {
    expect(THEMES).toEqual(["observatory", "aurora", "cosmic"]);
    expect(MODES).toEqual(["light", "dark", "auto"]);
    expect(DEFAULT_THEME).toBe("observatory");
    expect(DEFAULT_MODE).toBe("auto");
  });

  it("resolveMode: light/dark se devuelven tal cual", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
  });

  it("resolveMode: auto sigue la preferencia del sistema", () => {
    expect(resolveMode("auto", true)).toBe("dark"); // prefersDark=true
    expect(resolveMode("auto", false)).toBe("light");
  });

  it("nextTheme cicla observatory -> aurora -> cosmic -> observatory", () => {
    expect(nextTheme("observatory")).toBe("aurora");
    expect(nextTheme("aurora")).toBe("cosmic");
    expect(nextTheme("cosmic")).toBe("observatory");
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/theme/__tests__/themes.test.ts`
Expected: FAIL — no resuelve `../themes`.

- [ ] **Step 4: Implementar `apps/web/lib/theme/themes.ts`**

```ts
export const THEMES = ["observatory", "aurora", "cosmic"] as const;
export const MODES = ["light", "dark", "auto"] as const;

export type Theme = (typeof THEMES)[number];
export type Mode = (typeof MODES)[number];
export type ResolvedMode = "light" | "dark";

export const DEFAULT_THEME: Theme = "observatory";
export const DEFAULT_MODE: Mode = "auto";

/** Resuelve el modo efectivo: 'auto' sigue la preferencia del sistema. */
export function resolveMode(mode: Mode, prefersDark: boolean): ResolvedMode {
  if (mode === "auto") return prefersDark ? "dark" : "light";
  return mode;
}

/** Cicla al siguiente tema (para un botón de "cambiar tema"). */
export function nextTheme(theme: Theme): Theme {
  const i = THEMES.indexOf(theme);
  return THEMES[(i + 1) % THEMES.length]!;
}
```

- [ ] **Step 5: Correr el test y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/theme/__tests__/themes.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Crear `apps/web/lib/theme/tokens.css`** (paletas aprobadas; oscuro por defecto, `.light`/`[data-mode=light]` override)

```css
/* Tokens de Aluna. El tema se fija con data-theme + data-mode en <html>.
   Acento por sección: sobreescribir --acc en el contenedor (oro por defecto). */
:root {
  --font-ui: var(--font-quicksand), system-ui, sans-serif;
  --font-display: var(--font-cormorant), Georgia, serif;
  --radius: 16px;
  --radius-lg: 22px;
  --acc: #e7c986; /* dorado por defecto */
}

/* ---------------- OBSERVATORY (noche dorada) ---------------- */
[data-theme="observatory"] {
  --bg: radial-gradient(125% 85% at 50% -8%, #28316b 0%, #121737 46%, #0a0d24 100%);
  --surface: rgba(150, 150, 190, 0.07);
  --ink: #ece7f6;
  --soft: rgba(233, 228, 245, 0.6);
  --line: rgba(231, 201, 134, 0.2);
  --acc: #e7c986;
  --stars: 0.5;
}
[data-theme="observatory"][data-mode="light"] {
  --bg: radial-gradient(125% 85% at 50% -8%, #fdf3ec 0%, #f4eefb 55%, #efe7f8 100%);
  --surface: rgba(255, 255, 255, 0.6);
  --ink: #3d3650;
  --soft: rgba(61, 54, 80, 0.62);
  --line: rgba(142, 124, 195, 0.25);
  --acc: #caa85f;
  --stars: 0;
}

/* ---------------- AURORA (claro pastel) ---------------- */
[data-theme="aurora"] {
  --bg: linear-gradient(170deg, #f6f2fb 0%, #fdf3ec 100%);
  --surface: rgba(255, 255, 255, 0.6);
  --ink: #4a4458;
  --soft: rgba(74, 68, 88, 0.6);
  --line: rgba(155, 143, 192, 0.25);
  --acc: #9b8fc0;
  --stars: 0;
}
[data-theme="aurora"][data-mode="dark"] {
  --bg: linear-gradient(170deg, #211c33 0%, #2a2140 100%);
  --surface: rgba(180, 170, 210, 0.08);
  --ink: #ece7f6;
  --soft: rgba(236, 231, 246, 0.6);
  --line: rgba(180, 160, 230, 0.22);
  --acc: #c9b8f2;
  --stars: 0.25;
}

/* ---------------- COSMIC (neón oscuro) ---------------- */
[data-theme="cosmic"] {
  --bg: linear-gradient(165deg, #1c0529 0%, #3d0b54 70%, #6d1a6b 100%);
  --surface: rgba(255, 255, 255, 0.07);
  --ink: #f3eaff;
  --soft: rgba(243, 234, 255, 0.62);
  --line: rgba(255, 138, 224, 0.28);
  --acc: #ff8ae0;
  --stars: 0.4;
}
[data-theme="cosmic"][data-mode="light"] {
  --bg: linear-gradient(165deg, #f7eefc 0%, #fbeaf6 100%);
  --surface: rgba(255, 255, 255, 0.7);
  --ink: #3a2342;
  --soft: rgba(58, 35, 66, 0.6);
  --line: rgba(154, 107, 255, 0.25);
  --acc: #b86bff;
  --stars: 0;
}
```

- [ ] **Step 7: Crear `apps/web/app/globals.css`**

```css
@import "../lib/theme/tokens.css";

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  min-height: 100dvh;
  background: var(--bg);
  background-attachment: fixed;
  color: var(--ink);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, .display { font-family: var(--font-display); }
a { color: inherit; }
```

- [ ] **Step 8: Cargar fuentes e importar globals en el root layout**

Reemplazar `apps/web/app/layout.tsx` por:
```tsx
import "./globals.css";
import { Cormorant_Garamond, Quicksand } from "next/font/google";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

export const metadata = { title: "Aluna", description: "Autoconocimiento: carta astral y numerología" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="observatory" data-mode="dark" className={`${cormorant.variable} ${quicksand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Verificar build + tests**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run && pnpm --filter @aluna/web exec next build`
Expected: tests PASS; build OK (fuentes resueltas, CSS importado).

- [ ] **Step 10: Commit**

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): lógica de temas (TDD) + tokens CSS de los 3 temas + fuentes"
```

---

## Task 3: ThemeProvider (aplica y persiste el tema en vivo)

**Files:**
- Create: `apps/web/lib/theme/theme-provider.tsx`
- Test: `apps/web/lib/theme/__tests__/theme-provider.test.tsx`

- [ ] **Step 1: Escribir el test del provider (falla primero)**

`apps/web/lib/theme/__tests__/theme-provider.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../theme-provider";

function Probe() {
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <div>
      <span data-testid="t">{theme}</span>
      <span data-testid="m">{mode}</span>
      <button onClick={() => setTheme("cosmic")}>t</button>
      <button onClick={() => setMode("light")}>m</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("aplica data-theme/data-mode en <html> y los actualiza", async () => {
    const persist = vi.fn();
    render(
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={persist}>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(screen.getByTestId("t").textContent).toBe("observatory");

    await act(async () => { screen.getByText("t").click(); });
    expect(document.documentElement.dataset.theme).toBe("cosmic");
    expect(persist).toHaveBeenCalledWith({ theme: "cosmic" });

    await act(async () => { screen.getByText("m").click(); });
    expect(document.documentElement.dataset.mode).toBe("light");
    expect(persist).toHaveBeenCalledWith({ light_mode: "light" });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/theme/__tests__/theme-provider.test.tsx`
Expected: FAIL — no resuelve `../theme-provider`.

- [ ] **Step 3: Implementar `apps/web/lib/theme/theme-provider.tsx`**

```tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Theme, Mode } from "./themes";

type PersistPatch = { theme?: Theme; light_mode?: Mode };
type Ctx = {
  theme: Theme; mode: Mode;
  setTheme: (t: Theme) => void; setMode: (m: Mode) => void;
};
const ThemeCtx = createContext<Ctx | null>(null);

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({
  initialTheme, initialMode, persist, children,
}: {
  initialTheme: Theme; initialMode: Mode;
  persist: (patch: PersistPatch) => void;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [mode, setModeState] = useState<Mode>(initialMode);

  // Refleja el estado en <html> (las vars cascadean).
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.dataset.mode = mode; }, [mode]);

  const setTheme = useCallback((t: Theme) => { setThemeState(t); persist({ theme: t }); }, [persist]);
  const setMode = useCallback((m: Mode) => { setModeState(m); persist({ light_mode: m }); }, [persist]);

  return <ThemeCtx.Provider value={{ theme, mode, setTheme, setMode }}>{children}</ThemeCtx.Provider>;
}
```

- [ ] **Step 4: Correr el test y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/theme/__tests__/theme-provider.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): ThemeProvider — aplica data-attrs en vivo y persiste (TDD)"
```

---

## Task 4: i18n (next-intl, locale por cookie) ES/EN

**Files:**
- Create: `apps/web/i18n/request.ts`, `apps/web/messages/es.json`, `apps/web/messages/en.json`
- Modify: `apps/web/app/layout.tsx` (envolver con `NextIntlClientProvider`)
- Test: `apps/web/app/__tests__/i18n.test.tsx`

- [ ] **Step 1: Crear `apps/web/i18n/request.ts`**

```ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED = ["es", "en"] as const;

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("locale")?.value;
  const locale = (SUPPORTED as readonly string[]).includes(raw ?? "") ? raw! : "es";
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
```

- [ ] **Step 2: Crear catálogos `apps/web/messages/es.json` y `en.json`** (semilla; se amplían por pantalla)

`es.json`:
```json
{
  "app": { "name": "Aluna", "tagline": "Tu mapa de autoconocimiento" },
  "nav": { "carta": "Carta", "numeros": "Números", "hoy": "Hoy", "pilares": "Pilares", "perfil": "Perfil" },
  "auth": { "login": "Entrar", "signup": "Crear cuenta", "email": "Correo", "password": "Contraseña", "logout": "Salir", "noAccount": "¿No tienes cuenta?", "haveAccount": "¿Ya tienes cuenta?" },
  "settings": { "title": "Ajustes", "lightMode": "Modo de luz", "light": "Claro", "dark": "Oscuro", "auto": "Auto", "theme": "Tema", "language": "Idioma", "observatory": "Observatorio", "aurora": "Aurora", "cosmic": "Cósmico" },
  "hoy": { "greeting": "Hola", "lenses": "Tus lentes", "soon": "Próximamente" }
}
```

`en.json`:
```json
{
  "app": { "name": "Aluna", "tagline": "Your map of self-knowledge" },
  "nav": { "carta": "Chart", "numeros": "Numbers", "hoy": "Today", "pilares": "Pillars", "perfil": "Profile" },
  "auth": { "login": "Log in", "signup": "Sign up", "email": "Email", "password": "Password", "logout": "Log out", "noAccount": "No account yet?", "haveAccount": "Already have an account?" },
  "settings": { "title": "Settings", "lightMode": "Light mode", "light": "Light", "dark": "Dark", "auto": "Auto", "theme": "Theme", "language": "Language", "observatory": "Observatory", "aurora": "Aurora", "cosmic": "Cosmic" },
  "hoy": { "greeting": "Hi", "lenses": "Your lenses", "soon": "Coming soon" }
}
```

- [ ] **Step 3: Envolver el root layout con `NextIntlClientProvider`**

En `apps/web/app/layout.tsx`, importar y envolver el `{children}` del `<body>`:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// ...dentro del componente (ahora async):
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="observatory" data-mode="dark" className={`${cormorant.variable} ${quicksand.variable}`}>
      <body><NextIntlClientProvider>{children}</NextIntlClientProvider></body>
    </html>
  );
}
```

- [ ] **Step 4: Escribir un test de render i18n (falla primero)**

`apps/web/app/__tests__/i18n.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { useTranslations } from "next-intl";

function Nav() { const t = useTranslations("nav"); return <span>{t("numeros")}</span>; }

describe("i18n catalogs", () => {
  it("renderiza la etiqueta en español", () => {
    render(<NextIntlClientProvider locale="es" messages={es}><Nav /></NextIntlClientProvider>);
    expect(screen.getByText("Números")).toBeInTheDocument();
  });
  it("es y en tienen las mismas claves de nav", async () => {
    const en = (await import("../../messages/en.json")).default;
    expect(Object.keys(es.nav).sort()).toEqual(Object.keys(en.nav).sort());
  });
});
```

- [ ] **Step 5: Correr el test (debe pasar tras crear los catálogos)**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run app/__tests__/i18n.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Verificar build + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec next build`
Expected: OK (next-intl plugin activo).

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): i18n con next-intl (locale por cookie) + catálogos ES/EN"
```

---

## Task 5: Clientes Supabase SSR + middleware

**Files:**
- Create: `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/middleware.ts`, `apps/web/middleware.ts`
- Test: `apps/web/lib/supabase/__tests__/client.test.ts`

- [ ] **Step 1: Crear `apps/web/lib/supabase/client.ts`** (browser, tipado con Database de @aluna/supabase)

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@aluna/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Crear `apps/web/lib/supabase/server.ts`** (server, cookies async)

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@aluna/supabase";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component; lo refresca el middleware.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Crear `apps/web/lib/supabase/middleware.ts`** (updateSession, patrón verificado)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@aluna/supabase";

const PUBLIC_PREFIXES = ["/login", "/signup", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // No correr código entre createServerClient y getUser().
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
```

- [ ] **Step 4: Crear `apps/web/middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 5: Escribir un smoke test del client browser (sin red)**

`apps/web/lib/supabase/__tests__/client.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "../client";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("supabase browser client", () => {
  it("expone .auth y .from sin tocar la red", () => {
    const db = createClient();
    expect(typeof db.auth.getUser).toBe("function");
    expect(typeof db.from).toBe("function");
  });
});
```

- [ ] **Step 6: Correr test + typecheck**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/supabase/__tests__/client.test.ts && pnpm --filter @aluna/web typecheck`
Expected: PASS (1 test); typecheck sin errores.

- [ ] **Step 7: Commit**

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): clientes Supabase SSR (browser/server) + middleware de sesión"
```

---

## Task 6: Auth — páginas y server actions

**Files:**
- Create: `apps/web/app/auth/actions.ts`, `apps/web/app/login/page.tsx`, `apps/web/app/signup/page.tsx`
- Create: `apps/web/app/login/login-form.tsx` (client) y `apps/web/app/signup/signup-form.tsx` (client)
- Test: `apps/web/app/auth/__tests__/validation.test.ts`

- [ ] **Step 1: Escribir el test de validación de credenciales (falla primero)**

`apps/web/app/auth/__tests__/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseCredentials } from "../validation";

describe("parseCredentials", () => {
  it("acepta email y password válidos", () => {
    const r = parseCredentials({ email: "a@b.com", password: "secret12" });
    expect(r.ok).toBe(true);
  });
  it("rechaza email inválido", () => {
    const r = parseCredentials({ email: "nope", password: "secret12" });
    expect(r.ok).toBe(false);
  });
  it("rechaza password corto", () => {
    const r = parseCredentials({ email: "a@b.com", password: "123" });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run app/auth/__tests__/validation.test.ts`
Expected: FAIL — no resuelve `../validation`.

- [ ] **Step 3: Implementar `apps/web/app/auth/validation.ts`**

```ts
export type Credentials = { email: string; password: string };
export type ParseResult = { ok: true; value: Credentials } | { ok: false; error: string };

export function parseCredentials(input: { email?: unknown; password?: unknown }): ParseResult {
  const email = String(input.email ?? "").trim();
  const password = String(input.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "email" };
  if (password.length < 8) return { ok: false, error: "password" };
  return { ok: true, value: { email, password } };
}
```

- [ ] **Step 4: Correr y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run app/auth/__tests__/validation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar `apps/web/app/auth/actions.ts`** (server actions)

```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCredentials } from "./validation";

export async function signIn(formData: FormData) {
  const parsed = parseCredentials({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.ok) redirect(`/login?error=${parsed.error}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) redirect(`/login?error=auth`);
  redirect("/hoy");
}

export async function signUp(formData: FormData) {
  const parsed = parseCredentials({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.ok) redirect(`/signup?error=${parsed.error}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.value);
  if (error) redirect(`/signup?error=auth`);
  redirect("/hoy"); // el trigger handle_new_user ya creó profiles_user + settings
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 6: Crear los formularios y páginas** (UI mínima; el pulido visual con skills de diseño)

`apps/web/app/login/login-form.tsx`:
```tsx
"use client";
import { useTranslations } from "next-intl";
import { signIn } from "../auth/actions";

export function LoginForm() {
  const t = useTranslations("auth");
  return (
    <form action={signIn} style={{ display: "grid", gap: 12, maxWidth: 320, margin: "0 auto" }}>
      <input name="email" type="email" placeholder={t("email")} required />
      <input name="password" type="password" placeholder={t("password")} required minLength={8} />
      <button type="submit">{t("login")}</button>
    </form>
  );
}
```

`apps/web/app/login/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <main style={{ padding: 24 }}>
      <h1 className="display" style={{ textAlign: "center" }}>Aluna 🌙</h1>
      <LoginForm />
      <p style={{ textAlign: "center", marginTop: 16 }}>
        {t("noAccount")} <Link href="/signup">{t("signup")}</Link>
      </p>
    </main>
  );
}
```

`apps/web/app/signup/signup-form.tsx` (igual que LoginForm pero `action={signUp}` y botón `t("signup")`):
```tsx
"use client";
import { useTranslations } from "next-intl";
import { signUp } from "../auth/actions";

export function SignupForm() {
  const t = useTranslations("auth");
  return (
    <form action={signUp} style={{ display: "grid", gap: 12, maxWidth: 320, margin: "0 auto" }}>
      <input name="email" type="email" placeholder={t("email")} required />
      <input name="password" type="password" placeholder={t("password")} required minLength={8} />
      <button type="submit">{t("signup")}</button>
    </form>
  );
}
```

`apps/web/app/signup/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <main style={{ padding: 24 }}>
      <h1 className="display" style={{ textAlign: "center" }}>Aluna 🌙</h1>
      <SignupForm />
      <p style={{ textAlign: "center", marginTop: 16 }}>
        {t("haveAccount")} <Link href="/login">{t("login")}</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Verificar build + commit**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec next build`
Expected: OK.

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): auth — validación (TDD), server actions y páginas login/signup"
```

---

## Task 7: Shell autenticado (layout + nav + Ajustes) + verificación final

**Files:**
- Create: `apps/web/components/icon.tsx`, `apps/web/components/bottom-nav.tsx`, `apps/web/components/bottom-nav.module.css`
- Create: `apps/web/app/(app)/layout.tsx`, `apps/web/app/(app)/hoy/page.tsx`, `apps/web/app/(app)/ajustes/page.tsx`, `apps/web/app/(app)/ajustes/settings-controls.tsx`
- Create: `apps/web/app/page.tsx` (redirección raíz) — modificar el existente
- Create: `apps/web/lib/settings.ts` (lee/escribe settings) + test
- Test: `apps/web/lib/__tests__/settings.test.ts`

- [ ] **Step 1: Escribir el test del mapeo de settings (falla primero)**

`apps/web/lib/__tests__/settings.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { settingsToThemeState } from "../settings";

describe("settingsToThemeState", () => {
  it("mapea una fila de settings a tema/modo/idioma con defaults", () => {
    expect(settingsToThemeState({ theme: "cosmic", light_mode: "light", language: "en" }))
      .toEqual({ theme: "cosmic", mode: "light", locale: "en" });
  });
  it("cae a defaults si faltan/invalidos", () => {
    expect(settingsToThemeState({ theme: "x", light_mode: undefined, language: null }))
      .toEqual({ theme: "observatory", mode: "auto", locale: "es" });
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/settings.test.ts`
Expected: FAIL — no resuelve `../settings`.

- [ ] **Step 3: Implementar `apps/web/lib/settings.ts`**

```ts
import { THEMES, MODES, DEFAULT_THEME, DEFAULT_MODE, type Theme, type Mode } from "./theme/themes";

const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export type ThemeState = { theme: Theme; mode: Mode; locale: Locale };

export function settingsToThemeState(row: {
  theme?: unknown; light_mode?: unknown; language?: unknown;
}): ThemeState {
  const theme = (THEMES as readonly string[]).includes(row.theme as string) ? (row.theme as Theme) : DEFAULT_THEME;
  const mode = (MODES as readonly string[]).includes(row.light_mode as string) ? (row.light_mode as Mode) : DEFAULT_MODE;
  const locale = (LOCALES as readonly string[]).includes(row.language as string) ? (row.language as Locale) : "es";
  return { theme, mode, locale };
}
```

- [ ] **Step 4: Correr y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run lib/__tests__/settings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Crear `apps/web/components/icon.tsx`** (iconos de línea del set aprobado)

```tsx
const PATHS: Record<string, React.ReactNode> = {
  enso: (<><path d="M16.5 5.5a8 8 0 1 0 3 7.5" /><path d="M19 4.5a4 4 0 0 0 0 6 5 5 0 0 1 0-6Z" /></>),
  wheel: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" /></>),
  grid3: (<>{[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}</>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" /></>),
  pillars: (<path d="M6 4v16M11 4v16M16 4v16M21 4v16" />),
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 6: Crear la barra inferior** `apps/web/components/bottom-nav.tsx` + `bottom-nav.module.css`

`bottom-nav.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import styles from "./bottom-nav.module.css";

const ITEMS = [
  { href: "/carta", icon: "wheel", key: "carta", soon: true },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: true }, // se activa en Plan 4b
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: true },
] as const;

export function BottomNav() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className={styles.nav}>
      {ITEMS.map((it) => {
        const active = path.startsWith(it.href);
        const content = (
          <span className={`${styles.item} ${active ? styles.on : ""} ${it.soon ? styles.soon : ""}`}>
            <Icon name={it.icon as "wheel"} />{t(it.key)}
          </span>
        );
        return it.soon ? <span key={it.key}>{content}</span> : <Link key={it.key} href={it.href}>{content}</Link>;
      })}
    </nav>
  );
}
```

`bottom-nav.module.css`:
```css
.nav { position: sticky; bottom: 0; display: flex; justify-content: space-around;
  padding: 10px 8px 16px; border-top: 1px solid var(--line); background: var(--bg); }
.item { display: flex; flex-direction: column; align-items: center; gap: 5px;
  font-size: 9px; color: var(--soft); font-weight: 600; }
.on { color: var(--acc); }
.soon { opacity: 0.4; }
```

- [ ] **Step 7: Crear el layout autenticado** `apps/web/app/(app)/layout.tsx`

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { settingsToThemeState } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { persistSettings } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase.from("settings").select("theme, light_mode, language").eq("user_id", user.id).maybeSingle();
  const state = settingsToThemeState(row ?? {});

  return (
    <ThemeProvider initialTheme={state.theme} initialMode={state.mode} persist={persistSettings}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ flex: 1 }}>{children}</div>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}
```

`apps/web/app/(app)/actions.ts` (server action de persistencia + cookie de tema/locale):
```ts
"use server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function persistSettings(patch: { theme?: string; light_mode?: string; language?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("settings").update(patch).eq("user_id", user.id);
  const store = await cookies();
  if (patch.language) store.set("locale", patch.language);
}
```

> Nota: `persist` se pasa a un client component; en Next 15 una server action puede pasarse como prop. El `ThemeProvider` la invoca tras cada cambio.

- [ ] **Step 8: Crear hub y ajustes**

`apps/web/app/(app)/hoy/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function HoyPage() {
  const t = await getTranslations("hoy");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main style={{ padding: 20 }}>
      <h1 className="display">{t("greeting")} ✦</h1>
      <p style={{ color: "var(--soft)" }}>{user?.email}</p>
      <h2 style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--soft)" }}>{t("lenses")}</h2>
      {/* tiles de lentes (Numerología se activa en Plan 4b) */}
    </main>
  );
}
```

`apps/web/app/(app)/ajustes/settings-controls.tsx` (client; usa useTheme):
```tsx
"use client";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, MODES } from "@/lib/theme/themes";

export function SettingsControls() {
  const t = useTranslations("settings");
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <div style={{ display: "grid", gap: 18, padding: 20 }}>
      <section>
        <h3>{t("lightMode")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}>{t(m)}</button>
          ))}
        </div>
      </section>
      <section>
        <h3>{t("theme")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {THEMES.map((th) => (
            <button key={th} onClick={() => setTheme(th)} aria-pressed={theme === th}>{t(th)}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
```

`apps/web/app/(app)/ajustes/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { SettingsControls } from "./settings-controls";

export default async function AjustesPage() {
  const t = await getTranslations("settings");
  return (<main><h1 className="display" style={{ padding: "20px 20px 0" }}>{t("title")}</h1><SettingsControls /></main>);
}
```

- [ ] **Step 9: Redirección raíz** — reemplazar `apps/web/app/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/hoy" : "/login");
}
```

- [ ] **Step 10: Verificación final (todo el monorepo)**

Run: `cd ~/astro-app && pnpm --filter @aluna/web exec vitest run && pnpm --filter @aluna/web typecheck && pnpm --filter @aluna/web exec next build`
Expected: tests PASS (themes 4 + provider 1 + i18n 2 + client 1 + validation 3 + settings 2 = 13); typecheck limpio; build OK.

Run: `cd ~/astro-app && pnpm test`
Expected: los 4 paquetes previos siguen verdes + `@aluna/web` verde.

- [ ] **Step 11: Commit**

```bash
cd ~/astro-app && git add apps/web && git commit -m "feat(web): shell autenticado — layout+guard, BottomNav, hub Hoy y Ajustes (tema/modo en vivo)"
```

---

## Self-Review (cobertura vs. spec, mitad "cimientos del shell")

1. **Scaffold Next.js en monorepo** → Task 1. ✅
2. **Sistema de temas (3 × claro/oscuro, tokens, switch en vivo, persistido)** → Tasks 2, 3, 7 (Ajustes). ✅
3. **i18n ES/EN (locale por cookie/settings)** → Task 4 + persistencia en Task 7. ✅
4. **Auth Supabase SSR (clientes, middleware, login/signup, guard)** → Tasks 5, 6, 7. ✅
5. **Shell navegable (nav inferior, hub, avatar/ajustes)** → Task 7. ✅
6. **Anti-FOUC** → `<html data-theme data-mode>` fijado en SSR (Task 2/4); afinable leyendo settings en el root layout en un pulido posterior (el `(app)/layout` ya aplica el estado real del usuario al montar el ThemeProvider).
7. **Regla App Store / sin nativo en cliente** → la web no importa `@aluna/ephemeris`/`@aluna/compute` (entran en Corte 2, route handlers). ✅

**Fuera (Plan 4b):** onboarding ceremonial + geocodificación + perfiles + sección Numerología. La pestaña "Números" queda `soon` hasta 4b.

**Consistencia de tipos/nombres:** `Theme`/`Mode`/`ResolvedMode`, `resolveMode`/`nextTheme`, `THEMES`/`MODES`/`DEFAULT_THEME`/`DEFAULT_MODE`, `settingsToThemeState`, `createClient` (browser/server homónimos en módulos distintos, import por ruta), `updateSession`, `persistSettings`, `useTheme`/`ThemeProvider` — usados idénticos entre tasks. Patrones `@supabase/ssr`/`next-intl` verificados con context7 (2026-06-13).

**Nota de ejecución:** al construir cada pantalla con UI real (login, hub, ajustes, y sobre todo Plan 4b), **invocar los skills de diseño** antes de escribir el markup/CSS, para subir del "mínimo funcional" de este plan a la vara "Crafted · Aluna".
