# R4b-3 — Desktop: números · compatibilidad · informe · preguntar — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que `/numeros`, `/compatibilidad`, `/informe` y `/preguntar` dejen de usar el cap
intermedio de emergencia (`max-width: 760px`, stopgap de R4a) y reciban su layout desktop
real (≥1080px), según la dirección aprobada en
`docs/superpowers/specs/2026-07-13-r4b3-desktop-numeros-pilares-compat-informe-preguntar-design.md`
(§4.1, §4.3, §4.4, §4.5). `/pilares` NO está en este plan — lo cubre un plan hermano en
paralelo (spec §4.2).

**Architecture:** todo el trabajo vive detrás del breakpoint único del repo
`@media (min-width: 1080px) /* bp desktop R4a */`; móvil (<1080px) queda INTACTO en las 4
rutas. Numerología y Compatibilidad (patrón B, spec §3) son reflow de grilla puro: sus
contenedores (`.lentes`/`.pro` en numerología, `.pickers`/`.bars` en compatibilidad) ya
tienen los hijos en el orden de lectura deseado, así que basta con gridificar el contenedor
existente — **no hace falta el mecanismo `display:contents` de `hub.module.css`/
`carta.module.css`**, que solo resuelve el caso de REORDENAR JSX; aquí no hay nada que
reordenar (documentado como decisión de esta fase, no una desviación del spec: el resultado
visual es idéntico al descrito en §4.1/§4.3). Preguntar (patrón C compacto, spec §4.5) es
únicamente ancho + un ajuste de `min-height` — cero componentes nuevos. Informe (patrón C,
spec §4.4) es el único con pieza nueva: `ReportToc`, un riel de índice con scrollspy
(`IntersectionObserver`) que solo se monta cuando al menos un informe está `ready`.

**Decisión de esta fase, no cerrada literalmente por el spec:** `informe-view.tsx` renderiza
**dos** `ReportCard` independientes (natal y solar), cada uno con su propio estado
(`none`/`loading`/`dormant`/`plusRequired`/`generating`/`ready`/`error`) — el spec habla de
"un informe" en singular. Esta fase trata el riel a nivel de PÁGINA, no por tarjeta: agrega
un grupo de anclas por cada informe que esté `ready` (0, 1 o 2 grupos.) Si ninguno está
`ready`, no hay riel y la página es una sola columna angosta (fiel a §4.4). Si alguno lo
está, la página se ensancha para hospedar lectura + riel. Se documenta aquí porque no hay
una única "página en modo ready" en el código real — evita inventar dos rieles apilados o
descartar uno de los dos informes.

**Tech Stack:** Next.js 15 App Router, CSS Modules + tokens R3 (ver `apps/web/lib/theme/tokens.css`:
`--sp-1..7`, `--text-2xs..3xl`, `--display`/`--display-sm`, `--radius`/`--radius-lg`,
`--acc`/`--acc-rgb`/`--acc-text`, `--line`, `--surface`/`--surface-2`, `--ink`/`--soft`,
`--tone-warm`/`--tone-cool`/`--tone-caution`, `--glow-soft`, `--dur`/`--dur-fast`/`--ease*`),
next-intl, Vitest + React Testing Library.

## Global Constraints

- **Breakpoint desktop: `@media (min-width: 1080px)` exacto**, mismo literal en los 4
  archivos, con el comentario `/* bp desktop R4a */` (marca el ORIGEN del breakpoint, no la
  fase que lo consume — mismo precedente que `perfil.module.css` en R4b-1).
- **Móvil (<1080px) INTACTO:** ningún estilo ni marcado visible cambia bajo el breakpoint.
  La única pieza nueva de DOM (`ReportToc` en informe) se monta siempre que haya ≥1 grupo,
  pero queda oculta por CSS (`display:none` fuera del media query) bajo 1080px — mismo
  patrón ya aceptado en el repo (`.pro:not([data-pro])` de `carta.module.css`, R4a Task 3).
- **Anchos "a calibrar", no finales** (spec §7): 880px (numerología), 960px (compatibilidad),
  640px lectura + 200px riel = 868px (informe), 720px (preguntar) — mismo criterio que el
  spike de R2, la calibración fina contra contenido real queda para cuando se vea en
  navegador real (parte del gate final de esta fase, no de cada tarea).
- **El ajuste de "clearance fantasma del bottom-nav" (96px reservados para una barra que no
  existe en desktop) se aplica SOLO a Preguntar** (spec §4.5, es el único de los 4 con esta
  nota explícita) — no se extiende a numerología/compatibilidad/informe en esta fase aunque
  compartan el mismo patrón de `96px` en su padding móvil; extenderlo sería alcance no
  pedido.
- **Tareas de CSS puro (numerología, compatibilidad, preguntar) no llevan un paso de test
  dedicado.** jsdom no evalúa `@media` — no hay forma honesta de poner un test rojo→verde
  para un cambio de `grid-template-columns`/`max-width`. Mismo precedente que
  `2026-07-13-rediseno-r4a-shell-desktop.md` Task 2 (el reflow 5/4/3 de `hoy` tampoco llevó
  test dedicado). Se verifican con el gate completo (tsc + vitest + build) + la verificación
  real en navegador del cierre de fase.
- **i18n:** toda clave nueva en `apps/web/messages/es.json` **y** `apps/web/messages/en.json`
  (el test de paridad `app/__tests__/i18n.test.tsx` falla si faltan). Esta fase solo agrega
  `reports.tocLabel`.
- Tokens R3 siempre; los únicos valores crudos permitidos son los anchos de columna citados
  arriba y el offset sticky `84px` (header 66px + respiro — mismo valor ya usado en
  `carta.module.css` `.wheelCol`).
- Gate por tarea (desde `apps/web/`, cd absoluto): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Suite actual: **178 tests** (29 archivos).
- Sin dependencias nuevas. Sin tocar `apps/mobile`. Sin tocar `/pilares`, `/perfil`, `/ajustes`.
- Commits en español con prefijo `feat(r4b3):`.

---

### Task 1: Numerología — columna ancha (~880px) + núcleo a 5 columnas + Pro a grilla 2×2

**Files:**
- Modify: `apps/web/app/(app)/numeros/numerology-view.module.css:159-164`

**Interfaces:**
- Consumes: las clases ya existentes `.wrap`, `.lentes`, `.pro` (aplicadas sin cambios en
  `numerology-view.tsx` — esta tarea NO toca el `.tsx`, solo el CSS).
- Produces: nada que consuma otra tarea (hoja independiente).
- Sin paso de test dedicado — ver Global Constraints ("tareas de CSS puro").

- [ ] **Step 1: Reemplazar el bloque desktop stopgap** — en
  `numerology-view.module.css`, sustituir las líneas 159-164:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* cap intermedio: esta pantalla aún no tiene diseño desktop propio (R4b+);
       sin esto se estira a los 1280px del shell y la línea de lectura se rompe.
       Hallazgo de la review final de R4a. */
    .wrap { max-width: 760px; margin-left: auto; margin-right: auto; }
  }
  ```

  por:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* R4b-3 (patrón B, spec §4.1): columna ancha centrada — reemplaza el cap
       intermedio de 760px (stopgap de R4a). 880px es punto de partida, a
       calibrar contra contenido real (nombres largos EN) cuando se vea en
       navegador, igual que hizo el spike de R2. */
    .wrap { max-width: min(880px, calc(100% - 112px)); margin-left: auto; margin-right: auto; }

    /* Núcleo: las 5 lentes en una sola fila en vez de 3 filas de 2. */
    .lentes { grid-template-columns: repeat(5, 1fr); }

    /* Modo Pro: las 4 secciones (lecciones kármicas, inclusión, pináculos+desafíos,
       ciclos) de columna única a grilla 2×2. El orden del JSX ya es row-major
       correcto (lecciones+inclusión primera fila, pináculos/desafíos+ciclos
       segunda) — no hace falta reordenar nada, así que basta con gridificar el
       contenedor existente (no se usa el mecanismo display:contents de
       hub/carta: ese resuelve reordenar JSX, no es el caso aquí). */
    .pro { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
  }
  ```

- [ ] **Step 2: Gate completo** — desde `apps/web/`:
  `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (178 tests,
  sin cambios de conteo — esta tarea no agrega tests).

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/app/\(app\)/numeros/numerology-view.module.css
  git commit -m "feat(r4b3): numerología en desktop — columna ancha 880px, núcleo a 5 columnas, Pro a grilla 2x2"
  ```

---

### Task 2: Compatibilidad — columna ancha (~960px) + pickers en fila + barras a grilla 2×2

**Files:**
- Modify: `apps/web/app/(app)/compatibilidad/compat.module.css:121-126`

**Interfaces:**
- Consumes: las clases ya existentes `.wrap`, `.pickers`, `.bars` (aplicadas sin cambios en
  `compat-view.tsx` — esta tarea NO toca el `.tsx`, solo el CSS).
- Produces: nada que consuma otra tarea (hoja independiente).
- Sin paso de test dedicado — ver Global Constraints.

- [ ] **Step 1: Reemplazar el bloque desktop stopgap** — en `compat.module.css`,
  sustituir las líneas 121-126:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* cap intermedio: esta pantalla aún no tiene diseño desktop propio (R4b+);
       sin esto se estira a los 1280px del shell y la línea de lectura se rompe.
       Hallazgo de la review final de R4a. */
    .wrap { max-width: 760px; margin-left: auto; margin-right: auto; }
  }
  ```

  por:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* R4b-3 (patrón B, spec §4.3): columna ancha centrada — reemplaza el cap
       intermedio de 760px (stopgap de R4a). 960px es punto de partida (algo
       más que numerología: hospeda 2 columnas de picker + una grilla 2×2 de
       barras), a calibrar cuando se vea en navegador. */
    .wrap { max-width: min(960px, calc(100% - 112px)); margin-left: auto; margin-right: auto; }

    /* Los 2 PersonPicker, de apilados a fila de 2 columnas (son dos entidades
       independientes; no hace falta reordenar nada, el JSX ya los pone en el
       orden A/B deseado). */
    .pickers { display: grid; grid-template-columns: 1fr 1fr; }

    /* Las 4 barras de tema, de lista vertical a grilla 2×2. El acordeón de
       expansión in-place NO cambia (spec §4.3): solo el contenedor pasa de
       flex-column a grid; si una barra se expande, su fila crece y la barra
       vecina de esa misma fila queda con espacio vacío debajo — comportamiento
       aceptado explícitamente por el spec, no se resuelve aparte. */
    .bars { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
  }
  ```

- [ ] **Step 2: Gate completo** — desde `apps/web/`:
  `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (178 tests).

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/app/\(app\)/compatibilidad/compat.module.css
  git commit -m "feat(r4b3): compatibilidad en desktop — columna ancha 960px, pickers en fila, barras a grilla 2x2"
  ```

---

### Task 3: Preguntar — columna angosta (~720px) + ajuste del clearance fantasma del bottom-nav

**Files:**
- Modify: `apps/web/app/(app)/preguntar/chat.module.css:59-64`

**Interfaces:**
- Consumes: la clase ya existente `.wrap` (aplicada sin cambios en `chat-view.tsx` — esta
  tarea NO toca el `.tsx`, solo el CSS).
- Produces: nada que consuma otra tarea (hoja independiente).
- Sin paso de test dedicado — ver Global Constraints.

- [ ] **Step 1: Reemplazar el bloque desktop stopgap** — en `chat.module.css`,
  sustituir las líneas 59-64:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* cap intermedio: esta pantalla aún no tiene diseño desktop propio (R4b+);
       sin esto se estira a los 1280px del shell y la línea de lectura se rompe.
       Hallazgo de la review final de R4a. */
    .wrap { max-width: 760px; margin-left: auto; margin-right: auto; }
  }
  ```

  por:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* R4b-3 (patrón C compacto, spec §4.5): columna angosta centrada —
       reemplaza el cap intermedio de 760px (stopgap de R4a). 720px es punto de
       partida (turnos de conversación, no párrafos largos como informe), a
       calibrar cuando se vea en navegador. Sin riel: no hay historial de
       conversaciones persistido (fuera de alcance, spec §6). */
    .wrap { max-width: min(720px, calc(100% - 112px)); margin-left: auto; margin-right: auto; }

    /* .wrap usa `min-height: calc(100dvh - 150px)` en móvil: esos 150px son
       header móvil + el clearance del bottom-nav fijo (96px) que en desktop NO
       existe (mismo hallazgo que carta/hoy en la review de R4a — ver
       carta.module.css `.wrap { padding-bottom: var(--sp-7); }`). CORRECCIÓN
       (hallazgo de task-review, Task 3): 150-96=54 resta la contribución del
       header MÓVIL, no la del header de desktop — el header de desktop tiene
       su propia altura fija de 66px (`app-shell.module.css` `.header { height:
       66px; }`, mismo valor que usa `carta.module.css` `top: 84px; /* header
       66px + respiro */`). El valor correcto es restar esos 66px reales. */
    .wrap { min-height: calc(100dvh - 66px); }
  }
  ```

- [ ] **Step 2: Gate completo** — desde `apps/web/`:
  `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (178 tests).

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/app/\(app\)/preguntar/chat.module.css
  git commit -m "feat(r4b3): preguntar en desktop — columna angosta 720px, ajuste del clearance fantasma del bottom-nav"
  ```

---

### Task 4: Informe — anclas `id` en cada sección + funciones puras del índice

**Files:**
- Modify: `apps/web/app/(app)/informe/informe-view.tsx`
- Modify: `apps/web/app/(app)/informe/informe.module.css`
- Test: `apps/web/app/(app)/informe/__tests__/informe-view.test.tsx`

**Interfaces:**
- Consumes: `NatalReport`/`SolarReport`/`NatalReportSection`/`SolarReportTheme` de
  `@/lib/reports/types` (ya importados en el archivo).
- Produces (todo exportado desde `informe-view.tsx`, consumido por la Task 5):
  - `export type ViewState = { s: "loading" } | { s: "none" } | { s: "dormant" } | { s: "plusRequired" } | { s: "generating" } | { s: "ready"; content: NatalReport | SolarReport; modelUsed: string | null } | { s: "error" }` (ya existía, ahora exportado sin cambios de forma).
  - `export type TocEntry = { id: string; label: string }`
  - `export type TocGroup = { heading: string; entries: TocEntry[] }`
  - `export function natalTocEntries(content: NatalReport, labels: { intro: string; outro: string }): TocEntry[]`
  - `export function solarTocEntries(content: SolarReport, labels: { essay: string; mantra: string }): TocEntry[]`
  - `export function buildTocGroups(params: { natal: ViewState; solar: ViewState; natalHeading: string; solarHeading: string; introLabel: string; outroLabel: string; essayLabel: string; mantraLabel: string }): TocGroup[]`
  - `export function NatalContent({ content }: { content: NatalReport })` y `export function SolarContent({ content }: { content: SolarReport })` (mismas funciones de hoy, ahora exportadas + con `id` ancla en cada `.section`).
  - Esquema de ids (fuente única de verdad: los mismos strings que arma `natalTocEntries`/`solarTocEntries` Y los que `NatalContent`/`SolarContent` ponen en el DOM): `report-natal-intro`, `report-natal-{sec.key}` (uno por sección, `sec.key` ∈ `essence`/`emotional`/`path`/`challenges`), `report-natal-outro`; `report-solar-essay`, `report-solar-theme-{i}` (índice del array `themes`), `report-solar-mantra`.

- [ ] **Step 1: Escribir el test que falla** — crear
  `apps/web/app/(app)/informe/__tests__/informe-view.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, screen } from "@testing-library/react";
  import { NextIntlClientProvider } from "next-intl";
  import es from "@/messages/es.json";
  import type { NatalReport, SolarReport } from "@/lib/reports/types";
  import {
    NatalContent,
    SolarContent,
    natalTocEntries,
    solarTocEntries,
    buildTocGroups,
    type ViewState,
  } from "../informe-view";

  const fixtureNatal: NatalReport = {
    intro: "Intro de prueba",
    sections: [
      { key: "essence", title: "Esencia", body: "cuerpo esencia" },
      { key: "emotional", title: "Emocional", body: "cuerpo emocional" },
      { key: "path", title: "Camino", body: "cuerpo camino" },
      { key: "challenges", title: "Desafíos", body: "cuerpo desafíos" },
    ],
    outro: "Outro de prueba",
  };

  const fixtureSolar: SolarReport = {
    year: 2026,
    essay: "Ensayo de prueba",
    themes: [
      { title: "Tema uno", why: "porque uno", invitation: "invita uno" },
      { title: "Tema dos", why: "porque dos", invitation: "invita dos" },
    ],
    mantra: "Mantra de prueba",
  };

  function renderWithIntl(node: React.ReactElement) {
    return render(
      <NextIntlClientProvider locale="es" messages={es}>
        {node}
      </NextIntlClientProvider>,
    );
  }

  describe("NatalContent", () => {
    it("pone un id ancla en cada .section (intro, cada sección, outro)", () => {
      const { container } = renderWithIntl(<NatalContent content={fixtureNatal} />);
      expect(container.querySelector("#report-natal-intro")).not.toBeNull();
      expect(container.querySelector("#report-natal-essence")).not.toBeNull();
      expect(container.querySelector("#report-natal-emotional")).not.toBeNull();
      expect(container.querySelector("#report-natal-path")).not.toBeNull();
      expect(container.querySelector("#report-natal-challenges")).not.toBeNull();
      expect(container.querySelector("#report-natal-outro")).not.toBeNull();
    });
  });

  describe("SolarContent", () => {
    it("pone un id ancla en cada .section (ensayo, cada tema, mantra)", () => {
      const { container } = renderWithIntl(<SolarContent content={fixtureSolar} />);
      expect(container.querySelector("#report-solar-essay")).not.toBeNull();
      expect(container.querySelector("#report-solar-theme-0")).not.toBeNull();
      expect(container.querySelector("#report-solar-theme-1")).not.toBeNull();
      expect(container.querySelector("#report-solar-mantra")).not.toBeNull();
    });
  });

  describe("natalTocEntries", () => {
    it("arma las entradas en orden intro → secciones → outro", () => {
      const entries = natalTocEntries(fixtureNatal, { intro: "Introducción", outro: "Cierre" });
      expect(entries).toEqual([
        { id: "report-natal-intro", label: "Introducción" },
        { id: "report-natal-essence", label: "Esencia" },
        { id: "report-natal-emotional", label: "Emocional" },
        { id: "report-natal-path", label: "Camino" },
        { id: "report-natal-challenges", label: "Desafíos" },
        { id: "report-natal-outro", label: "Cierre" },
      ]);
    });
  });

  describe("solarTocEntries", () => {
    it("arma las entradas en orden ensayo → temas → mantra", () => {
      const entries = solarTocEntries(fixtureSolar, { essay: "Ensayo del año", mantra: "Mantra" });
      expect(entries).toEqual([
        { id: "report-solar-essay", label: "Ensayo del año" },
        { id: "report-solar-theme-0", label: "Tema uno" },
        { id: "report-solar-theme-1", label: "Tema dos" },
        { id: "report-solar-mantra", label: "Mantra" },
      ]);
    });
  });

  describe("buildTocGroups", () => {
    const labels = {
      natalHeading: "Carta natal",
      solarHeading: "Revolución Solar 2026",
      introLabel: "Introducción",
      outroLabel: "Cierre",
      essayLabel: "Ensayo del año",
      mantraLabel: "Mantra",
    };

    it("devuelve [] cuando ningún informe está ready", () => {
      const groups = buildTocGroups({
        natal: { s: "none" } as ViewState,
        solar: { s: "loading" } as ViewState,
        ...labels,
      });
      expect(groups).toEqual([]);
    });

    it("devuelve solo el grupo natal cuando solo natal está ready", () => {
      const groups = buildTocGroups({
        natal: { s: "ready", content: fixtureNatal, modelUsed: null } as ViewState,
        solar: { s: "dormant" } as ViewState,
        ...labels,
      });
      expect(groups).toHaveLength(1);
      expect(groups[0]!.heading).toBe("Carta natal");
      expect(groups[0]!.entries).toHaveLength(6);
    });

    it("devuelve ambos grupos, natal primero, cuando los dos están ready", () => {
      const groups = buildTocGroups({
        natal: { s: "ready", content: fixtureNatal, modelUsed: null } as ViewState,
        solar: { s: "ready", content: fixtureSolar, modelUsed: "claude" } as ViewState,
        ...labels,
      });
      expect(groups.map((g) => g.heading)).toEqual(["Carta natal", "Revolución Solar 2026"]);
    });
  });
  ```

- [ ] **Step 2: Correrlo y verlo fallar** — desde `apps/web/`:
  `npx vitest run "app/(app)/informe/__tests__/informe-view.test.tsx"` → FAIL (no existen
  `natalTocEntries`/`solarTocEntries`/`buildTocGroups`; `NatalContent`/`SolarContent` no
  están exportados; los `.section` no tienen `id`).

- [ ] **Step 3: Exportar `ViewState`** — en `informe-view.tsx`, añadir `export` a la
  declaración existente del tipo (sin cambiar su forma):

  ```tsx
  export type ViewState =
    | { s: "loading" }
    | { s: "none" }
    | { s: "dormant" }
    | { s: "plusRequired" }
    | { s: "generating" }
    | { s: "ready"; content: NatalReport | SolarReport; modelUsed: string | null }
    | { s: "error" };
  ```

- [ ] **Step 4: Tipos y funciones puras del índice** — en `informe-view.tsx`, justo
  antes de `function NatalContent(...)`, añadir:

  ```tsx
  /** Una entrada del riel de índice: ancla + etiqueta visible. */
  export type TocEntry = { id: string; label: string };
  /** Un grupo del riel (un informe = un grupo, con su propio encabezado). */
  export type TocGroup = { heading: string; entries: TocEntry[] };

  /** ids de ancla del informe natal — MISMA fuente que los `id` que
   * NatalContent pone en cada `.section` más abajo: si uno cambia sin el otro,
   * el riel deja de saltar a la sección correcta. */
  export function natalTocEntries(
    content: NatalReport,
    labels: { intro: string; outro: string },
  ): TocEntry[] {
    return [
      { id: "report-natal-intro", label: labels.intro },
      ...content.sections.map((sec) => ({ id: `report-natal-${sec.key}`, label: sec.title })),
      { id: "report-natal-outro", label: labels.outro },
    ];
  }

  /** ids de ancla del informe solar — misma fuente que los `id` de SolarContent. */
  export function solarTocEntries(
    content: SolarReport,
    labels: { essay: string; mantra: string },
  ): TocEntry[] {
    return [
      { id: "report-solar-essay", label: labels.essay },
      ...content.themes.map((theme, i) => ({ id: `report-solar-theme-${i}`, label: theme.title })),
      { id: "report-solar-mantra", label: labels.mantra },
    ];
  }

  /** Arma los grupos del riel a partir del estado de ambos informes: un grupo
   * por informe que esté `ready` (0, 1 o 2 grupos). El riel entero se oculta
   * cuando esto devuelve `[]` (InformeView decide con `groups.length > 0`,
   * Task 5). */
  export function buildTocGroups(params: {
    natal: ViewState;
    solar: ViewState;
    natalHeading: string;
    solarHeading: string;
    introLabel: string;
    outroLabel: string;
    essayLabel: string;
    mantraLabel: string;
  }): TocGroup[] {
    const groups: TocGroup[] = [];
    if (params.natal.s === "ready") {
      groups.push({
        heading: params.natalHeading,
        entries: natalTocEntries(params.natal.content as NatalReport, {
          intro: params.introLabel,
          outro: params.outroLabel,
        }),
      });
    }
    if (params.solar.s === "ready") {
      groups.push({
        heading: params.solarHeading,
        entries: solarTocEntries(params.solar.content as SolarReport, {
          essay: params.essayLabel,
          mantra: params.mantraLabel,
        }),
      });
    }
    return groups;
  }
  ```

- [ ] **Step 5: Exportar `NatalContent`/`SolarContent` y añadirles `id`** — en
  `informe-view.tsx`, reemplazar las dos funciones existentes:

  ```tsx
  function NatalContent({ content }: { content: NatalReport }) {
    const t = useTranslations("reports");
    return (
      <>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("introLabel")}</h3>
          <p className={styles.sectionBody}>{content.intro}</p>
        </div>
        {content.sections.map((sec) => (
          <div key={sec.key} className={styles.section}>
            <h3 className={styles.sectionTitle}>{sec.title}</h3>
            <p className={styles.sectionBody}>{sec.body}</p>
          </div>
        ))}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("outroLabel")}</h3>
          <p className={styles.sectionBody}>{content.outro}</p>
        </div>
      </>
    );
  }

  function SolarContent({ content }: { content: SolarReport }) {
    const t = useTranslations("reports");
    return (
      <>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("essayLabel")}</h3>
          <p className={styles.sectionBody}>{content.essay}</p>
        </div>
        {content.themes.map((theme, i) => (
          <div key={i} className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {i + 1}. {theme.title}
            </h3>
            <p className={styles.sectionBody}>
              <strong>{t("themeWhyLabel")}:</strong> {theme.why}
            </p>
            <p className={styles.sectionBody}>
              <strong>{t("themeInvitationLabel")}:</strong> {theme.invitation}
            </p>
          </div>
        ))}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("mantraLabel")}</h3>
          <p className={styles.sectionBody}>{content.mantra}</p>
        </div>
      </>
    );
  }
  ```

  por (mismo contenido, `export` + `id` por sección):

  ```tsx
  export function NatalContent({ content }: { content: NatalReport }) {
    const t = useTranslations("reports");
    return (
      <>
        <div id="report-natal-intro" className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("introLabel")}</h3>
          <p className={styles.sectionBody}>{content.intro}</p>
        </div>
        {content.sections.map((sec) => (
          <div key={sec.key} id={`report-natal-${sec.key}`} className={styles.section}>
            <h3 className={styles.sectionTitle}>{sec.title}</h3>
            <p className={styles.sectionBody}>{sec.body}</p>
          </div>
        ))}
        <div id="report-natal-outro" className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("outroLabel")}</h3>
          <p className={styles.sectionBody}>{content.outro}</p>
        </div>
      </>
    );
  }

  export function SolarContent({ content }: { content: SolarReport }) {
    const t = useTranslations("reports");
    return (
      <>
        <div id="report-solar-essay" className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("essayLabel")}</h3>
          <p className={styles.sectionBody}>{content.essay}</p>
        </div>
        {content.themes.map((theme, i) => (
          <div key={i} id={`report-solar-theme-${i}`} className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {i + 1}. {theme.title}
            </h3>
            <p className={styles.sectionBody}>
              <strong>{t("themeWhyLabel")}:</strong> {theme.why}
            </p>
            <p className={styles.sectionBody}>
              <strong>{t("themeInvitationLabel")}:</strong> {theme.invitation}
            </p>
          </div>
        ))}
        <div id="report-solar-mantra" className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("mantraLabel")}</h3>
          <p className={styles.sectionBody}>{content.mantra}</p>
        </div>
      </>
    );
  }
  ```

- [ ] **Step 6: `scroll-margin-top` en `.section`** — en `informe.module.css`, la
  regla `.section { display: grid; gap: var(--sp-1); }` pasa a:

  ```css
  .section { display: grid; gap: var(--sp-1); scroll-margin-top: 84px; } /* header 66px + respiro — mismo valor que carta.module.css .wheelCol; evita que el salto de ancla esconda el título tras el header fijo */
  ```

- [ ] **Step 7: Verlo pasar** — desde `apps/web/`:
  `npx vitest run "app/(app)/informe/__tests__/informe-view.test.tsx"` → PASS (7 tests
  nuevos).

- [ ] **Step 8: Gate completo** — `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (185 tests: 178 + 7).

- [ ] **Step 9: Commit**
  ```bash
  git add apps/web/app/\(app\)/informe/informe-view.tsx apps/web/app/\(app\)/informe/informe.module.css apps/web/app/\(app\)/informe/__tests__/informe-view.test.tsx
  git commit -m "feat(r4b3): informe — anclas id por sección + funciones puras del índice (natalTocEntries/solarTocEntries/buildTocGroups)"
  ```

---

### Task 5: Informe — componente `ReportToc` (scrollspy) + integración condicional + CSS del riel

**Files:**
- Create: `apps/web/app/(app)/informe/report-toc.tsx`
- Create: `apps/web/app/(app)/informe/__tests__/report-toc.test.tsx`
- Modify: `apps/web/app/(app)/informe/informe-view.tsx`
- Modify: `apps/web/app/(app)/informe/informe.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json`

**Interfaces:**
- Consumes: `type TocGroup` de `./informe-view` (Task 4); `buildTocGroups` de `./informe-view`.
- Produces: `export function ReportToc({ groups, ariaLabel }: { groups: TocGroup[]; ariaLabel: string })` — riel montado por `InformeView` cuando `groups.length > 0`; contrato de marcado `data-toc` en `.page` (`.page[data-toc]` = al menos un informe `ready`) que consume el CSS de esta misma tarea.

- [ ] **Step 1: Escribir el test que falla** — crear
  `apps/web/app/(app)/informe/__tests__/report-toc.test.tsx`:

  ```tsx
  import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
  import { render, screen, act } from "@testing-library/react";
  import { ReportToc } from "../report-toc";
  import type { TocGroup } from "../informe-view";

  /** jsdom no implementa IntersectionObserver: un doble mínimo que guarda el
   * callback y los elementos observados para poder simular intersección a mano. */
  class FakeIntersectionObserver implements IntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];
    callback: IntersectionObserverCallback;
    elements: Element[] = [];
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      FakeIntersectionObserver.instances.push(this);
    }
    observe(el: Element) {
      this.elements.push(el);
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  const groups: TocGroup[] = [
    {
      heading: "Carta natal",
      entries: [
        { id: "report-natal-intro", label: "Introducción" },
        { id: "report-natal-outro", label: "Cierre" },
      ],
    },
  ];

  function renderToc() {
    document.body.innerHTML = "";
    const intro = document.createElement("div");
    intro.id = "report-natal-intro";
    const outro = document.createElement("div");
    outro.id = "report-natal-outro";
    document.body.append(intro, outro);
    return render(<ReportToc groups={groups} ariaLabel="Índice" />);
  }

  describe("ReportToc", () => {
    beforeEach(() => {
      FakeIntersectionObserver.instances = [];
      vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("renderiza el encabezado del grupo y una ancla por entrada", () => {
      renderToc();
      expect(screen.getByText("Carta natal")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("href")).toBe("#report-natal-intro");
      expect(screen.getByRole("link", { name: "Cierre" }).getAttribute("href")).toBe("#report-natal-outro");
    });

    it("marca la primera entrada como activa antes de cualquier scroll", () => {
      renderToc();
      expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("data-on")).toBe("true");
    });

    it("mueve el indicador activo cuando el observer reporta otra sección visible", () => {
      renderToc();
      const observer = FakeIntersectionObserver.instances[0]!;
      const outroEl = document.getElementById("report-natal-outro")!;
      act(() => {
        observer.callback([{ isIntersecting: true, target: outroEl } as IntersectionObserverEntry], observer);
      });
      expect(screen.getByRole("link", { name: "Cierre" }).getAttribute("data-on")).toBe("true");
      expect(screen.getByRole("link", { name: "Introducción" }).getAttribute("data-on")).toBeNull();
    });
  });
  ```

- [ ] **Step 2: Correrlo y verlo fallar** — desde `apps/web/`:
  `npx vitest run "app/(app)/informe/__tests__/report-toc.test.tsx"` → FAIL (el módulo
  `../report-toc` no existe).

- [ ] **Step 3: Componente** — crear `apps/web/app/(app)/informe/report-toc.tsx`:

  ```tsx
  "use client";
  import { useEffect, useState } from "react";
  import type { TocGroup } from "./informe-view";
  import styles from "./informe.module.css";

  /** Riel de índice del informe (patrón C, spec §4.4): ancla + indicador de
   * sección activa por scroll (IntersectionObserver). InformeView solo lo monta
   * cuando `buildTocGroups(...)` devuelve al menos 1 grupo (algún informe
   * `ready`) — ver informe-view.tsx. */
  export function ReportToc({ groups, ariaLabel }: { groups: TocGroup[]; ariaLabel: string }) {
    const ids = groups.flatMap((g) => g.entries.map((e) => e.id));
    const idsKey = ids.join("|");
    const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

    useEffect(() => {
      const els = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      if (els.length === 0) return;
      const observer = new IntersectionObserver(
        (entries) => {
          const visibleIds = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
          if (visibleIds.length === 0) return;
          // El primero en orden de documento entre los visibles: la sección
          // "actual" mientras se hace scroll (scrollspy clásico).
          const current = ids.find((id) => visibleIds.includes(id));
          if (current) setActiveId(current);
        },
        { rootMargin: "-84px 0px -70% 0px", threshold: 0 },
      );
      els.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    return (
      <nav className={styles.toc} aria-label={ariaLabel}>
        {groups.map((g) => (
          <div key={g.heading} className={styles.tocGroup}>
            <span className={styles.tocHeading}>{g.heading}</span>
            <ul className={styles.tocList}>
              {g.entries.map((e) => (
                <li key={e.id}>
                  <a href={`#${e.id}`} className={styles.tocLink} data-on={activeId === e.id || undefined}>
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    );
  }
  ```

- [ ] **Step 4: Verlo pasar** — desde `apps/web/`:
  `npx vitest run "app/(app)/informe/__tests__/report-toc.test.tsx"` → PASS (3 tests
  nuevos).

- [ ] **Step 5: Claves i18n** — en `apps/web/messages/es.json`, namespace `reports`,
  añadir después de `"noProfileCta": "Crear perfil"` (última clave antes del `}` de
  cierre):

  ```json
    "noProfileCta": "Crea tu perfil primero",
    "tocLabel": "Índice"
  ```

  (OJO: la clave `noProfileCta` YA existe con el valor `"Crear perfil"` — no duplicarla, solo
  añadir la línea `"tocLabel": "Índice"` a continuación con su coma.) En
  `apps/web/messages/en.json`, mismo namespace, después de `"noProfileCta": "Create profile"`:

  ```json
    "tocLabel": "Contents"
  ```

- [ ] **Step 6: Verificar paridad** — desde `apps/web/`:
  `npx vitest run app/__tests__/i18n.test.tsx` → PASS.

- [ ] **Step 7: Integrar en `InformeView`** — en `informe-view.tsx`:

  (a) import nuevo, junto a los existentes:
  ```tsx
  import { ReportToc } from "./report-toc";
  ```

  (b) reemplazar el `return` del cuerpo "con perfil activo" (el bloque que hoy es
  `<main className={styles.page}><h1>...</h1><div className={styles.list}>...</div></main>`,
  el que viene DESPUÉS del `if (!active) { ... }` — ese primer `return` de perfil vacío NO
  se toca) por:

  ```tsx
  const groups = buildTocGroups({
    natal,
    solar,
    natalHeading: t("natalTitle"),
    solarHeading: t("solarTitle", { year: currentYear }),
    introLabel: t("introLabel"),
    outroLabel: t("outroLabel"),
    essayLabel: t("essayLabel"),
    mantraLabel: t("mantraLabel"),
  });

  return (
    <main className={styles.page} data-toc={groups.length > 0 || undefined}>
      <h1 className={styles.title}>{t("title")}</h1>
      <div className={styles.layout}>
        <div className={styles.list}>
          <ReportCard
            kind="natal"
            heading={t("natalTitle")}
            state={natal}
            onGenerate={() => void runAction("natal", "generate")}
            onRegenerate={() => void runAction("natal", "regenerate")}
            onRefresh={() => void refresh("natal")}
          />
          <ReportCard
            kind="solar_return"
            heading={t("solarTitle", { year: currentYear })}
            state={solar}
            onGenerate={() => void runAction("solar_return", "generate")}
            onRegenerate={() => void runAction("solar_return", "regenerate")}
            onRefresh={() => void refresh("solar_return")}
          />
        </div>
        {groups.length > 0 && <ReportToc groups={groups} ariaLabel={t("tocLabel")} />}
      </div>
    </main>
  );
  ```

  (el contenido de los dos `<ReportCard .../>` es EXACTO al que ya existe hoy — solo se
  envuelven en el nuevo `<div className={styles.layout}>` junto al `ReportToc` condicional;
  `groups` se calcula una vez arriba y se reusa en el atributo `data-toc` y en la prop
  `groups` de `ReportToc`.)

- [ ] **Step 8: CSS del riel + grid condicional** — en `informe.module.css`, reemplazar
  el bloque desktop stopgap actual:

  ```css
  @media (min-width: 1080px) { /* bp desktop R4a */
    /* cap intermedio: esta pantalla aún no tiene diseño desktop propio (R4b+);
       sin esto se estira a los 1280px del shell y la línea de lectura se rompe.
       Hallazgo de la review final de R4a. */
    .page { max-width: 760px; margin-left: auto; margin-right: auto; }
  }
  ```

  por (más las clases nuevas del riel, fuera del media query salvo donde se indica):

  ```css
  .layout { display: contents; }

  /* Riel de índice — oculto en móvil por defecto (no hay espacio lateral en
     una columna de teléfono); se muestra solo dentro del media query. */
  .toc { display: none; }
  .tocGroup { display: flex; flex-direction: column; gap: var(--sp-2); }
  .tocHeading { font-size: var(--text-2xs); letter-spacing: 1.2px; text-transform: uppercase; color: var(--acc-text); font-weight: 700; }
  .tocList { display: flex; flex-direction: column; gap: var(--sp-1); list-style: none; margin: 0; padding: 0; }
  .tocLink {
    display: block; padding: var(--sp-1) 0 var(--sp-1) var(--sp-3);
    border-left: 2px solid var(--line); font-size: var(--text-xs); color: var(--soft);
    text-decoration: none; line-height: 1.4;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }
  .tocLink:hover { color: var(--ink); }
  .tocLink[data-on] {
    color: var(--acc-text);
    border-left-color: var(--acc);
    /* glow vertical — versión del subrayado dorado de .dtab[data-on]::after
       (carta.module.css) orientada al borde izquierdo, spec §4.4. */
    box-shadow: -1px 0 8px rgba(var(--acc-rgb), 0.45);
  }

  @media (min-width: 1080px) { /* bp desktop R4a */
    /* R4b-3 (patrón C, spec §4.4): sin riel (ningún informe ready), columna de
       lectura angosta — reemplaza el cap intermedio de 760px (stopgap de R4a). */
    .page { max-width: min(640px, calc(100% - 112px)); margin-left: auto; margin-right: auto; }

    /* Con riel (≥1 informe ready): la página se ensancha para hospedar lectura
       (640) + riel (200) + separación (sp-6 = 28) = 868, punto de partida a
       calibrar cuando se vea en navegador. */
    .page[data-toc] { max-width: min(868px, calc(100% - 112px)); }
    .page[data-toc] .layout {
      display: grid;
      grid-template-columns: 640px 200px;
      gap: var(--sp-6);
      align-items: start;
    }
    .toc {
      display: flex; flex-direction: column; gap: var(--sp-4);
      position: sticky; top: 84px; /* header 66px + respiro — mismo valor que carta .wheelCol */
    }
  }
  ```

- [ ] **Step 9: Gate completo** — desde `apps/web/`:
  `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → verde (188 tests:
  185 + 3 de `ReportToc`).

- [ ] **Step 10: Commit**
  ```bash
  git add apps/web/app/\(app\)/informe/report-toc.tsx apps/web/app/\(app\)/informe/__tests__/report-toc.test.tsx apps/web/app/\(app\)/informe/informe-view.tsx apps/web/app/\(app\)/informe/informe.module.css apps/web/messages/es.json apps/web/messages/en.json
  git commit -m "feat(r4b3): informe — riel de índice ReportToc con scrollspy, montado solo si algún informe está ready"
  ```

---

## Self-Review

1. **Cobertura del spec:** §4.1 numerología (Task 1: 880px, lentes 5-col, Pro 2×2) ·
   §4.3 compatibilidad (Task 2: 960px, pickers en fila, barras 2×2, acordeón intacto) ·
   §4.4 informe (Tasks 4-5: anclas `id`, `ReportToc` con scrollspy, riel condicional a
   `ready`, columna 640 + riel 200) · §4.5 preguntar (Task 3: 720px, ajuste del clearance
   ajuste del header real de desktop 66px, sin riel, cero componentes nuevos) · §7 riesgos: los dos `{pro && ...}`
   de pilares NO aplican aquí (pilares fuera de alcance); anclas `id` de informe cubiertas en
   Task 4 tal como pedía el riesgo señalado; anchos "a calibrar" documentados en cada tarea
   y en Global Constraints, no fijados en piedra. Fuera de alcance respetado: sin capitular
   en informe, sin historial de conversaciones en preguntar, sin migración de tokens en
   compatibilidad (ya estaba hecha), sin tocar `/perfil`/`/ajustes`/`/pilares`.
2. **Escaneo de placeholders:** sin "TBD"/"añadir validación"/"similar a la Task N" en
   ningún paso; los únicos bloques "reemplazar X por Y" muestran el código COMPLETO antes y
   después (no una descripción de la diferencia). Corregido durante la redacción: la Task 5
   Step 5 aclara explícitamente que `noProfileCta` no se duplica (evita que un implementador
   lo lea como "añadir una clave que ya existe con otro texto").
3. **Consistencia de tipos/nombres:** `TocEntry`/`TocGroup` se definen una sola vez (Task 4,
   en `informe-view.tsx`) y Task 5 los importa por nombre exacto (`type TocGroup`) sin
   redefinirlos. El esquema de ids (`report-natal-intro`/`report-natal-{key}`/
   `report-natal-outro`, `report-solar-essay`/`report-solar-theme-{i}`/`report-solar-mantra`)
   es el MISMO string tanto en `natalTocEntries`/`solarTocEntries` (Task 4) como en los
   `id={...}` del JSX de `NatalContent`/`SolarContent` (Task 4) y en los `href="#{id}"` de
   `ReportToc` (Task 5) — verificado línea por línea al escribir el plan. `ReportToc({groups, ariaLabel})`
   se define en Task 5 y se consume en Task 5 mismo (Step 7) con las mismas dos props, sin
   variantes. `buildTocGroups` se define en Task 4 y se consume en Task 5 con el mismo objeto
   de 8 campos, sin renombrar ninguno.
4. **Riesgo documentado, no placeholder:** la decisión de "riel a nivel de página, no por
   tarjeta" (ver Architecture) es una interpretación deliberada de una ambigüedad real del
   spec (dos `ReportCard` independientes vs. "un informe" en singular) — no una laguna sin
   resolver; queda anotada para que el reviewer de Task 5 la confirme visualmente en el gate
   final (¿se ve razonable un riel que combina natal+solar cuando ambos están listos?).

**Verificación del controlador (NO es tarea del plan):** navegador real ≥1080px en las 4
rutas — numerología (columna 880px, 5 lentes en fila, Pro 2×2 al activar el toggle),
compatibilidad (columna 960px, 2 pickers en fila, comparar y ver las 4 barras en grilla 2×2,
expandir una y confirmar que el acordeón sigue funcionando in-place), informe (con un perfil
sin informes generados: columna angosta 640px sin riel; generar/ver un informe `ready`:
la página se ensancha, aparece el riel a la derecha, sticky bajo el header, el indicador
dorado se mueve al hacer scroll, click en una entrada salta a la sección sin que el header
fijo la tape), preguntar (columna 720px, el compositor pegado abajo reclama el alto real sin
el hueco fantasma del bottom-nav). Después, <1080px en las 4 rutas — confirmar que se ven
IDÉNTICAS a antes de este plan (mismas columnas angostas, sin rieles, sin grillas nuevas).
Luego: review whole-branch + merge (coordinar con el plan hermano de `/pilares` si comparten
ventana de merge).
