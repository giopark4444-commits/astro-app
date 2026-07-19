# Chat palancas de enfoque — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El chat de Aluna gana 4 palancas (Astros/Números/Pilares ON, Tarot OFF por defecto); el consejo se enfoca solo en las encendidas; activar Tarot pide sacar una carta (digital o mazo físico/manual) que alimenta el consejo.

**Spec:** `docs/superpowers/specs/2026-07-18-chat-palancas-enfoque-design.md`

## Global Constraints
- Rama `perfil-detalle`. Alcance: `apps/web/app/(app)/preguntar/` (chat-view + nuevo chat-lenses + css) + `apps/web/app/api/chat/route.ts` + `messages/*.json`. NO tocar `/api/bazi`, tarot/, ni otros lentes salvo LEER (content de tarot, computeBaziNatal).
- Serie: comillas dobles/2 espacios/comentarios ES; tokens; bp 1080; TDD; trailer `Co-Authored-By: Claude <noreply@anthropic.com>`; NO next build hasta el gate (16GB).
- Regresión-cero: sin llave IA el chat sigue latente; el modo página `/preguntar` y el panel de perfil siguen funcionando; el default (3 lentes base) reproduce el contexto de hoy (carta+numerología) MÁS Ba Zi (nuevo — el consejo hoy no lo tenía, adición intencional).
- Contrato de lentes: `LENSES = ["astros","numeros","pilares","tarot"]`; default activo `["astros","numeros","pilares"]`.

---

### Task 1: Backend — `buildContext` por bloques + Ba Zi + tarot + enfoque
**Files:** Modify `apps/web/app/api/chat/route.ts` · Test `apps/web/app/api/chat/__tests__/context.test.ts` (crear; si el route no es testeable aislado, extraer `buildContext`/bloques a `apps/web/lib/chat-context.ts` y testear ahí — RECOMENDADO)
**Cambios:**
1. Extraer a `apps/web/lib/chat-context.ts` (nuevo, testeable):
   - `buildAstrosBlock(profile, chart, locale): string` (el bloque "Carta natal — …" actual).
   - `buildNumerosBlock(numerology, locale): string` (el bloque "Numerología — …" actual).
   - `buildPilaresBlock(profile, locale): string` — usa `computeBaziNatal(profile)` (de `@/lib/timeline/bazi-natal`) + `composeBaziReading` (de `@aluna/core`); teje pilares (tronco/rama por posición) + Maestro del Día + esencia. Server-only OK.
   - `buildTarotBlock(card, locale): string` — recibe `{id, reversed}`, saca nombre+keywords+significado (upright/reversed) de `TAROT_CARDS_(ES|EN)`.
   - `buildFocusedContext({profile, chart, numerology, lenses, tarotCard, locale}): string` — concatena SOLO los bloques de `lenses` activos (tarot solo si `tarotCard` presente); encabeza con `DATOS DE <name>`.
   - `focusLine(lenses, tarotCard, locale): string` — "Aconseja apoyándote ÚNICAMENTE en: <lista de disciplinas activas>. No introduzcas las demás." (lista traducida: Astrología / Numerología / Cuatro Pilares (Ba Zi) / Tarot).
2. `route.ts`: parse `lenses` (validar contra `LENSES`, default a las 3 base si vacío/ausente) y `tarotCard` (validar `{id: string, reversed: boolean}`, id ∈ TAROT_CARDS) del body; usar `buildFocusedContext` + `focusLine` en vez del `buildContext` monolítico. `computeChart`/`computeNumerology` solo se llaman si su lente está activo (perf).
- [ ] RED: `context.test.ts` — solo `["numeros"]` → bloque numerología presente, carta AUSENTE, focusLine menciona solo Numerología; `["astros","pilares"]` → carta+bazi, sin numerología; `["tarot"]` con card → bloque tarot con nombre de la carta; `["tarot"]` sin card → sin bloque tarot; vacío → default 3 base. (Fixture: un profile mock + chart/numerology reales o mockeados — Ba Zi usa computeBaziNatal con un profile fijo tipo 1990-02-04.)
- [ ] Implementar → GREEN + suite completa + typecheck + eslint → commit `feat(chat): contexto enfocado por lente + bloques Ba Zi y tarot en /api/chat`.

---

### Task 2: `chat-lenses.tsx` — palancas + flujo de tarot
**Files:** Create `apps/web/app/(app)/preguntar/chat-lenses.tsx` + su CSS (en chat.module.css o propio) · Test `apps/web/app/(app)/preguntar/__tests__/chat-lenses.test.tsx`
**Contrato:** `ChatLenses({ value, onChange })` donde `value = { lenses: string[]; tarotCard: {id,reversed}|null }` y `onChange(next)` — componente CONTROLADO (estado en el padre ChatView).
- Fila de 4 chips-toggle: Astros/Números/Pilares/Tarot. Activo = clase resaltada + aria-pressed.
- Click en Astros/Números/Pilares: toggle directo; NO permitir apagar la última encendida (si es la única, ignora el apagado — feedback sutil).
- Click en Tarot: si ya ON → apaga y limpia `tarotCard`; si OFF → abre el mini-flujo (no activa aún).
- Mini-flujo tarot (estado interno del componente, `mode: "closed"|"choose"|"pick"`):
  - "choose": dos botones — "Sacar carta" (llama `drawCards`/RNG de `@aluna/core` para 1 carta con reversa aleatoria → set tarotCard, tarot ON, cerrar) y "Tengo mi carta" (→ "pick").
  - "pick": picker mínimo propio — grid de las 78 (`TAROT_CARDS_*`), buscador por nombre, click elige (con toggle reversa) → set tarotCard, tarot ON, cerrar. (Picker mínimo nuevo; NO extraer el de manual-entry.)
  - Cancelar → cierra, tarot queda OFF.
- Carta fijada (cuando `tarotCard` y tarot ON): chip/línea con nombre + "invertida" si reversed + botón "otra carta" (reabre "choose").
- [ ] RED: default no aplica aquí (lo pone el padre); tests con `value` inyectado: apagar la única encendida no llama onChange con vacío; activar tarot abre choose; "sacar carta" produce onChange con tarotCard no-null y "tarot" en lenses; picker elige carta.
- [ ] Implementar → GREEN + carpeta preguntar + typecheck + eslint → commit `feat(chat): ChatLenses — palancas de enfoque y flujo de carta de tarot`.

---

### Task 3: Cablear ChatView + i18n + CSS
**Files:** Modify `apps/web/app/(app)/preguntar/chat-view.tsx`, `chat.module.css` · Modify `messages/es.json`+`en.json`
**Cambios:**
1. ChatView: estado `lenses` (default `["astros","numeros","pilares"]`) + `tarotCard` (null); montar `<ChatLenses value={{lenses,tarotCard}} onChange={...}>` sobre el hilo (en ambos modos — embedded y página). Incluir `lenses` + `tarotCard` en el body del POST a `/api/chat`.
2. i18n (namespace del chat — verificar cuál usa ChatView, `ask` o similar): `lensAstros`/`lensNumeros`/`lensPilares`/`lensTarot`, `tarotDraw` ("Sacar carta"/"Draw a card"), `tarotManual` ("Tengo mi carta"/"I have my card"), `tarotAnother` ("Otra carta"/"Another card"), `tarotReversed` ("invertida"/"reversed"), `lensSearchCard` ("Busca una carta…"/"Search a card…"), `cancel` si no existe.
3. CSS: fila de palancas (chips wrap, gap sp-2), estado activo (fondo acc suave), la carta fijada, el mini-picker (grid responsive de cartas con scroll interno, buscador sticky). Debe verse bien en el panel de perfil (angosto, 50% ahora) y en la página. Móvil: las palancas hacen wrap.
- [ ] RED: test ChatView monta las palancas; el POST incluye lenses+tarotCard (mock fetch, asertar el body). 
- [ ] Implementar → GREEN + suite completa + typecheck + eslint → commit `feat(chat): palancas de enfoque montadas en el chat (página + panel de perfil)`.

---

### Task 4: Gate final
- [ ] Suite completa + typecheck + eslint + build 16GB EXIT 0 → dev :3010.
- [ ] Controlador en navegador propio: `/perfil` desktop → palancas visibles (3 ON, tarot OFF); apagar hasta dejar 1 (no deja apagar la última); activar Tarot → sacar carta (digital) y "tengo mi carta" (picker) → carta fijada; **mandar un mensaje con solo Números y verificar que la respuesta real (Ollama/llave) es numerológica** (cerrar el loop de verdad — es el corazón del pedido); con Tarot+carta que el consejo la menciona; `/preguntar` con las palancas; móvil wrap. Capturas.
- [ ] Review integral Fable → ola → re-review → merge a main vía worktree efímero + smoke + memoria + reporte.
