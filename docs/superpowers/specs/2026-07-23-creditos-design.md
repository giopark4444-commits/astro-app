# Créditos + Suscripción para Aluna — Diseño

Aprobado por Gio en conversación (2026-07-23). Objetivo doble: (a) que el costo
del modelo premium (Claude) NUNCA se le queme a Gio — sin saldo no hay llamada
a la API; (b) vender créditos con margen sobre el costo real acotado.

## Modelo de negocio (decidido)

- **Suscripción + créditos incluidos**: se reactiva el plan Plus (Dodo, ya
  montado: `subscriptions`, checkout, portal, webhook) con una **bolsa mensual
  de créditos**; quien quiera más compra **paquetes** one-time.
- **Qué gasta crédito**: SOLO las acciones con el modelo premium (Claude) —
  chat premium y lecturas profundas premium. Lo demás no descuenta saldo.
- **Unidad de cobro**: **costo fijo por acción** (chat premium = 1 crédito,
  lectura profunda premium = 3) con tope de tokens por respuesta → costo real
  acotado, margen garantizado al precio del pack (los precios viven en los
  productos de Dodo, no en el código).
- **Nivel gratis**: prueba limitada — chat + lecturas normales con **Gemini
  3.6 Flash** (free tier de Google = $0 para Gio) y tope diario de mensajes
  (default 5/día); premium bloqueado. *(Corrección explícita de Gio: el modelo
  gratis es Gemini 3.6, no Hermes.)*
- **Saldo en 0 pidiendo premium**: cae automáticamente al modelo incluido
  (Gemini) con aviso "comprá más créditos". Nunca se queda sin respuesta.

## Reglas duras (anti-quemada)

1. **Débito atómico ANTES de llamar a Claude** (función SQL `spend_credits`
   con lock por usuario): saldo insuficiente → no hay llamada API. El saldo
   jamás queda negativo.
2. **Reembolso si la generación falla por completo** (0 caracteres emitidos).
3. **Idempotencia por `ref` único** en el ledger: compras (`dodo:<payment>`),
   refill mensual (`refill:<sub>:<period>`), reembolsos (`refund:<spend>`);
   los reintentos del webhook no duplican abonos.
4. **Fail-closed para gastar**: sin `SUPABASE_SERVICE_ROLE_KEY` o sin
   `ANTHROPIC_API_KEY`, lo premium simplemente no se ofrece (cae a gratis).
   Fail-open para el tope diario (config rota no bloquea usuarios).
5. Los créditos se cobran **al generar**: una lectura profunda premium servida
   desde el caché (`reading_cache`, clave con prefijo premium) no descuenta —
   costo de Gio $0 ahí, y el mismo usuario no paga dos veces por releer.
6. El gasto de créditos es **independiente de `ALUNA_ALL_ACCESS`**: el
   interruptor de "app abierta" abre candados de features, nunca regala
   Claude. El tope diario gratis SÍ respeta `allAccessEnabled()` (hoy la app
   está abierta → tope apagado hasta que Gio cierre los planes).

## Datos (migración 0022)

- `credit_ledger` append-only: fuente de verdad; saldo = `sum(delta)`. RLS:
  el usuario lee lo suyo; solo `service_role` escribe (mismo criterio que
  `subscriptions`). `ref` con índice único parcial → idempotencia.
- Funciones `security definer` (grant solo a `service_role`, patrón 0005):
  `spend_credits(user, amount, ref)` (atómica, bool), `grant_credits(user,
  amount, kind, ref)` (idempotente), `bump_chat_usage(user)` (tope diario),
  y `my_credit_balance()` (grant a `authenticated`, para GET /api/credits).
- `usage_daily (user_id, day, chat_count)` para el tope del nivel gratis.

## Superficie

- **API**: `GET /api/credits` (saldo + últimos movimientos); `POST
  /api/chat` acepta `premium: true`; las 4 rutas de lectura profunda
  (chart/bazi/horoscope/area) aceptan `premium: true` vía helper compartido;
  checkout acepta `{pack}` además de `{plan}`; webhook Dodo abona refill
  mensual (subscription.active/renewed) y packs (payment.succeeded con
  product_id de pack).
- **Modelo premium**: `resolvePremiumProvider()` → Anthropic con
  `ALUNA_PREMIUM_MODEL` (default `claude-sonnet-5`). El default gratis queda
  como está (cascada existente; en prod se fija `READING_PROVIDER=gemini`).
- **UI**: toggle ✨ premium + chip de saldo en el composer del chat; banners
  de sin-saldo/tope-diario; sección Créditos en Ajustes (saldo, packs,
  historial). Preferencia premium en `localStorage` (`aluna:premium`), la
  leen también las lecturas profundas. i18n es/en con paridad.

## Config (todo ajustable sin tocar código)

`ALUNA_CREDIT_COST_CHAT=1`, `ALUNA_CREDIT_COST_READING=3`,
`ALUNA_PLUS_MONTHLY_CREDITS=60`, `ALUNA_FREE_DAILY_CHAT_CAP=5`,
`ALUNA_PREMIUM_MODEL=claude-sonnet-5`, productos Dodo:
`DODO_PRODUCT_CREDITS_100|300|1000` (+ los existentes MONTHLY/YEARLY).
Precios sugeridos (se fijan en Dodo): pack 100 ≈ $9.99; Plus ≈ $7.99/mes con
60 créditos. Costo real por chat premium con tope 1500 tokens ≈ $0.02–0.03 →
margen ~3–4x.

## Nota de privacidad (pendiente de Gio)

El free tier de Gemini puede usar datos para entrenar y tiene límites de
rate. Mitigación aplicada: las rutas no envían PII más allá del nombre de
perfil que ya viaja hoy. Si Aluna crece, pasar a Gemini pago o Hermes.
