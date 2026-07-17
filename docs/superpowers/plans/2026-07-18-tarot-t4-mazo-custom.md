# Tarot T4 — Mazo custom + reverso · Plan de implementación

> Ejecutar con superpowers:subagent-driven-development. Spec:
> `docs/superpowers/specs/2026-07-18-tarot-t4-mazo-custom-design.md`.

**Goal:** El usuario arma su mazo (sube cartas parciales con fallback RWS + define
el reverso) y lo usa en toda la app, web y móvil.

**Arquitectura:** resolver central en @aluna/core (keystone) → migración+Storage+
endpoints latentes (patrón avatars) → editor de reverso (SVG compartido) → UI de
Ajustes → cableado en lecturas. La subida es latente sin `SUPABASE_SERVICE_ROLE_KEY`.

## Global Constraints (verbatim del spec)

- Resolver PURO y determinista; sin mazo custom devuelve EXACTO las URLs RWS de hoy (no-regresión).
- Paths de Storage derivados de la SESIÓN (`user.id`), NUNCA del cliente. Espejo de `/api/avatar`.
- Endpoints: `runtime=nodejs`, `authenticateRoute`, gate `SUPABASE_SERVICE_ROLE_KEY` → 503/{available:false} si falta; validación server-side fuente de verdad (mime png/jpeg/webp, ≤5MB, cardId ∈ las 78).
- Lienzo/encuadre: NO normalizar server-side (YAGNI) — el display ya usa object-fit:contain sobre el matte índigo #12142e. Guardar bytes crudos.
- Móvil: sin reanimated/gesture-handler (Animated core); react-native-svg ya está para el preview del reverso.
- i18n: toda copy nueva en messages/{es,en}.json (web) y strings ES/EN (móvil). Nada hardcodeado.
- deck value en tarot_readings: `'rws' | 'aluna' | 'custom'` (ampliar check `tarot_deck_known`).

---

## Task 1 — Resolver central + registro de mazos (@aluna/core) + refactor de los ~24 sitios

**Files:** Create `packages/core/src/tarot/deck-assets.ts` (+ test); Modify
`packages/core/src/tarot/deck.ts` (TAROT_DECKS/tipos para 'custom'), `index.ts`
(export); Modify TODOS los sitios que construyen `/tarot/rws/{id}.webp` (lista en
el mapa de exploración: web tarot-view.tsx, manual-entry.tsx, ceremony.tsx;
móvil tarot.tsx, tarot-manual-entry.tsx, tarot-ceremony.tsx).

**Interfaces (produce):**
```ts
export interface DeckAssetCtx { base: string; activeDeck: "rws" | "custom";
  customCardIds?: ReadonlySet<string>; customBase?: string; customBack?: string | null; }
export function cardImageUrl(cardId: string, ctx: DeckAssetCtx): string;
export function cardBackUrl(ctx: DeckAssetCtx): string;
export function rwsCtx(base: string): DeckAssetCtx; // helper: {base, activeDeck:"rws"}
```
- Regla custom vs rws como en el spec §1. `rwsCtx("")` (web) / `rwsCtx(apiUrl())` (móvil) reproduce hoy.
- Refactor: cada sitio deja de hardcodear la URL; usa `cardImageUrl(id, ctx)` / `cardBackUrl(ctx)` con un `ctx` que por ahora es `rwsCtx(base)` (el manifiesto real se cablea en Task 7). Esto NO cambia comportamiento (no-regresión) pero centraliza.

**Tests:** unit del resolver (rws puro = URLs actuales; custom con/ sin la carta en el set; back custom vs rws). Los tests existentes de tarot siguen verdes.
**Acceptance:** tsc web+móvil+core limpio; suites verdes; grep confirma que ya no quedan `/tarot/rws/${` inline fuera del resolver.

## Task 2 — Migración 0016 + tipos Supabase

**Files:** Create `supabase/migrations/0016_tarot_custom_deck.sql`; Modify
`packages/supabase/src/database.types.ts` (fila `tarot_deck`); Modify
`apps/web/lib/tarot/validate-reading.ts` (aceptar deck `'custom'`); Modify
`packages/core/src/tarot/deck.ts` si el check de deck vive replicado.

**SQL:** tabla `tarot_deck` (user_id pk, active bool, card_ids text[], back_kind
check none/upload/editor, back_config jsonb, updated_at) + RLS CRUD auth.uid();
bucket `tarot-decks` público + file_size_limit 5MB + allowed_mime_types; ampliar
`tarot_deck_known` → `deck in ('rws','aluna','custom')`.
**Tests:** validate-reading acepta `'custom'`; rechaza deck desconocido.
**Acceptance:** migración idempotente/segura; tipos compilan; tests verdes.
PENDIENTE GIO: aplicar 0016 (con 0011-0014).

## Task 3 — Lógica de SVG del reverso compartida (@aluna/core)

**Files:** Create `packages/core/src/tarot/back-svg.ts` (+ test); Modify `index.ts`.
Portar `scripts/tarot-make-back.mjs`.
**Interface:** `buildBackSvg(cfg: { bg: string; border: string; symbol: "enso" | "star" | "moon" }): string` (SVG 350×600, doble borde, símbolo central). Añadir `moon` (arco lunar) a los existentes enso/star.
**Tests:** el SVG contiene los colores/viewBox esperados; los 3 símbolos generan paths distintos; entradas inválidas → default seguro.
**Acceptance:** función pura, sin I/O; core suite verde.

## Task 4 — Endpoints de mazo (web, latentes) — patrón /api/avatar

**Files:** Create `apps/web/app/api/tarot/deck/route.ts` (GET manifiesto, PUT
active), `apps/web/app/api/tarot/deck/card/route.ts` (POST/DELETE carta),
`apps/web/app/api/tarot/deck/back/route.ts` (POST upload|editor); Create
`apps/web/lib/tarot/deck-storage.ts` (paths, validación, render editor→webp con
sharp reusando buildBackSvg); tests de la lib pura.
**Interfaces (consume):** buildBackSvg (Task 3); patrón exacto de `/api/avatar` +
`lib/avatar.ts` (validate, service client, getPublicUrl).
**Tests:** validación pura (mime/size/cardId∈78; paths derivados de userId; render
config→bytes). Rutas: latente sin service-role → 503/{available:false}.
**Acceptance:** tsc limpio; lib tests verdes; sin llaves las rutas responden latente sin romper.

## Task 5 — Editor de reverso + sección "Tu mazo" en Ajustes (web)

**Files:** Create `apps/web/app/(app)/ajustes/deck-manager.tsx` (Client) + módulo
CSS; Create `apps/web/app/(app)/ajustes/back-editor.tsx` (preview SVG en vivo +
controles bg/border/symbol); Modify `ajustes/page.tsx` (montar sección "Tu mazo");
messages es+en; tests RTL de lo testeable.
**Interfaces (consume):** GET/POST/PUT/DELETE de Task 4; buildBackSvg (preview);
manifiesto → estado. Latente: si GET da {available:false} → nota + controles deshabilitados.
**Acceptance:** render correcto; editor muestra preview con los 3 símbolos; estado latente claro; navegador OK.

## Task 6 — Sección "Tu mazo" en Ajustes (móvil, espejo)

**Files:** Create `apps/mobile/components/deck-manager.tsx` (+ editor con
react-native-svg); Modify `apps/mobile/app/(tabs)/ajustes.tsx`; Modify
`apps/mobile/lib/tarot-api.ts` (cliente Bearer de los endpoints del mazo);
strings ES/EN; tests de la lib.
**Interfaces:** espejo de Task 5; buildBackSvg (para params del preview RN-SVG);
image picker de Expo (verificar la API v56 en AGENTS.md) para subir.
**Acceptance:** tsc móvil limpio; lib tests verdes; nada hardcodeado.

## Task 7 — Cablear el manifiesto del mazo en las lecturas (web + móvil)

**Files:** Create `apps/web/lib/tarot/use-deck-assets.ts` (hook: fetch GET /api/
tarot/deck una vez → DeckAssetCtx; sin custom → rwsCtx("")); wirear ceremony.tsx,
manual-entry.tsx, tarot-view.tsx para pasar el ctx al resolver y guardar
`deck:"custom"` si activo. Móvil: contexto/carga equivalente en tarot.tsx +
componentes, `rwsCtx(apiUrl())` por defecto.
**Interfaces (consume):** resolver (Task 1), GET manifiesto (Task 4).
**Acceptance:** con deck rws (default) idéntico a hoy; con manifiesto custom
simulado, el resolver elige custom donde corresponde. Navegador (deck rws) sin regresión.

## Task 8 (controlador) — Verificación real + review adversarial + merge

- Verificar en navegador: editor de reverso (3 símbolos, colores) con preview
  vivo; sección "Tu mazo" render + estado latente; ceremonia y modo manual con
  deck rws SIN regresión (las imágenes siguen saliendo). Estado latente de los
  endpoints (503) sin romper la UI.
- Review adversarial (Fable): fugas de path desde el cliente, fallos silenciosos,
  no-regresión del resolver, consistencia deck='custom' en validación/guardado.
- Fixes; merge a main (+push, Aluna autorizado); memoria; checklist PENDIENTE GIO
  (aplicar 0016 + bucket + service-role para encender la subida; Expo Go del editor/picker).
