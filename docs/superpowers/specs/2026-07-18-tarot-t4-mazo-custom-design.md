# Tarot T4 — Mazo custom + reverso propio (spec)

Fase posterior a T3. Decisiones de producto ya tomadas con Gio (ver la NOTA
`2026-07-18-tarot-t4-mazo-custom-NOTA.md`); este spec las baja a implementación.

## Objetivo

El usuario puede armar **su propio mazo**: sube imágenes de cartas (de 1 a 78;
las que falten usan RWS) y define el **reverso** (sube una imagen o lo diseña con
un mini-editor). Su mazo queda seleccionable en Ajustes y se usa en toda la
ceremonia y el modo manual, web y móvil.

## Realidad de dependencia (latencia)

Toda la ruta de **subida/almacenamiento** vive sobre Supabase Storage (bucket
nuevo + RLS) y exige `SUPABASE_SERVICE_ROLE_KEY` — hoy pendiente de Gio, igual
que las migraciones 0011-0014. Por eso el patrón es el de siempre: **cableado
pero latente**. Sin service-role, los endpoints responden `503 {available:false}`
y la UI muestra "configura tu mazo cuando conectes Storage" sin romperse. Lo que
SÍ se construye y verifica localmente sin Supabase: el resolver central, el
editor de reverso (genera SVG con preview en vivo), la UI de Ajustes, y el
registro de mazos.

## Arquitectura

### 1. Resolver central de imagen de carta (keystone) — `@aluna/core`

Hoy ~24 sitios (web + móvil) construyen `/tarot/rws/{id}.webp` inline con el
segmento `rws` hardcodeado, sin consultar el `deck`. Se centraliza en una función
pura:

```ts
export interface DeckAssetCtx {
  base: string;                 // web: "" (rutas relativas) ; móvil: `${apiUrl()}`
  activeDeck: "rws" | "custom"; // el mazo elegido por el usuario
  customCardIds?: ReadonlySet<string>; // qué cartas tienen imagen custom subida
  customBase?: string;          // getPublicUrl del bucket, hasta la carpeta del user
  customBack?: string | null;   // URL del reverso custom (subido o generado), o null
}
export function cardImageUrl(cardId: string, ctx: DeckAssetCtx): string;
export function cardBackUrl(ctx: DeckAssetCtx): string;
```

Regla: si `activeDeck==="custom"` y `customCardIds.has(cardId)` →
`${customBase}/${cardId}.webp`; si no → `${base}/tarot/rws/${cardId}.webp`.
Reverso: `activeDeck==="custom" && customBack` → `customBack`; si no →
`${base}/tarot/rws/back.webp`. Determinista, sin I/O; testeable con unidades.

Los ~24 sitios se refactorizan para llamar al resolver. El contexto del mazo
(`activeDeck`, `customCardIds`, etc.) se obtiene una vez por pantalla desde un
hook/loader (`useDeckAssets()` web, contexto móvil) que consulta el manifiesto
del usuario (ver §3). Sin manifiesto (o deck rws) → contexto rws puro, idéntico
a hoy (no-regresión).

### 2. Registro de mazos — `TAROT_DECKS` / tipos

`TarotDeckInfo.id` hoy es union cerrado `"rws"|"aluna"`. Se amplía el concepto a
`"custom"` (el mazo "aluna" de diseño se reinterpreta como "tu mazo custom": el
registro expone `custom` cuando el usuario tiene ≥1 carta o un reverso). La
validación de guardado (`validate-reading.ts`) y el check SQL `tarot_deck_known`
aceptan `'custom'` además de `'rws'`/`'aluna'`.

### 3. Persistencia — migración + Storage (latente)

- **Migración `0015_tarot_custom_deck.sql`:**
  - Tabla `public.tarot_deck` (`user_id uuid pk refs auth.users`, `active boolean
    default false`, `card_ids text[] default '{}'` = ids con imagen custom,
    `back_kind text check (back_kind in ('none','upload','editor')) default 'none'`,
    `back_config jsonb` = {bg,border,symbol} del editor, `updated_at`). RLS CRUD
    por `auth.uid()` (espejo de `tarot_readings`).
  - Bucket `tarot-decks` **público** + límites nativos (`file_size_limit`,
    `allowed_mime_types png/jpeg/webp`) — espejo de avatars 0008/0009. Sin
    políticas de escritura del cliente (la escritura real es server-side con
    service-role, igual que avatars 0009).
  - Amplía `tarot_deck_known` check en `tarot_readings.deck` para incluir `'custom'`.
- **Tipos** `packages/supabase/database.types.ts`: fila `tarot_deck`.

Paths en Storage (derivados de la sesión, NUNCA del cliente):
`${userId}/${cardId}.webp` para cartas, `${userId}/back.webp` para el reverso.

### 4. Endpoints (web, latente sin service-role)

Espejo exacto del patrón `/api/avatar`:
- `GET /api/tarot/deck` → manifiesto del usuario `{active, cardIds, backKind,
  backUrl}` (o `{available:false}` sin service-role). Fuente del `DeckAssetCtx`.
- `POST /api/tarot/deck/card` (FormData: `cardId`, `file`) → valida (mime+≤5MB+
  cardId ∈ 78), sube a `${userId}/${cardId}.webp`, añade a `card_ids`.
- `DELETE /api/tarot/deck/card?cardId=` → borra objeto + saca de `card_ids`.
- `POST /api/tarot/deck/back` (FormData `file` **o** JSON `{config}`) →
  upload: sube `${userId}/back.webp`, `back_kind='upload'`; editor: renderiza el
  SVG a webp server-side (misma lógica que `tarot-make-back.mjs`, portada a TS) y
  sube, `back_kind='editor'`, guarda `back_config`.
- `PUT /api/tarot/deck` `{active}` → activa/desactiva el mazo custom.

Todos: `runtime=nodejs`, `authenticateRoute`, gate `SUPABASE_SERVICE_ROLE_KEY`
(503 si falta), `createServiceSupabaseClient`, path de sesión, validación
server-side como fuente de verdad.

### 5. Editor de reverso — lógica compartida

Portar la generación de `scripts/tarot-make-back.mjs` a
`packages/core/src/tarot/back-svg.ts`: `buildBackSvg({bg, border, symbol})` →
string SVG (350×600, doble borde, símbolo central). Símbolos: `enso` | `star` |
`moon` (los dos primeros ya existen en el script; `moon` = arco lunar nuevo).
- Web: el editor renderiza el SVG en vivo (data-URL) para preview; al guardar,
  manda el `config` al endpoint (server renderiza a webp con sharp — sharp ya
  está disponible en web).
- Móvil: preview con `react-native-svg` (ya en deps) usando los mismos params;
  guardar manda el `config` (el server hace el webp).

### 6. UI de Ajustes

- **Web** `apps/web/app/(app)/ajustes`: nueva sección "Tu mazo" (Client Component
  aislado, patrón `settings-controls.tsx`): grid de 78 slots (miniatura RWS por
  defecto; cada slot: subir/reemplazar/quitar), tarjeta "Diseña tu reverso"
  (abre el editor), toggle "Usar mi mazo". Latente sin Storage → nota + deshabilitado.
- **Móvil** `apps/mobile/app/(tabs)/ajustes.tsx`: sección espejo bajo el patrón
  de "Apariencia" (chips/swatches) — subir por carta (image picker), editor de
  reverso, toggle activar.

### 7. Cableado en las lecturas

Ceremonia + modo manual (web y móvil) obtienen el `DeckAssetCtx` del manifiesto y
lo pasan al resolver. Al guardar con mazo custom activo, `deck: "custom"`. El
diario resuelve las imágenes con el mismo ctx.

## No-regresión

Sin mazo custom (caso de todos hoy): el resolver devuelve exactamente las URLs
RWS actuales. Los tests existentes de tarot deben seguir verdes sin cambios de
aserción (salvo los que centralicen la construcción de URL).

## Fuera de alcance (T4)

Sincronizar el mazo a dispositivos offline (móvil siempre pide al server, como
hoy); versionado de mazos; compartir mazos entre usuarios; el gate Plus real de
cruz celta y las notas del diario (fases aparte).

## Verificación

Localmente sin Supabase: resolver (unit tests), editor de reverso (preview SVG en
navegador con los 3 símbolos y colores), UI de Ajustes (render + estado latente),
no-regresión de la ceremonia/manual con deck rws (navegador). La ruta de subida
se cierra el loop cuando Gio configure el bucket + service-role (queda documentado
como pendiente Gio, con checklist).
