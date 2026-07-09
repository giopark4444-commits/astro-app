# Fase 4a — Infraestructura de cobro (Dodo Payments) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la infraestructura de cobro de Aluna Plus — tabla de suscripción, checkout web con Dodo Payments, webhook que mantiene el estado, portal de gestión, y la tarjeta de "Tu plan" en Ajustes (web con acciones, móvil solo lectura) — sin gatear todavía ninguna función existente (eso es 4d).

**Architecture:** Checkout hospedado por Dodo (redirect) + webhook como única fuente de verdad del estado (mismo patrón `service_role` ya usado por `reading_cache`). El móvil NUNCA vende ni menciona compra — solo lee la tabla `subscriptions` por RLS.

**Tech Stack:** Dodo Payments SDK (`dodopayments` npm), Next.js 15 Route Handlers, Supabase (Postgres + RLS + función `security definer`), TypeScript strict, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-fase4a-cobro-dodo-design.md`.
- **El móvil nunca vende ni menciona compra dentro de la app** — solo lectura de `subscriptions` por RLS, con nota "Gestiona tu suscripción en aluna.app".
- Precio: Aluna Plus $4.99/mes o $39.99/año, **14 días de prueba** (`subscription_data.trial_period_days: 14`).
- Estado de suscripción vive en su PROPIA tabla `subscriptions` (no en `settings`) — una tabla por responsabilidad, convención ya establecida en este esquema.
- Solo el webhook (`service_role`) escribe en `subscriptions`; los usuarios solo leen su propia fila (RLS).
- Resolución de usuario en el webhook: por `data.customer.email` vía función SQL `security definer` `user_id_by_email()` — **NO** por `metadata` (no confirmado que se propague al evento).
- Firma de webhook: Standard Webhooks spec — headers `webhook-id`/`webhook-signature` (`v1,<b64>`)/`webhook-timestamp`; HMAC-SHA256 de `${timestamp}.${rawBody}`, comparación de tiempo constante, rechazar si el timestamp tiene más de 5 minutos.
- Comentarios en español. Gate web: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Gate del monorepo tras tocar `packages/core`/`packages/supabase`: `npx pnpm -w exec turbo run typecheck test`.
- Nada de esto se prueba en vivo con un cobro real sin las llaves de Gio (Dodo API key + webhook secret + IDs de producto) — los gates de código no dependen de eso, la verificación en vivo sí (Task 10).

---

### Task 1: Base de datos — tabla `subscriptions` + función `user_id_by_email`

**Files:**
- Create: `supabase/migrations/0005_subscriptions.sql`
- Modify: `packages/supabase/src/database.types.ts`

**Interfaces:**
- Produces: tabla `public.subscriptions` (columnas: `user_id`, `dodo_customer_id`, `dodo_subscription_id`, `plan`, `status`, `current_period_end`, `created_at`, `updated_at`); función `public.user_id_by_email(lookup_email text) returns uuid`; tipos `Tables<"subscriptions">`, `TablesInsert<"subscriptions">`, `TablesUpdate<"subscriptions">` desde `@aluna/supabase`.

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/0005_subscriptions.sql
-- Estado de Aluna Plus. Tabla propia (no en `settings`) — una tabla por
-- responsabilidad, igual que birth_profiles/charts/reading_cache. Solo el
-- webhook de Dodo (service_role) escribe; el usuario solo lee la suya.
create table public.subscriptions (
  user_id uuid primary key references public.profiles_user(id) on delete cascade,
  dodo_customer_id text not null,
  dodo_subscription_id text not null unique,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "own subscription select"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Sin políticas de insert/update/delete para anon/authenticated: solo
-- service_role escribe (igual que reading_cache, ver 0004).

-- Resuelve el user_id de Aluna a partir del email que manda el webhook de
-- Dodo (data.customer.email) — mismo patrón security definer que ya usa
-- handle_new_user() en 0001_core_schema.sql para leer auth.users con
-- privilegio elevado, sin exponer esa tabla por RLS normal.
create or replace function public.user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lookup_email limit 1;
$$;

revoke execute on function public.user_id_by_email(text) from anon, authenticated, public;
grant execute on function public.user_id_by_email(text) to service_role;
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase remoto (`xcilrdpcanielalpfvld`)**

Usa la herramienta MCP de Supabase para aplicarla en vivo:

```
mcp__plugin_supabase_supabase__apply_migration
  project_id: xcilrdpcanielalpfvld
  name: subscriptions
  query: <el contenido completo del Step 1>
```

Verifica con `mcp__plugin_supabase_supabase__list_tables` (o `execute_sql` con
`select * from public.subscriptions limit 0;`) que la tabla existe, y con
`mcp__plugin_supabase_supabase__get_advisors` (tipo `security`) que no hay
hallazgos nuevos de RLS sobre `subscriptions`.

- [ ] **Step 3: Añadir el tipo a mano en `database.types.ts`**

En `packages/supabase/src/database.types.ts`, dentro de `Database.public.Tables`,
justo DESPUÉS de la entrada `settings` (orden alfabético: `settings` < `subscriptions`)
y ANTES del cierre `};` del objeto `Tables`:

```ts
      // Añadida a mano junto con supabase/migrations/0005_subscriptions.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          dodo_customer_id: string;
          dodo_subscription_id: string;
          plan: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          dodo_customer_id: string;
          dodo_subscription_id: string;
          plan: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          dodo_customer_id?: string;
          dodo_subscription_id?: string;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
```

- [ ] **Step 4: Verificar**

Run: `cd packages/supabase && npx tsc --noEmit -p tsconfig.json`
Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_subscriptions.sql packages/supabase/src/database.types.ts
git commit -m "feat(billing): tabla subscriptions + user_id_by_email (aplicada al proyecto remoto)"
```

---

### Task 2: Core — `isPlusActive` (puro, compartido web+móvil)

**Files:**
- Create: `packages/core/src/billing/subscription.ts`
- Test: `packages/core/src/billing/__tests__/subscription.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled"`; `interface SubscriptionRow { status: SubscriptionStatus; currentPeriodEnd: string | null }`; `isPlusActive(row: SubscriptionRow | null, now?: Date): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/billing/__tests__/subscription.test.ts
import { describe, it, expect } from "vitest";
import { isPlusActive } from "../subscription";

describe("isPlusActive", () => {
  it("false si no hay fila (nunca se suscribió)", () => {
    expect(isPlusActive(null)).toBe(false);
  });
  it("false si status es past_due o cancelled", () => {
    expect(isPlusActive({ status: "past_due", currentPeriodEnd: null })).toBe(false);
    expect(isPlusActive({ status: "cancelled", currentPeriodEnd: null })).toBe(false);
  });
  it("true con status active/trialing y sin fecha de fin (aún no llegó el primer webhook completo)", () => {
    expect(isPlusActive({ status: "active", currentPeriodEnd: null })).toBe(true);
    expect(isPlusActive({ status: "trialing", currentPeriodEnd: null })).toBe(true);
  });
  it("true si currentPeriodEnd es futuro respecto a `now`", () => {
    const now = new Date("2026-07-09T00:00:00Z");
    expect(isPlusActive({ status: "active", currentPeriodEnd: "2026-08-01T00:00:00Z" }, now)).toBe(true);
  });
  it("false si currentPeriodEnd ya pasó respecto a `now` (aunque el status no se haya actualizado aún)", () => {
    const now = new Date("2026-07-09T00:00:00Z");
    expect(isPlusActive({ status: "active", currentPeriodEnd: "2026-07-01T00:00:00Z" }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/billing/__tests__/subscription.test.ts`
Expected: FAIL — cannot resolve `../subscription`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/billing/subscription.ts
// Deriva si una cuenta tiene Aluna Plus activo. Puro y RN-safe (usado tal
// cual por web y móvil) — no importa nada de Supabase, recibe los datos ya
// leídos. `now` es inyectable para tests deterministas (mismo patrón que
// jieBoundaries/luckPillars en el motor Ba Zi).
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface SubscriptionRow {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export function isPlusActive(row: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!row) return false;
  if (row.status !== "trialing" && row.status !== "active") return false;
  if (!row.currentPeriodEnd) return true;
  return new Date(row.currentPeriodEnd) > now;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/billing/__tests__/subscription.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export { isPlusActive, type SubscriptionStatus, type SubscriptionRow } from "./billing/subscription";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/billing/subscription.ts packages/core/src/billing/__tests__/subscription.test.ts packages/core/src/index.ts
git commit -m "feat(billing): isPlusActive puro y compartido (web+móvil)"
```

---

### Task 3: Web — verificación de firma del webhook (puro)

**Files:**
- Create: `apps/web/lib/billing/dodo-webhook.ts`
- Test: `apps/web/lib/billing/__tests__/dodo-webhook.test.ts`

**Interfaces:**
- Produces: `verifyDodoSignature(params: { rawBody: string; signatureHeader: string | null; timestampHeader: string | null; secret: string; now?: number }): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/billing/__tests__/dodo-webhook.test.ts
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyDodoSignature } from "../dodo-webhook";

const SECRET = "whsec_test_1234567890";

function sign(rawBody: string, timestamp: string, secret: string): string {
  const signed = `${timestamp}.${rawBody}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("base64");
  return `v1,${sig}`;
}

describe("verifyDodoSignature (Standard Webhooks spec)", () => {
  it("true con firma válida y timestamp fresco", () => {
    const rawBody = '{"type":"subscription.active"}';
    const nowSec = Math.floor(Date.now() / 1000);
    const timestampHeader = String(nowSec);
    const signatureHeader = sign(rawBody, timestampHeader, SECRET);
    expect(
      verifyDodoSignature({ rawBody, signatureHeader, timestampHeader, secret: SECRET, now: nowSec * 1000 }),
    ).toBe(true);
  });
  it("false con firma incorrecta", () => {
    const rawBody = '{"type":"subscription.active"}';
    const timestampHeader = String(Math.floor(Date.now() / 1000));
    expect(
      verifyDodoSignature({
        rawBody,
        signatureHeader: "v1,firmaFalsa==",
        timestampHeader,
        secret: SECRET,
      }),
    ).toBe(false);
  });
  it("false si el body fue alterado después de firmar", () => {
    const timestampHeader = String(Math.floor(Date.now() / 1000));
    const signatureHeader = sign('{"type":"subscription.active"}', timestampHeader, SECRET);
    expect(
      verifyDodoSignature({
        rawBody: '{"type":"subscription.cancelled"}',
        signatureHeader,
        timestampHeader,
        secret: SECRET,
      }),
    ).toBe(false);
  });
  it("false si faltan headers", () => {
    expect(
      verifyDodoSignature({ rawBody: "{}", signatureHeader: null, timestampHeader: "123", secret: SECRET }),
    ).toBe(false);
    expect(
      verifyDodoSignature({ rawBody: "{}", signatureHeader: "v1,x", timestampHeader: null, secret: SECRET }),
    ).toBe(false);
  });
  it("false si el timestamp tiene más de 5 minutos de diferencia (anti-replay)", () => {
    const rawBody = "{}";
    const oldSec = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás
    const timestampHeader = String(oldSec);
    const signatureHeader = sign(rawBody, timestampHeader, SECRET);
    expect(
      verifyDodoSignature({ rawBody, signatureHeader, timestampHeader, secret: SECRET, now: Date.now() }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/billing/__tests__/dodo-webhook.test.ts`
Expected: FAIL — cannot resolve `../dodo-webhook`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/billing/dodo-webhook.ts
// Verificación de firma de los webhooks de Dodo Payments (Standard Webhooks
// spec: https://standardwebhooks.com/): HMAC-SHA256 en base64 de
// "{timestamp}.{rawBody}", header "webhook-signature: v1,<firma>", más una
// ventana anti-replay de 5 minutos sobre "webhook-timestamp" (epoch segundos).
// Server-only (node:crypto).
import crypto from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function verifyDodoSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { rawBody, signatureHeader, timestampHeader, secret, now = Date.now() } = params;
  if (!signatureHeader || !timestampHeader) return false;

  const provided = signatureHeader.split(",")[1];
  if (!provided) return false;

  const signedPayload = `${timestampHeader}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return false;

  const eventMs = Number(timestampHeader) * 1000;
  if (!Number.isFinite(eventMs)) return false;
  return Math.abs(now - eventMs) <= MAX_CLOCK_SKEW_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/billing/__tests__/dodo-webhook.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/billing/dodo-webhook.ts apps/web/lib/billing/__tests__/dodo-webhook.test.ts
git commit -m "feat(billing): verificación de firma del webhook de Dodo (Standard Webhooks)"
```

---

### Task 4: Web — cliente Dodo + instalación del SDK

**Files:**
- Modify: `apps/web/package.json` (vía `npm install dodopayments` / `npx pnpm add dodopayments --filter @aluna/web`)
- Create: `apps/web/lib/billing/dodo-client.ts`
- Create: `apps/web/.env.example` entries (si el archivo existe; si no, saltar — ver Step 3)

**Interfaces:**
- Produces: `getDodoClient(): DodoPayments` (singleton lazy, mismo patrón que `getReadingCache()` en `apps/api/reading/route.ts`); `DODO_PRODUCT_IDS: { monthly: string; yearly: string }` (leídos de env vars, lanzan si faltan al usarse, no al importar el módulo).

- [ ] **Step 1: Instalar el SDK**

Run: `cd apps/web && npx pnpm add dodopayments`
Expected: añade `dodopayments` a `apps/web/package.json`. Luego `cd ../.. && npx pnpm install` para el lockfile del monorepo.

- [ ] **Step 2: Verificar la forma real del SDK antes de escribir el wrapper**

Antes de continuar, inspecciona los tipos instalados para confirmar (o corregir) las firmas
usadas en este plan — la documentación pública ya fue consultada (checkout-integration,
subscription-integration, dodo-best-practices) pero el código real manda:

```bash
find node_modules/.pnpm -maxdepth 1 -iname "dodopayments@*" -type d
```

Localiza el paquete y revisa sus `.d.ts` (o `README.md` si lo trae) para `checkoutSessions.create`,
`customers.createPortalSession`, y el constructor `new DodoPayments({...})`. Si algún nombre de
campo difiere de lo escrito en los Tasks 5-7 de este plan (por ejemplo `bearerToken` vs `apiKey`,
o la forma exacta del objeto de retorno), AJUSTA el código de esos tasks para que coincida con
los tipos reales — son la fuente de verdad, no este plan. Anota cualquier ajuste en tu reporte.

- [ ] **Step 3: Escribir el wrapper**

```ts
// apps/web/lib/billing/dodo-client.ts
// Cliente Dodo Payments — server-only. Un singleton perezoso (igual que
// getReadingCache() en app/api/reading/route.ts) para no instanciar el SDK
// en cada import. environment se resuelve por NODE_ENV: 'live_mode' en
// producción, 'test_mode' en cualquier otro caso (dev/test).
import DodoPayments from "dodopayments";

let client: DodoPayments | undefined;

export function getDodoClient(): DodoPayments {
  if (client) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error("Falta DODO_PAYMENTS_API_KEY");
  client = new DodoPayments({
    bearerToken,
    environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
  });
  return client;
}

/** IDs de producto de Dodo por plan — un producto por plan, creados en su dashboard. */
export function dodoProductId(plan: "monthly" | "yearly"): string {
  const id = plan === "monthly" ? process.env.DODO_PRODUCT_MONTHLY : process.env.DODO_PRODUCT_YEARLY;
  if (!id) throw new Error(`Falta DODO_PRODUCT_${plan === "monthly" ? "MONTHLY" : "YEARLY"}`);
  return id;
}
```

- [ ] **Step 4: Verificar**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errores (si el Step 2 reveló diferencias de tipos, este es el gate que las atrapa).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/billing/dodo-client.ts
git commit -m "feat(billing): cliente Dodo Payments (SDK instalado + wrapper server-only)"
```

---

### Task 5: Web — `POST /api/billing/checkout`

**Files:**
- Create: `apps/web/app/api/billing/checkout/route.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server` (cookies SSR — esta ruta la llama la UI de Ajustes, siempre con sesión de navegador, nunca el móvil); `getDodoClient`, `dodoProductId` de `@/lib/billing/dodo-client` (Task 4).
- Produces: `POST` recibe `{ plan: "monthly" | "yearly" }`, responde `{ checkoutUrl: string }` o `{ error }`.

- [ ] **Step 1: Escribir la ruta**

```ts
// apps/web/app/api/billing/checkout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient, dodoProductId } from "@/lib/billing/dodo-client";

// Crea la sesión de checkout de Aluna Plus. SOLO la web la llama (el móvil
// nunca vende dentro de la app). El email sale de la sesión autenticada,
// nunca del body — evita que alguien inicie un checkout a nombre de otro.
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const plan = body.plan === "monthly" || body.plan === "yearly" ? body.plan : null;
  if (!plan) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId(plan), quantity: 1 }],
      customer: { email: user.email },
      subscription_data: { trial_period_days: 14 },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes?checkout=success`,
    });
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
```

Nota: si `NEXT_PUBLIC_APP_URL` no existe todavía como env var en `apps/web/.env.local`, añádela
apuntando a `http://localhost:3002` en desarrollo (Gio la actualizará al dominio real en
producción — mismo patrón que las demás env vars de este proyecto).

- [ ] **Step 2: Verificar**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: verde (sin test unitario dedicado — ruta con red externa, igual que `/api/chart`; el
gate es typecheck + la verificación en vivo del Task 10).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/billing/checkout/route.ts
git commit -m "feat(billing): POST /api/billing/checkout — crea la sesión de Dodo para Aluna Plus"
```

---

### Task 6: Web — `POST /api/billing/portal`

**Files:**
- Create: `apps/web/app/api/billing/portal/route.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `getDodoClient` de `@/lib/billing/dodo-client`.
- Produces: `POST` (sin body) responde `{ portalUrl: string }` o `{ error }`.

- [ ] **Step 1: Escribir la ruta**

```ts
// apps/web/app/api/billing/portal/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient } from "@/lib/billing/dodo-client";

// Abre el portal de Dodo (cancelar/cambiar de plan/actualizar tarjeta) para
// el dodo_customer_id de la fila propia. RLS ya limita el select a la fila
// del usuario — si no tiene fila (nunca se suscribió), 404.
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("dodo_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    // Confirmado contra los tipos reales del SDK instalado en Task 4
    // (dodopayments@2.42.2): NO existe `customers.createPortalSession(...)`.
    // El método real es el sub-recurso anidado `customerPortal.create`, que
    // recibe el customerId como primer argumento posicional (no dentro del
    // objeto) y devuelve `{ link }`, no `{ url }`.
    const portal = await getDodoClient().customers.customerPortal.create(sub.dodo_customer_id, {
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes`,
    });
    return NextResponse.json({ portalUrl: portal.link });
  } catch {
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar + commit**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errores. El código de arriba ya refleja la forma real confirmada por Task 4
(`customerPortal.create(customerId, { return_url })` → `{ link }`) — si el `.d.ts` instalado
difiere de esto (por ejemplo por un upgrade de versión del SDK), ajusta aquí para que coincida
con los tipos reales, que siempre mandan sobre este plan.

```bash
git add apps/web/app/api/billing/portal/route.ts
git commit -m "feat(billing): POST /api/billing/portal — portal de gestión de Dodo"
```

---

### Task 7: Web — `POST /api/webhooks/dodo`

**Files:**
- Create: `apps/web/app/api/webhooks/dodo/route.ts`

**Interfaces:**
- Consumes: `verifyDodoSignature` de `@/lib/billing/dodo-webhook` (Task 3); `createServiceSupabaseClient` de `@aluna/supabase/server` (patrón exacto de `apps/web/app/api/reading/route.ts`).
- Produces: `POST` — sin sesión de usuario (Dodo llama directo), responde 200/401.

- [ ] **Step 1: Escribir la ruta**

```ts
// apps/web/app/api/webhooks/dodo/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@aluna/supabase/server";
import type { TablesInsert } from "@aluna/supabase";
import { verifyDodoSignature } from "@/lib/billing/dodo-webhook";

// Única fuente de verdad del estado de Aluna Plus. Dodo NO manda sesión de
// usuario — manda su propia firma (Standard Webhooks). Server-only,
// service_role (RLS no aplica a escrituras de webhook, igual que
// reading_cache). Responde 200 rápido siempre que la firma sea válida —
// incluso ante eventos no manejados o emails sin cuenta Aluna, para que
// Dodo no reintente en bucle por algo que nunca va a resolver.

export const runtime = "nodejs";

type DodoEvent = {
  type: string;
  data: {
    subscription_id?: string;
    customer_id?: string;
    product_id?: string;
    next_billing_date?: string;
    customer?: { customer_id?: string; email?: string };
  };
};

function planFromProductId(productId: string | undefined): "monthly" | "yearly" | null {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_MONTHLY) return "monthly";
  if (productId === process.env.DODO_PRODUCT_YEARLY) return "yearly";
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const valid = verifyDodoSignature({
    rawBody,
    signatureHeader: request.headers.get("webhook-signature"),
    timestampHeader: request.headers.get("webhook-timestamp"),
    secret,
  });
  if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody) as DodoEvent;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const STATUS_BY_TYPE: Record<string, "trialing" | "active" | "past_due" | "cancelled" | undefined> = {
    "subscription.active": "active",
    "subscription.renewed": "active",
    "subscription.on_hold": "past_due",
    "subscription.cancelled": "cancelled",
    "subscription.expired": "cancelled",
  };
  const status = STATUS_BY_TYPE[event.type];
  if (!status) {
    // Evento reconocido pero fuera del alcance de esta sub-fase (updated,
    // failed, plan_changed, pagos/créditos) — 200 para no reintentar.
    return NextResponse.json({ received: true });
  }

  const email = event.data.customer?.email;
  const dodoCustomerId = event.data.customer?.customer_id ?? event.data.customer_id;
  const dodoSubscriptionId = event.data.subscription_id;
  if (!email || !dodoCustomerId || !dodoSubscriptionId) {
    return NextResponse.json({ received: true }); // payload incompleto: nada que hacer
  }

  const supabase = createServiceSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: userId } = await supabase.rpc("user_id_by_email", { lookup_email: email });
  if (!userId) return NextResponse.json({ received: true }); // sin cuenta Aluna con ese email

  const plan = planFromProductId(event.data.product_id) ?? "monthly";
  const row: TablesInsert<"subscriptions"> = {
    user_id: userId,
    dodo_customer_id: dodoCustomerId,
    dodo_subscription_id: dodoSubscriptionId,
    plan,
    status,
    current_period_end: event.data.next_billing_date ?? null,
  };

  await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });
  return NextResponse.json({ received: true });
}
```

Nota: si `event.data.product_id` viene ausente en algunos tipos de evento (p. ej.
`subscription.cancelled` podría no repetirlo), el `plan` cae al último conocido — decisión
consciente: el `upsert` con `onConflict: "user_id"` sobreescribe TODA la fila, así que si el
evento no trae `product_id`, esta versión perdería el plan real. Antes de dar el Task por
terminado, decide con el tipo real del SDK (Task 4 Step 2) si conviene un `update` condicional
en vez de `upsert` para los eventos que no traen `product_id`, o si Dodo siempre lo incluye
(confirmar contra un payload de prueba real en el Task 10). Documenta la decisión en el reporte.

- [ ] **Step 2: Verificar + commit**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: verde.

```bash
git add apps/web/app/api/webhooks/dodo/route.ts
git commit -m "feat(billing): POST /api/webhooks/dodo — mantiene subscriptions al día"
```

---

### Task 8: Web — tarjeta "Tu plan" en Ajustes

**Files:**
- Modify: `apps/web/app/(app)/ajustes/page.tsx`
- Create: `apps/web/app/(app)/ajustes/plan-card.tsx`
- Modify: `apps/web/app/(app)/ajustes/settings.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (namespace nuevo `billing`)

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server` (para leer la fila propia server-side); `isPlusActive` de `@aluna/core` (Task 2).
- Produces: `<PlanCard row={Tables<"subscriptions"> | null} />` client component con los botones de checkout/portal.

- [ ] **Step 1: i18n — namespace `billing`**

En `apps/web/messages/es.json`, junto a los demás namespaces de nivel raíz (como `"pilares": {...}`), añadir:

```json
  "billing": {
    "title": "Tu plan",
    "freeBody": "Numerología y Carta completas, gratis para siempre.",
    "monthly": "$4.99/mes",
    "yearly": "$39.99/año",
    "trialNote": "14 días gratis",
    "planTrialing": "En prueba gratis",
    "planActive": "Aluna Plus",
    "planPastDue": "Pago pendiente",
    "renewsOn": "Se renueva el {date}",
    "trialEndsOn": "La prueba termina el {date}",
    "pastDueNote": "Tu último pago falló. Actualiza tu método de pago para seguir con Plus.",
    "manage": "Gestionar suscripción",
    "loading": "Un momento…",
    "error": "Algo salió mal. Inténtalo de nuevo."
  },
```

Y su espejo en `apps/web/messages/en.json`:

```json
  "billing": {
    "title": "Your plan",
    "freeBody": "Full Numerology and Birth Chart, free forever.",
    "monthly": "$4.99/mo",
    "yearly": "$39.99/yr",
    "trialNote": "14 days free",
    "planTrialing": "Free trial",
    "planActive": "Aluna Plus",
    "planPastDue": "Payment overdue",
    "renewsOn": "Renews on {date}",
    "trialEndsOn": "Trial ends on {date}",
    "pastDueNote": "Your last payment failed. Update your payment method to keep Plus.",
    "manage": "Manage subscription",
    "loading": "One moment…",
    "error": "Something went wrong. Please try again."
  },
```

- [ ] **Step 2: Componente `PlanCard`**

```tsx
// apps/web/app/(app)/ajustes/plan-card.tsx
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { isPlusActive, type SubscriptionStatus } from "@aluna/core";
import styles from "./settings.module.css";

interface Row {
  status: SubscriptionStatus;
  current_period_end: string | null;
}

const STATUS_KEY: Record<SubscriptionStatus, string> = {
  trialing: "planTrialing",
  active: "planActive",
  past_due: "planPastDue",
  cancelled: "planActive", // no debería mostrarse (ver render abajo), fallback inerte
};

export function PlanCard({ row }: { row: Row | null }) {
  const t = useTranslations("billing");
  const [busy, setBusy] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [error, setError] = useState(false);

  const active = isPlusActive(row ? { status: row.status, currentPeriodEnd: row.current_period_end } : null);

  async function startCheckout(plan: "monthly" | "yearly") {
    setBusy(plan);
    setError(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error("checkout_failed");
      window.location.href = data.checkoutUrl;
    } catch {
      setBusy(null);
      setError(true);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(false);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { portalUrl?: string };
      if (!res.ok || !data.portalUrl) throw new Error("portal_failed");
      window.location.href = data.portalUrl;
    } catch {
      setBusy(null);
      setError(true);
    }
  }

  const dateLabel = row?.current_period_end
    ? new Date(row.current_period_end).toLocaleDateString()
    : "";

  return (
    <section className={styles.section}>
      <h3 className={styles.label}>{t("title")}</h3>
      {!active ? (
        <>
          <p>{t("freeBody")}</p>
          <div className={styles.seg} role="group" aria-label={t("title")}>
            <button className={styles.segItem} disabled={busy !== null} onClick={() => startCheckout("monthly")}>
              {busy === "monthly" ? t("loading") : `${t("monthly")} · ${t("trialNote")}`}
            </button>
            <button className={styles.segItem} disabled={busy !== null} onClick={() => startCheckout("yearly")}>
              {busy === "yearly" ? t("loading") : `${t("yearly")} · ${t("trialNote")}`}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{t(STATUS_KEY[row!.status])}</p>
          {row?.current_period_end && (
            <p>{t(row!.status === "trialing" ? "trialEndsOn" : "renewsOn", { date: dateLabel })}</p>
          )}
          {row?.status === "past_due" && <p>{t("pastDueNote")}</p>}
          <button className={styles.segItem} disabled={busy !== null} onClick={openPortal}>
            {busy === "portal" ? t("loading") : t("manage")}
          </button>
        </>
      )}
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Montar en `page.tsx` (server component, lee la fila propia)**

```tsx
// apps/web/app/(app)/ajustes/page.tsx
import { getTranslations, getLocale } from "next-intl/server";
import { SettingsControls } from "./settings-controls";
import { PlanCard } from "./plan-card";
import { createClient } from "@/lib/supabase/server";
import styles from "./settings.module.css";

export default async function AjustesPage() {
  const t = await getTranslations("settings");
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: row } = user
    ? await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <PlanCard row={row} />
      <SettingsControls currentLocale={locale} />
    </main>
  );
}
```

- [ ] **Step 4: CSS — reusar `.section`/`.label`/`.seg`/`.segItem` ya existentes**

No hace falta CSS nuevo — `PlanCard` reusa exactamente las clases de `settings.module.css`
que ya usa `SettingsControls` (verificado en el diseño). Si el párrafo de estado necesita
espaciado propio, añadir a `settings.module.css`:

```css
.section p { margin: 0; font-size: 14px; color: var(--soft); }
```

- [ ] **Step 5: Gates + commit**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`
Expected: todo verde.

```bash
git add "apps/web/app/(app)/ajustes/" apps/web/messages/es.json apps/web/messages/en.json
git commit -m "feat(billing): tarjeta 'Tu plan' en Ajustes web (checkout + portal)"
```

---

### Task 9: Móvil — tarjeta "Tu plan" solo lectura en Ajustes

**Files:**
- Modify: `apps/mobile/app/(tabs)/ajustes.tsx`
- Modify: `apps/mobile/lib/strings.ts` (namespace `billing` ES/EN)

**Interfaces:**
- Consumes: `getSupabase` de `../../lib/supabase`; `useAuth` de `../../lib/auth-context`; `SubscriptionStatus` (tipo) de `@aluna/core` (Task 2) — NO `isPlusActive`, ver nota de corrección en el Step 2 (mismo bug ya encontrado y arreglado en Task 8: esa función oculta `past_due` a propósito, no sirve para decidir qué rama de UI mostrar).
- Produces: sección "Tu plan" solo lectura dentro de la pantalla Ajustes existente.

- [ ] **Step 1: Claves i18n**

En `apps/mobile/lib/strings.ts`, nuevo namespace de nivel raíz `billing` (ES):

```ts
    billing: {
      title: "Tu plan",
      freeBody: "Numerología y Carta completas, gratis para siempre.",
      upsell: "Hazte Plus en aluna.app",
      planTrialing: "En prueba gratis",
      planActive: "Aluna Plus",
      planPastDue: "Pago pendiente",
      manageNote: "Gestiona tu suscripción en aluna.app",
    },
```

Y EN:

```ts
    billing: {
      title: "Your plan",
      freeBody: "Full Numerology and Birth Chart, free forever.",
      upsell: "Go Plus at aluna.app",
      planTrialing: "Free trial",
      planActive: "Aluna Plus",
      planPastDue: "Payment overdue",
      manageNote: "Manage your subscription at aluna.app",
    },
```

- [ ] **Step 2: Leer la fila + pintar la sección**

En `apps/mobile/app/(tabs)/ajustes.tsx`:

1. Imports nuevos: `import { useEffect, useState } from "react";` (si `useState`/`useEffect`
   no están ya importados — verificar antes de duplicar), `import { getSupabase } from "../../lib/supabase";`,
   `import { isPlusActive, type SubscriptionStatus } from "@aluna/core";`.
2. Estado nuevo dentro del componente `AjustesScreen`:

```ts
  const [subRow, setSubRow] = useState<{ status: SubscriptionStatus; current_period_end: string | null } | null>(null);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    getSupabase()
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setSubRow(data as typeof subRow);
      });
    return () => {
      alive = false;
    };
  }, [session]);
  // NO uses isPlusActive aquí para decidir qué rama pintar: esa función
  // devuelve false para "past_due" a propósito (¿tiene acceso Plus AHORA?),
  // y un usuario con pago fallido SÍ debe ver la rama de gestión (con el
  // aviso de pago pendiente), no la de "hazte Plus" como si nunca se
  // hubiera suscrito. La rama se decide por presencia de fila + status.
  const hasManagedSubscription = subRow !== null && subRow.status !== "cancelled";
```

(`session` ya existe en este archivo vía `useAuth()` — verificar el nombre real de la
desestructuración antes de asumir; si el archivo usa otro nombre, ajustar. `isPlusActive`
NO se importa para esta pantalla — no hace falta, la decisión de rama usa `hasManagedSubscription`
de arriba.)

3. Nueva tarjeta JSX, siguiendo el patrón `styles.card`/`styles.cardEyebrow` ya usado por las
   demás secciones de esta pantalla (perfil, apariencia, sistemas) — insertar ANTES de la
   sección "Sistemas":

```tsx
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>{t("billing.title")}</Text>
          {hasManagedSubscription ? (
            <>
              <Text style={styles.profileName}>
                {t(subRow!.status === "trialing" ? "billing.planTrialing" : subRow!.status === "past_due" ? "billing.planPastDue" : "billing.planActive")}
              </Text>
              <Text style={styles.muted}>{t("billing.manageNote")}</Text>
            </>
          ) : (
            <>
              <Text style={styles.rowLabel}>{t("billing.freeBody")}</Text>
              <Text style={[styles.muted, { marginTop: space.sm }]}>{t("billing.upsell")}</Text>
            </>
          )}
        </View>
```

(Los nombres exactos `styles.card`/`styles.cardEyebrow`/`styles.profileName`/`styles.rowLabel`/
`styles.muted` deben confirmarse contra los estilos YA definidos en este archivo — reusar los
que existan con esa forma; si algún nombre no calza, usar el equivalente real del archivo sin
inventar clases nuevas, siguiendo el mismo criterio que las tarjetas de "Tu perfil"/"Sistemas".)

- [ ] **Step 3: Gates + commit**

Run: `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist`
Expected: todo verde.

```bash
git add "apps/mobile/app/(tabs)/ajustes.tsx" apps/mobile/lib/strings.ts
git commit -m "feat(billing): tarjeta 'Tu plan' solo lectura en Ajustes móvil"
```

---

### Task 10: Verificación integral (la hace el controller)

- [ ] **Step 1:** `npx pnpm -w exec turbo run typecheck test` → verde en los 6 paquetes/apps.
      `cd apps/web && rm -rf .next && npx next build` → verde.
- [ ] **Step 2:** Confirmar en Supabase (MCP `get_advisors` tipo `security`) que la tabla
      `subscriptions` y la función `user_id_by_email` no generan hallazgos nuevos.
- [ ] **Step 3:** Si Gio ya dejó las llaves de Dodo (test mode) en `apps/web/.env.local`:
      dev server + cuenta de prueba → botón de checkout → tarjeta `4242 4242 4242 4242` en el
      checkout de Dodo → confirmar que el webhook (vía `ngrok` apuntando a
      `/api/webhooks/dodo`, configurado en el dashboard de Dodo) actualiza `subscriptions` →
      Ajustes refleja "En prueba gratis" → portal abre y refleja el estado. Si las llaves NO
      están, documentar el bloqueo (mismo patrón que Nous Portal/WhatsApp en otros proyectos) y
      dejar todo lo demás verificado.
- [ ] **Step 4:** Limpieza de datos de prueba; merge a main + push; actualizar memoria del
      proyecto con lo entregado y lo pendiente (llaves de Gio, verificación con cobro real,
      Tasks 4b/4c/4d siguientes).

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec:** §4→T1, §"Helper puro"→T2, §5→T5, §6→T3+T7, §7→T6, §8→T8+T9,
  §10→T3/T5-T7 (unitarios) + T10 (vivo), §11→T10 Step 3 (bloqueo documentado si faltan llaves).
- **Placeholders:** T4 Step 2 y T7 traen instrucciones EXPLÍCITAS de verificación contra los
  tipos reales del SDK instalado (no "TBD" — es un paso mecánico con comando exacto), porque la
  documentación pública consultada no alcanza a confirmar cada campo al 100%; T7 documenta
  también la decisión pendiente sobre `product_id` ausente con una acción concreta ("decide y
  documenta"), no una omisión.
- **Type consistency:** `SubscriptionStatus`/`SubscriptionRow`/`isPlusActive` (T2) usados
  idénticos en T8 (web) y T9 (móvil); `Tables<"subscriptions">`/`TablesInsert<"subscriptions">`
  (T1) usados en T7; `getDodoClient`/`dodoProductId` (T4) usados en T5/T6.
