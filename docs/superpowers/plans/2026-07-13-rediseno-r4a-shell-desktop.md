# R4a — Shell desktop (dirección 06 «Cúpula con top-nav»): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que Aluna web deje de ser una columna de teléfono (max-width 520px) en pantallas anchas: top-nav de vidrio con 6 botones, Hoy en fila hero de 12 columnas y Carta a dos columnas con rueda sticky + tabs internas — según el mockup aprobado por Gio.

**Architecture:** el primer breakpoint desktop del repo (`@media (min-width: 1080px)`) sobre el shell existente. Móvil queda INTACTO: todo cambio desktop vive detrás del media query; las únicas adiciones al DOM móvil quedan ocultas por CSS (`display:none`) bajo 1080px. El mockup `docs/redesign/r4-mockups/06-cupula-topnav.html` es el spec visual (valores de nav 66px, shell 1280px, 12 col gap 20, tintes de paneles — copiados abajo donde se usan).

**Tech Stack:** Next.js 15 App Router, CSS Modules + tokens R3 (LEER `docs/redesign/R3-sistema.md` antes de tocar estilos: primitivos globales `.card`/`.chip`/`.seg` se consumen como strings literales + lo que difiere queda en el módulo local), next-intl, Vitest + React Testing Library.

## Global Constraints

- **Breakpoint desktop: `@media (min-width: 1080px)` exacto** — mismo valor en todos los archivos (las vars CSS no funcionan en media queries; se repite el literal con el comentario `/* bp desktop R4a */`).
- **Móvil (<1080px) INTACTO:** ni el DOM visible ni los estilos actuales cambian bajo el breakpoint. Elementos nuevos (TopNav, CTA preguntar, tab-strip de carta) llevan `display:none` fuera del media query.
- Tokens R3 siempre (`--sp-*`, `--text-*`, `--radius*`, `--acc-rgb`, `--line`, `--surface*`, `--tone-*`); los únicos valores crudos permitidos son los del mockup que se citan en cada tarea (gradientes de tinte, 1280px, 66px, 84px sticky) — comentar su origen.
- **i18n:** toda clave nueva va en `messages/es.json` **y** `messages/en.json` (el test de paridad `app/__tests__/i18n.test.tsx` falla si no).
- Glifos unicode de texto llevan `U+FE0E` (`"︎"`) — patrón existente (`TEXT_VS` en carta-view).
- Gate por tarea (desde `apps/web/`): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` — los tres verdes antes de commitear. Suite actual: 148 tests.
- Sin dependencias nuevas. Sin tocar `apps/mobile`.
- Commits en español con prefijo `feat(r4a):`.

---

### Task 1: El marco desktop — TopNav de 6 + header en grid + shell ancho + bottom-nav oculta

**Files:**
- Modify: `apps/web/components/icon.tsx` (2 iconos nuevos)
- Create: `apps/web/components/top-nav.tsx`
- Create: `apps/web/components/top-nav.module.css`
- Create: `apps/web/components/__tests__/top-nav.test.tsx`
- Modify: `apps/web/components/bottom-nav.module.css` (ocultar ≥1080)
- Modify: `apps/web/app/(app)/layout.tsx` (montar TopNav en el header)
- Modify: `apps/web/app/(app)/app-shell.module.css` (header grid + .main ancho desktop)
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (claves `nav.horoscopo`, `nav.perfil`)

**Interfaces:**
- Consumes: `Icon` (`components/icon.tsx`), claves i18n `nav.*` + `hoy.soon` existentes, patrón activo de `bottom-nav.tsx` (`path === href || path.startsWith(href + "/")`).
- Produces: `TopNav` (component sin props, client) montado en el header; iconos `aries` y `person` disponibles en `Icon`.

- [ ] **Step 1: Test que falla** — `apps/web/components/__tests__/top-nav.test.tsx` (espeja el patrón de mocks de `app/auth/reset/__tests__/page.test.tsx`):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { TopNav } from "../top-nav";

let currentPath = "/hoy";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

function renderNav(path: string) {
  currentPath = path;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <TopNav />
    </NextIntlClientProvider>,
  );
}

describe("TopNav", () => {
  it("renderiza los 6 botones en el orden de Gio", () => {
    renderNav("/hoy");
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    // horóscopo NO es link (está 'pronto'), así que sale aparte
    expect(labels).toEqual([es.nav.hoy, es.nav.carta, es.nav.numeros, es.nav.pilares, es.nav.perfil]);
    expect(screen.getByText(es.nav.horoscopo).closest("[aria-disabled]")).toBeInTheDocument();
  });

  it("marca activo el mundo actual (y subrutas)", () => {
    renderNav("/carta");
    expect(screen.getByText(es.nav.carta).closest("a")!.getAttribute("data-on")).toBe("true");
    expect(screen.getByText(es.nav.hoy).closest("a")!.getAttribute("data-on")).toBeNull();
  });

  it("Perfil apunta a /ajustes (hasta R4b) y se activa en /ajustes", () => {
    renderNav("/ajustes");
    const perfil = screen.getByText(es.nav.perfil).closest("a")!;
    expect(perfil.getAttribute("href")).toBe("/ajustes");
    expect(perfil.getAttribute("data-on")).toBe("true");
  });
});
```

- [ ] **Step 2: Correrlo y verlo fallar** — `npx vitest run components/__tests__/top-nav.test.tsx` → FAIL (módulo `../top-nav` no existe; y `es.nav.horoscopo` undefined).

- [ ] **Step 3: Claves i18n** — en `messages/es.json`, namespace `nav` (línea 3): añadir `"horoscopo": "Horóscopo", "perfil": "Perfil"`. En `messages/en.json`: `"horoscopo": "Horoscope", "perfil": "Profile"`.

- [ ] **Step 4: Iconos** — en `components/icon.tsx`, añadir a `PATHS` (misma línea de estilo stroke 1.4):

```tsx
  aries: (<path d="M4 19.5C4 9.5 6 5.5 8.6 5.5c2.1 0 3.4 2.4 3.4 6 0-3.6 1.3-6 3.4-6C18 5.5 20 9.5 20 19.5" />),
  person: (<><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.2c1.3-3.8 4.2-5.8 7.5-5.8s6.2 2 7.5 5.8" /></>),
```

- [ ] **Step 5: Componente** — `components/top-nav.tsx` (espeja `bottom-nav.tsx`; el orden es el DEFINITIVO de Gio):

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import styles from "./top-nav.module.css";

// Orden definitivo de Gio (2026-07-13). Perfil → /ajustes hasta que R4b
// construya el santuario; Horóscopo es sección futura (solo el botón, "pronto").
const ITEMS = [
  { href: "/hoy", icon: "sun", key: "hoy", soon: false },
  { href: "/carta", icon: "wheel", key: "carta", soon: false },
  { href: "/horoscopo", icon: "aries", key: "horoscopo", soon: true },
  { href: "/numeros", icon: "grid3", key: "numeros", soon: false },
  { href: "/pilares", icon: "pillars", key: "pilares", soon: false },
  { href: "/ajustes", icon: "person", key: "perfil", soon: false },
] as const;

export function TopNav() {
  const path = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className={styles.tabs} aria-label="principal">
      {ITEMS.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        const inner = (
          <>
            <Icon name={it.icon} size={16} />
            {t(it.key)}
          </>
        );
        return it.soon ? (
          <span key={it.key} className={`${styles.tab} ${styles.soon}`} role="button" aria-disabled="true">
            {inner}
          </span>
        ) : (
          <Link key={it.key} href={it.href} className={styles.tab} data-on={active || undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 6: Estilos del TopNav** — `components/top-nav.module.css` (valores del mockup: tabs de 66px con subrayado dorado `.tab.on::after`; oculto en móvil):

```css
/* R4a: top-nav desktop (mockup 06). Oculta bajo el breakpoint — el móvil
   sigue navegando con la BottomNav. */
.tabs { display: none; }

@media (min-width: 1080px) { /* bp desktop R4a */
  .tabs { display: flex; gap: var(--sp-1); height: 100%; }
  .tab {
    position: relative; display: flex; align-items: center; gap: var(--sp-2);
    padding: 0 var(--sp-5);
    color: var(--soft); font-size: var(--text-sm); font-weight: 600;
    transition: color var(--dur, 0.22s) var(--ease);
  }
  .tab svg { opacity: 0.75; }
  .tab:hover { color: var(--ink); }
  .tab[data-on] { color: var(--ink); }
  .tab[data-on] svg { opacity: 1; filter: drop-shadow(0 0 6px rgba(var(--acc-rgb), 0.55)); }
  .tab[data-on]::after {
    content: ""; position: absolute; left: var(--sp-3); right: var(--sp-3); bottom: -1px; height: 2px;
    background: linear-gradient(90deg, transparent, var(--acc), transparent); /* mockup: subrayado dorado */
    box-shadow: 0 0 14px rgba(var(--acc-rgb), 0.65);
  }
  .soon { opacity: 0.45; cursor: default; }
}
```

Nota: si `--dur`/`--ease` no existen en tokens.css con esos nombres, usar los nombres reales del bloque motion de `lib/theme/tokens.css` (verificar con grep) — NO inventar tokens.

- [ ] **Step 7: Montarlo en el header** — en `app/(app)/layout.tsx`, entre el brand y el ProfileMenu:

```tsx
<header className={styles.header}>
  <span className={styles.brand}>Aluna</span>
  <TopNav />
  <ProfileMenu />
</header>
```

(con `import { TopNav } from "@/components/top-nav";`)

- [ ] **Step 8: Header en grid + shell ancho** — en `app/(app)/app-shell.module.css` añadir al final:

```css
@media (min-width: 1080px) { /* bp desktop R4a */
  /* header: marca izq · tabs centro · perfil der (mockup: grid 1fr auto 1fr, 66px) */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    height: 66px; /* mockup 06 */
    padding: 0 var(--sp-7);
  }
  .header > :last-child { justify-self: end; }
  /* la columna de teléfono se vuelve lienzo (mockup: min(1280px, 100% - 112px)) */
  .main { max-width: min(1280px, calc(100% - 112px)); }
}
```

- [ ] **Step 9: Ocultar la BottomNav en desktop** — al final de `components/bottom-nav.module.css`:

```css
@media (min-width: 1080px) { /* bp desktop R4a: navega el TopNav */
  .nav { display: none; }
}
```

- [ ] **Step 10: Gate completo** — `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` → todo verde (151 tests: 148 + 3 nuevos).

- [ ] **Step 11: Commit** — `git add -A && git commit -m "feat(r4a): top-nav desktop de 6 mundos + shell ancho (bp 1080)"`.

---

### Task 2: Hoy en desktop — fila hero 5/4/3 tintada + CTA «Pregúntale a Aluna»

**Files:**
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx`
- Modify: `apps/web/app/(app)/hoy/hub.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (claves `hoy.askAluna`, `hoy.askHint`)

**Interfaces:**
- Consumes: `EnergyPanel` (root = `<section className={styles.panel}>` de energy.module.css — NO es `.card` global), `DayNumberCard` (root SÍ es `card card--interactive`), la Link `weatherCard` (es su propio card). Ruta `/preguntar` (existe).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Claves i18n** — `es.json` namespace `hoy`: `"askAluna": "Pregúntale a Aluna", "askHint": "Tu carta, tus números y el cielo de hoy, en la respuesta."` · `en.json`: `"askAluna": "Ask Aluna", "askHint": "Your chart, your numbers and today's sky — in the answer."`.

- [ ] **Step 2: Verificar paridad** — `npx vitest run app/__tests__/i18n.test.tsx` → PASS.

- [ ] **Step 3: Wrappers + CTA en hub-view.tsx** — el DOM móvil no cambia visualmente: los wrappers son `display:contents` en móvil, y el CTA va `display:none` bajo 1080. Reemplazar el bloque central del return (desde `{weather && ...}` hasta cerrar `.lenses`) por:

```tsx
      <div className={styles.deskGrid}>
        {weather && weather.length > 0 && (
          <Link href="/carta" className={`card card--interactive ${styles.weatherCard} ${styles.heroWeather} reveal`} style={{ ["--i" as string]: 1 }}>
            {/* ...contenido EXACTO actual de la weatherCard, sin cambios... */}
          </Link>
        )}

        <div className={styles.heroDay}>{active && <DayNumberCard birthDate={active.birth_date} />}</div>

        <div className={styles.heroEnergy}>{active && <EnergyPanel profileId={active.id} />}</div>

        <h2 className={`${styles.section} ${styles.gridFull}`}>{t("hoy.lenses")}</h2>

        {/* CTA desktop (mockup 06): en móvil no existe (display:none) */}
        <Link href="/preguntar" className={`card card--interactive ${styles.askCta}`}>
          <span className={styles.askTitle}>{t("hoy.askAluna")}</span>
          <span className={styles.askHint}>{t("hoy.askHint")}</span>
        </Link>

        <div className={styles.lenses}>
          {/* ...bloque LENSES.map EXACTO actual, sin cambios... */}
        </div>
      </div>
```

⚠️ Los comentarios `...EXACTO actual...` significan: mover el JSX existente tal cual, sin editarlo. Solo se añaden: el div `deskGrid`, los 2 wrappers `heroDay`/`heroEnergy`, la clase extra `heroWeather`, la clase extra `gridFull` en el h2, y el Link `askCta`.

- [ ] **Step 4: CSS del grid + tintes** — al final de `hub.module.css`:

```css
/* ===== R4a desktop (mockup 06): fila hero 5/4/3 + CTA + lentes ===== */
/* En móvil los wrappers no existen visualmente y el CTA está oculto. */
.deskGrid { display: contents; }
.heroDay, .heroEnergy { display: contents; }
.askCta { display: none; }

@media (min-width: 1080px) { /* bp desktop R4a */
  .deskGrid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--sp-5); /* mockup: 20px */
    position: relative; z-index: 1;
  }
  .heroEnergy { display: block; grid-column: span 5; order: 1; }
  .heroWeather { grid-column: span 4; order: 2; margin-bottom: 0; }
  .heroDay { display: block; grid-column: span 3; order: 3; }
  .section.gridFull { grid-column: 1 / -1; order: 4; margin-top: var(--sp-4); }
  .askCta {
    display: flex; flex-direction: column; gap: var(--sp-2); justify-content: center;
    grid-column: span 6; order: 5; padding: var(--sp-5);
    /* mockup .p-energy: superficie dorada dominante del CTA */
    background: linear-gradient(150deg, rgba(var(--acc-rgb), 0.14), rgba(var(--acc-rgb), 0.035) 55%, var(--surface));
    border-color: rgba(var(--acc-rgb), 0.34);
  }
  .askTitle { font-family: var(--font-display); font-size: var(--text-xl); color: var(--ink); }
  .askHint { font-size: var(--text-xs); color: var(--soft); }
  .lenses { grid-column: span 6; order: 6; grid-template-columns: repeat(3, 1fr); }

  /* tintes por dominio (mockup: energía oro / clima azul / numerología violeta).
     .wrap .heroEnergy > * = especificidad (0,2,0): gana al .panel del módulo del
     componente sin importar el orden de carga (regla R3: override por especificidad). */
  .wrap .heroEnergy > * {
    background: linear-gradient(150deg, rgba(var(--acc-rgb), 0.14), rgba(var(--acc-rgb), 0.035) 55%, var(--surface));
    border-color: rgba(var(--acc-rgb), 0.34);
    height: 100%;
  }
  .wrap .heroWeather {
    background: linear-gradient(155deg, rgba(122, 170, 224, 0.14), rgba(122, 170, 224, 0.04) 55%, var(--surface)); /* mockup: --tone-cool 7aaae0 */
    border-color: rgba(122, 170, 224, 0.34);
  }
  .wrap .heroDay > * {
    background: linear-gradient(160deg, rgba(150, 140, 214, 0.14), rgba(150, 140, 214, 0.04) 60%, var(--surface)); /* mockup: violeta numerología */
    border-color: rgba(150, 140, 214, 0.34);
    height: 100%;
  }
  .wrap { padding-bottom: var(--sp-7); } /* sin bottom-nav no hace falta el clearance de 96px */
}
```

- [ ] **Step 5: Gate completo** — tsc + vitest (151) + `rm -rf .next && npx next build` → verde.

- [ ] **Step 6: Commit** — `git commit -m "feat(r4a): hoy en desktop — fila hero 5/4/3 tintada + CTA pregúntale a Aluna"`.

---

### Task 3: Carta en desktop — rueda sticky 55/45 + tabs internas del panel

**Files:**
- Create: `apps/web/app/(app)/carta/chart-tabs.tsx`
- Create: `apps/web/app/(app)/carta/__tests__/chart-tabs.test.tsx`
- Modify: `apps/web/app/(app)/carta/carta-view.tsx`
- Modify: `apps/web/app/(app)/carta/carta.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (claves `carta.tabNucleo`, `carta.tabPosiciones`, `carta.tabAspectos`, `carta.tabBalance`)

**Interfaces:**
- Consumes: la estructura actual de carta-view (wheelWrap/tapHint/solar · bigThree · Balance×2 · weather section · proToggle · pro sections). El estado `pro` existente.
- Produces: `ChartTabs` — `{ active: ChartTab; onSelect: (t: ChartTab) => void }` con `export type ChartTab = "nucleo" | "posiciones" | "aspectos" | "balance"`.

**Diseño de la tarea (léelo entero antes de codificar):** en desktop la carta se parte en 2 columnas — izquierda sticky con la rueda (55%), derecha con un tab-strip (Núcleo/Posiciones/Aspectos/Balance) que muestra un grupo a la vez. En móvil NADA cambia: el strip está oculto, todos los grupos se ven apilados en el orden actual, y el Modo Pro sigue siendo el toggle el que muestra/oculta la lámina. La mecánica: cada sección existente recibe una clase de "pane"; en desktop se ocultan los panes que no coinciden con el tab activo. Las secciones pro HOY se renderizan condicionalmente (`{pro && ...}`) — eso se cambia a render SIEMPRE con ocultamiento CSS en móvil (`data-pro`), para que en desktop las tabs Posiciones/Aspectos tengan contenido sin encender el toggle (el toggle se oculta en desktop).

- [ ] **Step 1: Test que falla** — `app/(app)/carta/__tests__/chart-tabs.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ChartTabs } from "../chart-tabs";

function renderTabs(active: Parameters<typeof ChartTabs>[0]["active"], onSelect = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChartTabs active={active} onSelect={onSelect} />
    </NextIntlClientProvider>,
  );
  return onSelect;
}

describe("ChartTabs", () => {
  it("renderiza los 4 tabs y marca el activo", () => {
    renderTabs("nucleo");
    expect(screen.getByRole("tab", { name: es.carta.tabNucleo }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: es.carta.tabBalance }).getAttribute("aria-selected")).toBe("false");
  });

  it("al tocar un tab llama onSelect con su clave", () => {
    const onSelect = renderTabs("nucleo");
    fireEvent.click(screen.getByRole("tab", { name: es.carta.tabAspectos }));
    expect(onSelect).toHaveBeenCalledWith("aspectos");
  });
});
```

- [ ] **Step 2: Verlo fallar** — `npx vitest run "app/(app)/carta/__tests__/chart-tabs.test.tsx"` → FAIL (no existe el módulo ni las claves).

- [ ] **Step 3: Claves i18n** — `es.json` namespace `carta`: `"tabNucleo": "Núcleo", "tabPosiciones": "Posiciones", "tabAspectos": "Aspectos", "tabBalance": "Balance"` · `en.json`: `"tabNucleo": "Core", "tabPosiciones": "Positions", "tabAspectos": "Aspects", "tabBalance": "Balance"`.

- [ ] **Step 4: Componente** — `app/(app)/carta/chart-tabs.tsx`:

```tsx
"use client";
import { useTranslations } from "next-intl";
import styles from "./carta.module.css";

export type ChartTab = "nucleo" | "posiciones" | "aspectos" | "balance";

const TABS: Array<{ key: ChartTab; labelKey: string }> = [
  { key: "nucleo", labelKey: "tabNucleo" },
  { key: "posiciones", labelKey: "tabPosiciones" },
  { key: "aspectos", labelKey: "tabAspectos" },
  { key: "balance", labelKey: "tabBalance" },
];

/** Tab-strip del panel derecho de la carta en desktop (mockup 06 .dtabs).
 *  En móvil está oculto por CSS y todos los panes se ven apilados. */
export function ChartTabs({ active, onSelect }: { active: ChartTab; onSelect: (t: ChartTab) => void }) {
  const t = useTranslations("carta");
  return (
    <div className={styles.dtabs} role="tablist">
      {TABS.map(({ key, labelKey }) => (
        <button key={key} role="tab" aria-selected={active === key}
          className={styles.dtab} data-on={active === key || undefined}
          onClick={() => onSelect(key)}>
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verlo pasar** — mismo comando → PASS (2 tests).

- [ ] **Step 6: Recablear carta-view.tsx** — cambios quirúrgicos, en orden:

(a) imports + estado:
```tsx
import { ChartTabs, type ChartTab } from "./chart-tabs";
// dentro de CartaView():
const [tab, setTab] = useState<ChartTab>("nucleo");
```

(b) helper de clase de pane (junto a los consts del componente):
```tsx
const pane = (key: ChartTab) => `${styles.pane} ${tab === key ? styles.paneOn : ""}`;
```

(c) envolver el bloque `{ready && (<>...</>)}` en la grilla de 2 columnas: la rueda y su contexto van en `<div className={styles.wheelCol}>` (contiene: aviso solar, wheelWrap, tapHint) y TODO lo demás en `<div className={styles.readCol}>`. Dentro de readCol, primero `<ChartTabs active={tab} onSelect={setTab} />` y luego las secciones existentes SIN reordenar, cada una con su clase de pane añadida:

```tsx
{ready && (
  <div className={styles.deskCols}>
    <div className={styles.wheelCol}>
      {ready.solar && <p className={styles.solar}>☉ {t("solarNotice")}</p>}
      <div className={`${styles.wheelWrap} ${playCeremony ? "" : "reveal"}`} style={{ ["--i" as string]: 1 }}>
        <ChartWheel chart={ready.chart} solar={ready.solar} onSelect={setSheet} animated={playCeremony} />
      </div>
      <p className={styles.tapHint}>{t("tapHint")}</p>
    </div>

    <div className={styles.readCol}>
      <ChartTabs active={tab} onSelect={setTab} />

      <div className={pane("nucleo")}>
        {/* bigThree EXACTO actual */}
      </div>

      <div className={pane("balance")}>
        {/* los 2 <Balance .../> EXACTOS actuales */}
      </div>

      {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
        <section className={`card card--tight fade-in ${pane("nucleo")}`}>
          {/* contenido EXACTO actual de Tu Clima */}
        </section>
      )}

      <button className={styles.proToggle} onClick={() => setPro(!pro)} aria-pressed={pro}>
        {/* contenido EXACTO actual del toggle */}
      </button>

      <div className={styles.pro} data-pro={pro || undefined}>
        <section className={`card card--tight fade-in ${pane("posiciones")}`}>{/* posiciones EXACTO */}</section>
        <section className={`card card--tight fade-in ${pane("balance")}`}>{/* distribución EXACTO */}</section>
        <section className={`card card--tight fade-in ${pane("aspectos")}`}>{/* aspectario EXACTO */}</section>
        <section className={`card card--tight fade-in ${pane("balance")}`}>{/* patrones EXACTO */}</section>
        <section className={`card card--tight fade-in ${pane("posiciones")}`}>{/* cabecera técnica EXACTO */}</section>
      </div>
    </div>
  </div>
)}
```

⚠️ CAMBIO DE COMPORTAMIENTO DELIBERADO: el bloque `.pro` deja de ser `{pro && (...)}` y pasa a renderizarse SIEMPRE con `data-pro={pro || undefined}`. En móvil el CSS lo oculta cuando no hay `data-pro` (mismo efecto visual que hoy); en desktop las tabs muestran su contenido siempre y el toggle se oculta. El resto del JSX interno NO se toca.

(d) el estado `sheet`/BodyReading y todo lo demás del componente quedan igual.

- [ ] **Step 7: CSS** — al final de `carta.module.css`:

```css
/* ===== R4a desktop (mockup 06): 2 columnas 55/45, rueda sticky, tabs ===== */
.deskCols { display: contents; }
.dtabs { display: none; }
/* móvil: la lámina pro solo se ve con el toggle encendido (mismo efecto que
   el {pro && ...} que reemplazó — ver carta-view Step 6c) */
.pro:not([data-pro]) { display: none; }

@media (min-width: 1080px) { /* bp desktop R4a */
  .deskCols {
    display: grid;
    grid-template-columns: 11fr 9fr; /* mockup: rueda 55% / panel 45% */
    gap: var(--sp-6);
    align-items: start;
  }
  .wheelCol { position: sticky; top: 84px; /* header 66px + respiro */ }
  .readCol { display: flex; flex-direction: column; gap: var(--sp-4); }

  /* tab-strip (mockup .dtabs) */
  .dtabs {
    display: flex; padding: 0 var(--sp-2);
    border-bottom: 1px solid rgba(var(--acc-rgb), 0.16);
    background: color-mix(in oklab, var(--bg) 75%, transparent);
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .dtab {
    position: relative; padding: var(--sp-3) var(--sp-4);
    background: none; border: 0; cursor: pointer;
    color: var(--soft); font-family: var(--font-ui); font-size: var(--text-sm); font-weight: 600;
  }
  .dtab:hover { color: var(--ink); }
  .dtab[data-on] { color: var(--ink); }
  .dtab[data-on]::after {
    content: ""; position: absolute; left: var(--sp-3); right: var(--sp-3); bottom: -1px; height: 2px;
    background: linear-gradient(90deg, transparent, var(--acc), transparent);
    box-shadow: 0 0 14px rgba(var(--acc-rgb), 0.55);
  }

  /* panes: en desktop solo se ve el activo; en móvil (fuera del media) todos */
  .readCol .pane { display: none; }
  .readCol .paneOn { display: block; }

  /* en desktop la lámina pro vive en las tabs: el toggle sobra y la lámina
     se muestra siempre (sus secciones ya se filtran por pane) */
  .proToggle { display: none; }
  .pro:not([data-pro]) { display: block; }
}
```

⚠️ Nota de cascada: `.pro:not([data-pro]) { display: none; }` (móvil) y su override desktop `display:block` viven en el MISMO módulo — el del media query gana por orden. El `.readCol .pane` desktop (0,2,0) también controla las secciones pro individuales.

- [ ] **Step 8: Gate completo** — tsc + vitest (153) + `rm -rf .next && npx next build` → verde. OJO: si algún test existente de carta falla por el cambio `{pro && ...}` → `data-pro`, revisar si el test asertaba la AUSENCIA del DOM pro; ajustar el test a la nueva semántica (visibilidad por CSS) y documentarlo en el reporte.

- [ ] **Step 9: Commit** — `git commit -m "feat(r4a): carta en desktop — rueda sticky 55/45 + tabs núcleo/posiciones/aspectos/balance"`.

---

## Self-Review

1. **Cobertura del spec:** breakpoint (T1) · top-nav 6 con Horóscopo pronto y Perfil→/ajustes (T1) · bottom-nav oculta (T1) · shell 1280 (T1) · Hoy hero 5/4/3 tintada + CTA (T2) · Carta 55/45 sticky + tabs (T3) · móvil intacto (constraint global + wrappers display:contents). El chip de tema del nav-right del mockup se OMITE (YAGNI: el avatar/ProfileMenu ya ocupa ese slot; el chip es decorativo) — anotado como pulido opcional.
2. **Placeholders:** los bloques `...EXACTO actual...` son instrucciones de MOVER código existente sin editarlo (no de inventarlo) — legítimos, el implementador tiene el archivo delante.
3. **Consistencia de tipos:** `ChartTab` definido en chart-tabs.tsx y consumido en carta-view (import type). `data-on` como convención de activo en TopNav y ChartTabs.
4. **Riesgo señalado:** el cambio `{pro && ...}` → render-siempre + CSS es el único cambio de comportamiento móvil (DOM presente aunque oculto); visualmente idéntico. El reviewer de la tarea 3 debe verificarlo explícitamente.

**Verificación del controlador (Fase 5 de build-fable-g, NO es tarea del plan):** navegador real a ≥1080px — top-nav con subrayado, hero 5/4/3 con tintes, CTA, carta 2 columnas con rueda sticky y tabs conmutando; y a <1080px — TODO idéntico a hoy (bottom-nav, columna, pro toggle). Después: review whole-branch + merge.
