# Móvil — Compatibilidad (paridad web→Expo) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portar **Compatibilidad** (sinastría) al app móvil Expo — la primera de las 3 features nuevas de paridad, elegida por ser la única 100% funcional sin llaves de proveedor IA. Incluye el desbloqueo de backend que las 3 features comparten (swap de auth a Bearer) y el hub "Tu universo" en Hoy que sirve de puerta de entrada a las 3 (Compatibilidad funcional; Informes/Preguntar quedan como entradas "próximamente" hasta su propia pasada de build).

**Architecture:** `/api/synastry` y `/api/chat` migran de `createClient()` (cookies, web-only) a `authenticateRoute()` (Bearer o cookies, ya usado por `/api/chart`) — mismo patrón, sin tocar la lógica de cómputo. Móvil añade `fetchAllProfiles` (lectura RLS directa de `birth_profiles`, mismo patrón que `fetchRemoteProfile`) y `lib/synastry-api.ts` (fetch autenticado, mismo patrón que `chart-reading-api.ts`). La pantalla `app/compatibilidad.tsx` es una ruta push (fuera de tabs, como `login.tsx`/`onboarding.tsx`) con máquina de estados `{s:"picking"}|{s:"loading"}|{s:"error"}|{s:"ready",...}` — mismo patrón que `carta.tsx`/`pilares.tsx`.

**Tech Stack:** Next.js 15 route handlers, `@supabase/ssr` + RLS, `@aluna/core` (`synastryReport`, tipos `SynastryReport`/`SynastryThemeScore`/`SynastryDriver`), Expo Router (RN), Vitest.

## Global Constraints

- **Auth:** el swap usa `authenticateRoute(request)` de `apps/web/lib/supabase/route-auth.ts` (ya existe, NO se crea nada nuevo) — devuelve `{ supabase, user }`; `user` puede ser `null` → 401. Nunca se confía en IDs de perfil del body sin validarlos contra `birth_profiles` con el cliente autenticado (RLS).
- **Móvil nunca importa `@aluna/ephemeris`** — todo cómputo astrológico vive en las rutas Next.js; móvil solo llama `POST /api/synastry` con Bearer.
- **Sigue los patrones existentes** (ver `chart-reading-api.ts`, `profile-sync.ts`, `carta.tsx`, `components/ui.tsx` — Card/Chip/FadeIn): no inventes primitivos nuevos si uno ya sirve.
- **i18n es/en paridad** — cada string nueva en `apps/mobile/lib/strings.ts` lleva su espejo en ambos locales, mismo orden de claves.
- **Escala tipográfica de 4 tamaños** (13/15/19/24 sans; jerarquía serif propia de títulos) — usa los tokens de `apps/mobile/theme/tokens.ts` (`typeScale`), no números sueltos.
- Gate por tarea (desde `apps/web/` y `apps/mobile/`, cd absoluto): `npx vitest run`. Suite actual: 178 web + 24 mobile, ambas verdes.
- Commits pequeños, `feat(movil-compat):` / `fix(movil-compat):`.

## Alcance explícito (para que quede registrado, no perdido en el camino)

**Dentro de esta pasada:**
- Swap de Bearer en `/api/synastry` y `/api/chat` (el segundo se incluye porque es el mismo fix mecánico de una línea; desbloquea Preguntar para una pasada futura sin repetir este trabajo).
- Hub "Tu universo" en Hoy con 3 entradas: Compatibilidad (funcional), Informes y Preguntar (placeholders "próximamente", mismo patrón `SoonCard` que ya usa `hoy.climateTitle`/`hoy.readingsTitle`).
- Compatibilidad completa: selección de 2 perfiles + resultado (score, 4 barras, drivers expandibles).

**Fuera de esta pasada (decisión de scope, no descuido):**
- **"Vínculos recientes"** (historial de comparaciones) del mockup — no existe tabla en el esquema para persistir esto; se corta del build real.
- **"+ Añadir persona"** creando un SEGUNDO perfil desde el móvil — el onboarding móvil hoy solo sabe crear el PRIMER perfil (`RootGate` asume "sin perfil → onboarding"); no hay flujo de multi-perfil en móvil (la web sí lo tiene). Con <2 perfiles, el empty-state de Compatibilidad explica esto sin prometer un botón que no funciona.
- Pantallas de **Informe** y **Preguntar** — sus mockups y diseño ya existen (`docs/redesign/movil-mockups/`); quedan para la siguiente pasada de build.

---

### Task 1: Backend — swap Bearer en `/api/synastry`

**Files:**
- Modify: `apps/web/app/api/synastry/route.ts`
- Create: `apps/web/app/api/synastry/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `authenticateRoute(request: NextRequest): Promise<{ supabase: AlunaSupabaseClient, user: User | null }>` de `@/lib/supabase/route-auth` (ya existe).
- Produces: sin cambio de contrato HTTP — `POST /api/synastry` sigue devolviendo `{ overall, tone, themes, aspects }` (200) o `{ error }` (400/401/404/500). Solo cambia CÓMO se autentica (ahora acepta `Authorization: Bearer <token>` además de cookies).

- [ ] **Step 1: Test que falla** — `apps/web/app/api/synastry/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const computeChartMock = vi.fn();
vi.mock("@aluna/ephemeris", () => ({
  computeChart: (...args: unknown[]) => computeChartMock(...args),
  setEphePath: vi.fn(),
}));

const synastryReportMock = vi.fn();
vi.mock("@aluna/core", () => ({
  synastryReport: (...args: unknown[]) => synastryReportMock(...args),
}));

const inMock = vi.fn();
const selectMock = vi.fn(() => ({ in: inMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { POST } from "../route";

const PROFILE_A = { id: "profile-a", birth_date: "1990-01-01", birth_time: "10:00", time_known: true, latitude: 1, longitude: 1, time_zone: "UTC" };
const PROFILE_B = { id: "profile-b", birth_date: "1992-06-15", birth_time: "08:30", time_known: true, latitude: 2, longitude: 2, time_zone: "UTC" };

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

describe("POST /api/synastry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
    computeChartMock.mockReturnValue({ bodies: [] });
    synastryReportMock.mockReturnValue({ overall: 78, tone: "high", themes: [], aspects: [] });
  });

  it("401 si authenticateRoute no resuelve usuario (sin cookie ni Bearer)", async () => {
    const res = await POST(fakeRequest({ profileIdA: "a", profileIdB: "b" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("pasa el request a authenticateRoute (así llega el header Authorization)", async () => {
    const req = fakeRequest({ profileIdA: "a", profileIdB: "b" }, { authorization: "Bearer token-abc" });
    await POST(req);
    expect(authenticateRouteMock).toHaveBeenCalledWith(req);
  });

  it("400 si profileIdA y profileIdB son iguales", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    const res = await POST(fakeRequest({ profileIdA: "same", profileIdB: "same" }));
    expect(res.status).toBe(400);
  });

  it("404 si no vuelven las dos filas de birth_profiles (RLS ya limita al dueño)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    inMock.mockResolvedValue({ data: [PROFILE_A] });
    const res = await POST(fakeRequest({ profileIdA: "profile-a", profileIdB: "profile-b" }));
    expect(res.status).toBe(404);
  });

  it("200 con el reporte cuando ambos perfiles se validan y el cómputo resuelve", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    inMock.mockResolvedValue({ data: [PROFILE_A, PROFILE_B] });
    const res = await POST(fakeRequest({ profileIdA: "profile-a", profileIdB: "profile-b" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ overall: 78, tone: "high", themes: [], aspects: [] });
    expect(synastryReportMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run app/api/synastry/__tests__/route.test.ts` → FAIL (la ruta actual usa `createClient()`, no `authenticateRoute`, así que `authenticateRouteMock` nunca se llama y el test de 401 falla porque el mock de `createClient`/cookies real no está interceptado).

- [ ] **Step 3: Implementación** — en `apps/web/app/api/synastry/route.ts`, reemplaza el import y las 4 líneas de auth:

```ts
// ANTES:
import { createClient } from "@/lib/supabase/server";
// ...
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

// DESPUÉS:
import { authenticateRoute } from "@/lib/supabase/route-auth";
// ...
const { supabase, user } = await authenticateRoute(request);
if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
```

Nada más cambia en el archivo — el resto de la lógica (validación de body, `.in()` sobre `birth_profiles`, `computeChart`, `synastryReport`) queda idéntica.

- [ ] **Step 4: Verlo pasar** — `cd apps/web && npx vitest run app/api/synastry/__tests__/route.test.ts` → PASS (5 tests).

- [ ] **Step 5: Suite completa web** — `cd apps/web && npx vitest run` → 183 tests (178 + 5), 0 fallas.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/synastry/route.ts apps/web/app/api/synastry/__tests__/route.test.ts
git commit -m "fix(movil-compat): /api/synastry acepta Bearer (authenticateRoute) para móvil"
```

---

### Task 2: Backend — swap Bearer en `/api/chat`

**Files:**
- Modify: `apps/web/app/api/chat/route.ts`
- Create: `apps/web/app/api/chat/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `authenticateRoute` (mismo que Task 1).
- Produces: sin cambio de contrato — `POST /api/chat` sigue devolviendo el stream `text/plain` o `{available:false,...}` JSON.

- [ ] **Step 1: Test que falla** — `apps/web/app/api/chat/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

vi.mock("@aluna/ephemeris", () => ({
  computeChart: vi.fn(() => ({ bodies: [], houses: { ascendant: 0, midheaven: 0 }, patterns: [] })),
  setEphePath: vi.fn(),
}));
vi.mock("@aluna/core", () => ({
  computeNumerology: vi.fn(() => ({ core: { lifePath: { value: 1 }, expression: { value: 1 }, soulUrge: { value: 1 }, personality: { value: 1 }, maturity: { value: 1 } } })),
  signOfLongitude: vi.fn(() => ({ sign: "aries" })),
}));
vi.mock("@/lib/content/astrology-labels", () => ({
  astroLabels: () => ({ bodies: {}, signs: {}, dignities: {}, patterns: {} }),
}));

const resolveReadingProviderMock = vi.fn();
vi.mock("@/lib/reading/provider", () => ({
  resolveReadingProvider: () => resolveReadingProviderMock(),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

import { POST } from "../route";

function fakeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

const VALID_BODY = { profileId: "p1", locale: "es", messages: [{ role: "user", content: "hola" }] };

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: null });
  });

  it("401 sin usuario autenticado", async () => {
    const res = await POST(fakeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ available: false, error: "unauthorized" });
  });

  it("pasa el request a authenticateRoute", async () => {
    const req = fakeRequest(VALID_BODY, { authorization: "Bearer token-xyz" });
    await POST(req);
    expect(authenticateRouteMock).toHaveBeenCalledWith(req);
  });

  it("available:false si no hay proveedor IA resuelto (dormant)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: { from: fromMock }, user: { id: "user-1" } });
    maybeSingleMock.mockResolvedValue({ data: { name: "Gio", birth_date: "1990-01-01", birth_time: "10:00", time_known: true, latitude: 1, longitude: 1, time_zone: "UTC", gender: "masculine" } });
    resolveReadingProviderMock.mockReturnValue({ available: false });
    const res = await POST(fakeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false });
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run app/api/chat/__tests__/route.test.ts` → FAIL (mismo motivo que Task 1: la ruta actual no llama a `authenticateRoute`).

- [ ] **Step 3: Implementación** — en `apps/web/app/api/chat/route.ts`, mismo swap exacto que Task 1:

```ts
// ANTES:
import { createClient } from "@/lib/supabase/server";
// ...
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });

// DESPUÉS:
import { authenticateRoute } from "@/lib/supabase/route-auth";
// ...
const { supabase, user } = await authenticateRoute(request);
if (!user) return NextResponse.json({ available: false, error: "unauthorized" }, { status: 401 });
```

- [ ] **Step 4: Verlo pasar** — `cd apps/web && npx vitest run app/api/chat/__tests__/route.test.ts` → PASS (3 tests).

- [ ] **Step 5: Suite completa web** — `cd apps/web && npx vitest run` → 186 tests, 0 fallas.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/chat/route.ts apps/web/app/api/chat/__tests__/route.test.ts
git commit -m "fix(movil-compat): /api/chat acepta Bearer (authenticateRoute) — desbloquea Preguntar a futuro"
```

---

### Task 3: Móvil — `fetchAllProfiles` (lista de personas propias)

**Files:**
- Modify: `apps/mobile/lib/profile-sync.ts`
- Modify: `apps/mobile/lib/__tests__/profile-sync.test.ts`

**Interfaces:**
- Consumes: `AlunaSupabaseClient` (de `getSupabase()`, ya usado en el resto del archivo), `rowToProfile` (misma función existente).
- Produces: `fetchAllProfiles(supabase: AlunaSupabaseClient, userId: string): Promise<Profile[]>` — para Task 7 (picker de compatibilidad).

- [ ] **Step 1: Test que falla** — añade a `apps/mobile/lib/__tests__/profile-sync.test.ts` (mismo archivo, mismo `row`/`profile` de fixture ya definidos arriba):

```ts
import { fetchAllProfiles } from "../profile-sync";

describe("fetchAllProfiles", () => {
  it("mapea todas las filas del usuario a Profile, ordenadas por created_at", async () => {
    const rowB = { ...row, id: "row-2", name: "Segunda Persona", created_at: "2026-02-01T00:00:00Z" };
    const orderMock = vi.fn().mockResolvedValue({ data: [row, rowB] });
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const supabase = { from: vi.fn(() => ({ select: selectMock })) } as unknown as AlunaSupabaseClient;

    const result = await fetchAllProfiles(supabase, "user-1");

    expect(supabase.from).toHaveBeenCalledWith("birth_profiles");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual([{ ...profile, id: "row-1" }, { ...profile, id: "row-2", name: "Segunda Persona" }]);
  });

  it("lista vacía si el usuario no tiene perfiles", async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: null });
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const supabase = { from: vi.fn(() => ({ select: selectMock })) } as unknown as AlunaSupabaseClient;

    expect(await fetchAllProfiles(supabase, "user-1")).toEqual([]);
  });
});
```

Añade también el import que falte al inicio del archivo: `import { vi, type Mock } from "vitest";` ya está cubierto por `import { describe, it, expect } from "vitest"` existente — agrega `vi` a esa línea si no está.

- [ ] **Step 2: Verlo fallar** — `cd apps/mobile && npx vitest run lib/__tests__/profile-sync.test.ts` → FAIL (`fetchAllProfiles` no existe).

- [ ] **Step 3: Implementación** — añade al final de `apps/mobile/lib/profile-sync.ts`:

```ts
/** Todos los birth_profiles del usuario (RLS ya limita a los suyos), más viejo primero
 *  — el índice 0 es el perfil "activo" por convención de creación. Para el picker de
 *  Compatibilidad (elegir entre TÚ + las demás personas guardadas). */
export async function fetchAllProfiles(
  supabase: AlunaSupabaseClient,
  userId: string,
): Promise<Profile[]> {
  const { data } = await supabase
    .from("birth_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToProfile);
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/mobile && npx vitest run lib/__tests__/profile-sync.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/profile-sync.ts apps/mobile/lib/__tests__/profile-sync.test.ts
git commit -m "feat(movil-compat): fetchAllProfiles — lista de personas guardadas del usuario"
```

---

### Task 4: Móvil — `lib/synastry-api.ts` (cliente del endpoint)

**Files:**
- Create: `apps/mobile/lib/synastry-api.ts`
- Create: `apps/mobile/lib/__tests__/synastry-api.test.ts`

**Interfaces:**
- Consumes: `apiUrl()` de `./config` (ya existe).
- Produces: `SynastryReport`/`SynastryThemeScore`/`SynastryDriver` (tipos locales, espejo de `@aluna/core`), `fetchSynastry(params): Promise<SynastryReport>`, `SynastryApiError` — usados por Task 7.

- [ ] **Step 1: Test que falla** — `apps/mobile/lib/__tests__/synastry-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSynastry, SynastryApiError } from "../synastry-api";

const originalFetch = global.fetch;

describe("fetchSynastry", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama POST /api/synastry con Bearer y el body correcto", async () => {
    const report = { overall: 82, tone: "high", themes: [], aspects: [] };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => report,
    });

    const result = await fetchSynastry({ accessToken: "token-abc", profileIdA: "a", profileIdB: "b" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/synastry"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer token-abc" }),
        body: JSON.stringify({ profileIdA: "a", profileIdB: "b" }),
      }),
    );
    expect(result).toEqual(report);
  });

  it("lanza SynastryApiError con el status si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchSynastry({ accessToken: "t", profileIdA: "a", profileIdB: "b" })).rejects.toThrow(SynastryApiError);
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/mobile && npx vitest run lib/__tests__/synastry-api.test.ts` → FAIL (`../synastry-api` no existe).

- [ ] **Step 3: Implementación** — `apps/mobile/lib/synastry-api.ts`:

```ts
// apps/mobile/lib/synastry-api.ts
// Cliente de /api/synastry (compatibilidad) con Bearer — mismo patrón que
// chart-api.ts. El cómputo (motor de efemérides + synastryReport) es
// server-only; el móvil NUNCA importa @aluna/ephemeris ni @aluna/core/astrology.
import { apiUrl } from "./config";

export type SynastryTheme = "attraction" | "communication" | "harmony" | "growth";
export type SynastryTone = "low" | "mixed" | "high";

export interface SynastryDriver {
  a: string;
  b: string;
  aspect: string;
  orb: number;
  harmony: "soft" | "hard" | "neutral";
  favorable: boolean;
}

export interface SynastryThemeScore {
  key: SynastryTheme;
  score: number;
  tone: SynastryTone;
  drivers: SynastryDriver[];
}

export interface SynastryReport {
  overall: number;
  tone: SynastryTone;
  themes: SynastryThemeScore[];
  aspects: unknown[];
}

export class SynastryApiError extends Error {
  constructor(public status: number) {
    super(`synastry_${status}`);
  }
}

export async function fetchSynastry(params: {
  accessToken: string;
  profileIdA: string;
  profileIdB: string;
}): Promise<SynastryReport> {
  const res = await fetch(`${apiUrl()}/api/synastry`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileIdA: params.profileIdA, profileIdB: params.profileIdB }),
  });
  if (!res.ok) throw new SynastryApiError(res.status);
  return (await res.json()) as SynastryReport;
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/mobile && npx vitest run lib/__tests__/synastry-api.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/synastry-api.ts apps/mobile/lib/__tests__/synastry-api.test.ts
git commit -m "feat(movil-compat): cliente fetchSynastry de /api/synastry con Bearer"
```

---

### Task 5: Móvil — strings i18n (universo + compatibilidad)

**Files:**
- Modify: `apps/mobile/lib/strings.ts`

**Interfaces:**
- Produces: claves `universo.*` y `compat.*` en `STRINGS.es` y `STRINGS.en`, consumidas por Task 6 y Task 7 vía `useT().t("universo.title")` etc.

- [ ] **Step 1: no aplica TDD aquí** (son datos estáticos, no lógica) — añade directamente, verificando después con el test de paridad `app/__tests__/i18n.test.tsx` que ya existe en la web (equivalente estructural) y su par en móvil si existe.

Primero confirma si móvil tiene test de paridad es/en:

```bash
cd apps/mobile && grep -rn "STRINGS.es\|STRINGS.en" lib/__tests__/ 2>/dev/null
```

Si no existe uno, este Task no rompe nada porque `lookup()` (en `i18n-context.tsx`) ya tolera claves faltantes sin crashear — pero AÚN ASÍ escribe ambos locales completos, es la regla del proyecto.

- [ ] **Step 2: añade en `STRINGS.es`**, después del bloque `nav: {...}` (mismo nivel que `hoy`, `carta`, etc.):

```ts
    universo: {
      eyebrow: "Tu universo",
      compatTitle: "Compatibilidad",
      compatBody: "El cielo entre dos",
      informesTitle: "Informes",
      informesBody: "Tu carta en profundidad",
      preguntarTitle: "Pregúntale a Aluna",
      preguntarBody: "Te respondo desde tu cielo",
    },
    compat: {
      eyebrow: "Compatibilidad",
      title: "El cielo entre dos personas",
      subtitle: "¿Con quién quieres mirar el cielo?",
      you: "Tú",
      withWhom: "Y…",
      needSecondTitle: "Añade otra persona para comparar",
      needSecondBody: "Todavía no tienes un segundo perfil guardado. Por ahora, crea a la otra persona desde la web — pronto podrás hacerlo aquí también.",
      cta: "Ver el vínculo",
      loading: "Leyendo el cielo entre ustedes…",
      error: "No se pudo leer el vínculo. Inténtalo de nuevo.",
      of100: "de 100",
      framing: "La sinastría no dice si encajan, sino dónde se reflejan. Un mapa del terreno que comparten, no un veredicto.",
      themeAttraction: "Atracción",
      themeCommunication: "Comunicación",
      themeHarmony: "Armonía",
      themeGrowth: "Crecimiento",
      growthHint: "fricción fértil",
      noDrivers: "Sin contactos marcados en este tema.",
    },
```

- [ ] **Step 3: añade el espejo en `STRINGS.en`**, mismo lugar relativo (después de `nav: {...}`):

```ts
    universo: {
      eyebrow: "Your universe",
      compatTitle: "Compatibility",
      compatBody: "The sky between two",
      informesTitle: "Reports",
      informesBody: "Your chart in depth",
      preguntarTitle: "Ask Aluna",
      preguntarBody: "I answer from your sky",
    },
    compat: {
      eyebrow: "Compatibility",
      title: "The sky between two people",
      subtitle: "Who do you want to look at the sky with?",
      you: "You",
      withWhom: "And…",
      needSecondTitle: "Add another person to compare",
      needSecondBody: "You don't have a second saved profile yet. For now, create the other person from the web — soon you'll be able to do it here too.",
      cta: "See the bond",
      loading: "Reading the sky between you…",
      error: "Couldn't read the bond. Try again.",
      of100: "of 100",
      framing: "Synastry doesn't say whether you fit, but where you mirror each other. A map of the terrain you share, not a verdict.",
      themeAttraction: "Attraction",
      themeCommunication: "Communication",
      themeHarmony: "Harmony",
      themeGrowth: "Growth",
      growthHint: "fertile friction",
      noDrivers: "No contacts marked in this theme.",
    },
```

- [ ] **Step 4: verifica que las claves cuadran en ambos locales** (mismo número, mismo orden):

```bash
cd apps/mobile && node -e "
const { STRINGS } = require('./lib/strings.ts');
" 2>&1 | head -5
# Si el require directo de .ts falla (ESM), en su lugar corre el test suite completo del paquete —
# cualquier desalineación estructural la revienta un test existente de i18n si lo hay, o inspección manual:
```

Inspección manual: `Object.keys(STRINGS.es.universo)` debe ser igual (mismo orden) a `Object.keys(STRINGS.en.universo)`, y lo mismo para `compat`.

- [ ] **Step 5: suite completa móvil** — `cd apps/mobile && npx vitest run` → sigue en 24/24 (no se añadieron tests en este task, es contenido).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib/strings.ts
git commit -m "feat(movil-compat): strings es/en — universo (hub) y compat (compatibilidad)"
```

---

### Task 6: Móvil — hub "Tu universo" en Hoy

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `t("universo.*")` (Task 5), `router.push("/compatibilidad")` (ruta creada en Task 7 — expo-router la resuelve por convención de archivo, no hace falta registrarla), componentes `Card`/`FadeIn` ya importados en el archivo.
- Produces: sección visual nueva en Hoy; sin cambios de tipos ni de props expuestas a otros archivos.

- [ ] **Step 1: no aplica TDD** (cambio de UI puro en una screen ya existente sin lógica nueva testeable de forma aislada — el patrón del repo para `index.tsx` no tiene tests de screen, solo de sus helpers puros). Verificación = Step 4 (correr la app).

- [ ] **Step 2: edita `apps/mobile/app/(tabs)/index.tsx`** — inserta la sección ANTES de `<Text style={styles.sectionLabel}>{t("hoy.soon")}</Text>` (o sea, entre el card de Pilares y esa línea):

```tsx
        <FadeIn delay={150} style={styles.cardGapMd}>
          <Text style={styles.sectionLabel}>{t("universo.eyebrow")}</Text>
          <Pressable onPress={() => router.push("/compatibilidad")} style={styles.cardGapMd}>
            <Card accent>
              <Text style={styles.soonTitle}>{t("universo.compatTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.compatBody")}</Text>
            </Card>
          </Pressable>
          <View style={styles.cardGapMd}>
            <Card>
              <Text style={styles.soonTitle}>{t("universo.informesTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.informesBody")}</Text>
              <SoonBadge label={t("settings.soon")} />
            </Card>
          </View>
          <Card>
            <Text style={styles.soonTitle}>{t("universo.preguntarTitle")}</Text>
            <Text style={styles.soonBody}>{t("universo.preguntarBody")}</Text>
            <SoonBadge label={t("settings.soon")} />
          </Card>
        </FadeIn>
```

Añade `SoonBadge` al import existente de `"../../components/ui"` (ya importa `Card, FadeIn, SoonBadge` — verifica que `SoonBadge` esté en esa línea; si no, agrégalo).

- [ ] **Step 3: type-check** — `cd apps/mobile && npx tsc --noEmit` → sin errores.

- [ ] **Step 4: correr la app y verificar de verdad** (Fase 5 del skill, no lo saltes aquí tampoco a nivel de humo): `cd apps/mobile && npx expo start` (o el comando que ya use el proyecto), abrir en simulador/Expo Go, entrar a Hoy, confirmar que la sección "Tu universo" aparece con las 3 cards y que tocar "Compatibilidad" navega (aunque la pantalla destino aún no exista hasta Task 7 — en ese punto puede dar 404 de router, es esperado hasta completar Task 7).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(movil-compat): hub 'Tu universo' en Hoy — entradas Compatibilidad/Informes/Preguntar"
```

---

### Task 7: Móvil — pantalla `app/compatibilidad.tsx` (selección + resultado)

**Files:**
- Create: `apps/mobile/app/compatibilidad.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`session.access_token`), `useProfile()` (`profile` — el activo, "Tú"), `useTheme()`, `useT()`, `fetchAllProfiles` (Task 3), `fetchSynastry`/`SynastryReport`/`SynastryApiError` (Task 4), `Card`/`Chip`/`FadeIn` de `components/ui`, `getSupabase()` de `lib/supabase`.
- Produces: ruta `/compatibilidad` (push, fuera de tabs) — pantalla terminal de este plan, nada más la consume.

- [ ] **Step 1: no aplica TDD de unidad** (es una screen RN completa; el repo no testea screens directamente — su lógica de red ya está testeada en Task 3/4, y la máquina de estados se verifica ejecutando la app, Fase 5). Se escribe completa y se verifica corriendo.

- [ ] **Step 2: implementación completa** — `apps/mobile/app/compatibilidad.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Chip, FadeIn } from "../components/ui";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useProfile } from "../lib/profile-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { getSupabase } from "../lib/supabase";
import { fetchAllProfiles } from "../lib/profile-sync";
import { fetchSynastry, SynastryApiError, type SynastryReport, type SynastryTheme } from "../lib/synastry-api";
import type { Profile } from "../lib/profile";
import { fonts, space, radius, type as typeScale, type ThemeTokens } from "../theme/tokens";

type State =
  | { s: "picking" }
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; report: SynastryReport };

const THEME_ORDER: SynastryTheme[] = ["attraction", "communication", "harmony", "growth"];

export default function CompatibilidadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [people, setPeople] = useState<Profile[] | null>(null);
  const [idA, setIdA] = useState<string | null>(profile?.id ?? null);
  const [idB, setIdB] = useState<string | null>(null);
  const [state, setState] = useState<State>({ s: "picking" });
  const [expanded, setExpanded] = useState<SynastryTheme | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    let alive = true;
    fetchAllProfiles(getSupabase(), session.user.id).then((list) => {
      if (alive) setPeople(list);
    });
    return () => {
      alive = false;
    };
  }, [session?.user.id]);

  // cambiar cualquier selección invalida un resultado ya mostrado
  function pick(which: "A" | "B", id: string) {
    if (which === "A") setIdA(id === idB ? idA : id);
    else setIdB(id === idA ? idB : id);
    if (state.s !== "picking") setState({ s: "picking" });
  }

  async function compare() {
    if (!idA || !idB || !session?.access_token) return;
    setState({ s: "loading" });
    try {
      const report = await fetchSynastry({ accessToken: session.access_token, profileIdA: idA, profileIdB: idB });
      setState({ s: "ready", report });
    } catch (e) {
      setState({ s: "error" });
    }
  }

  const back = () => router.back();

  if (people === null) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
      </View>
    );
  }

  if (people.length < 2) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <View style={styles.emptyWrap}>
          <Enso size={44} />
          <Text style={styles.emptyTitle}>{t("compat.needSecondTitle")}</Text>
          <Text style={styles.emptyBody}>{t("compat.needSecondBody")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header t={t} styles={styles} onBack={back} />
      <ScrollView
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: insets.bottom + space.xxxl, paddingHorizontal: space.xl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>{t("compat.title")}</Text>
          <Text style={styles.subtitle}>{t("compat.subtitle")}</Text>
        </FadeIn>

        <FadeIn delay={60} style={styles.cardGap}>
          <Picker label={t("compat.you")} people={people} selectedId={idA} otherId={idB} onPick={(id) => pick("A", id)} styles={styles} />
        </FadeIn>

        <FadeIn delay={120} style={styles.cardGap}>
          <Picker label={t("compat.withWhom")} people={people} selectedId={idB} otherId={idA} onPick={(id) => pick("B", id)} styles={styles} />
        </FadeIn>

        {state.s === "ready" && (
          <FadeIn delay={0} style={styles.cardGap}>
            <ResultCard report={state.report} t={t} styles={styles} tk={tk} expanded={expanded} setExpanded={setExpanded} />
          </FadeIn>
        )}

        {state.s === "error" && <Text style={styles.note}>{t("compat.error")}</Text>}

        <Pressable
          onPress={compare}
          disabled={!idA || !idB || state.s === "loading"}
          style={[styles.cta, (!idA || !idB || state.s === "loading") && styles.ctaDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{state.s === "loading" ? t("compat.loading") : t("compat.cta")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Header({ t, styles, onBack }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles>; onBack: () => void }) {
  return (
    <View style={[styles.header]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{t("compat.eyebrow")}</Text>
    </View>
  );
}

function Picker({
  label,
  people,
  selectedId,
  otherId,
  onPick,
  styles,
}: {
  label: string;
  people: Profile[];
  selectedId: string | null;
  otherId: string | null;
  onPick: (id: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerRow}>
        {people.map((p) => {
          if (!p.id) return null;
          const disabled = p.id === otherId;
          return (
            <Chip
              key={p.id}
              label={p.name}
              kind="control"
              selected={p.id === selectedId}
              onPress={disabled ? undefined : () => onPick(p.id!)}
            />
          );
        })}
      </View>
    </View>
  );
}

function ResultCard({
  report,
  t,
  styles,
  tk,
  expanded,
  setExpanded,
}: {
  report: SynastryReport;
  t: (k: string) => string;
  styles: ReturnType<typeof makeStyles>;
  tk: ThemeTokens;
  expanded: SynastryTheme | null;
  setExpanded: (v: SynastryTheme | null) => void;
}) {
  const themeLabel: Record<SynastryTheme, string> = {
    attraction: t("compat.themeAttraction"),
    communication: t("compat.themeCommunication"),
    harmony: t("compat.themeHarmony"),
    growth: t("compat.themeGrowth"),
  };
  return (
    <Card accent>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreNum} maxFontSizeMultiplier={1.2}>{report.overall}</Text>
        <Text style={styles.scoreOf}>{t("compat.of100")}</Text>
      </View>
      {THEME_ORDER.map((key) => {
        const theme = report.themes.find((th) => th.key === key);
        if (!theme) return null;
        const isOpen = expanded === key;
        return (
          <Pressable key={key} onPress={() => setExpanded(isOpen ? null : key)} style={styles.themeRow}>
            <View style={styles.themeHead}>
              <Text style={styles.themeName}>
                {themeLabel[key]}
                {key === "growth" && <Text style={styles.themeHint}>  {t("compat.growthHint")}</Text>}
              </Text>
              <Text style={styles.themeScore}>{theme.score}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${theme.score}%`, backgroundColor: tk.acc }]} />
            </View>
            {isOpen && (
              <Text style={styles.driversText}>
                {theme.drivers.length > 0
                  ? theme.drivers.map((d) => `${d.a} ${d.aspect} ${d.b}`).join(" · ")
                  : t("compat.noDrivers")}
              </Text>
            )}
          </Pressable>
        );
      })}
      <Text style={styles.framing}>{t("compat.framing")}</Text>
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    title: { color: t.text, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi, marginTop: space.lg },
    subtitle: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.sm },
    cardGap: { marginTop: space.xl },
    pickerLabel: { color: t.textFaint, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi, marginBottom: space.sm },
    pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl },
    emptyTitle: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi, textAlign: "center" },
    emptyBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", lineHeight: 20 },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", marginTop: space.lg },
    cta: { marginTop: space.xxl, backgroundColor: t.acc, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: "center" },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: t.onAcc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    scoreRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space.xs, marginBottom: space.lg },
    scoreNum: { color: t.acc, fontSize: typeScale.display, fontFamily: fonts.serifSemi },
    scoreOf: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans },
    themeRow: { marginTop: space.md },
    themeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    themeName: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    themeHint: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans },
    themeScore: { color: t.acc, fontSize: typeScale.lg, fontFamily: fonts.serif },
    track: { height: 5, borderRadius: radius.pill, backgroundColor: t.accHair, marginTop: space.xs, overflow: "hidden" },
    fill: { height: "100%", borderRadius: radius.pill },
    driversText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.sm },
    framing: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, textAlign: "center", marginTop: space.xl, lineHeight: 18 },
  });
}
```

Todos los nombres de token usados arriba están confirmados contra `apps/mobile/theme/tokens.ts`: `space` = `{xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,xxxl:48}`, `radius.pill` = 999, `type` (importado como `typeScale`) = `{xs2:11,xs:12,sm:13,md:15,lg:17,xl:20,xl2:24,xl3:32,displaySm:44,display:60}`, `fonts.{serif,serifItalic,serifSemi,sans,sansSemi}` existen tal cual. Nota: esta es la escala tipográfica **propia y ya establecida del app RN** (10 pasos compartidos por las 5 pantallas existentes) — es distinta de la escala de 4 tamaños de los mockups HTML (esos eran prototipo visual, no el sistema de producción); esta pantalla sigue el patrón real del código, como manda la Fase 0.

- [ ] **Step 3: type-check** — `cd apps/mobile && npx tsc --noEmit` → sin errores.

- [ ] **Step 4: suite completa móvil** — `cd apps/mobile && npx vitest run` → sigue verde (no se añaden tests de screen en este task).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/compatibilidad.tsx
git commit -m "feat(movil-compat): pantalla Compatibilidad — selección + resultado (dial, 4 barras, drivers)"
```

---

## Cierre del plan (Fase 5 del skill — obligatoria, no la saltes)

Después del Task 7:
1. **Corre la app de verdad** (Expo, simulador o Expo Go) con una sesión real que tenga ≥2 perfiles en `birth_profiles` — confirma: el hub aparece en Hoy, la navegación a `/compatibilidad` funciona, el picker lista las personas correctas, seleccionar A=B no deja elegir el mismo, "Ver el vínculo" llama a `/api/synastry` con Bearer y muestra el score real, expandir un tema muestra sus drivers, y con <2 perfiles se ve el empty-state (no una pantalla rota).
2. Si algo no se comporta como se espera, arregla y repite — no cierres el loop con solo tests verdes.
3. Revisión adversarial (multi-lente: corrección, edge cases, fallos silenciosos) antes de dar la feature por terminada — especialmente sobre Task 1/2 (superficie de auth) y Task 7 (manejo de `session`/`profile` nulos).
