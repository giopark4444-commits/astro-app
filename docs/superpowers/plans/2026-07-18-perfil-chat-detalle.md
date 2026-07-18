# Perfil chat-detalle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/perfil` desktop en 2 columnas: todo el perfil a la izquierda (11fr), SOLO el chat general de Aluna a la derecha (9fr, sticky, ventana con scroll + input); móvil intacto; `ChatView` parametrizado (cero 4º clon).

**Spec:** `docs/superpowers/specs/2026-07-18-perfil-chat-detalle-design.md` · **Molde:** receta serie lentes-detalle (en main: `numeros/`, `tarot/` module.css — deskCols/interpCol/interpPanel/cardH2).

## Global Constraints
- Rama `perfil-detalle` (desde `f667a9d`). Alcance: `apps/web/app/(app)/perfil/` (page + module.css + panel nuevo) + `apps/web/app/(app)/preguntar/chat-view.tsx` (parametrización mínima) + `messages/*.json` si hace falta clave nueva. NADA más (no api, no lifetime/, no ajustes, no otros lentes).
- Serie: comillas dobles/2 espacios/comentarios ES; tokens; bp 1080; TDD; trailer `Co-Authored-By: Claude <noreply@anthropic.com>`; NO next build hasta el gate (16GB).
- Regresión-cero: móvil de perfil idéntico; `/preguntar` idéntico.
- PROHIBIDO clonar el esqueleto de chat por 4ª vez.

---

### Task 1: Parametrizar `ChatView` (modo embebido)
**Files:** Modify `apps/web/app/(app)/preguntar/chat-view.tsx` · Test `apps/web/app/(app)/preguntar/__tests__/chat-view.test.tsx` (crear si no existe, con harness de mocks fetch/useProfiles/matchMedia de la serie)
**Cambios:**
- Prop nueva `embedded?: boolean` (default false). Con `embedded`:
  - NO llama `useSearchParams` — ⚠️ los hooks no pueden ser condicionales: extraé la lectura de `?q=` a un subcomponente `PageSeed` que solo se monta sin embedded, O leé searchParams siempre pero IGNORÁ el valor con embedded (lo segundo es más simple y no viola reglas de hooks — elegir y documentar).
  - No renderiza la cabecera de página (`eyebrow`/`title`); el contenedor raíz usa clase `styles.wrapEmbedded` (nueva en su module.css: sin padding de página, alto 100%, flex column para que la lista de mensajes tome el espacio y el input quede abajo).
  - Todo lo demás (estados opening/idle/loading/dormant/error, streaming, SpeakButton) intacto.
- [ ] RED: test monta `<ChatView embedded />` con `?q=hola` mockeado en la URL → NO auto-envía (el mock de fetch a /api/chat no recibe llamada); monta sin cabecera; y `<ChatView />` (página) conserva el auto-seed (fetch llamado con "hola"). Dormant: respuesta `{available:false}` → texto dormant visible en ambos modos.
- [ ] Implementar → GREEN + typecheck + eslint → commit `feat(preguntar): ChatView embebible — modo panel sin seed de URL ni cabecera de página`.

---

### Task 2: Panel de chat en Perfil + CSS 2-col
**Files:** Create `apps/web/app/(app)/perfil/perfil-chat-panel.tsx` · Modify `apps/web/app/(app)/perfil/page.tsx`, `perfil.module.css` · Modify `messages/es.json`+`en.json` (clave `perfil.chatTitle` = "Pregúntale a Aluna"/"Ask Aluna") · Test `apps/web/app/(app)/perfil/__tests__/perfil-layout.test.tsx`
**Cambios:**
1. `perfil-chat-panel.tsx` ("use client", delgado): `<div className={styles.chatPanel}><span className={styles.cardH2}>{t("perfil.chatTitle")}</span><ChatView embedded /></div>`.
2. `page.tsx` (server): envolver el contenido actual en `deskCols > leftCol` + `interpCol > PerfilChatPanel` (el panel es client; el resto sigue server — verificar que el import cruza bien la frontera RSC).
3. CSS (receta serie adaptada a chat):
   - Base: `.deskCols{display:block}` `.leftCol{display:block}` `.interpCol{display:none}`.
   - Desktop 1080: `.deskCols{display:grid;grid-template-columns:11fr 9fr;gap:var(--sp-6);align-items:start}` · `.leftCol{min-width:0}` (el grid 12-col interno del perfil vive AQUÍ — re-escopar sus reglas existentes si referencian al wrap) · `.interpCol{display:block;position:sticky;top:84px}` · `.chatPanel{display:flex;flex-direction:column;height:calc(100vh - 100px);border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);padding:var(--sp-4);}` — el hijo ChatView embebido flexea: lista de mensajes `flex:1;overflow-y:auto`, input abajo (coordinar clases con la `wrapEmbedded` de T1).
   - `.cardH2` copiada de la receta serie si perfil no la tiene.
   - Móvil: cero cambios efectivos (verificar que las reglas existentes del perfil no se anidaron mal).
- [ ] RED: test desktop (matchMedia false) → panel presente con título y el chat montado; móvil (true)… el panel es CSS-only (`display:none`) así que en jsdom basta asertar estructura: el panel existe en el DOM pero el CSS module lo oculta — asertar clases correctas; y que las 5 secciones del perfil siguen en leftCol en el mismo orden.
- [ ] Implementar → GREEN + suite completa + typecheck + eslint → commit `feat(perfil): maestro-detalle — el perfil a la izquierda, ventana de chat con Aluna sticky a la derecha`.

---

### Task 3: Gate final
- [ ] Suite completa + typecheck + eslint + build 16GB EXIT 0 → dev server en :3010 (el 3008 quedó huérfano del worktree borrado — matar si sigue vivo).
- [ ] Controlador en navegador propio (checklist serie): `/perfil` desktop → 2 columnas, chat sticky, mandar un mensaje (dormant esperado sin llave — verificar el estado y que el input/UI responden), scroll del perfil no arrastra el panel, las 5 secciones intactas; `/preguntar` con `?q=` sigue auto-enviando; móvil 390px → perfil idéntico a main (comparar captura), panel invisible; barrido de consola.
- [ ] Review integral Fable de la rama → ola de fixes → re-review → merge a main vía worktree efímero (auto-push autorizado) + smoke post-merge + ledger + memoria + reporte a Gio.
