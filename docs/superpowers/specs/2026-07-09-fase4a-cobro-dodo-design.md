# Fase 4a — Infraestructura de cobro (Dodo Payments) — Diseño

**Fecha:** 2026-07-09 · **Estado:** aprobado por Gio (brainstorming en sesión)
**Alcance:** primera de 4 sub-fases de la Fase 4 (monetización) de Aluna. Esta sub-fase construye
la infraestructura de cobro — checkout, webhook, estado de suscripción, portal de gestión — sin
tocar todavía el contenido que se va a gatear (eso es 4d).

## 1. Punto de partida

- Fase 4 completa (boceto de Gio, 2026-06-13, spec Fase 1 §"Fase 4 — Monetización"):
  **Aluna Plus = $4.99/mes o $39.99/año**; informe PDF suelto ~$9–14 (fuera de 4a); frontera
  gratis/premium ya decidida: gratis = carta+numerología completa + Modo Pro técnico; premium =
  informes evolutivos largos + Revolución Solar + lecturas IA + PDFs + perfiles ilimitados.
- Hoy: CERO infraestructura de cobro (verificado — sin tablas, sin dependencias, sin lógica de
  gating por usuario). `profiles_user`/`settings` no tienen campo de plan.
- Lecturas IA (Profunda/Completa) ya cableadas vía `lib/reading/provider.ts` — hoy el único gate
  es GLOBAL (¿hay alguna llave de proveedor configurada?), no por usuario. Ese gate por-usuario
  es trabajo de 4d, no de esta sub-fase.
- Multi-perfil ya existe (`ProfilesProvider` web, `ProfileProvider` móvil) sin tope alguno.

## 2. Decisiones (tomadas en este brainstorming)

| Tema | Decisión |
|---|---|
| Proveedor de pago | **Dodo Payments** (ya usado en Oriole1060) — checkout hospedado + webhooks. |
| Móvil y pagos | **El móvil NUNCA vende ni menciona compra dentro de la app.** Suscribirse ocurre SOLO en la web (aluna.app); el móvil, con la MISMA cuenta, simplemente refleja el estado (lectura de la tabla `subscriptions` por RLS). Evita el requisito de compra-dentro-de-la-app de Apple/Google sin construir RevenueCat/StoreKit/Play Billing — patrón Netflix/Spotify. |
| Tope de perfiles | 1 perfil gratis; ilimitados en Plus (aplicado en 4d, dato de referencia). |
| Gate de IA | 100% Plus, sin prueba gratuita de lecturas (aplicado en 4d). |
| Alcance del informe evolutivo | Se construye en 4b (Carta completa narrativa + Revolución Solar + mantra); 4a no lo toca. |
| Prueba gratis de Plus | **14 días de prueba** vía `subscription_data.trial_period_days` de Dodo. |
| Créditos medidos (Dodo credits) | **No se usan** — es suscripción plana (acceso ilimitado mientras esté activa), no facturación por uso. |

## 3. Arquitectura — enfoque elegido

**A) Checkout hospedado por Dodo + tabla de suscripción alimentada por webhook.** Dodo aloja la
pantalla de pago (cumplimiento PCI de su lado); el webhook es la ÚNICA fuente de verdad del
estado de suscripción — mismo patrón ya establecido en este proyecto (escrituras con
`service_role`, lecturas protegidas por RLS, como `reading_cache`).

Rechazados: **B)** sondear la API de Dodo en vez de webhook (el estado queda obsoleto ante
eventos fuera de sesión — cancelación, fallo de renovación); **C)** guardar el estado en
`settings` en vez de una tabla propia (mezcla preferencias de cuenta con facturación, rompe la
convención de una tabla por responsabilidad de este esquema).

## 4. Base de datos — tabla `subscriptions`

Migración nueva `0005_subscriptions.sql`:

```sql
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
```

RLS: `select` propio (`user_id = auth.uid()`); sin políticas de `insert`/`update`/`delete` para
`anon`/`authenticated` (igual que `reading_cache`) — solo el webhook (`service_role`) escribe.
Índice en `dodo_subscription_id` (ya único) para el upsert idempotente del webhook.

Helper puro de lectura (usado por 4d más adelante, expuesto ya aquí como API del módulo):
`isPlusActive(row: Tables<"subscriptions"> | null): boolean` — `true` si `status` es `trialing`
o `active` Y (`current_period_end` es null O es futuro). Vive en `@aluna/supabase` o
`apps/web/lib/billing/` (decisión de ubicación exacta en el plan).

## 5. Checkout (solo web)

`POST /api/billing/checkout` (server, RLS — usa el `userId` de la sesión, nunca del body):
recibe `{ plan: "monthly" | "yearly" }`, resuelve el `product_id` de Dodo desde env vars
(`DODO_PRODUCT_MONTHLY`, `DODO_PRODUCT_YEARLY` — un producto por plan, creados en el dashboard
de Dodo), crea la sesión de checkout con `customer.email` del usuario autenticado,
**`metadata: { userId }`** (así el webhook resuelve la fila sin depender de buscar por email —
ver §6) y `subscription_data: { trial_period_days: 14 }`, devuelve `{ checkoutUrl }`. La UI
redirige `window.location.href = checkoutUrl`. `return_url` apunta a `/ajustes?checkout=success`.

## 6. Webhook

`POST /api/webhooks/dodo` (server, runtime nodejs, **sin** `authenticateRoute` — Dodo no manda
sesión de usuario, manda su propia firma):
1. Lee el body crudo + header de firma; verifica HMAC contra `DODO_PAYMENTS_WEBHOOK_SECRET`
   (comparación de tiempo constante, `crypto.timingSafeEqual`) — 401 si no coincide.
2. Según el tipo de evento (`subscription.active`, `subscription.cancelled`, y los de
   renovación/fallo de pago que se confirmen contra la documentación vigente al construir —
   nombres exactos a verificar en `docs.dodopayments.com` con el skill `dodo-best-practices`
   como primer paso del plan de implementación, no asumir del training):
   resuelve el `user_id` desde `metadata.userId` del payload del evento (sembrado en el
   checkout, §5) — robusto, sin depender de buscar por email.
3. Upsert en `subscriptions` vía `service_role` (`onConflict: dodo_subscription_id`).
4. Responde 200 rápido (Dodo reintenta si no hay 200 — la lógica pesada, si la hubiera, no debe
   bloquear la respuesta).

## 7. Portal de gestión

Botón "Gestionar suscripción" (solo visible con `status` trialing/active/past_due) →
`POST /api/billing/portal` (RLS, usa `dodo_customer_id` de la fila propia) →
`client.customers.createPortalSession({ customer_id, return_url })` → redirige a `portal.url`.
Cancelar/cambiar de plan/actualizar tarjeta ocurre DENTRO del portal de Dodo — no se reconstruye
nada de eso en Aluna.

## 8. UI — Ajustes

**Web** (`/ajustes`): tarjeta "Tu plan" — Free: "Numerología y Carta completas, gratis" +
dos botones de precio (mensual/anual, "14 días gratis" en ambos) → checkout. Plus/trialing:
insignia del plan + fecha de renovación/fin de prueba + botón "Gestionar suscripción" → portal.
`past_due`: aviso de pago fallido con el mismo botón de portal.

**Móvil** (`app/(tabs)/ajustes.tsx`): misma tarjeta, **solo lectura** — lee `subscriptions` del
usuario directo por RLS (sin endpoint nuevo). Free: texto "Hazte Plus en aluna.app" SIN botón de
compra. Plus: insignia + fecha, sin botón de gestión (eso también es "salir a la web" — con un
texto "Gestiona tu suscripción en aluna.app").

## 9. Fuera de alcance (explícito)

- Gating real de ninguna función (4d).
- Informes evolutivos / PDF (4b, 4c).
- Compra nativa in-app (RevenueCat) — no planeada en esta fase; ver tabla de decisiones.
- Precios regionales/promociones — precio único global por ahora.
- Créditos medidos de Dodo — no aplica al modelo plano.

## 10. Testing

- Puro: `isPlusActive()` con las 4 combinaciones de status × vencimiento; verificación HMAC del
  webhook (payload+firma válida/inválida); mapeo de evento Dodo → fila `subscriptions` (función
  pura de parseo, testeada sin red).
- Integración liviana: `/api/billing/checkout` y `/api/billing/portal` con el SDK de Dodo
  mockeado (sin pegarle a la red real en CI).
- Verificación en vivo (requiere llaves de Gio, PENDIENTE): checkout en modo test de Dodo con
  tarjeta `4242 4242 4242 4242`, confirmar que el webhook (vía `ngrok` en local) actualiza
  `subscriptions`, portal abre y refleja el estado.

## 11. Pendiente de Gio (bloqueante para verificación en vivo, no para construir el código)

Cuenta en Dodo Payments + crear 2 productos de suscripción (Aluna Plus mensual $4.99, anual
$39.99) en su dashboard + `DODO_PAYMENTS_API_KEY` + `DODO_PAYMENTS_WEBHOOK_SECRET` +
`DODO_PRODUCT_MONTHLY`/`DODO_PRODUCT_YEARLY` (los IDs de producto) en `apps/web/.env.local`.
Mismo patrón que las demás llaves externas de este proyecto (Nous Portal, proveedores IA).

## 12. Proceso de construcción

Diseño en esta sesión (Sonnet, brainstorming). Construcción: subagentes (Sonnet) con review por
tarea + review final de rama. Siguiente paso: writing-plans → plan de implementación TDD.
