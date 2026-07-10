# Rediseño R2 — Escalas web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ritmo tipográfico y espacial consistente en toda la web — los 30+ tamaños ad hoc (con medios píxeles) y ~170 gaps/paddings arbitrarios migran a una escala tokenizada; los colores semánticos hardcodeados (#1a1305 ×8, tonos armonía ×5) se tokenizan. Cero rediseño de layout: mismos componentes, mismos DOM, solo valores sobre la escala.

**Architecture:** Tokens primero (`tokens.css` gana escalas + semánticos), luego barrido módulo a módulo en tandas revisables — spike de calibración en el módulo flagship (pilares) antes de comprometer el resto. La vara es `docs/redesign/mockups/SPEC.md` + los mockups web aprobados (`web-numeros-despues.html`, `desktop-carta-despues.html`).

**Tech Stack:** CSS vars + CSS Modules (NO Tailwind — decisión firme de Gio). Next.js 15.

## Global Constraints

- SOLO cambian VALORES de CSS (font-size/gap/padding/margin/color hardcodeado → var). PROHIBIDO: cambiar selectores, estructura, layout (flex/grid), animaciones, o cualquier .tsx salvo que un valor viva inline (no debería — verificado en exploración: los inline son stagger `--i` y anchos dinámicos, NO se tocan).
- **Escala tipográfica** (nueva en `:root` de tokens.css):
  `--text-2xs: 11px; --text-xs: 12px; --text-sm: 13px; --text-md: 15px; --text-lg: 17px; --text-xl: 20px; --text-2xl: 24px; --text-3xl: 32px; --display-sm: 44px; --display: 60px;`
- **Escala de espaciado**: `--sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 28px; --sp-7: 40px;`
- **Semánticos**: `--ink-on-acc: #1a1305;` (reemplaza el literal en los 8 archivos) · `--tone-warm: #e0795a; --tone-cool: #7aaae0;` (reemplaza los tonos armonía/tenso-fluido en los 5 archivos). OJO: los temas claros podrían necesitar variantes — en R2 se define UNA vez en `:root` (los valores actuales funcionan en ambos modos porque ya se usan así hardcodeados hoy; si un tema define su propio on-acc en el futuro, se sobreescribe por tema).
- **Regla de mapeo**: cada font-size migra al paso MÁS CERCANO de la escala; empates exactos → el paso menor si es texto de apoyo, el mayor si es jerarquía principal (documentar cada empate con un comentario corto). Medios píxeles (11.5/12.5/13.5/9.5/8.5/10.5/16.5) → paso más cercano. Sub-11px (7.5/8.5/9.5) → `--text-2xs` (piso de la escala; si algo se ve gigante tras subir de 8.5→11, es candidato a excepción documentada).
- **Héroes**: numerology hero 66→`--display`; sheet hero 56→`--display-sm`; compat score 56→`--display-sm`; day-number 48→`--display-sm`. (Vara: mockup web-numeros usa 60 para el hero de página.)
- **Padding de tarjeta canónico**: 14px actuales → `--sp-5` (20px) SOLO en las tarjetas patrón `.card`-glass (la receta del SPEC); otros paddings → paso más cercano.
- **Excepciones legítimas** (NO migrar): valores de geometría SVG (la rueda), border-width 1px, radios (ya tokenizados --radius/--radius-lg), los `style={{"--i": n}}` de stagger, anchos %, el clearance de 96px del bottom-nav (patrón repetido en los wraps de página — se deja como está en R2), y ajustes de línea base negativos (-Npx).
- **Reglas calibradas por el spike de pilares (T2) — aplican a TODAS las tandas:**
  - La regla de empate menor/mayor por ROL (apoyo→menor, jerarquía→mayor) aplica también a gap/padding/margin, no solo a font-size.
  - Si existe mockup "después" de la pantalla (numeros, carta/desktop-carta, pilares, hoy móvil como referencia de recetas), la vara del mockup MANDA sobre la heurística de rol — citar la línea del mockup en el comentario del empate. Pantallas SIN mockup (compat/chat/ajustes/onboarding/auth/shell): heurística de rol + consistencia con los módulos ya migrados (pilares como precedente), y esas tandas reciben escrutinio visual extra del controlador.
  - Empate 18px (sp-4 16 vs sp-5 20, diff 2 ambos): paddings de contenedor/tarjeta → sp-5 (20, coherente con la receta canónica de card del SPEC); gaps internos/apoyo → sp-4 (16). Documentar cada caso.
  - Empate 14px (sm 13 vs md 15): texto de apoyo → sm; texto de lectura/valor → md.
  - Colisiones numéricas con tokens semánticos de OTRO eje (ej. un color que coincide con --tone-*) NO se alias — ejes semánticos distintos se mantienen separados.
- Gate por tarea: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` — verde.
- Verificación visual: cada tanda termina con pase visual del CONTROLADOR en navegador vivo (localhost:3002, los 3 temas × 2 modos en las páginas tocadas) — regresiones de wrap/overflow se cazan ahí; especial atención en EN (textos más largos).
- Comentarios en español; cada archivo migrado abre con una línea `/* R2: valores sobre la escala tokenizada (ver tokens.css) */`.

---

### Task 1: Tokens — escalas + semánticos en `tokens.css`

**Files:**
- Modify: `apps/web/lib/theme/tokens.css`

- [ ] **Step 1:** Añadir al `:root` (tras los tokens de movimiento) los 3 bloques de Global Constraints (tipográfica, espaciado, semánticos) con comentarios de sección en español. NO tocar los tokens existentes ni los bloques por tema.
- [ ] **Step 2:** Gate + commit: `feat(r2): escalas tipográfica/espaciado + tokens semánticos en tokens.css`

### Task 2: Spike de calibración — `pilares.module.css` (flagship, checkpoint riguroso)

**Files:**
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (167 líneas, el más grande)

- [ ] **Step 1:** Migrar TODOS los font-size/gap/padding/margin a las escalas según la regla de mapeo; colores Wu Xing NO se tocan (dominio); si aparece #1a1305 o tonos armonía → semánticos. Documentar en el reporte: conteo de valores migrados, empates adjudicados, excepciones dejadas.
- [ ] **Step 2:** Gate + verificación visual del controlador (Pilares en 3 temas, ES/EN, modo Pro completo — la lámina es la firma profesional). Este spike CALIBRA el esfuerzo real de las tandas restantes.
- [ ] **Step 3:** Commit: `feat(r2): pilares (flagship) sobre la escala — spike de calibración`

### Task 3: Tanda Carta — `carta.module.css`

**Files:**
- Modify: `apps/web/app/(app)/carta/carta.module.css` (131 líneas)

- [ ] Migración estándar (regla de mapeo; la geometría SVG de la rueda NO se toca). Gate + commit: `feat(r2): carta sobre la escala`

### Task 4: Tanda Hoy + Números — `hub` + `day-number` + `energy` + `numerology-view`

**Files:**
- Modify: `apps/web/app/(app)/hoy/hub.module.css`, `apps/web/app/(app)/hoy/day-number.module.css`, `apps/web/app/(app)/hoy/energy.module.css`, `apps/web/app/(app)/numeros/numerology-view.module.css`

- [ ] Migración estándar. Héroes según Global Constraints (66→display, 56→display-sm, 48→display-sm). Los tonos armonía de energy/day-number → `--tone-warm/--tone-cool`. Gate + commit: `feat(r2): hoy y números sobre la escala`

### Task 5: Tanda Compat + Chat + Ajustes — `compat` + `chat` + `settings`

**Files:**
- Modify: `apps/web/app/(app)/compatibilidad/compat.module.css`, `apps/web/app/(app)/preguntar/chat.module.css`, `apps/web/app/(app)/ajustes/settings.module.css`

- [ ] Migración estándar (compat score 56→display-sm; tonos → semánticos; #1a1305 → --ink-on-acc). Gate + commit: `feat(r2): compat/chat/ajustes sobre la escala`

### Task 6: Tanda Onboarding + Auth (flagship login) — `onboarding` + `auth`

**Files:**
- Modify: `apps/web/app/onboarding/onboarding.module.css` (193 líneas), `apps/web/components/auth.module.css`

- [ ] Migración estándar. **Login/signup es el segundo flagship** (la portada del producto): checkpoint visual riguroso del controlador post-migración. Gate + commit: `feat(r2): onboarding y auth (flagship login) sobre la escala`

### Task 7: Tanda shell + componentes — `app-shell` + `bottom-nav` + `bottom-sheet` + `profile-menu` + `starfield` + `globals`

**Files:**
- Modify: `apps/web/app/(app)/app-shell.module.css`, `apps/web/components/bottom-nav.module.css`, `apps/web/components/bottom-sheet.module.css`, `apps/web/components/profile-menu.module.css`, `apps/web/components/starfield.module.css` (si tiene valores), `apps/web/app/globals.css` (solo valores, NO las animaciones)

- [ ] Migración estándar. Gate + commit: `feat(r2): shell y componentes sobre la escala`

### Task 8: Verificación integral (controlador)

- [ ] **Greps de cierre**: `grep -rn "font-size: [0-9]" apps/web --include="*.module.css" --include="globals.css" | grep -v "var(--"` → solo excepciones documentadas; ídem `gap:`/`padding:` con px crudos; `#1a1305` → 0; `#e0795a|#7aaae0` fuera de tokens.css → 0.
- [ ] Gates monorepo: turbo 12/12 + next build.
- [ ] **Pase visual vivo final** (controlador, browser): las 10 páginas en Observatorio dark/light + Hoy y Pilares en Aurora y Cósmico + una pasada EN — buscando wraps/overflows/jerarquías rotas.
- [ ] Merge a main + push + memoria.

## Self-Review

- Cobertura: los 16 módulos + globals repartidos en T2-T7 (16 archivos listados = inventario completo de la exploración); escalas/semánticos = T1; flagships con checkpoint (pilares T2, login T6); verificación = T8 con greps definidos.
- Placeholders: la regla de mapeo + tabla de héroes + excepciones están definidas UNA vez en Global Constraints con valores exactos; las tareas de tanda son aplicación mecánica de esa regla (no "TBD").
- Consistencia: los nombres de tokens (--text-*, --sp-*, --ink-on-acc, --tone-*) idénticos entre T1 y las tandas; coinciden con el SPEC de mockups aprobado.
