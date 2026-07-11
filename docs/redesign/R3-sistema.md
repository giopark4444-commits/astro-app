# Sistema de UI de Aluna (R3) — contrato para 4b/4c/4d y features nuevas

Una página. Tras R3, las superficies/controles repetidos viven como **primitivos**
(clases globales en `apps/web/app/globals.css` + tokens en `apps/web/lib/theme/tokens.css`)
y los colores de dominio en `@aluna/core`. **Construye features nuevas SOBRE esto**, no
reinventes recetas — si algo no calza, extiende el primitivo o documenta el one-off.

## Cómo se consume un primitivo (web)
Aplica la(s) **clase(s) global(es) como string literal** en el JSX, JUNTO a la clase de
módulo que aporta solo lo que difiere (layout, padding no uniforme, tinte, font propia):

```tsx
// base + variante + override local
<div className={`card card--tight ${styles.big}`}>
<button className={`seg__item ${styles.tier} ${active ? "seg__item--active" : ""}`}>
```
El CSS de Módulo carga DESPUÉS de `globals.css` en Next, así que un override local gana por
orden de fuente a igual especificidad. Si un caso no ganara, sube especificidad (`.card.big`),
nunca `!important`. (Alternativa: `composes: card from global` desde el módulo.)

## Primitivos

### `.card` — superficies
- `.card` base: `surface` + `1px line` + `--radius-lg` (22px) + `--sp-5`.
- `.card--tight`: radio `--radius` (16px) — bloques Pro / mini-cards.
- `.card--interactive`: hover lift −3px + border→acc + `--glow-soft`. (OJO: si el elemento
  también lleva `.reveal`, la animación retiene el transform y suprime el lift — deuda R6.)
- `.card--dashed`: borde punteado acc + `surface-2` — estados vacíos/dormidos.
- `.card--elevated`: + `--elev` + blur — login/signup.
- **One-offs que NO son `.card`** (por diseño): hero de numerología (gradiente), burbujas de
  chat (esquina asimétrica), bottom-sheet (`--bg`, chrome de cajón), tiles seleccionables
  (`settings.tc`, `onboarding.gender`).

### `.chip` / `.chip--control` — etiquetas y controles
- `.chip` (tag/display): `1px line` + radio 9px. `.chip--pill` para el outlier de 999px.
- `.chip--control` (interactivo, pill 999px) + `.chip--control-on` (relleno gradiente acc +
  `--ink-on-acc` + glow) + `.chip--control-disabled`. `.chip--control-outline` = activo solo
  borde+texto, sin relleno (toggle Ba Zi/Saju).
- Color de dominio (Wu Xing `.el_*`) = override que va JUNTO al chip, nunca inline.
- Token de aviso: `--tone-caution` / `--tone-caution-rgb` (no `--tone-warm`, es otro eje).

### `.seg` — segmentados
- `.seg` (track `surface-2` + `--radius`) + `.seg__item` (flex, `text-align:center`) +
  `.seg__item--active` (relleno PLANO acc + `--ink-on-acc` + glow + 600).
- `.seg--gradient .seg__item--active` = relleno GRADIENTE (flagship: Carta, Numerología) —
  gana por especificidad, no aplanar.
- El primitivo **NO define padding/font-size/font-weight de los items** a propósito: cada
  consumidor los aporta con su clase de módulo local (ver `settings.segItem`, `carta.kindBtn`,
  `numerology.tier`). Si añades un seg nuevo, dale su override local de esos 3.
- Grupo de botones plano SIN estado seleccionado (p.ej. planes de cobro) → clase propia
  (`.planActions`/`.planBtn`), NO `.seg`.

## Escala (R2) — usa tokens, no valores crudos
- Tipografía: `--text-2xs`(11) `--text-xs`(12) `--text-sm`(13) `--text-md`(14) … `--text-3xl`
  + `--display-sm`/`--display`.
- Espaciado: `--sp-1`(4) … `--sp-7`(40).
- Radios: `--radius`(16) `--radius-lg`(22). Motion: `--dur-fast`, `--ease`, `--ease-spring`.
- Elevación/resplandor: `--elev`, `--glow`, `--glow-soft` (derivados de `--acc-rgb`).

## Colores
- **Dominio → `@aluna/core`** (una fuente, web+móvil): `ELEMENT_INK`/`ELEMENT_FILL`
  (`constants/colors.ts`, keyed `Element`), `ASPECT_COLORS` (hard/soft/neutral), `WU_XING_COLORS`
  (`bazi/colors.ts`, keyed `WuXingElement`). **Zodiaco y Wu Xing son exports SEPARADOS** —
  comparten claves fire/earth/water pero solo `fire` coincide; nunca fusionar.
  - Web: `carta/wheel-colors.ts` re-exporta de core (shim). Móvil: `ChartWheel.tsx`/`pilares.tsx`
    importan de core. Wu Xing en CSS web = clases `.el_*` (espejo documentado; CSS no importa TS).
- **Tema → CSS vars** por tema×modo en `tokens.css` (`--acc`, `--ink`, `--soft`, `--surface`,
  `--surface-2`, `--line`, `--bg`). NO van a core (dependen del tema).
- **`--ink-on-acc` = `#1a1305` plano** (NO theme-aware): medido, pasa WCAG AA en las 6
  combinaciones (5.8–11.5:1). Espejar el móvil (tinta clara) fallaría — los acentos claros de
  la web son medios, no oscuros como los del móvil.

## ⚠️ Deuda de accesibilidad conocida (pre-existente, decisión de Gio pendiente)
El TEXTO `--acc` (dorado/lavanda/púrpura de eyebrows/labels) sobre fondos claros FALLA WCAG en
los 3 modos claros (2.07 / 2.68 / 2.82 : 1, <3.0). Fix propuesto: token `--acc-text` oscurecido
solo para labels en modos claros (los rellenos/bordes/pills siguen con el acento brillante).
Cambio visual de los temas claros → requiere OK de Gio.

## Primitivos móvil (`apps/mobile/components/ui.tsx`)
`Card` (superficie glass, `accent?`; `luckCol` la adopta), `Chip` (`kind: "control" | "tag"`;
el tag acepta `tint`/borde opt-in para badges de color de dominio Wu Xing), `FadeIn`, `ToggleRow`
(fila con label + switch, mata la triplicación del toggle Modo Pro). Gaps que quedan locales por
forma/overflow (documentados): swatch del theme-picker y dropdown de PlaceAutocomplete. Móvil NUNCA importa
`@aluna/ephemeris`/`@aluna/compute`; colores de dominio desde `@aluna/core`. Android no
sintetiza pesos/itálicas en fuentes custom → usar la variante de familia pre-cargada, nunca
`fontWeight`/`fontStyle`.
