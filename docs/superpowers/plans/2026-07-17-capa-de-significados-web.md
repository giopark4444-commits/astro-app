# Capa de significados (tap-to-learn) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que ningún símbolo o término de la web de Aluna quede mudo — todo glifo, dignidad, aspecto, tronco, rama o término técnico se puede tocar y abre una explicación breve en voz Aluna (ES/EN).

**Architecture:** un módulo de glosario (`glossary-es.ts`/`glossary-en.ts`, ~120 entradas por idioma, claves namespaced en inglés) + un componente `<Meaning k="...">` que envuelve cualquier texto/glifo y abre una hoja (sheet) con título+glifo+cuerpo. Las secciones (Carta, Pilares, Horóscopo, Hoy) solo ENVUELVEN lo que ya renderizan — cero cambios de datos o cálculo. Móvil queda para un plan siguiente (paridad).

**Tech Stack:** Next.js 15 App Router, CSS Modules, next-intl (el glosario NO va en messages/*.json — es contenido largo, vive en lib/content como numerology-es.ts), Vitest+RTL.

**Origen:** pedido de Gio 2026-07-17 — "no me sirve de nada ver solo símbolos que no sé qué quieren decir; el chiste es que toda la app funcione completamente". Auditoría en vivo: Carta/Aspectos = muro de glifos estáticos; Pilares = troncos/ramas/dioses/Na Yin sin explicación; dignidades/orbe/aplicativo/patrones mudos en todas partes.

## Global Constraints

- Worktree/rama: `capa-significados` en `~/astro-app`. NO tocar main.
- Claves internas SIEMPRE en inglés (`aspect.trine`, `bazi.stem.jia`); i18n solo en superficie.
- **Paridad ES/EN obligatoria**: `GLOSSARY_ES` y `GLOSSARY_EN` deben tener EXACTAMENTE las mismas claves (test en Task 1 lo vigila).
- **Voz Aluna** (referencia obligatoria: leer 3 entradas de `apps/web/lib/content/numerology-es.ts` antes de escribir contenido): segunda persona, cálida pero honesta, evolutiva-yóguica sin dogma, 2–4 frases por entrada, CERO relleno tipo "es un concepto importante de la astrología".
- Glifos como texto con `U+FE0E` (patrón TEXT_VS del repo) cuando se muestren en la hoja.
- Sin dependencias nuevas. Sin tocar rutas API ni cálculo.
- Gate por tarea: `npx pnpm --filter @aluna/web exec vitest run && npx pnpm --filter @aluna/web exec tsc --noEmit`; las tareas de cableado añaden `npx pnpm --filter @aluna/web exec next build` (si OOM en "Collecting build traces": reintentar con `NODE_OPTIONS=--max-old-space-size=8192`; NUNCA `rm -rf apps/web/.next` si hay un dev server corriendo).
- Commits en español, prefijo `feat(significados):`.
- El wrapper `<Meaning>` NUNCA cambia el layout del texto que envuelve (inline, hereda tipografía); el affordance es un subrayado punteado sutil (`text-decoration: underline dotted`, color `--soft`) + cursor help. GUSTO de Gio: nada de ruido visual.

---

### Task 1: Infraestructura — glosario + `<Meaning>` + hoja

**Files:**
- Create: `apps/web/lib/content/glossary-es.ts`
- Create: `apps/web/lib/content/glossary-en.ts`
- Create: `apps/web/lib/content/glossary.ts`
- Create: `apps/web/components/meaning.tsx`
- Create: `apps/web/components/meaning.module.css`
- Test: `apps/web/components/__tests__/meaning.test.tsx`
- Test: `apps/web/lib/content/__tests__/glossary-parity.test.ts`

**Interfaces:**
- Produces (las usan Tasks 2–7):
  - `interface GlossaryEntry { title: string; glyph?: string; body: string }`
  - `GLOSSARY_ES` / `GLOSSARY_EN`: `Record<string, GlossaryEntry>` (en esta tarea: solo 3 entradas semilla cada uno, las mismas claves: `aspect.trine`, `term.orb`, `dignity.exaltation` — el contenido masivo llega en Tasks 2–4)
  - `glossaryEntry(key: string, locale: string): GlossaryEntry | null`
  - `<Meaning k="aspect.trine">Trígono</Meaning>` — client component; si la clave no existe en el glosario, renderiza los children tal cual SIN botón (nunca rompe).

- [ ] **Step 1: tests que fallan**

```tsx
// apps/web/components/__tests__/meaning.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { Meaning } from "../meaning";

function wrap(ui: React.ReactNode) {
  return render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);
}

describe("Meaning", () => {
  it("abre la hoja con el título y cuerpo del glosario al tocar", () => {
    wrap(<Meaning k="aspect.trine">Trígono</Meaning>);
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // título de la entrada semilla del glosario ES
    expect(screen.getAllByText(/Trígono/).length).toBeGreaterThan(1);
  });
  it("Escape cierra la hoja", () => {
    wrap(<Meaning k="aspect.trine">Trígono</Meaning>);
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("clave desconocida: children sin botón", () => {
    wrap(<Meaning k="no.existe">Texto</Meaning>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Texto")).toBeInTheDocument();
  });
});
```

```ts
// apps/web/lib/content/__tests__/glossary-parity.test.ts
import { describe, it, expect } from "vitest";
import { GLOSSARY_ES } from "../glossary-es";
import { GLOSSARY_EN } from "../glossary-en";

describe("glosario ES↔EN", () => {
  it("mismas claves en ambos idiomas", () => {
    expect(Object.keys(GLOSSARY_EN).sort()).toEqual(Object.keys(GLOSSARY_ES).sort());
  });
  it("ninguna entrada vacía", () => {
    for (const g of [GLOSSARY_ES, GLOSSARY_EN])
      for (const [k, e] of Object.entries(g)) {
        expect(e.title.length, k).toBeGreaterThan(2);
        expect(e.body.length, k).toBeGreaterThan(40);
      }
  });
});
```

- [ ] **Step 2: correr y ver fallar** — `npx pnpm --filter @aluna/web exec vitest run components/__tests__/meaning.test.tsx lib/content/__tests__/glossary-parity.test.ts` → FAIL (módulos no existen).

- [ ] **Step 3: implementación.**

```ts
// apps/web/lib/content/glossary-es.ts
// Glosario de significados (ES) — la capa "toca y entiende" de toda la web.
// Voz Aluna: segunda persona, cálida y honesta, 2–4 frases. Claves en inglés,
// namespaced (sign.* planet.* house.* aspect.* term.* dignity.* pattern.*
// housesystem.* zodiac.* element.* modality.* bazi.*). Paridad EN vigilada por test.
export interface GlossaryEntry { title: string; glyph?: string; body: string }

export const GLOSSARY_ES: Record<string, GlossaryEntry> = {
  "aspect.trine": {
    title: "Trígono", glyph: "△",
    body: "Dos planetas a 120°, en el mismo elemento: la energía fluye entre ellos sin esfuerzo. Es un talento que ya traes de serie — tan natural que a veces ni lo notas. El trabajo con un trígono no es ganarlo, es no darlo por sentado.",
  },
  "term.orb": {
    title: "Orbe",
    body: "Los grados que le faltan (o le sobran) al aspecto para ser exacto. Cuanto más pequeño el orbe, más fuerte se siente: un aspecto a 0.5° te habla a diario; a 7°, susurra de fondo.",
  },
  "dignity.exaltation": {
    title: "Exaltación",
    body: "El planeta está en un signo que amplifica su mejor versión, como un invitado de honor. No está en su casa (eso sería domicilio), pero aquí se le celebra: su energía sube de voltaje y pide expresarse en grande.",
  },
};
```

```ts
// apps/web/lib/content/glossary-en.ts — mismas claves, mismos formatos, inglés natural (no traducción literal).
// (escribir las 3 entradas semilla equivalentes)
```

```ts
// apps/web/lib/content/glossary.ts
import { GLOSSARY_ES, type GlossaryEntry } from "./glossary-es";
import { GLOSSARY_EN } from "./glossary-en";
export type { GlossaryEntry };
export function glossaryEntry(key: string, locale: string): GlossaryEntry | null {
  const g = locale === "en" ? GLOSSARY_EN : GLOSSARY_ES;
  return g[key] ?? null;
}
```

```tsx
// apps/web/components/meaning.tsx
"use client";
// Envuelve cualquier texto/glifo con "toca y entiende": abre una hoja con la
// entrada del glosario. Si la clave no existe, renderiza los children intactos
// (la capa nunca rompe contenido). Inline: hereda tipografía del contexto.
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { glossaryEntry } from "@/lib/content/glossary";
import styles from "./meaning.module.css";

const TEXT_VS = "︎";

export function Meaning({ k, children }: { k: string; children: React.ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const entry = glossaryEntry(k, locale);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!entry) return <>{children}</>;
  return (
    <>
      <button type="button" className={styles.trigger} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {children}
      </button>
      {open && (
        <div className={styles.veil} onClick={() => setOpen(false)} role="presentation">
          <aside className={styles.sheet} role="dialog" aria-label={entry.title} onClick={(e) => e.stopPropagation()}>
            {entry.glyph && <span className={styles.glyph} aria-hidden>{entry.glyph + TEXT_VS}</span>}
            <h4 className={styles.title}>{entry.title}</h4>
            <p className={styles.body}>{entry.body}</p>
          </aside>
        </div>
      )}
    </>
  );
}
```

```css
/* apps/web/components/meaning.module.css — sobre tokens existentes (tokens.css) */
.trigger {
  display: inline; background: none; border: 0; padding: 0; margin: 0;
  font: inherit; color: inherit; letter-spacing: inherit; cursor: help;
  text-decoration: underline dotted rgba(var(--acc-rgb), 0.5);
  text-underline-offset: 3px;
}
.trigger:hover { text-decoration-color: var(--acc); }
.veil {
  position: fixed; inset: 0; z-index: 60; display: grid; place-items: end center;
  background: color-mix(in oklab, var(--bg) 55%, transparent); backdrop-filter: blur(2px);
}
.sheet {
  width: min(480px, calc(100vw - 24px)); margin-bottom: 18px;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg);
  padding: var(--sp-5); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}
.glyph { font-size: 26px; color: var(--acc-text); display: block; margin-bottom: var(--sp-2); }
.title { font-family: var(--font-display); font-size: var(--text-lg); color: var(--ink); margin: 0 0 var(--sp-2); }
.body { font-family: var(--font-ui); font-size: var(--text-sm); line-height: 1.6; color: var(--soft); margin: 0; }
```

- [ ] **Step 4: verde** — mismos tests → PASS; suite web completa + tsc → PASS.
- [ ] **Step 5: commit** — `git add apps/web/lib/content apps/web/components && git commit -m "feat(significados): glosario + componente Meaning con hoja de significado"`

---

### Task 2: Contenido astro I — signos, planetas/puntos y casas (ES+EN)

**Files:**
- Modify: `apps/web/lib/content/glossary-es.ts`
- Modify: `apps/web/lib/content/glossary-en.ts`

**Interfaces:**
- Consumes: `GlossaryEntry` (Task 1). Los glifos exactos: tomar de `ZODIAC_SIGNS` y `PLANETS` de `@aluna/core` (leer `packages/core/src/constants/astrology.ts`) — NO inventar glifos.
- Produces: claves que Tasks 5 y 7 envuelven.

**Inventario EXACTO (37 claves × 2 idiomas):**
- `sign.aries` `sign.taurus` `sign.gemini` `sign.cancer` `sign.leo` `sign.virgo` `sign.libra` `sign.scorpio` `sign.sagittarius` `sign.capricorn` `sign.aquarius` `sign.pisces` (12 — glyph del signo; body: el impulso del signo, su don y su exceso, SIN horóscopo barato)
- `planet.sun` `planet.moon` `planet.mercury` `planet.venus` `planet.mars` `planet.jupiter` `planet.saturn` `planet.uranus` `planet.neptune` `planet.pluto` `planet.chiron` `planet.lilith` `planet.northnode` `planet.southnode` (14 — glyph del planeta; body: qué parte de ti es ese planeta; para nodos: la dirección del alma; Quirón: la herida que enseña; Lilith: lo indomable)
- `point.ascendant` (1 — sin glifo; la máscara/umbral con que el mundo te encuentra)
- `house.1` … `house.12` (12 — sin glifo; body: el terreno de vida de esa casa, con UNA imagen concreta cada una — ej. casa 3: "hermanos, calles de tu barrio, la palabra dicha")

- [ ] **Step 1: leer voz de referencia** — 3 entradas de `numerology-es.ts` + los glifos reales en `packages/core/src/constants/astrology.ts`.
- [ ] **Step 2: escribir las 37 entradas en ES** (2–4 frases, voz Aluna). Ejemplo de calibre esperado (escribir TODAS a este nivel):

```ts
"sign.scorpio": {
  title: "Escorpio", glyph: "♏",
  body: "Agua fija: la intensidad que no sabe quedarse en la superficie. Donde Escorpio toca tu carta, no te conformas con la versión oficial de nada — quieres la verdad con raíces. Su don es transformarse; su sombra, controlar lo que ama por miedo a perderlo.",
},
"house.8": {
  title: "Casa 8",
  body: "El terreno de lo compartido y lo que no se puede controlar: la intimidad profunda, el dinero de otros, las crisis que te rehacen. Los planetas aquí no viven cómodos — viven hondos. Es la casa donde aprendes a soltar para renacer.",
},
```

- [ ] **Step 3: escribir las 37 en EN** (inglés natural con la misma alma, no traducción palabra a palabra).
- [ ] **Step 4: gate** — vitest web (la paridad y no-vacío de Task 1 vigilan) + tsc → PASS.
- [ ] **Step 5: commit** — `git add apps/web/lib/content && git commit -m "feat(significados): glosario astro I — signos, planetas y casas (es/en)"`

---

### Task 3: Contenido astro II — aspectos, términos, dignidades, patrones, sistemas y balance (ES+EN)

**Files:**
- Modify: `apps/web/lib/content/glossary-es.ts` (las 3 semillas de Task 1 se completan aquí si les faltó calibre)
- Modify: `apps/web/lib/content/glossary-en.ts`

**Inventario EXACTO (36 claves × 2 idiomas):**
- Aspectos (7, con glifo — glifos exactos de `ASPECT_GLYPHS` en `apps/web/lib/content/astrology-labels.ts`): `aspect.conjunction` `aspect.opposition` `aspect.trine` `aspect.square` `aspect.sextile` `aspect.quincunx` `aspect.semisextile`
- Términos (6): `term.orb` `term.applying` (aplicativo: el aspecto aún se está formando — se siente creciente) `term.separating` `term.retrograde` `term.transit` `term.natal`
- Dignidades (5): `dignity.domicile` `dignity.exaltation` `dignity.detriment` (exilio) `dignity.fall` (caída) `dignity.peregrine`
- Patrones (5): `pattern.stellium` `pattern.grandtrine` `pattern.tsquare` `pattern.yod` `pattern.grandcross`
- Sistemas de casas (6): `housesystem.placidus` `housesystem.koch` `housesystem.equal` `housesystem.wholesign` `housesystem.regiomontanus` `housesystem.porphyry` — 2 frases cada uno: cómo corta el cielo y para quién tiene sentido; SIN tecnicismo de trigonometría
- Zodiaco (2): `zodiac.tropical` `zodiac.sidereal`
- Elementos y modalidades (7): `element.fire` `element.earth` `element.air` `element.water` `modality.cardinal` `modality.fixed` `modality.mutable` — en clave de balance de carta ("qué significa tener mucho/poco de esto")

- [ ] **Step 1: escribir las 36 ES + 36 EN** al calibre del ejemplo de Task 2.
- [ ] **Step 2: gate** — vitest web + tsc → PASS.
- [ ] **Step 3: commit** — `git add apps/web/lib/content && git commit -m "feat(significados): glosario astro II — aspectos, dignidades, patrones y sistemas (es/en)"`

---

### Task 4: Contenido BaZi — troncos, ramas, dioses y conceptos (ES+EN)

**Files:**
- Modify: `apps/web/lib/content/glossary-es.ts`
- Modify: `apps/web/lib/content/glossary-en.ts`

**Interfaces:**
- Consumes: nombres/caracteres EXACTOS de `apps/web/lib/content/bazi-labels.ts` y `apps/web/app/(app)/pilares/types.ts` (leer ambos ANTES — las claves de dios/tronco/rama deben calzar 1:1 con los identificadores internos que usa la vista, revisar cómo `pilares-view.tsx` nombra cada cosa).

**Inventario EXACTO (~49 claves × 2 idiomas):**
- Troncos celestes (10, glyph = carácter): `bazi.stem.jia` (甲 madera yang) `bazi.stem.yi` `bazi.stem.bing` `bazi.stem.ding` `bazi.stem.wu` `bazi.stem.ji` `bazi.stem.geng` `bazi.stem.xin` `bazi.stem.ren` `bazi.stem.gui` — body: elemento+polaridad con su imagen tradicional (甲: el árbol que crece recto; 癸: la lluvia fina)
- Ramas terrestres (12, glyph = carácter): `bazi.branch.zi` (子 Rata) … `bazi.branch.hai` (亥 Cerdo) — body: animal + elemento + estación, y qué aporta como cimiento
- Los 10 dioses (10): `bazi.god.friend` (Compañero) `bazi.god.rivalfriend` (Compañero rival) `bazi.god.eatinggod` (Genio) `bazi.god.hurtingofficer` (Rebelde) `bazi.god.directwealth` (Riqueza directa) `bazi.god.indirectwealth` (Riqueza indirecta) `bazi.god.directofficer` (Autoridad) `bazi.god.sevenkillings` (Poder indirecto) `bazi.god.directresource` (Recurso directo) `bazi.god.indirectresource` (Recurso indirecto) — body: la relación con tu Maestro del Día y cómo se vive (⚠️ usar los nombres ES que ya usa la vista — verificar en bazi-labels)
- Conceptos (9): `bazi.term.daymaster` (Maestro del Día) `bazi.term.hiddenstems` (troncos ocultos) `bazi.term.nayin` `bazi.term.luckpillars` `bazi.term.twelvestages` `bazi.term.symbolicstars` `bazi.term.pillar` (qué es un pilar año/mes/día/hora) `bazi.term.favorable` (elementos favorables) `bazi.term.strength` (fuerza del Maestro del Día)
- Elementos wuxing (5): `bazi.element.wood` `bazi.element.fire` `bazi.element.earth` `bazi.element.metal` `bazi.element.water` — ciclo de generación/control en una frase, distinto de los 4 elementos occidentales
- Etapas (opcional si el tiempo alcanza — si no, la clave concepto `bazi.term.twelvestages` basta; NO bloquear la tarea por las 12)

- [ ] **Step 1: leer `bazi-labels.ts` + `pilares/types.ts` + cómo nombra la vista.**
- [ ] **Step 2: escribir ES + EN** al calibre de Task 2.
- [ ] **Step 3: gate** — vitest web + tsc → PASS.
- [ ] **Step 4: commit** — `git add apps/web/lib/content && git commit -m "feat(significados): glosario BaZi — troncos, ramas, dioses y conceptos (es/en)"`

---

### Task 5: Cablear Carta

**Files:**
- Modify: `apps/web/app/(app)/carta/carta-view.tsx` (núcleo, controles)
- Modify: `apps/web/app/(app)/carta/chart-tabs.tsx` (posiciones, aspectos, balance, patrones — verificar dónde vive cada tab leyendo el archivo; si algo vive en carta-view, cablearlo ahí)
- Test: extender `apps/web/app/(app)/carta/__tests__/` (el test existente que renderice aspectos/balance; si no existe, crear `meaning-wiring.test.tsx` que renderice el componente del tab Aspectos con datos fixture y verifique que "Trígono" es un botón que abre dialog)

**Interfaces:**
- Consumes: `<Meaning>` (Task 1) + claves de Tasks 2–3.
- Mapa de envolturas (mínimo obligatorio):
  1. **Aspectos**: nombre del aspecto (`Trígono` → `aspect.trine`), cada glifo de planeta (`☉` → `planet.sun`), la palabra `Orbe` → `term.orb`, `Aplicativo`/`Separativo` → `term.applying`/`term.separating`.
  2. **Núcleo**: chip de dignidad (`Exaltación` → `dignity.exaltation`), nombre del signo (`Aries` → `sign.aries`), `Casa 11` → `house.11`, `ASCENDENTE` → `point.ascendant`.
  3. **Posiciones**: glifo/nombre de planeta, signo y casa de cada fila.
  4. **Balance**: `Fuego/Tierra/Aire/Agua` → `element.*`, `Cardinal/Fijo/Mutable` → `modality.*`.
  5. **Patrones**: `Stellium` → `pattern.stellium`, `Gran Trígono` → `pattern.grandtrine`, y cada glifo de planeta del patrón.
  6. **Controles**: cada tab de sistema de casas → `housesystem.*`; `Tropical`/`Sideral` → `zodiac.*`. OJO: los controles son `tab`s — NO envolver el tab entero (rompería la selección); añadir al lado un afijo pequeño `ⓘ` envuelto en `<Meaning>` o envolver solo el label visual si el click de selección no se pierde (probar; si hay conflicto, el afijo ⓘ con `aria-label` es la salida).
- El mapeo clave: las vistas ya tienen los keys internos en inglés (planet keys, sign keys de core) — construir la clave del glosario desde el key interno (`"sun"` → `planet.sun`), NUNCA desde el label traducido. Para casas: número → `house.${n}`.

- [ ] **Step 1: leer carta-view.tsx y chart-tabs.tsx enteros.**
- [ ] **Step 2: test que falla** (fixture del tab Aspectos → "Trígono" abre dialog).
- [ ] **Step 3: envolver por el mapa de arriba; verde; suite completa.**
- [ ] **Step 4: gates** — vitest + tsc + next build → PASS.
- [ ] **Step 5: commit** — `git add apps/web && git commit -m "feat(significados): carta tocable — aspectos, núcleo, posiciones, balance, patrones y controles"`

---

### Task 6: Cablear Pilares

**Files:**
- Modify: `apps/web/app/(app)/pilares/pillar-column.tsx` (troncos, ramas, dioses, troncos ocultos)
- Modify: `apps/web/app/(app)/pilares/pilares-tabs.tsx` (Na Yin, etapas, estrellas, fuerza, favorables, pilares de suerte — el HEADING de cada tab lleva `<Meaning>` del concepto)
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx` (balance de elementos, "MAESTRO DEL DÍA")
- Test: `apps/web/app/(app)/pilares/__tests__/meaning-wiring.test.tsx` (fixture de un pilar → el carácter 甲 es botón y abre dialog con "jiǎ"/madera)

**Interfaces:**
- Consumes: `<Meaning>` + claves `bazi.*` (Task 4). Igual que en carta: construir claves desde los identificadores internos de `types.ts` (stem/branch/god keys), no desde labels.
- Mapa mínimo: carácter de tronco → `bazi.stem.*`; carácter de rama (+animal) → `bazi.branch.*`; etiqueta de dios (p.ej. `RECURSO INDIRECTO`) → `bazi.god.*`; heading `TRONCOS OCULTOS` → `bazi.term.hiddenstems`; `MAESTRO DEL DÍA`/`日主` → `bazi.term.daymaster`; heading de cada tab → su `bazi.term.*`; elementos del balance → `bazi.element.*`.

- [ ] **Step 1: leer los 3 archivos.**
- [ ] **Step 2: test que falla → envolver → verde.**
- [ ] **Step 3: gates** — vitest + tsc + next build → PASS.
- [ ] **Step 4: commit** — `git add apps/web && git commit -m "feat(significados): pilares tocables — troncos, ramas, dioses y conceptos"`

---

### Task 7: Cablear Horóscopo + Hoy + barrido final

**Files:**
- Modify: `apps/web/app/(app)/horoscopo/horoscopo-view.tsx` (glifos de planeta/aspecto en los drivers de las barras; signo del titular)
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx` (tarjetas del clima: glifos de planetas y nombre del aspecto → `planet.*`/`aspect.*`; `Aplicativo`/`Separativo` → `term.*`)
- Modify: `apps/web/app/(app)/hoy/energy-panel.tsx` (los drivers "por qué" de cada barra: glifos → `planet.*`)
- Test: extender un test existente de hub o crear `apps/web/app/(app)/hoy/__tests__/meaning-wiring.test.tsx` con fixture de una tarjeta de clima.

**Barrido final (mismo task):**
- [ ] Recorrer con `next dev`: /carta (4 tabs + controles), /pilares (4 pilares + 7 tabs), /horoscopo, /hoy — CADA símbolo visible responde al tap o su término está envuelto. Anotar y envolver lo que falte (con claves existentes; si falta una clave de contenido, añadirla ES+EN en este mismo task).
- [ ] **Gates finales**: `npx pnpm turbo run typecheck test` (raíz) + `next build` limpio.
- [ ] **Commit** — `git add apps/web && git commit -m "feat(significados): horóscopo y hoy tocables + barrido de cobertura"`

---

## Self-review del plan (hecho)

- **Cobertura del pedido**: "cada signo que dé click pueda ver qué significa" → Tasks 2+5 (signos/planetas/casas en carta), 3+5 (aspectos/orbe/dignidades/patrones — el muro de glifos de la auditoría), 4+6 (pilares completos), 7 (horóscopo/hoy). ✓
- **Lo que NO cubre a propósito**: móvil (plan siguiente de paridad, mismo glosario se portará a `apps/mobile`); niveles Profunda/Completa (ya cableados — solo falta la llave de Gio, fuera del alcance del código); rueda de la carta (los planetas de la rueda YA abren detalle — no duplicar).
- **Tipos consistentes**: `GlossaryEntry`/`glossaryEntry`/`<Meaning k>` definidos en Task 1 y consumidos con esa firma exacta en 5–7. ✓
- **Claves desde identificadores internos**, nunca desde labels traducidos (regla explícita en Tasks 5 y 6). ✓
