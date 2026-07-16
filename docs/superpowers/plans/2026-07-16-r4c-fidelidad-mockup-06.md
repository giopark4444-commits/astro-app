# R4c — Fidelidad total al mockup 06 (Cúpula con top-nav): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que `/hoy`, `/carta` y `/perfil` desktop queden **idénticos** al mockup aprobado `docs/redesign/r4-mockups/06-cupula-topnav.html` — cerrando las 18 brechas del mapa de Fase 0 (fondo de cúpula, chip de tema, clima rico, numerología héroe, ask-row real, tiles con subtítulo, carta centrada con rueda en panel y Núcleo narrativo, perfil reordenado con preferencias compactas).

**Architecture:** mismo contrato que R4a/R4b — **móvil (<1080px) INTACTO**: todo cambio desktop vive detrás de `@media (min-width: 1080px)` (`/* bp desktop R4a */`); las adiciones nuevas al DOM que solo existen en desktop llevan `display:none` fuera del media query. El mockup es el spec visual; sus valores crudos se citan donde se usan con comentario de origen. Prosa nueva (lectura del núcleo, frases de clima) = contenido escrito a mano en `lib/content/` (patrón Esencia — SIN IA, la capa IA sigue latente).

**Tech Stack:** Next.js 15 App Router, CSS Modules + tokens R3 + primitivos globales (`.card`/`.chip`/`.seg` — LEER `docs/redesign/R3-sistema.md` antes de tocar estilos), next-intl, Vitest + RTL.

## Global Constraints

- Breakpoint desktop `@media (min-width: 1080px)` exacto, comentado `/* bp desktop R4a */`.
- **Móvil (<1080px) INTACTO** — ni DOM visible ni estilos actuales cambian bajo el breakpoint.
- Tokens R3 siempre; valores crudos solo los citados del mockup, con comentario de origen (`/* mockup 06: ... */`).
- i18n: toda clave nueva va en `messages/es.json` **y** `messages/en.json` (paridad la vigila `app/__tests__/i18n.test.tsx`).
- Glifos unicode de texto llevan `U+FE0E` (patrón `TEXT_VS` de carta-view.tsx:20).
- Gate por tarea (desde `apps/web/`): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` — verde antes de commitear. Suite actual: **230 tests / 42 archivos**.
- Sin dependencias nuevas. Sin tocar `apps/mobile`.
- Commits en español, prefijo `feat(r4c):`.
- La sección "Tu plan" (billing) NO existe en el mockup pero SE CONSERVA (Fase 4a), restilada como fila propia (Task 8).

---

### Task 1: Cúpula de fondo continua + halo cenital (desktop)

Mockup §6.1: el gradiente radial de la cúpula cubre TODA la página (en el mockup cada `.screen` largo lleva el gradiente completo), y hay un halo dorado tenue en el cénit. Hoy `app/globals.css:8` usa `background-attachment: fixed` → en páginas largas todo lo que baja del primer viewport se ve del color sólido final.

**Files:**
- Modify: `apps/web/app/globals.css` (bloque body + nuevo `body::before`)

**Interfaces:**
- Consumes: token `--bg` y `--acc-rgb` (`lib/theme/tokens.css`)
- Produces: nada consumido por otras tareas (cambio visual puro)

- [ ] **Step 1: Cambio CSS** — en `globals.css`, tras el bloque `body{...}` existente, añadir:

```css
/* R4c mockup 06 §6.1: en desktop la cúpula cubre TODA la página (el mockup pinta
   el radial sobre el alto completo de cada pantalla) + halo dorado cenital
   (.screen::before del mockup). En móvil (<1080) se conserva el fixed actual. */
@media (min-width: 1080px) { /* bp desktop R4a */
  body { background-attachment: scroll; }
  body::before {
    content: ""; position: absolute; left: 15%; right: 15%; top: -6%; height: 42%;
    background: radial-gradient(55% 70% at 50% 0%, rgba(var(--acc-rgb), 0.09), transparent 72%);
    pointer-events: none; z-index: 0; /* mockup 06 .screen::before */
  }
}
```

y en el `body` base añadir `position: relative;` (necesario para anclar el `::before`).

- [ ] **Step 2: Verificación visual manual** — `pnpm dev`, abrir `http://localhost:3000/perfil` a 1440px, hacer scroll hasta el fondo: el gradiente debe degradar suavemente en TODO el alto (sin corte a negro), y debe verse el halo tenue arriba. Verificar también en tema Aurora modo claro que nada se rompe (el halo usa `--acc-rgb` del tema).
- [ ] **Step 3: Gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add app/globals.css && git commit -m "feat(r4c): cúpula de fondo continua + halo cenital en desktop (mockup 06 §6.1)"
```

---

### Task 2: Chip de tema «☾ Observatorio» en la top-nav

Mockup §2 nav-right: chip pill `☾︎ Observatorio` (tema actual) ANTES del avatar. Hoy no existe.

**Files:**
- Create: `apps/web/components/theme-chip.tsx`
- Modify: `apps/web/components/top-nav.module.css` (estilos `.modeChip`, oculto <1080)
- Modify: `apps/web/app/(app)/layout.tsx` (montarlo en `.menuSlot`, antes de `<ProfileMenu/>`)
- Modify: `apps/web/messages/es.json` + `en.json` — reusar claves existentes `settings.observatory|aurora|cosmic` (verificar nombres exactos en `messages/es.json`; si el namespace difiere, usar el que consume `settings-controls.tsx:23`)
- Test: `apps/web/components/__tests__/theme-chip.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` de `@/lib/theme/theme-provider` (mismo hook que `settings-controls.tsx:18`); claves i18n de nombres de tema.
- Produces: `ThemeChip` (client component sin props). Es un `<Link href="/perfil">` (lleva a Preferencias).

- [ ] **Step 1: Test que falla** (mock de theme-provider como en los tests existentes de settings; buscar precedente con `grep -rl "theme-provider" app --include=*.test.tsx`):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ThemeChip } from "../theme-chip";

vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ theme: "observatory", setTheme: vi.fn(), mode: "dark", setMode: vi.fn() }),
}));

describe("ThemeChip", () => {
  it("muestra el tema actual y enlaza a /perfil", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ThemeChip />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/perfil");
    expect(link).toHaveTextContent("Observatorio");
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run components/__tests__/theme-chip.test.tsx` → FAIL (módulo no existe).
- [ ] **Step 3: Implementación**

```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import styles from "./top-nav.module.css";

/** Chip del tema actual en la nav (mockup 06 §2 .mode-chip) — clic → Preferencias. */
export function ThemeChip() {
  const t = useTranslations("settings");
  const { theme } = useTheme();
  return (
    <Link href="/perfil" className={styles.modeChip}>
      <span aria-hidden>☾︎</span> {t(theme)}
    </Link>
  );
}
```

CSS en `top-nav.module.css` (fuera del media query existente):

```css
/* mockup 06 §2 .mode-chip — solo desktop */
.modeChip { display: none; }
@media (min-width: 1080px) { /* bp desktop R4a */
  .modeChip {
    display: inline-flex; align-items: center; gap: 7px; /* mockup: gap 7px */
    padding: 7px 14px; border-radius: 999px; /* mockup: 7px 14px */
    border: 1px solid var(--line); background: var(--surface);
    color: var(--soft); font-size: var(--text-2xs); font-weight: 600;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }
  .modeChip:hover { color: var(--ink); border-color: rgba(var(--acc-rgb), 0.45); }
}
```

Montaje en `app/(app)/layout.tsx`: dentro del div `.menuSlot`, antes de `<ProfileMenu/>`: `<ThemeChip />` (import arriba). El menuSlot ya es `justify-self:end`; añadirle `display:flex; align-items:center; gap:12px` en `app-shell.module.css` si no lo tiene (mockup .nav-right gap 12px).

- [ ] **Step 4: Test verde + gate + commit**

```bash
npx vitest run components/__tests__/theme-chip.test.tsx   # PASS
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add components/theme-chip.tsx components/top-nav.module.css "app/(app)/layout.tsx" app/(app)/app-shell.module.css components/__tests__/theme-chip.test.tsx
git commit -m "feat(r4c): chip de tema en la top-nav (mockup 06 §2 .mode-chip)"
```

---

### Task 3: /hoy — saludo del mockup + Numerología de hoy como héroe centrado

Mockup §3.1 y §3.2 panel violeta. Hoy: `hello` es eyebrow uppercase (mockup: "Hola," 15px normal); el nombre no lleva oro/glow (mockup: itálica dorada con `text-shadow 0 0 24px rgba(acc,.35)`); la numerología es fila horizontal con número 44px (mockup: columna centrada, número **146px** con glow, chips pill `Mes 3` / `Año 5` violetas abajo).

**Files:**
- Modify: `apps/web/app/(app)/hoy/hub.module.css` (overrides desktop de `.hello`/`.name`)
- Modify: `apps/web/app/(app)/hoy/day-number-card.tsx` (DOM: eyebrow como hermana, no dentro de `.body`)
- Modify: `apps/web/app/(app)/hoy/day-number.module.css` (layout móvil re-anclado + overrides desktop)
- Test: los tests existentes de day-number (si hay — `grep -rl "DayNumberCard" --include=*.test.tsx app`) deben seguir verdes; añadir asserts de estructura si el archivo existe.

**Interfaces:**
- Consumes: nada nuevo.
- Produces: mismo componente `DayNumberCard({ birthDate })` — sin cambio de contrato.

- [ ] **Step 1: DOM de day-number-card** — sacar el eyebrow de `.body` para poder reordenar por CSS (eyebrow arriba en desktop). Estructura nueva del JSX (mismo Link wrapper):

```tsx
<span className={styles.eyebrow}>{t("dayNumberTitle")}</span>
<span className={`${styles.num} ${isMaster ? styles.master : ""}`} aria-hidden>{day}</span>
<span className={styles.body}>
  <span className={styles.meaning}>{meaning}</span>
  <span className={styles.context}>
    <span className={styles.stat}>{t("dayNumberMonth")} <b>{month}</b></span>
    <span className={styles.dot} aria-hidden>·</span>
    <span className={styles.stat}>{t("dayNumberYear")} <b>{year}</b></span>
  </span>
</span>
```

- [ ] **Step 2: CSS móvil re-anclado** (móvil debe verse IGUAL que hoy: fila num-izquierda / texto-derecha con eyebrow arriba del texto). En `day-number.module.css`, `.card` móvil pasa a grid de 2 columnas con áreas:

```css
.card {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 58px 1fr; grid-template-areas: "num eyebrow" "num body";
  column-gap: var(--sp-4); align-items: center;
  padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-6);
}
.eyebrow { grid-area: eyebrow; align-self: end; }
.num { grid-area: num; /* resto de reglas actuales igual */ }
.body { grid-area: body; }
```

(comparar contra captura previa del móvil — mismo aspecto; el eyebrow ya se leía arriba del meaning).

- [ ] **Step 3: Overrides desktop** (mockup §3.2 panel violeta):

```css
@media (min-width: 1080px) { /* bp desktop R4a */
  .card {
    display: flex; flex-direction: column; text-align: center; align-items: center;
    height: 100%; margin-bottom: 0;
  }
  .eyebrow { color: #b3a6e8; } /* mockup: eyebrow violeta del panel numerología */
  .num {
    width: auto; font-style: normal;
    font-size: 146px; line-height: 1; margin: 4px 0 10px; /* mockup .big-num */
    color: var(--acc-text);
    text-shadow: 0 0 34px rgba(var(--acc-rgb), 0.4); /* mockup .big-num glow */
    font-feature-settings: "lnum" 1;
  }
  .body { align-items: center; }
  .meaning { font-size: var(--text-sm); line-height: 1.6; }
  .context { margin-top: auto; padding-top: 14px; gap: var(--sp-2); } /* mockup .day-ctx */
  .dot { display: none; }
  .stat {
    border: 1px solid rgba(150, 140, 214, 0.35); border-radius: 999px; padding: 4px 12px; /* mockup .day-ctx span */
  }
  .stat b { color: #c9bdf0; } /* mockup: número violeta claro */
}
```

- [ ] **Step 4: Saludo** — en `hub.module.css`, dentro del media query desktop existente:

```css
  .hello { font-size: 15px; letter-spacing: 0; text-transform: none; color: var(--soft); } /* mockup .hello */
  .name {
    font-size: 52px; line-height: 1.02; color: var(--acc-text); /* mockup .greet h1 em: itálica dorada */
    text-shadow: 0 0 24px rgba(var(--acc-rgb), 0.35);
  }
```

- [ ] **Step 5: Verificación visual** — `/hoy` a 1440px: número gigante centrado con chips violetas abajo; saludo "Hola," normal + nombre dorado con glow. A 390px (móvil): tarjeta idéntica a antes.
- [ ] **Step 6: Gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add "app/(app)/hoy/" && git commit -m "feat(r4c): saludo dorado + numerología héroe 146px con chips violetas (mockup 06 §3)"
```

---

### Task 4: /hoy — «Tu clima de hoy» rico (tarjetas de tránsito con orbe y frase)

Mockup §3.2 panel clima: subtítulo itálico, 3 tarjetas `.asp` con border-left por armonía, fila glifo+nombre+`orbe° · Aplicativo/Separativo`, y **frase interpretativa itálica** por tránsito; link "Verlo en la carta →" en la cabecera (la tarjeta deja de ser un Link gigante).

**Files:**
- Create: `apps/web/lib/content/transit-phrases-es.ts` + `transit-phrases-en.ts`
- Create: `apps/web/lib/content/__tests__/transit-phrases.test.ts`
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx` (bloque weather, líneas 68-85)
- Modify: `apps/web/app/(app)/hoy/hub.module.css` (estilos nuevos del clima desktop; móvil conserva las filas actuales)
- Modify: `apps/web/messages/es.json` + `en.json`: claves `hoy.weatherSub` («El cielo de hoy sobre ti — tu clima del alma.» / «Today's sky over you — your soul's weather.»), `hoy.weatherLink` («Verlo en la carta» / «See it on the chart»)

**Interfaces:**
- Consumes: `Aspect` de `@aluna/core` (campos `a`, `b`, `aspect`, `orb`, `applying`, `harmony` — verificar shape exacto en `packages/core` antes de escribir); claves existentes `carta.applying`/`carta.separating` (las usa carta-view.tsx:221).
- Produces: `transitPhrase(aspect: AspectType, transiting: BodyKey): string` por locale — export `TRANSIT_PHRASES` (mapa) + helper `transitPhrase(a, b)` con fallback genérico por aspecto.

- [ ] **Step 1: Test que falla** — completitud del mapa (cada aspecto mayor × cada cuerpo transitante tiene frase, ES y EN, no vacía, ≤120 chars):

```ts
import { describe, it, expect } from "vitest";
import { TRANSIT_PHRASES as ES, transitPhrase as phraseEs } from "../transit-phrases-es";
import { TRANSIT_PHRASES as EN } from "../transit-phrases-en";

const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

describe("frases de tránsito", () => {
  it("cubre aspecto×cuerpo en ambos idiomas", () => {
    for (const a of ASPECTS) for (const b of BODIES) {
      for (const M of [ES, EN]) {
        const s = M[`${a}:${b}`];
        expect(s, `${a}:${b}`).toBeTruthy();
        expect(s!.length).toBeLessThanOrEqual(120);
      }
    }
  });
  it("fallback genérico por aspecto si el cuerpo no está", () => {
    expect(phraseEs("square", "chiron" as never)).toBeTruthy();
  });
});
```

(ajustar los literales de `ASPECTS`/`BODIES` a los tipos reales de `@aluna/core` — leerlos primero.)

- [ ] **Step 2: Contenido** — escribir las 50 frases ES + 50 EN **a mano, en la voz de Aluna** (segunda persona, cálida, imagen concreta, sin jerga; ≤120 chars). Registro del mockup como vara de calidad:
  - `square:saturn` → «El deber le aprieta la mano al deseo: hoy no firmes nada del corazón.»
  - `opposition:moon` → «Antojo de romperlo todo; respira dos veces antes de decidir.»
  - `trine:jupiter` → «Una puerta se abre justo donde ya venías brillando.»
  Más 5 genéricos `${aspect}` de fallback por idioma. Estructura del archivo:

```ts
export const TRANSIT_PHRASES: Record<string, string> = {
  "square:saturn": "El deber le aprieta la mano al deseo: hoy no firmes nada del corazón.",
  // ... 49 más + 5 genéricos "square", "trine", ...
};
export function transitPhrase(aspect: string, transiting: string): string {
  return TRANSIT_PHRASES[`${aspect}:${transiting}`] ?? TRANSIT_PHRASES[aspect] ?? "";
}
```

- [ ] **Step 3: Test verde** — `npx vitest run lib/content/__tests__/transit-phrases.test.ts`.
- [ ] **Step 4: DOM del clima en hub-view** — reemplazar el `<Link>` gigante por `<section className={...heroWeather...}>` con: cabecera `.p-head` (título ☾ + `<Link href="/carta" className={styles.weatherLink}>{t("hoy.weatherLink")} →</Link>`), subtítulo `.weatherSub`, y por tránsito una tarjeta `.aspCard` con `data-harm={a.harmony}`:

```tsx
<div className={styles.aspCard} data-harm={a.harmony} key={i}>
  <span className={styles.aspTop}>
    <span className={styles.weatherGlyphs}>{PLANET_GLYPH[a.a]} <span className={styles.weatherAsp}>{ASPECT_GLYPHS[a.aspect]}</span> {PLANET_GLYPH[a.b]}</span>
    <span className={styles.aspName}>{L.bodies[a.a]} {L.aspects[a.aspect]} {t("carta.yourPossessive")} {L.bodies[a.b]}</span>
    <span className={styles.aspOrb}>{a.orb.toFixed(1)}° · {a.applying ? t("carta.applying") : t("carta.separating")}</span>
  </span>
  <span className={styles.aspWhy}>{(locale === "en" ? phraseEn : phraseEs)(a.aspect, a.a)}</span>
</div>
```

**Móvil intacto:** bajo 1080px `.aspOrb` y `.aspWhy` llevan `display:none` y `.aspCard` se degrada a la fila actual (sin borde, sin fondo) — así el DOM único sirve a ambos. El clima móvil se ve EXACTO a hoy.

- [ ] **Step 5: CSS** — móvil primero (aspCard como weatherRow actual, orb/why ocultos), luego en el media query:

```css
  .weatherSub { font-family: var(--font-display); font-style: italic; font-size: var(--text-md); color: var(--soft); margin: -8px 0 0; } /* mockup .w-sub */
  .aspCard {
    display: flex; flex-direction: column; gap: 4px;
    padding: 12px 14px 11px; border-radius: 12px; /* mockup .asp */
    background: color-mix(in oklab, var(--bg) 60%, transparent);
    border-left: 2px solid var(--tone-warm);
  }
  .aspCard[data-harm="soft"] { border-left-color: var(--tone-cool); }
  .aspOrb { display: inline; font-size: var(--text-2xs); color: var(--soft); margin-left: auto; }
  .aspWhy { display: block; font-family: var(--font-display); font-style: italic; font-size: var(--text-md); line-height: 1.45; color: var(--soft); } /* mockup .asp-why */
```

- [ ] **Step 6: Verificación visual + gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add lib/content/ "app/(app)/hoy/" messages/ && git commit -m "feat(r4c): clima de hoy con tarjetas ricas — orbe, aplicativo y frase del alma (mockup 06 §3.2)"
```

---

### Task 5: /hoy — Pregúntale con input real + tiles con subtítulo

Mockup §3.3. El CTA pasa a tener input pill + botón dorado «Preguntar ✦» + 2 chips de sugerencia; los 4 tiles ganan icono en caja 40px, nombre ui/700 y subtítulo (adaptación consciente: el mockup trae 3 tiles, el producto tiene 4 lentes — van los 4 en una fila).

**Files:**
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx` (askCta → form; tiles con sub)
- Modify: `apps/web/app/(app)/hoy/hub.module.css`
- Modify: `apps/web/app/(app)/preguntar/chat-view.tsx` — leer `?q=` (searchParams) y precargar el input (leer el archivo antes; si el input es controlado, `useSearchParams()` + estado inicial)
- Modify: `apps/web/messages/es.json` + `en.json`: `hoy.askPlaceholder` («¿Por qué me cuesta decidir hoy?»), `hoy.askButton` («Preguntar ✦︎»), `hoy.askSug1` («¿Cómo aprovecho el cielo de hoy?»), `hoy.askSug2` («¿Qué me pide mi día personal?»), `hoy.lensSub.numeros` («Tus ciclos y vibraciones personales»), `hoy.lensSub.carta` («Tu cielo de nacimiento, vivo»), `hoy.lensSub.horoscopo` («Tu signo, hoy y esta semana»), `hoy.lensSub.pilares` («Ba Zi · los Cuatro Pilares»)
- Test: `apps/web/app/(app)/hoy/__tests__/ask-cta.test.tsx` (nuevo; si ya existe un test del hub, extenderlo)

**Interfaces:**
- Consumes: `useRouter` de next/navigation.
- Produces: navegación `router.push("/preguntar?q=" + encodeURIComponent(q))`; `/preguntar` precarga `q` en su input.

- [ ] **Step 1: Test que falla** — el form del hub navega con la pregunta:

```tsx
// mocks: next/navigation useRouter → push espía; profiles-provider con perfil activo
it("enviar la pregunta navega a /preguntar?q=", async () => {
  const user = userEvent.setup();
  render(<HubView />, { wrapper: Providers });
  const input = screen.getByPlaceholderText(es.hoy.askPlaceholder);
  await user.type(input, "hola cielo");
  await user.click(screen.getByRole("button", { name: es.hoy.askButton }));
  expect(push).toHaveBeenCalledWith("/preguntar?q=hola%20cielo");
});
```

(espejar los mocks del test existente del hub si lo hay; si HubView requiere fetch, mockear `global.fetch` como hacen los tests vecinos.)

- [ ] **Step 2: askCta → form** en hub-view.tsx (sigue `display:none` en móvil):

```tsx
<section className={`card ${styles.askCta}`}>
  <span className={styles.askHead}>
    <span className={styles.askTitle}>{t("hoy.askAluna")}</span>
    <span className={styles.askHint}>{t("hoy.askHint")}</span>
  </span>
  <form className={styles.askRow} onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/preguntar?q=${encodeURIComponent(q.trim())}`); }}>
    <input className={styles.askInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("hoy.askPlaceholder")} />
    <button type="submit" className={styles.askBtn}>{t("hoy.askButton")}</button>
  </form>
  <span className={styles.askSug}>
    {[t("hoy.askSug1"), t("hoy.askSug2")].map((s) => (
      <button key={s} type="button" className={styles.askSugChip} onClick={() => router.push(`/preguntar?q=${encodeURIComponent(s)}`)}>{s}</button>
    ))}
  </span>
</section>
```

- [ ] **Step 3: CSS del ask** (dentro del media query; base `.askCta` conserva su tinte dorado actual):

```css
  .askHead { display: flex; align-items: baseline; gap: var(--sp-3); }
  .askRow { display: flex; gap: 10px; } /* mockup .ask-row */
  .askInput {
    flex: 1; height: 44px; border-radius: 999px; padding: 0 18px; /* mockup .ask-input */
    border: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 62%, transparent);
    color: var(--ink); font-family: inherit; font-size: var(--text-sm); outline: none;
    transition: border-color var(--dur-fast) var(--ease);
  }
  .askInput::placeholder { color: var(--soft); }
  .askInput:focus { border-color: rgba(var(--acc-rgb), 0.5); }
  .askBtn {
    height: 44px; padding: 0 24px; border-radius: 999px; border: 0; cursor: pointer; /* mockup .ask-btn */
    background: linear-gradient(90deg, var(--acc), rgba(var(--acc-rgb), 0.8)); color: var(--ink-on-acc);
    font-family: inherit; font-size: var(--text-sm); font-weight: 700; box-shadow: var(--glow-soft);
  }
  .askSug { display: flex; gap: 8px; } /* mockup .ask-sug */
  .askSugChip {
    border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; cursor: pointer;
    background: var(--surface-2); color: var(--soft); font-family: inherit; font-size: var(--text-2xs);
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }
  .askSugChip:hover { color: var(--ink); border-color: rgba(var(--acc-rgb), 0.45); }
```

- [ ] **Step 4: Tiles** — en hub-view añadir `<span className={styles.tileSub}>{t(\`hoy.lensSub.${l.key}\`)}</span>` tras tileName. CSS desktop: `.tileIcon` caja 40×40 (`border-radius:12px; background: rgba(var(--acc-rgb),.1); border:1px solid rgba(var(--acc-rgb),.3); display:grid; place-items:center;` /* mockup .tile-ic */), `.tileName { font-family: var(--font-ui); font-size: 15px; font-weight: 700; margin-top: auto; }`, `.tileSub { font-size: var(--text-2xs); color: var(--soft); line-height: 1.45; }`. Móvil: `.tileSub { display:none }` fuera del media (móvil intacto) y tileName conserva la serif fuera del media. Grid: `.lenses` desktop pasa a `grid-template-columns: repeat(4, 1fr)` (adaptación 4 lentes).
- [ ] **Step 5: /preguntar lee ?q=** — en chat-view: `const sp = useSearchParams(); const [draft, setDraft] = useState(sp.get("q") ?? "")` (nombres reales según el archivo). Solo precarga el input — NO auto-envía.
- [ ] **Step 6: Test verde + visual + gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add "app/(app)/hoy/" "app/(app)/preguntar/" messages/ && git commit -m "feat(r4c): Pregúntale con input real + sugerencias; tiles con subtítulo (mockup 06 §3.3)"
```

---

### Task 6: /carta — cabecera centrada, seg compacto, rueda en panel con controles al pie

Mockup §4.1–§4.3. Cambios SOLO desktop (móvil intacto vía duplicado oculto de controles).

**Files:**
- Create: `apps/web/app/(app)/carta/chart-controls.tsx` (extrae las dos filas de chips — se monta 2 veces)
- Modify: `apps/web/app/(app)/carta/carta-view.tsx`
- Modify: `apps/web/app/(app)/carta/carta.module.css`
- Modify: `apps/web/messages/es.json` + `en.json`: `carta.housesLabel` («Casas»/«Houses»), `carta.zodiacLabel` («Zodiaco»/«Zodiac»)
- Test: `apps/web/app/(app)/carta/__tests__/chart-controls.test.tsx`

**Interfaces:**
- Consumes: estado `houseSystem`/`zodiac`/`pro` y setters de CartaView (props).
- Produces: `ChartControls({ houseSystem, onHouseSystem, zodiac, onZodiac, labeled, proToggle })` — `labeled:true` añade los labels uppercase del mockup; `proToggle` (ReactNode opcional) se coloca al final de la fila zodiaco.

- [ ] **Step 1: Test que falla** — ChartControls renderiza los 6 sistemas + 2 zodiacos, marca activo, y con `labeled` muestra "Casas"/"Zodiaco":

```tsx
it("labeled muestra los rótulos del mockup y marca el activo", () => {
  render(<ChartControls houseSystem="placidus" onHouseSystem={fn} zodiac="tropical" onZodiac={fn} labeled />, { wrapper: I18nEs });
  expect(screen.getByText("Casas")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: es.carta.houseSystems.placidus, selected: true })).toBeInTheDocument();
});
```

- [ ] **Step 2: Extraer ChartControls** — mover el JSX de carta-view.tsx:144-161 al componente (mismas clases `chip--control`); con `labeled`, cada fila gana `<span className={styles.ctrlLab}>` delante. CartaView lo monta DOS veces: (a) donde está hoy, con `className={styles.controlsMobile}` (visible <1080), y (b) dentro de `.wheelCol`, después de `.tapHint`, con `labeled` + `proToggle={<button className={styles.proToggle}...>}` (el toggle existente se mueve aquí — su render actual en readCol se elimina), envuelto en `.ctrlRows` (visible ≥1080).
- [ ] **Step 3: CSS** —

```css
/* fila de controles del pie de rueda (mockup .ctrl-rows) — solo desktop */
.ctrlRows { display: none; }
.ctrlLab {
  flex: none; width: 64px; font-size: var(--text-2xs); font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--soft); /* mockup .ctrl-row .lab */
}
@media (min-width: 1080px) { /* bp desktop R4a */
  .controlsMobile { display: none; }
  .ctrlRows {
    display: flex; flex-direction: column; gap: 9px; /* mockup .ctrl-rows */
    border-top: 1px solid rgba(var(--acc-rgb), 0.14); padding-top: 14px; margin-top: 0;
  }
  .ctrlRows .ctrlRow { align-items: center; }
  .ctrlRows .ctrlRow:last-child .proToggle { margin-left: auto; }
  /* cabecera centrada (mockup .carta-head) */
  .head { justify-content: center; }
  .enso { display: none; }
  .h1 { text-align: center; font-style: normal; font-size: 38px; margin-top: 6px; } /* mockup 38px/600 */
  .eyebrow { display: block; text-align: center; }
  .kindRow { display: inline-flex; margin: 14px auto var(--sp-4); } /* mockup .seg centrado */
  .kindBtn { font-family: var(--font-ui); font-size: var(--text-sm); padding: 9px 24px; } /* mockup .seg button */
  .kindHint { display: none; } /* el mockup no lleva hint bajo el seg */
  .wrapKind { display: flex; justify-content: center; } /* wrapper para centrar el inline-flex */
  /* rueda dentro de panel (mockup .wheel-card) */
  .wheelCol {
    border: 1px solid var(--line); border-radius: var(--radius-lg);
    background: var(--surface); backdrop-filter: blur(10px);
    padding: 22px 28px 16px; /* mockup .wheel-card */
    display: flex; flex-direction: column;
  }
  .wheel { max-width: 566px; margin: 0 auto; } /* mockup: max-width 566px */
  .proToggle { display: inline-flex; margin: 0; } /* reactivado en el pie de rueda */
}
```

(el `.proToggle { display:none }` desktop actual de carta.module.css:214 SE ELIMINA; `.pro:not([data-pro])` desktop vuelve a respetar el toggle **solo** para las secciones técnicas — ver Step 4.)

- [ ] **Step 4: Pro en desktop** — las secciones de las tabs deben seguir pobladas con pro OFF. Regla nueva: `posTable`, `aspList` del aspectario y `Balance` se muestran SIEMPRE en sus tabs; solo `tech` y `distGrid` (extras técnicos) se condicionan a pro. Implementación: sacar esas dos secciones de `.pro` a render condicional `{pro && (...)}` y dejar `.pro` como contenedor simple siempre visible en desktop (`.pro:not([data-pro]) { display:block }` se conserva en el media query). Verificar en móvil que el toggle sigue mostrando/ocultando la lámina completa como hoy (fuera del media query nada cambia).
- [ ] **Step 5: Verificación visual** — desktop: cabecera centrada, seg compacto dorado, rueda grande en panel con controles y Modo Pro al pie; móvil 390px: IDÉNTICO a antes (controles arriba, toggle pro funcional).
- [ ] **Step 6: Gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add "app/(app)/carta/" messages/ && git commit -m "feat(r4c): carta centrada, rueda en panel y controles al pie con rótulos (mockup 06 §4.1-4.3)"
```

---

### Task 7: /carta — Núcleo narrativo: grados+dignidad, Lectura del núcleo, balance compacto, patrones y pie

Mockup §4.4. La tab Núcleo pasa de 3 tarjetas peladas a la historia completa.

**Files:**
- Create: `apps/web/lib/content/core-reading-es.ts` + `core-reading-en.ts` (+ test)
- Create: `apps/web/lib/content/__tests__/core-reading.test.ts`
- Modify: `apps/web/app/(app)/carta/carta-view.tsx` (BigCard sub+chip; pane Núcleo)
- Modify: `apps/web/app/(app)/carta/carta.module.css`
- Modify: `apps/web/messages/es.json` + `en.json`: `carta.coreReadingTitle` («Lectura del núcleo»/«Core reading»), `carta.coreHint` («Toca un planeta en la rueda y te cuento su historia: su don, su sombra y la casa donde vive.» / EN equivalente), `carta.dominantsCaption` («✦ dominantes de tu carta»/«✦ your chart's dominants»)

**Interfaces:**
- Consumes: `BodyPosition` (degree, minute, house, sign, dignity), `ChartResult.distribution`, `L.dignities`, patrón de fragmentos de `lib/content/astrology-readings-es.ts` (leerlo primero y REUSAR su contenido/estructura donde aplique).
- Produces: `composeCoreReading({ sun, moon, ascSign }): Array<{ b?: string; t: string }>` — segmentos alternando texto normal y negrita (los `<b>` del mockup), para render sin dangerouslySetInnerHTML.

- [ ] **Step 1: Test que falla** —

```ts
it("teje sol, luna y ascendente en un párrafo con negritas", () => {
  const segs = composeCoreReading({
    sun: { sign: "aquarius", house: 11, dignity: "detriment" },
    moon: { sign: "scorpio", house: 8 },
    ascSign: "pisces",
  });
  const bolds = segs.filter((s) => s.b).map((s) => s.b);
  expect(bolds.some((b) => /Sol en Acuario/.test(b!))).toBe(true);
  expect(bolds.some((b) => /Luna en Escorpio/.test(b!))).toBe(true);
  expect(bolds.some((b) => /Ascendente Piscis/.test(b!))).toBe(true);
  const full = segs.map((s) => s.b ?? s.t).join("");
  expect(full.length).toBeGreaterThan(120); // párrafo real, no esqueleto
});
it("cada combinación signo×cuerpo tiene fragmento (12×3, ES y EN)", () => { /* iterar ZODIAC_SIGNS */ });
```

- [ ] **Step 2: Contenido** — 12 fragmentos por cuerpo (sol/luna/ascendente) × 2 idiomas, escritos a mano en la voz del mockup («brillas cuando la tribu te necesita distinto», «siente hondo lo que otros apenas rozan», «el mundo te conoce primero por tu marea»); plantilla que los une mencionando casa y dignidad cuando existen (la dignidad en minúscula integrada: «vive en la casa 11, en exilio:»). Consultar `astrology-readings-es.ts` para no contradecir la voz existente.
- [ ] **Step 3: BigCard enriquecida** — firma nueva `BigCard({ glyph, name, sign, signGlyph, sub, dignity?, dim? })`; en los call-sites: `sub={`${b.degree}°${pad(b.minute)}′ · ${t("house")} ${b.house}`}` para sol/luna (asc conserva `${ascDeg}°` — mockup «26°06′»: usar también minutos del ascendente si `houses.ascendant` da longitud → `dms` parcial), y `dignity={b.dignity ? L.dignities[b.dignity] : undefined}` renderizado como `<span className={`chip ${styles.bigTag}`}>` (estilo `.warn` del mockup: color `--tone-caution`, borde `rgba(var(--tone-caution-rgb), .4)`, pill 10.5px — solo para detriment/fall; domicile/exaltation en dorado suave).
- [ ] **Step 4: Pane Núcleo completo** — tras `.bigThree`:

```tsx
<section className={styles.reading}>
  <span className={styles.cardH}>{t("coreReadingTitle")}</span>
  <p className={styles.readingP}>
    {coreSegs.map((s, i) => (s.b ? <b key={i}>{s.b}</b> : <span key={i}>{s.t}</span>))}
  </p>
</section>
<div className={styles.balPair}>
  <Balance title={t("elements")} ... />   {/* mismas props que la tab balance */}
  <Balance title={t("modalities")} ... />
</div>
<p className={styles.balCap}>{t("dominantsCaption")} — {L.elements[dom.element]} {L.modalities[dom.modality]}.</p>
{ready.chart.patterns.length > 0 && (
  <div className={styles.chips}>{/* chips de patrones — mismo render que la tab balance */}</div>
)}
<p className={styles.coreHint}>{t("coreHint")}</p>
```

Solo desktop: en móvil el pane Núcleo conserva únicamente `.bigThree` (los bloques nuevos llevan clase `.coreExtra` con `display:none` fuera del media query). Los patrones NO se quitan de la tab balance (conviven).

- [ ] **Step 5: CSS** —

```css
.coreExtra, .reading, .balPair, .balCap, .coreHint { display: none; } /* móvil: Núcleo queda como hoy */
@media (min-width: 1080px) { /* bp desktop R4a */
  .reading {
    display: block; border: 1px solid rgba(var(--acc-rgb), 0.22); border-radius: var(--radius);
    background: color-mix(in oklab, var(--bg) 65%, transparent); padding: 14px 17px; /* mockup .reading */
  }
  .readingP { margin: 6px 0 0; font-family: var(--font-display); font-style: italic; font-size: 16px; line-height: 1.55; color: var(--ink); font-feature-settings: "lnum" 1; } /* mockup .reading p */
  .readingP b { color: var(--acc-text); font-weight: 600; }
  .balPair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); } /* mockup .bal */
  .balCap { display: block; margin: -6px 0 0; font-size: var(--text-2xs); color: var(--soft); } /* mockup .bal-cap */
  .coreHint { display: block; margin: auto 0 0; text-align: center; font-family: var(--font-display); font-style: italic; font-size: var(--text-md); color: var(--soft); } /* mockup .d-hint */
  .bigSub { font-variant-numeric: tabular-nums; }
  .bigTag { font-size: var(--text-2xs); padding: 1px 8px; border-radius: 999px; color: var(--tone-caution); border-color: rgba(var(--tone-caution-rgb), 0.4); } /* mockup .warn */
}
```

- [ ] **Step 6: Tests verdes + visual + gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add lib/content/ "app/(app)/carta/" messages/ && git commit -m "feat(r4c): Núcleo narrativo — lectura del núcleo, grados y dignidad, balance compacto, patrones (mockup 06 §4.4)"
```

---

### Task 8: /perfil — reordenar a la retícula del mockup + Preferencias como tarjeta compacta

Mockup §5. Desktop: fila 1 = Manifestaciones(8)+Diario(4) [ya existe como `.diarioGrid` 2:1 ✓]; fila 2 = Personas(7)+Preferencias(5) **como card**; Tu plan queda como fila propia debajo (adaptación consciente, no está en el mockup). Móvil conserva el orden actual (hero→personas→diario→prefs).

**Files:**
- Modify: `apps/web/app/(app)/perfil/page.tsx` (pasar email/created_at; sin mover DOM — el orden lo hace CSS `order`)
- Modify: `apps/web/app/(app)/perfil/perfil.module.css`
- Modify: `apps/web/app/(app)/perfil/settings-controls.tsx` (variante compacta: filas label+control, switches de tema con iconito circular, pie correo+salir)
- Modify: `apps/web/app/(app)/perfil/settings.module.css`
- Modify: `apps/web/app/(app)/perfil/perfil-hero.tsx` + `perfil.module.css` (chips con circulito de glifo; caja nacimiento dashed + lápiz; línea «En Aluna desde»)
- Modify: `apps/web/components/avatar-upload.tsx` (leerlo primero — solo estilos desktop: 118px, anillo, punto; si el botón de subir ya existe, restilarlo a `.pf-chg` pill)
- Modify: `apps/web/messages/es.json` + `en.json`: `profile.sinceAluna` («En Aluna desde {date} ✦»/«In Aluna since {date} ✦»), `profile.signOut` (si no existe ya — buscar la clave que usa ProfileMenu y REUSARLA), `profile.editBirth` («Editar datos»/«Edit details»)
- Test: extender el test existente de settings-controls si lo hay; añadir assert del pie (correo + botón salir).

**Interfaces:**
- Consumes: `user.email` y `user.created_at` (page.tsx ya tiene `user`); acción de signOut existente (leer `components/profile-menu.tsx` y reusar SU mecanismo exacto — no crear otro).
- Produces: `SettingsControls({ currentLocale, email, signOutSlot? })` — prop nueva opcional para el pie.

- [ ] **Step 1: Orden desktop por CSS** — en `perfil.module.css` media query: `.page { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--sp-5); max-width: min(1280px, calc(100% - 112px)); }` con: hero `grid-column: 1/-1; order: 1`; `.diarioGrid { grid-column: 1/-1; order: 2; }` (su grid interno 2:1 se conserva); `.people { grid-column: span 7; order: 3; }`; `.prefs { grid-column: span 5; order: 4; }`; `.plan (nueva clase al wrapper de PlanCard) { grid-column: 1/-1; order: 5; }`. En page.tsx: separar PlanCard de `.prefs` a su propio `<section className={styles.plan}>` colocado DESPUÉS de `.prefs` en el DOM (móvil: el plan ya se veía dentro de preferencias al final — verificar captura móvil antes/después; si el salto es visible en móvil, envolver ambos en el mismo orden visual con `order` móvil también).
- [ ] **Step 2: Preferencias card compacta** — `.prefs` gana `card` (className="card ${styles.prefs}") solo si NO rompe móvil (el mockup móvil de R4b1 la tenía como sección; para móvil intacto: aplicar borde/fondo del card únicamente en el media query con las mismas reglas de `.card` copiadas — NO añadir la clase global). Reescribir `SettingsControls` a filas del mockup:

```tsx
<div className={styles.prow}>
  <span className={styles.plab}>{t("theme")}</span>
  <div className={styles.sws} role="group" aria-label={t("theme")}>
    {THEMES.map((th) => (
      <button key={th} className={`${styles.psw} ${theme === th ? styles.pswOn : ""}`} aria-pressed={theme === th} onClick={() => setTheme(th)}>
        <i className={styles.pswDot} data-theme-dot={th} aria-hidden /> {t(th)}
      </button>
    ))}
  </div>
</div>
```

(modo e idioma: mismas filas con el `.seg` compacto actual pero `flex:none` — pills al contenido, no full-width). CSS del mockup §5.3:

```css
.prow { display: flex; align-items: center; gap: var(--sp-3); }
.plab { flex: none; width: 64px; font-size: var(--text-2xs); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--soft); } /* mockup .pf-plab */
.psw { display: inline-flex; align-items: center; gap: 7px; padding: 5px 13px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--soft); font-family: inherit; font-size: var(--text-2xs); font-weight: 600; cursor: pointer; transition: border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); } /* mockup .pf-sw */
.pswOn { border-color: rgba(var(--acc-rgb), 0.55); color: var(--ink); box-shadow: var(--glow-soft); }
.pswDot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--line); } /* mockup .pf-sw i */
.pswDot[data-theme-dot="observatory"] { background: radial-gradient(circle at 32% 28%, #2b3570, #0a0d24 72%); border-color: rgba(231, 201, 134, 0.7); } /* mockup .obs */
.pswDot[data-theme-dot="aurora"] { background: linear-gradient(140deg, #f3ecff, #cdb9f2 60%, #f7d9c4); } /* mockup .aur */
.pswDot[data-theme-dot="cosmic"] { background: linear-gradient(140deg, #3d1d63, #7a2f8f 55%, #e56ca4); } /* mockup .cos */
.acct { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 13px; border-top: 1px solid rgba(var(--acc-rgb), 0.14); font-size: var(--text-xs); color: var(--soft); } /* mockup .pf-acct */
.out { color: var(--soft); background: none; border: 0; cursor: pointer; font-family: inherit; font-size: var(--text-xs); transition: color var(--dur-fast) var(--ease); }
.out:hover { color: var(--tone-warm); } /* mockup .pf-out:hover */
```

Los selectores móviles actuales (swatch-cards `.themes/.tc/.sw`) se ELIMINAN a favor de las filas nuevas **solo si el móvil se ve ≥ igual de bien**; de lo contrario, filas nuevas solo desktop y swatches solo móvil (media queries espejo). Decidir mirando la captura móvil.

- [ ] **Step 3: Pie de cuenta** — page.tsx pasa `email={user.email}` y el slot de salir reusa el signOut de ProfileMenu (leer profile-menu.tsx y llamar al mismo action/función).
- [ ] **Step 4: Hero santuario** — chips con circulito: `.sigChip` gana `<i className={styles.sigG}>☉︎</i>` (26px círculo dorado, glifo serif 13.5px — mockup .pf-sig .g), padding `5px 15px 5px 6px`, radio 999px. Caja nacimiento: borde `1px dashed rgba(var(--acc-rgb), 0.38)`, radio `--radius-lg`, botón lápiz 30×30 circular arriba-derecha (Link a `/onboarding` si el flujo de edición existe — VERIFICAR leyendo `app/onboarding/`; si no permite editar el perfil activo, omitir el lápiz y anotar en el PR). Añadir `<p className={styles.since}>{t("sinceAluna", { date })}</p>` con `user.created_at` formateado `MMMM yyyy` (pasar como prop desde page.tsx). Avatar desktop: 118px, `box-shadow: 0 0 0 7px rgba(var(--acc-rgb), 0.06), var(--glow-soft)`, letra 56px, punto indicador 9px arriba-derecha (mockup .pf-photo) — overrides en media query sobre las clases de avatar-upload.
- [ ] **Step 5: Verificación visual ambas anchuras** — desktop: orden mockup (manifestaciones+diario arriba, personas+prefs abajo, plan al fondo); móvil 390px: orden y aspecto EXACTOS a antes (salvo la decisión documentada del Step 2).
- [ ] **Step 6: Gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add "app/(app)/perfil/" components/avatar-upload.tsx messages/ && git commit -m "feat(r4c): perfil en retícula del mockup — preferencias compactas con pie de cuenta, hero santuario (mockup 06 §5)"
```

---

### Task 9: Microdetalles transversales + barrido de fidelidad

Mockup §6.4–§6.6 y todo lo que el barrido visual encuentre.

**Files:**
- Modify: `apps/web/components/starfield.tsx` (leerlo primero — comparar densidad/tamaños/twinkle vs mockup §6.2: ~110 estrellas, 85% de 1–2px / 15% de 2–3px, twinkle 3–8s con delay negativo; ajustar solo si difiere)
- Modify: los `.module.css` que el barrido señale

**Interfaces:** ninguna nueva.

- [ ] **Step 1: Starfield** — comparar implementación vs spec §6.2 y ajustar densidad/tamaños/duración si difieren (respetando `--stars` por tema y prefers-reduced-motion).
- [ ] **Step 2: Barrido lado a lado** — con el dev server y el mockup servido (`python3 -m http.server` en r4-mockups), capturar a 1440px: mockup pantalla N vs app ruta N (hoy/carta/perfil), superponer mentalmente sección por sección contra el spec §§2-5 (tipos, tamaños, trackings, radios, glows, hovers). Anotar CADA diferencia restante y arreglarla aquí (las estructurales grandes ya no deberían existir).
- [ ] **Step 3: Hovers** — verificar los 8 hovers del spec §6.5 en la app (tab, tile, p-link, pf-chg, pf-edit, pf-ghost, pf-out, seg button); añadir los que falten con `--dur-fast`/`--ease`.
- [ ] **Step 4: Gate + commit**

```bash
npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build
git add -A apps/web && git commit -m "feat(r4c): barrido de fidelidad — starfield, hovers y microtipografía (mockup 06 §6)"
```

---

## Self-Review (hecho al escribir)

- **Cobertura:** las 18 brechas de Fase 0 → T1 (16), T2 (1), T3 (4 y saludo), T4 (3), T5 (5, 6), T6 (7, 8), T7 (9, 10, 11), T8 (12, 13, 14, 15), T9 (17, 18). La brecha 2 (tintes) ya estaba cerrada en el código (hub.module.css:90-106) — verificar en T9. ✓
- **Placeholders:** el contenido creativo (50 frases ×2, 36 fragmentos ×2) se especifica con vara de calidad + test de completitud que impide entregarlo a medias; el resto lleva código concreto. ✓
- **Consistencia de tipos:** `ChartControls` props definidas en T6 y usadas solo ahí; `composeCoreReading` definida en T7 con shape `{b?, t}` usado en su propio render; `SettingsControls` gana props opcionales (retrocompatible). ✓
- **Adaptaciones conscientes (no están en el mockup, decisión registrada):** 4 tiles en vez de 3 (Horóscopo es parte del producto); Tu plan se conserva como fila propia; frases de clima por aspecto×planeta (el mockup trae ejemplos literarios puntuales, no un sistema).
