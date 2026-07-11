# R3 — Unificación + colores compartidos: brief de ejecución

Fuente: dos inventarios read-only (2026-07-11) sobre `apps/web`, `apps/mobile`, `packages/core`.
Este doc es la base de R3 (writing-plans + SDD lo consumen). Objetivo del plan maestro
(`PLAN-MAESTRO-rediseno.md` §R3): 40+ implementaciones duplicadas → pocas fuentes de verdad,
**sin aplanar variantes intencionales** (mitigación = inventario previo, este doc).

## Decisiones (sintetizadas; algunas confirmadas por Gio)

1. **On-accent web = CONSCIENTE DEL TEMA** (confirmado por Gio 2026-07-11). Hoy la web usa un
   solo `#1a1305` en los 6 modos; el móvil ya varía la tinta por tema×modo (casi blanca en los 3
   claros). Web adopta `--ink-on-acc` por tema×modo espejando los valores ya afinados del móvil
   (`apps/mobile/theme/tokens.ts` `onAcc`). Retira el `#14132a` local de `hoy/energy.module.css`.
   Verificar con la pasada axe/contraste. Es la corrección del "riesgo WCAG modos claros con oro".
2. **Colores invariantes SÍ a core, on-accent NO** (contradice el plan maestro, que lo listaba
   como invariante — el inventario probó que es theme-dependent). A core solo: element→color,
   armonía/aspecto, Wu Xing. On-accent se queda como CSS var por-tema (decisión 1).
3. **Zodiaco vs Wu Xing = exports SEPARADOS y TIPADOS**, nunca un mapa plano. Comparten claves
   `fire/earth/water` pero solo `fire` coincide en valor; fusionarlos corrompería un dominio.
4. **Preservar variantes intencionales como modificadores** (no aplanar): seg de relleno
   gradiente en Carta/Numerología (flagship) = `.seg--gradient`; chip-control sin relleno
   (`scriptBtn` 漢字↔한글) = `.chip--control-outline`. Documentar cada one-off por nombre.
5. **Wu Xing en web = clases CSS** (`.el_*`/`.elBg_*`, lookup dinámico en 6 call sites) se
   MANTIENEN con comentario "espejo de @aluna/core WU_XING_COLORS"; el móvil SÍ importa de core.
   (CSS no puede importar TS; la fuente canónica es core, la web es espejo documentado.)
6. **R4 (desktop) va en el mismo plan** como última tarea (un bloque `@media` en tokens.css;
   el plan maestro lo sugiere).
7. **Gates de grep con comentario de justificación** en cada excepción superviviente (convención
   ya usada en el repo: `pilares.module.css:104`, `numeros.tsx:396`, `ajustes.tsx:324`), no un
   cero duro donde hay excepciones legítimas.

---

## A. Colores de dominio → `@aluna/core` (invariantes, byte-idénticos web↔móvil hoy)

**Home:** `packages/core/src/constants/colors.ts` (nuevo) + `packages/core/src/bazi/colors.ts` (nuevo).
`@aluna/core` es RN-safe (0 deps runtime, sin `node:`), ya lo importa `ChartWheel.tsx` móvil.

### element→color (tipo `Element` fire/earth/air/water, ya en `constants/astrology.ts:1`)
```ts
export const ELEMENT_INK:  Record<Element,string> = { fire:"#e0795a", earth:"#7fb069", air:"#7aaae0", water:"#9b8fd6" };
export const ELEMENT_FILL: Record<Element,string> = { fire:"rgba(224,121,90,0.12)", earth:"rgba(127,176,105,0.12)", air:"rgba(122,170,224,0.12)", water:"rgba(150,140,214,0.12)" };
```
Hoy: web `apps/web/app/(app)/carta/wheel-colors.ts:4-22` · móvil `apps/mobile/components/ChartWheel.tsx:24-40` (copia a mano). Sin drift.

### armonía/aspecto (tipo `AspectHarmony` hard/soft/neutral, ya en `constants/astrology.ts:52`)
```ts
export const ASPECT_COLORS: Record<AspectHarmony,string> = { hard:"rgba(224,121,90,0.55)", soft:"rgba(122,170,224,0.5)", neutral:"rgba(231,201,134,0.4)" };
```
Hoy: web `wheel-colors.ts:18-22` (HARMONY_STROKE) · móvil `ChartWheel.tsx:36-40`. Sin drift.
Nota: `--tone-warm #e0795a`/`--tone-cool #7aaae0` (tokens.css:41-42) comparten RGB pero son OTRO
eje semántico (clima de tránsitos); se pueden derivar de los mismos valores core pero NO fusionar.

### Wu Xing (nuevo tipo `WuXingElement` = `StemDef["element"]`, exportar desde `bazi.ts:17`)
```ts
export const WU_XING_COLORS: Record<WuXingElement,string> = { wood:"#7fb069", fire:"#e0795a", earth:"#d4a85f", metal:"#b8b6c8", water:"#7aaae0" };
```
Hoy: web `pilares.module.css:104-117` (.el_*/.elBg_*, comentado "DOMINIO intocable") · móvil
`apps/mobile/app/(tabs)/pilares.tsx:38-46` (EL_COLOR). Sin drift. `earth` #d4a85f ≠ zodiaco `earth`.

**Sitios de import tras el refactor:**
- `carta/wheel-colors.ts` → re-exporta de @aluna/core (shim; `chart-wheel.tsx` no cambia su import).
- móvil `ChartWheel.tsx:24-40` → borra consts locales, añade al import de @aluna/core (línea 10-14).
- móvil `pilares.tsx:38-46` → borra EL_COLOR, importa WU_XING_COLORS (alias local para no tocar ~6 call sites).
- web `pilares.module.css:104-117` → MANTIENE clases, comentario → core (decisión 5).

**Tests core:** los valores exportados == los literales actuales (byte-check). Grep gate: `#d4a85f|#b8b6c8`
y `#e0795a|#7fb069|#7aaae0|#9b8fd6` fuera de core/tokens.css == 0; `const ELEMENT_INK|ELEMENT_FILL|HARMONY_STROKE|EL_COLOR` en apps/ == 0.

---

## B. Web `.card` global + variantes (25 ocurrencias → base + 4 modificadores)

`globals.css` ya tiene `.glass` HUÉRFANA (surface+line+radius+blur, usada en 0 .tsx) = semilla de `.card`.
Radios tokenizados: `--radius` 16px, `--radius-lg` 22px. **Tercer radio no documentado: 14px
hardcodeado 7× ** (settings.tc, numerology.practiceBlock/gatedNote, informe.dormant, pilares.luckCol) →
normalizar a `--radius` (delta 2px, screenshot-check).

Variantes propuestas (definir en globals.css; migrar por módulo):
- **`.card`** base: `background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-lg); padding:var(--sp-5)`. Cubre: compat.overall, informe.card, pilares.card(Pro), auth.card(+elevated).
- **`.card--tight`**: radio `--radius` (16px) + padding menor. Cubre: carta.card/.big, numerology.pro.card + el cluster 14px normalizado.
- **`.card--interactive`**: base + hover lift -3px + border→acc + `box-shadow:var(--glow-soft)`. Cubre (casi byte-iguales ya): hoy.day-number.card, hub.tile, hub.weatherCard (unifica el `a .tile:hover` vs `.weatherCard:hover`).
- **`.card--dashed`** (empty/dormant): `border:1px dashed rgba(var(--acc-rgb),.35); background:var(--surface-2); border-radius:var(--radius-lg)`. Cubre: compat.empty, informe.dormant/.plusTease/.emptyProfile, numerology.gatedNote, chat.dormant (converge 22/18/14px → uno).
- **`.card--elevated`**: base + `box-shadow:var(--elev)` (+blur). Cubre: auth.card.

**One-offs — NO forzar a `.card`** (documentar por nombre en el grep gate): numerology.hero (gradiente+borde acc+tap-scale), chat.msg/.aluna (esquina asimétrica = forma de burbuja, semántica), bottom-sheet.sheet/.modal (fondo `--bg`, chrome de cajón, radios 24/26px), settings.tc + onboarding.gender (tiles seleccionables — familia aparte `.card--selectable` o quedan como están).

Grep gate B (== 0 salvo el archivo del primitivo + one-offs nombrados): recetas `border:1px solid var(--line)`+`background:var(--surface)` sueltas; `border-radius:\s*(14|18|24|26)px`; `border:1px dashed rgba(var(--acc-rgb)`.

---

## C. Web chips: 2 primitivas (11 ocurrencias: 8 tag + 3 control)

- **`.chip`** (tag/display): `border:1px solid var(--line); border-radius:9px; padding:var(--sp-1) var(--sp-3); color:var(--soft)|var(--ink)` + custom prop `--chip-tint` para badges de color dinámico (Wu Xing `.el_*` = override, intocable). Mapea: carta.chip/.tag, numerology.chip, pilares.god/.dayTag, hub.badge. `pilares.chip` (999px pill) = `.chip--pill` (outlier, no aplanar en silencio). `day-number.chip` NO es chip visual (sin borde/bg) → renombrar, no migrar.
- **`.chip--control`** (interactivo): pill 999px + hover + `.chip--control-on` (gradiente acc + `--ink-on-acc` + `glow-soft`) + `.chip--control-disabled`. Mapea: compat person-picker (ya pill), carta.ctrl/.ctrlOn (radio 18→999, screenshot-check). **`.chip--control-outline`** para pilares.scriptBtn/.scriptOn (activo solo borde+texto, SIN relleno — variante, no aplanar).
- **Token `--tone-caution`**: los literales `#e0a07a`/`rgba(220,120,80,.6)` (warn) están duplicados verbatim en carta.tagWarn y numerology.chipWarn → un token semántico.

Grep gate C: selectores viejos `^\.(chip|chipOn|chipWarn|chipDim|chipDisabled|chipDot|tag|tagWarn|god|godSelf|dayTag|badge)\b` en app/components == 0 (salvo primitivo + `.el_*`); `e0a07a|220, 120, 80` == 0.

---

## D. Web `.seg` unificado (segmentados)

- **`.seg`** track: `display:flex; gap:var(--sp-1); padding:var(--sp-1); background:var(--surface-2); border:1px solid var(--line); border-radius:var(--radius)` + **`.seg__item`** (`flex:1; border:0; border-radius:calc(var(--radius) - 5px); background:transparent; color:var(--soft)`) + **`.seg__item--active`** (relleno plano `background:var(--acc); color:var(--ink-on-acc); box-shadow:var(--glow-soft)`).
- **`.seg--gradient`** (modificador, preserva flagship): activo con relleno gradiente acc 1→0.8. Para carta.kindRow/.kindOn y numerology.tierRow/.tierOn (pantallas flagship — NO aplanar a plano).
- Mapea directo: settings.seg (ya casi igual), energy.periods (el que SÍ se renderiza).
- **CORRECCIÓN (verificado por grep 2026-07-11):** NO hay código muerto en `hub.module.css` (el 1er inventario se equivocó). El bloque `.periods/.period/.periodOn` vive SOLO en `hoy/energy.module.css` (vivo, renderizado por energy-panel.tsx) — ése es el seg a unificar, no hay copia que borrar.
- **`#14132a`** (tinta activa navy del period-selector, comentada "decisión pendiente") → converge al `--ink-on-acc` theme-aware (decisión 1). Cambio visible en el pill activo → cubierto por axe/screenshot.
- **plan-card.tsx** reusa `.seg`/`.segItem` para botones de plan SIN estado activo (mal uso semántico) → repuntar a una clase button-group plana, no al `.seg` nuevo.

Grep gate D: `^\.(seg|segItem|segOn|kindRow|kindBtn|kindOn|periods|period|periodOn|tierRow|tier|tierOn)\b` == 0 (salvo primitivo); `#14132a` == 0; el bloque `.periods` de hub.module.css ya no existe.

---

## E. Móvil: adopción de primitivos R1 (`apps/mobile/components/ui.tsx`: Card/Chip/FadeIn)

- **`proToggle`/`proDot`/`proText` byte-idénticos 3×** (carta.tsx:445, numeros.tsx:341, pilares.tsx:832) → **extraer primitivo `ToggleRow`** (paralelo del `.proDot`/`.proToggle` web, también 3×). Nueva primitiva, no adopción.
- **`Chip` `"tag"` no tiene bg/borde** (ui.tsx:216-220): extender para variante con borde/relleno + color Wu Xing dinámico → cubre pilares Favor/Avoid + estrellas simbólicas (pilares.tsx:892-905, gap auto-documentado) y el theme-picker con swatch (ajustes.tsx:326-341, ¿el prop `icon?` existente ya sirve para el swatch? verificar primero).
- **`luckCol`** (pilares.tsx:599-613): tiles 大運/流年 = Pressable a mano (borderColor accHair + radius.md), hermanos usan `<Card>`. Necesita Card con `onPress` + estados (luckNow borde, luckOpen bg) → extender Card o anidar `<Pressable><Card>`.
- **PlaceAutocomplete.tsx:100-123**: dropdown opaco a mano SIN comentario de excepción → revisar (puede ser legítimo por overflow/clipping; si lo es, añadir comentario).
- **Legítimos, no tocar** (ya comentados): inputs de form (login/signup/onboarding), inclCell numeros:396, bottom bar onboarding:355, dayBadge pilares:796.

Grep gate E: `proDot: { width: 9, height: 9, borderRadius: 5` == ≤1; `const EL_COLOR` móvil == 0.
Heurísticas `borderColor: t.accHair`+bg en View/Pressable y `borderRadius: radius.pill` fuera de ui.tsx
NO van a cero limpio (excepciones legítimas) → exigir comentario de justificación, no cero duro.

---

## F. Mini-doc contrato + axe

- **`docs/redesign/R3-sistema.md`** (1 página): los primitivos (.card/variantes, .chip/.chip--control, .seg), la escala (--text-*/--sp-*/--radius), y las fuentes de color (core ELEMENT/ASPECT/WU_XING + on-accent theme-aware) → para que 4b/4c/4d nazcan dentro del sistema.
- **Pasada axe/contraste** sobre las **6 combinaciones tema×modo** (Observatorio/Aurora/Cósmico × claro/oscuro). Riesgo real = modos claros con oro (resuelto por decisión 1). Hecho cuando: axe sin errores nuevos.

## G. R4 desktop (última tarea del plan)

`@media (min-width:~900px)` en tokens.css re-escalando `--text-*`/`--sp-*` + contenedor algo más ancho +
BottomNav como dock. Métricas (Lighthouse/build-size) re-medidas vs baseline. Riesgo bajo (borrar = revertir).

## Hecho cuando (R3)
grep de patrones viejos == 0 (salvo primitivos + one-offs nombrados con comentario); contrato escrito;
axe sin errores nuevos en las 6 combinaciones; render de las pantallas idéntico salvo los cambios
conscientes (on-accent theme-aware, dashed unificado, 14→16px).
