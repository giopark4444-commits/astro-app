# R4b-3 — Desktop: Pilares (Ba Zi / Saju) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que `/pilares` deje de usar el cap intermedio de emergencia (`max-width: 760px`, stopgap de R4a) y reciba su propio diseño desktop (≥1080px): split sticky 8fr/12fr (grilla de 4 pilares fija a la izquierda, columna de lectura a la derecha con tabs **verticales** locales sobre las 7 secciones de `ProLamina`), con los controles globales (switch de escritura 漢字/한글 y el concepto Modo Pro) promovidos arriba del split a todo el ancho — según `docs/superpowers/specs/2026-07-13-r4b3-desktop-numeros-pilares-compat-informe-preguntar-design.md` §4.2.

**Architecture:** mismo breakpoint único del repo (`@media (min-width: 1080px) /* bp desktop R4a */`) y el mismo mecanismo `display: contents` + CSS Grid con posicionamiento explícito (`grid-column`/`grid-row`) que carta ya usa para reordenar visualmente SIN mover el JSX de sitio — necesario aquí porque, a diferencia de carta, el orden actual de pilares en el código es grilla → controles → resto, y el layout desktop necesita los controles ARRIBA de la grilla; el truco evita que mover elementos en el JSX rompa el orden visual móvil. Los DOS lugares con `{pro && ...}` que señala el spec §7 (grilla de pilares y `ProLamina`) migran al patrón render-siempre + `data-pro` que carta ya validó en R4a (`carta.module.css` `.pro:not([data-pro])`); un tercer control (`scriptRow`, el switch de escritura) recibe el MISMO tratamiento porque el spec lo promueve a "control global" visible arriba del split — y como el toggle de Modo Pro desaparece en desktop, sin este tratamiento el switch quedaría inalcanzable ahí (ver nota de decisión en Task 4). Móvil queda INTACTO: ningún elemento cambia de posición relativa en el DOM, solo se agrupa en wrappers estructurales sin estilo propio fuera del media query.

**Tech Stack:** Next.js (App Router), CSS Modules + tokens R3 (`--sp-*`, `--text-*`, `--font-*`, `--acc*`, `--line`, `--surface*` — ver `apps/web/lib/theme/tokens.css`), next-intl, Vitest + React Testing Library, `@aluna/core` (Ba Zi puro: `HEAVENLY_STEMS`, `EARTHLY_BRANCHES`, `tenGod`, `hiddenStems`, etc.).

## Global Constraints

- **Breakpoint desktop: `@media (min-width: 1080px)` exacto**, comentario literal `/* bp desktop R4a */` (marca el ORIGEN del breakpoint, no la fase que lo consume — mismo precedente que `perfil.module.css` de R4b-1).
- **Móvil (<1080px) INTACTO:** ni el DOM visible ni el orden relativo de los elementos cambia bajo el breakpoint. Los wrappers estructurales nuevos (`.deskCols`, `.pillarsCol`, `.controlsGlobal`, `.readCol`, `.tabsRow`) NO llevan ninguna regla CSS fuera del media query (ver precedente: `carta.module.css` `.wheelCol`/`.readCol` tampoco tienen reglas fuera de él).
- **Patrón `{pro && ...}` → render-siempre + `data-pro`:** exactamente el mecanismo de `carta.module.css` — el elemento se renderiza SIEMPRE en el DOM; una regla base (fuera del media query) lo oculta con `display:none` salvo que el atributo `data-pro` esté presente (`pro===true`); dentro del media query desktop, un override fuerza `display:<valor original>` siempre, y el toggle que lo controlaba se oculta (`display:none`). Aplica a: la grilla de pilares (badge de Dios + troncos ocultos, vía `PillarColumn`), `ProLamina` completa, y el switch de escritura (`scriptRow`).
- Tokens R3 siempre; los únicos valores crudos permitidos son los ya usados por el propio archivo (`84px` sticky, ya usado por carta) o nuevos y explícitamente marcados como punto de partida a calibrar (`168px` del riel de tabs — ver Task 4).
- **i18n:** este plan NO agrega claves nuevas — todos los labels de las tabs verticales reusan las claves `pilares.*Title` que `ProLamina` ya usa como encabezados de sección (`nayinTitle`, `strengthTitle`, `favorTitle`, `luckTitle`, `stagesTitle`, `interactionsTitle`, `starsTitle`). Si una tarea futura agregara una clave, va en `messages/es.json` **y** `messages/en.json` (el test de paridad `app/__tests__/i18n.test.tsx` falla si no).
- **Convención de tests de este repo:** los componentes de datos con `fetch`/`useProfiles` (los `*-view.tsx`, incluido `PilaresView`) NO tienen test unitario propio en este repo — se verifican por navegador real (ver Task 4). Los componentes PRESENTACIONALES (props puras) SÍ lo tienen (`ChartTabs`/`chart-tabs.test.tsx` es el precedente exacto). Este plan sigue esa convención: extrae piezas presentacionales testeables (`PillarColumn`, `PilaresTabs`, y usa que `ProLamina` YA es presentacional) en vez de inventar mocks de `fetch`/`useProfiles` que no existen en ningún otro test del repo.
- **Cada ruta, sus propios widgets locales** (decisión ya tomada en R3, reafirmada en spec §4.2): `PilaresTabs` es un componente NUEVO local a `pilares/`, NO reusa ni importa `carta/chart-tabs.tsx`.
- Gate por tarea (desde `apps/web/`, cd absoluto — el cwd del shell no persiste entre comandos): `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build` — los tres verdes antes de commitear. Suite actual: **178 tests**.
- Sin dependencias nuevas. Sin tocar `apps/mobile` ni las otras 4 rutas del spec (`/numeros`, `/compatibilidad`, `/informe`, `/preguntar` — plan aparte, fuera de este alcance).
- Commits en español con prefijo `feat(r4b3):`.

---

### Task 1: `PillarColumn` — extrae la columna de un pilar; badge de Dios + troncos ocultos pasan a render-siempre + `data-pro`

**Files:**
- Create: `apps/web/app/(app)/pilares/pillar-column.tsx`
- Create: `apps/web/app/(app)/pilares/__tests__/pillar-column.test.tsx`
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx:4-13` (imports), `:28-41` (borra `GOD_KEY`/`cap`, ahora viven en `pillar-column.tsx`), `:113-184` (el `.grid` y su `.map` — la columna de cada pilar pasa a `<PillarColumn>`)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (nueva regla base, antes del `@media` existente)

**Interfaces:**
- Produces: `PillarColumn({ posKey, pillar, isDay, dayMaster, pro, script, index }: { posKey: string; pillar: Pillar; isDay: boolean; dayMaster: number; pro: boolean; script: "hanzi" | "hangul"; index: number }): JSX.Element` — export nombrado desde `./pillar-column`. También exporta `GOD_KEY: Record<TenGod, string>` (reusado por el test para no duplicar el mapa Dios→clave i18n).
- Consumes: de `@aluna/core` — `HEAVENLY_STEMS`, `EARTHLY_BRANCHES`, `STEM_LABELS`, `BRANCH_LABELS`, `hiddenStems`, `tenGod`, `type Pillar`, `type TenGod`. De `next-intl` — `useTranslations`. Clases de `./pilares.module.css` (`col`, `dayCol`, `colLabel`, `char`, `roman`, `animal`, `god`, `godSelf`, `dayTag`, `hidden`, `hiddenLabel`, `hiddenRow`, `hiddenChar`, `hiddenGod`, `el_*`).

- [ ] **Step 1: Test que falla** — `apps/web/app/(app)/pilares/__tests__/pillar-column.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { tenGod, type Pillar } from "@aluna/core";
import es from "@/messages/es.json";
import { PillarColumn, GOD_KEY } from "../pillar-column";

const esPilares = es.pilares as Record<string, string>;

function renderColumn(props: Partial<Parameters<typeof PillarColumn>[0]> = {}) {
  const pillar: Pillar = props.pillar ?? { stem: 6, branch: 0 };
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PillarColumn
        posKey={props.posKey ?? "day"}
        pillar={pillar}
        isDay={props.isDay ?? true}
        dayMaster={props.dayMaster ?? pillar.stem}
        pro={props.pro ?? false}
        script={props.script ?? "hanzi"}
        index={props.index ?? 0}
      />
    </NextIntlClientProvider>,
  );
}

describe("PillarColumn", () => {
  it("renderiza el badge del Maestro del Día y los troncos ocultos SIEMPRE, incluso con pro=false", () => {
    renderColumn({ isDay: true, pro: false });
    expect(screen.getByText(esPilares.dayMasterHanzi)).toBeInTheDocument();
    expect(screen.getByText(esPilares.hiddenStems)).toBeInTheDocument();
  });

  it("con isDay=false calcula y muestra el Dios del tronco, incluso con pro=false", () => {
    const pillar: Pillar = { stem: 2, branch: 4 };
    const dayMaster = 6;
    renderColumn({ posKey: "month", pillar, isDay: false, dayMaster, pro: false, index: 1 });
    const god = tenGod(dayMaster, pillar.stem);
    expect(screen.getByText(esPilares[GOD_KEY[god]]!)).toBeInTheDocument();
  });

  it("marca data-pro en la raíz según el prop `pro`", () => {
    const { container: off } = renderColumn({ pro: false });
    expect(off.firstElementChild).not.toHaveAttribute("data-pro");
    const { container: on } = renderColumn({ pro: true });
    expect(on.firstElementChild).toHaveAttribute("data-pro", "true");
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pillar-column.test.tsx"` → FAIL (no existe el módulo `../pillar-column`).

- [ ] **Step 3: Crear el componente** — `apps/web/app/(app)/pilares/pillar-column.tsx`:

```tsx
"use client";
import { useTranslations } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  hiddenStems,
  tenGod,
  type Pillar,
  type TenGod,
} from "@aluna/core";
import styles from "./pilares.module.css";

/** Clave i18n del nombre de cada Dios (十神) en la sección `pilares`. Exportada
 *  para que el test compute el mismo texto esperado sin duplicar el mapa. */
export const GOD_KEY: Record<TenGod, string> = {
  peer: "godPeer",
  rob: "godRob",
  eating: "godEating",
  hurting: "godHurting",
  wealth_indirect: "godWealthIndirect",
  wealth_direct: "godWealthDirect",
  power_indirect: "godPowerIndirect",
  power_direct: "godPowerDirect",
  resource_indirect: "godResourceIndirect",
  resource_direct: "godResourceDirect",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Una columna de la grilla de 4 pilares (año/mes/día/hora). Extraída de
 *  PilaresView (R4b-3, spec §4.2/§7) para que el badge de Dios y los troncos
 *  ocultos — hoy condicionados a `{pro && ...}` — migren a render-siempre +
 *  `data-pro` (mismo mecanismo que `carta.module.css` `.pro:not([data-pro])`)
 *  de forma testeable sin mockear `fetch`/`useProfiles`. */
export function PillarColumn({
  posKey,
  pillar,
  isDay,
  dayMaster,
  pro,
  script,
  index,
}: {
  posKey: string;
  pillar: Pillar;
  isDay: boolean;
  dayMaster: number;
  pro: boolean;
  script: "hanzi" | "hangul";
  index: number;
}) {
  const t = useTranslations();
  const stem = HEAVENLY_STEMS[pillar.stem]!;
  const branch = EARTHLY_BRANCHES[pillar.branch]!;
  return (
    <div
      className={`${styles.col} ${isDay ? styles.dayCol : ""} reveal`}
      data-pro={pro || undefined}
      style={{ ["--i" as string]: index }}
    >
      <span className={styles.colLabel}>{t(`pilares.${posKey}`)}</span>
      <span className={`chip ${styles.god} ${isDay ? styles.godSelf : ""}`}>
        {isDay
          ? t("pilares.dayMasterHanzi")
          : t(`pilares.${GOD_KEY[tenGod(dayMaster, pillar.stem)]}`)}
      </span>
      <span className={`${styles.char} ${styles[`el_${stem.element}`] ?? ""}`}>
        {script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : stem.hanzi}
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? STEM_LABELS[pillar.stem]!.romanKo : STEM_LABELS[pillar.stem]!.pinyin}
      </span>
      <span className={`${styles.char} ${styles[`el_${branch.element}`] ?? ""}`}>
        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.hangul : branch.hanzi}
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.romanKo : BRANCH_LABELS[pillar.branch]!.pinyin}
      </span>
      <span className={styles.animal}>{t(`pilares.animal${cap(branch.animal)}`)}</span>
      {isDay && <span className={`chip ${styles.dayTag}`}>{t("pilares.dayMaster")}</span>}
      <div className={styles.hidden}>
        <span className={styles.hiddenLabel}>{t("pilares.hiddenStems")}</span>
        {hiddenStems(pillar.branch).map((hs, j) => {
          const hidden = HEAVENLY_STEMS[hs]!;
          return (
            <span key={j} className={styles.hiddenRow}>
              <span className={`${styles.hiddenChar} ${styles[`el_${hidden.element}`] ?? ""}`}>
                {hidden.hanzi}
              </span>
              <span className={styles.hiddenGod}>
                {t(`pilares.${GOD_KEY[tenGod(dayMaster, hs)]}`)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pillar-column.test.tsx"` → PASS (3 tests).

- [ ] **Step 5: Recablear `pilares-view.tsx`** — cambios quirúrgicos:

(a) imports (reemplaza `apps/web/app/(app)/pilares/pilares-view.tsx:4-13`):

```tsx
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type Pillar,
} from "@aluna/core";
```

y agrega, junto al import de `ProLamina` (línea 16):

```tsx
import { PillarColumn } from "./pillar-column";
```

(b) borra los consts `GOD_KEY` y `cap` (líneas 28-41 del archivo original — ya no se usan aquí, viven en `pillar-column.tsx`). `ELEMENTS`/`ELEMENT_KEY` (líneas 20-27) SE QUEDAN — los sigue usando el balance de elementos.

(c) reemplaza el `.map` de la grilla (líneas 113-184 del archivo original):

```tsx
<div className={styles.grid}>
  {pillars.map(({ key, pillar }, i) => {
    if (!pillar) {
      return (
        <div key={key} className={styles.col}>
          <span className={styles.colLabel}>{t(`pilares.${key}`)}</span>
          <span className={styles.empty}>—</span>
        </div>
      );
    }
    const isDay = key === "day";
    return (
      <PillarColumn
        key={key}
        posKey={key}
        pillar={pillar}
        isDay={isDay}
        dayMaster={data.day.stem}
        pro={pro}
        script={script}
        index={i}
      />
    );
  })}
</div>
```

El resto del archivo (proToggle, proHint, scriptRow, noTime, balance, `{pro && data && <ProLamina .../>}`) queda **exactamente igual** en este paso — se toca en las Tasks 2-4.

- [ ] **Step 6: CSS** — en `apps/web/app/(app)/pilares/pilares.module.css`, agrega esto **justo antes** del `@media (min-width: 1080px)` existente (después de `.annual { margin-top: var(--sp-2); }`):

```css
/* Modo Pro en desktop (R4b-3, spec §7 — primero de los DOS lugares con
   {pro && ...}): mismo mecanismo render-siempre + data-pro que carta
   (ver carta.module.css .pro:not([data-pro])). En móvil, oculto salvo
   Modo Pro (idéntico al comportamiento de hoy); el override que lo hace
   SIEMPRE visible en desktop llega en Task 4, junto con el resto del layout. */
.col:not([data-pro]) .god,
.col:not([data-pro]) .hidden { display: none; }
```

- [ ] **Step 7: Gate** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Verde. Suite: 178 → **181** (3 nuevos).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/\(app\)/pilares/pillar-column.tsx \
        apps/web/app/\(app\)/pilares/__tests__/pillar-column.test.tsx \
        apps/web/app/\(app\)/pilares/pilares-view.tsx \
        apps/web/app/\(app\)/pilares/pilares.module.css
git commit -m "feat(r4b3): extrae PillarColumn — badge de Dios y troncos ocultos a render-siempre + data-pro"
```

---

### Task 2: `PilaresTabs` — tabs verticales locales a pilares (7 secciones)

**Files:**
- Create: `apps/web/app/(app)/pilares/pilares-tabs.tsx`
- Create: `apps/web/app/(app)/pilares/__tests__/pilares-tabs.test.tsx`

**Interfaces:**
- Produces: `export type PilaresTab = "nayin" | "strength" | "favor" | "luck" | "stages" | "interactions" | "stars"`; `PilaresTabs({ active, onSelect }: { active: PilaresTab; onSelect: (t: PilaresTab) => void }): JSX.Element`.
- Consumes: `useTranslations` de `next-intl`; clases `./pilares.module.css` (`vtabs`, `vtab` — **no se declaran en el CSS todavía**, llegan en Task 4, mismo precedente que `chart-tabs.tsx`/`.dtabs` en R4a: el componente referencia las clases antes de que existan en el `.css`, sin efecto visual porque no está montado en ninguna página aún).
- Este componente NO se cablea en `pilares-view.tsx` en esta tarea (llega en Task 4, junto con el resto del layout) — mismo orden que R4a siguió con `ChartTabs` (creado y testeado solo, cableado después).

- [ ] **Step 1: Test que falla** — `apps/web/app/(app)/pilares/__tests__/pilares-tabs.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PilaresTabs } from "../pilares-tabs";

function renderTabs(active: Parameters<typeof PilaresTabs>[0]["active"], onSelect = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PilaresTabs active={active} onSelect={onSelect} />
    </NextIntlClientProvider>,
  );
  return onSelect;
}

describe("PilaresTabs", () => {
  it("renderiza las 7 tabs y marca la activa", () => {
    renderTabs("nayin");
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    expect(screen.getByRole("tab", { name: es.pilares.nayinTitle }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: es.pilares.starsTitle }).getAttribute("aria-selected")).toBe("false");
  });

  it("al tocar una tab llama onSelect con su clave", () => {
    const onSelect = renderTabs("nayin");
    fireEvent.click(screen.getByRole("tab", { name: es.pilares.luckTitle }));
    expect(onSelect).toHaveBeenCalledWith("luck");
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pilares-tabs.test.tsx"` → FAIL (no existe el módulo `../pilares-tabs`).

- [ ] **Step 3: Crear el componente** — `apps/web/app/(app)/pilares/pilares-tabs.tsx`:

```tsx
"use client";
import { useTranslations } from "next-intl";
import styles from "./pilares.module.css";

export type PilaresTab =
  | "nayin"
  | "strength"
  | "favor"
  | "luck"
  | "stages"
  | "interactions"
  | "stars";

const TABS: Array<{ key: PilaresTab; labelKey: string }> = [
  { key: "nayin", labelKey: "nayinTitle" },
  { key: "strength", labelKey: "strengthTitle" },
  { key: "favor", labelKey: "favorTitle" },
  { key: "luck", labelKey: "luckTitle" },
  { key: "stages", labelKey: "stagesTitle" },
  { key: "interactions", labelKey: "interactionsTitle" },
  { key: "stars", labelKey: "starsTitle" },
];

/** Tab-strip VERTICAL local a pilares (spec R4b-3 §4.2) — paralelo a
 *  carta/chart-tabs.tsx pero de forma distinta (riel a la izquierda, no fila
 *  horizontal): 7 secciones de ProLamina no caben cómodas en una fila dentro
 *  de la columna de lectura (patrón "tabs-verticales" de la biblioteca visual).
 *  NO se reusa/importa chart-tabs.tsx — cada ruta, sus propios widgets locales
 *  (decisión ya tomada en R3). En móvil está oculto por CSS (Task 4) y las 7
 *  secciones de ProLamina se ven todas apiladas. */
export function PilaresTabs({ active, onSelect }: { active: PilaresTab; onSelect: (t: PilaresTab) => void }) {
  const t = useTranslations();
  return (
    <div className={styles.vtabs} role="tablist" aria-label={t("pilares.title")}>
      {TABS.map(({ key, labelKey }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          className={styles.vtab}
          data-on={active === key || undefined}
          onClick={() => onSelect(key)}
        >
          {t(`pilares.${labelKey}`)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verlo pasar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pilares-tabs.test.tsx"` → PASS (2 tests).

- [ ] **Step 5: Gate** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Verde. Suite: 181 → **183** (2 nuevos).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(app\)/pilares/pilares-tabs.tsx \
        apps/web/app/\(app\)/pilares/__tests__/pilares-tabs.test.tsx
git commit -m "feat(r4b3): PilaresTabs — tabs verticales locales (7 secciones de ProLamina)"
```

---

### Task 3: `ProLamina` — prop `pro`+`tab`, render-siempre + `data-pro` (segundo lugar del spec §7), panes por sección

**Files:**
- Modify: `apps/web/app/(app)/pilares/pro-lamina.tsx:39` (firma), `:70-71` (raíz), `:74-193` (las 7 `<section>` reciben su pane)
- Create: `apps/web/app/(app)/pilares/__tests__/pro-lamina.test.tsx`
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx` (import de `PilaresTab`, estado `tab`, la línea `{pro && data && <ProLamina .../>}` pasa a render-siempre)
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (nueva regla base)

**Interfaces:**
- Consumes: `PilaresTab` (tipo) de `./pilares-tabs` (Task 2).
- Produces: `ProLamina({ data, script, pro, tab }: { data: BaZiData; script: Script; pro: boolean; tab: PilaresTab }): JSX.Element` — firma ampliada (antes solo `{ data, script }`). La raíz (`.lamina`) lleva `data-pro={pro || undefined}`. Cada una de las 7 `<section>` lleva su clase de pane vía un helper local `pane(key: PilaresTab)`.

- [ ] **Step 1: Test que falla** — `apps/web/app/(app)/pilares/__tests__/pro-lamina.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ProLamina } from "../pro-lamina";
import type { BaZiData } from "../types";

const data: BaZiData = {
  year: { stem: 0, branch: 0 },
  month: { stem: 2, branch: 4 },
  day: { stem: 6, branch: 8 },
  hour: { stem: 8, branch: 10 },
  solarYear: 1990,
  timeKnown: true,
  gender: "feminine",
  birthYear: 1990,
  daysToPrevJie: 10,
  daysToNextJie: 20,
};

function renderLamina(pro: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProLamina data={data} script="hanzi" pro={pro} tab="nayin" />
    </NextIntlClientProvider>,
  );
}

describe("ProLamina", () => {
  it("renderiza las 7 secciones SIEMPRE, incluso con pro=false", () => {
    renderLamina(false);
    expect(screen.getByText(es.pilares.nayinTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.strengthTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.favorTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.luckTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.stagesTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.interactionsTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.starsTitle)).toBeInTheDocument();
  });

  it("marca data-pro en la raíz según el prop `pro`", () => {
    const { container: off } = renderLamina(false);
    expect(off.firstElementChild).not.toHaveAttribute("data-pro");
    const { container: on } = renderLamina(true);
    expect(on.firstElementChild).toHaveAttribute("data-pro", "true");
  });
});
```

- [ ] **Step 2: Verlo fallar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pro-lamina.test.tsx"` → FAIL (la firma actual de `ProLamina` no acepta `pro`/`tab`; TS error / prop no usada).

- [ ] **Step 3: Cablear `pro`/`tab` en `pro-lamina.tsx`** — cambios quirúrgicos:

(a) import del tipo, junto a los demás imports (línea 26-28 del archivo original):

```tsx
import { baziLabels } from "@/lib/content/bazi-labels";
import type { BaZiData } from "./types";
import type { PilaresTab } from "./pilares-tabs";
import styles from "./pilares.module.css";
```

(b) firma (reemplaza línea 39):

```tsx
export function ProLamina({ data, script, pro, tab }: { data: BaZiData; script: Script; pro: boolean; tab: PilaresTab }) {
```

(c) helper de pane, junto a `elName` (después de la línea 68 del archivo original, antes del `return`):

```tsx
  const pane = (key: PilaresTab) => `${styles.pane} ${tab === key ? styles.paneOn : ""}`;
```

(d) raíz con `data-pro` (reemplaza línea 71):

```tsx
    <div className={styles.lamina} data-pro={pro || undefined}>
```

(e) cada una de las 7 `<section className="card">` recibe su pane (mismo `className="card"` de siempre, con el pane agregado):

```tsx
      {/* Na Yin */}
      <section className={`card ${pane("nayin")}`}>
```
```tsx
      {/* Fuerza del DM */}
      <section className={`card ${pane("strength")}`}>
```
```tsx
      {/* Favorables */}
      <section className={`card ${pane("favor")}`}>
```
```tsx
      {/* 大運 */}
      <section className={`card ${pane("luck")}`}>
```
```tsx
      {/* 12 etapas */}
      <section className={`card ${pane("stages")}`}>
```
```tsx
      {/* Interacciones */}
      <section className={`card ${pane("interactions")}`}>
```
```tsx
      {/* Estrellas */}
      <section className={`card ${pane("stars")}`}>
```

El resto de `pro-lamina.tsx` (contenido interno de cada sección, `LuckRow`, etc.) **no cambia**.

- [ ] **Step 4: Verlo pasar** — `cd apps/web && npx vitest run "app/(app)/pilares/__tests__/pro-lamina.test.tsx"` → PASS (2 tests).

- [ ] **Step 5: Cablear en `pilares-view.tsx`** —

(a) import, junto al de `PillarColumn`:

```tsx
import { type PilaresTab } from "./pilares-tabs";
```

(b) nuevo estado, junto a `script` (después de `const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");`):

```tsx
  const [tab, setTab] = useState<PilaresTab>("nayin");
```

(c) reemplaza `{pro && data && <ProLamina data={data} script={script} />}` por:

```tsx
          <ProLamina data={data} script={script} pro={pro} tab={tab} />
```

(el resto del archivo, incluida la posición de esta línea, no cambia todavía — el layout completo llega en Task 4; `tab` queda fijo en `"nayin"` porque `PilaresTabs` aún no está montado, sin efecto visible: `.pane`/`.paneOn` no tienen ninguna regla CSS todavía, así que las 7 secciones se siguen viendo apiladas, igual que hoy).

- [ ] **Step 6: CSS** — en `pilares.module.css`, agrega esto justo después de la regla que agregó la Task 1 (`.col:not([data-pro]) .god, .hidden { display: none; }`), todavía antes del `@media`:

```css
/* ProLamina completa (R4b-3, spec §7 — segundo de los DOS lugares con
   {pro && ...}): mismo mecanismo. El override "siempre visible" en desktop
   llega en Task 4. */
.lamina:not([data-pro]) { display: none; }
```

- [ ] **Step 7: Gate** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Verde. Suite: 183 → **185** (2 nuevos).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/\(app\)/pilares/pro-lamina.tsx \
        apps/web/app/\(app\)/pilares/__tests__/pro-lamina.test.tsx \
        apps/web/app/\(app\)/pilares/pilares-view.tsx \
        apps/web/app/\(app\)/pilares/pilares.module.css
git commit -m "feat(r4b3): ProLamina — prop pro/tab, render-siempre + data-pro, panes por sección"
```

---

### Task 4: Split desktop 8fr/12fr — sticky de pilares, controles globales arriba, tabs verticales + lámina en la columna de lectura

**Contexto de la decisión (léelo antes de tocar código):** el spec (§4.2, §7) dice que el switch de escritura y "Modo Pro como concepto" se quedan **arriba del split, a todo el ancho**, y que el toggle de Modo Pro se **oculta** en desktop (el contenido Pro queda permanentemente accesible vía las tabs — mismo cambio que carta en R4a). Esto implica que `scriptRow` (hoy condicionado a `{pro && ...}`, visible solo si el usuario prendió el toggle) necesita el MISMO tratamiento render-siempre + `data-pro` que la grilla y la lámina: si no migrara, en desktop quedaría inalcanzable para siempre (el botón que lo revela desaparece y nunca podría volver a activarse). El spec solo nombra "DOS lugares" (grilla y ProLamina) porque agrupa `scriptRow` conceptualmente junto a "la grilla de pilares" (está physically pegado a ella y afecta directamente cómo se leen sus caracteres) — este plan trata `scriptRow` con el mismo mecanismo por esa razón, no como un tercer lugar nuevo. `proHint` (el texto explicativo del toggle) NO recibe este tratamiento — se oculta lisa y llanamente en desktop junto con el toggle (no tiene sentido explicar un botón que no está), sin `data-pro`.

**Files:**
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx` (import de `PilaresTabs`, reestructura del JSX de retorno dentro de la rama "listo")
- Modify: `apps/web/app/(app)/pilares/pilares.module.css` (reemplaza el `@media` stopgap de 760px por el layout completo)

**Interfaces:**
- Consumes: `PilaresTabs`/`PilaresTab` de `./pilares-tabs` (Task 2); `PillarColumn` (Task 1); `ProLamina` con `pro`/`tab` (Task 3).
- No agrega componentes nuevos — es reestructuración de JSX + CSS sobre lo ya construido.

- [ ] **Step 1: Import** — en `pilares-view.tsx`, agrega junto a los demás imports locales:

```tsx
import { PilaresTabs } from "./pilares-tabs";
```

(ya existe `import { type PilaresTab } from "./pilares-tabs";` de la Task 3 — déjalo, o combínalo en una sola línea: `import { PilaresTabs, type PilaresTab } from "./pilares-tabs";`).

- [ ] **Step 2: Reestructurar el JSX de retorno** — reemplaza el bloque completo desde `{error ? (` hasta el `)}` que lo cierra (la rama "lista", hoy un fragmento `<>...</>`) por:

```tsx
      {error ? (
        <p className={styles.note}>{t("pilares.error")}</p>
      ) : !data ? (
        <p className={styles.note}>{t("pilares.loading")}</p>
      ) : (
        <div className={styles.deskCols}>
          <div className={styles.pillarsCol}>
            <div className={styles.grid}>
              {pillars.map(({ key, pillar }, i) => {
                if (!pillar) {
                  return (
                    <div key={key} className={styles.col}>
                      <span className={styles.colLabel}>{t(`pilares.${key}`)}</span>
                      <span className={styles.empty}>—</span>
                    </div>
                  );
                }
                const isDay = key === "day";
                return (
                  <PillarColumn
                    key={key}
                    posKey={key}
                    pillar={pillar}
                    isDay={isDay}
                    dayMaster={data.day.stem}
                    pro={pro}
                    script={script}
                    index={i}
                  />
                );
              })}
            </div>
          </div>

          <div className={styles.controlsGlobal}>
            <button
              type="button"
              className={styles.proToggle}
              onClick={() => setPro((v) => !v)}
              aria-pressed={pro}
            >
              <span className={styles.proDot} data-on={pro || undefined} />
              {t("pilares.modePro")}
            </button>
            {pro && <p className={styles.proHint}>{t("pilares.modeProHint")}</p>}
            <div
              className={styles.scriptRow}
              data-pro={pro || undefined}
              role="tablist"
              aria-label="Ba Zi / Saju"
            >
              {(["hanzi", "hangul"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={script === s}
                  className={`chip--control chip--control-outline ${script === s ? "chip--control-on" : ""}`}
                  onClick={() => setScript(s)}
                >
                  {t(s === "hanzi" ? "pilares.scriptBazi" : "pilares.scriptSaju")}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.readCol}>
            {!data.timeKnown && <p className={styles.note}>{t("pilares.noTime")}</p>}

            <h2 className={styles.section}>{t("pilares.balance")}</h2>
            <div className={styles.balance}>
              {ELEMENTS.map((el) => (
                <div key={el} className={styles.elRow}>
                  <span className={styles.elName}>{t(`pilares.${ELEMENT_KEY[el]}`)}</span>
                  <span className={styles.elTrack}>
                    <span
                      className={`${styles.elBar} ${styles[`elBg_${el}`] ?? ""}`}
                      style={{ width: `${((counts[el] ?? 0) / totalEls) * 100}%` }}
                    />
                  </span>
                  <span className={styles.elCount}>{counts[el] ?? 0}</span>
                </div>
              ))}
            </div>

            <div className={styles.tabsRow}>
              <PilaresTabs active={tab} onSelect={setTab} />
              <ProLamina data={data} script={script} pro={pro} tab={tab} />
            </div>
          </div>
        </div>
      )}
```

⚠️ **Nota de orden:** `pillarsCol` (grilla) sigue siendo el PRIMER hijo de `.deskCols` en el JSX, `controlsGlobal` el segundo y `readCol` el tercero — EXACTAMENTE el mismo orden relativo que hoy (grilla → controles → resto). No se mueve nada de sitio; el CSS de Task 4/Step 3 es lo que visualmente promueve `controlsGlobal` a la fila de arriba en desktop vía `grid-row` explícito — en móvil (`display:contents`), los 3 bloques fluyen en ESTE MISMO orden de código, así que el DOM visible es idéntico a hoy.

- [ ] **Step 3: CSS — reemplazar el `@media` stopgap** — en `pilares.module.css`, primero agrega esto **antes** del `@media` (después de la regla `.lamina:not([data-pro])` que agregó la Task 3):

```css
/* Switch de escritura (R4b-3, spec §4.2/§7): promovido a "control global" en
   desktop — arriba del split, siempre accesible, porque el toggle de Modo
   Pro desaparece ahí (ver nota de decisión al inicio de esta tarea). Mismo
   mecanismo render-siempre + data-pro que .col/.lamina arriba. En móvil el
   comportamiento visual NO cambia (oculto salvo Modo Pro, igual que hoy). */
.scriptRow:not([data-pro]) { display: none; }

.deskCols { display: contents; }
```

Después, **reemplaza por completo** el `@media (min-width: 1080px) { ... }` existente (el que solo tiene `.wrap { max-width: 760px; ... }`) por:

```css
@media (min-width: 1080px) { /* bp desktop R4a */
  .wrap { padding-bottom: var(--sp-7); } /* sin bottom-nav en desktop, paridad con carta/hoy */

  .deskCols {
    display: grid;
    grid-template-columns: 8fr 12fr; /* spec R4b-3 §4.2: grilla compacta izq / lámina densa der */
    grid-template-rows: auto auto;
    gap: var(--sp-6);
    align-items: start;
  }
  .controlsGlobal {
    grid-column: 1 / -1; grid-row: 1;
    display: flex; align-items: center; gap: var(--sp-4); flex-wrap: wrap;
  }
  .controlsGlobal .scriptRow { margin-top: 0; }
  .pillarsCol { grid-column: 1; grid-row: 2; position: sticky; top: 84px; /* header 66px + respiro, mismo valor que carta */ }
  .readCol { grid-column: 2; grid-row: 2; display: flex; flex-direction: column; gap: var(--sp-4); }

  /* el toggle sobra: en desktop el contenido Pro es siempre accesible vía tabs */
  .proToggle, .proHint { display: none; }

  /* los DOS lugares del spec §7 + el switch de escritura: visibles siempre */
  .col:not([data-pro]) .god,
  .col:not([data-pro]) .hidden { display: flex; }
  .scriptRow:not([data-pro]) { display: flex; }
  .lamina:not([data-pro]) { display: grid; }

  /* fila: riel de tabs verticales + lámina */
  .tabsRow { display: flex; gap: var(--sp-4); align-items: start; }
  .vtabs {
    flex: 0 0 168px; /* riel de navegación, punto de partida — a calibrar contra el contenido real (mismo criterio que R2/spec §7) */
    display: flex; flex-direction: column; gap: var(--sp-1);
    border-right: 1px solid rgba(var(--acc-rgb), 0.16);
    padding-right: var(--sp-3);
  }
  .vtab {
    position: relative; text-align: left; padding: var(--sp-2) var(--sp-3);
    background: none; border: 0; cursor: pointer;
    color: var(--soft); font-family: var(--font-ui); font-size: var(--text-sm); font-weight: 600;
  }
  .vtab:hover { color: var(--ink); }
  .vtab[data-on] { color: var(--ink); }
  .vtab[data-on]::before {
    content: ""; position: absolute; left: -1px; top: var(--sp-1); bottom: var(--sp-1); width: 2px;
    background: linear-gradient(180deg, transparent, var(--acc), transparent);
    box-shadow: 0 0 14px rgba(var(--acc-rgb), 0.55);
  }
  .lamina { flex: 1; max-width: none; margin-top: 0; }

  /* panes: en desktop solo se ve la sección del tab activo; en móvil (fuera
     del media) todas se ven apiladas, igual que hoy. */
  .readCol .pane { display: none; }
  .readCol .paneOn { display: block; }
}
```

- [ ] **Step 4: Gate completo** — `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Verde. Suite: **185** (sin tests nuevos en esta tarea — es reestructuración de JSX/CSS sobre unidades ya testeadas en las Tasks 1-3; ver "Convención de tests" en Global Constraints sobre por qué `PilaresView` no tiene test propio). Si `tsc` marca algún prop faltante o mal tipado, es la señal de una firma inconsistente entre esta tarea y las anteriores — revisar contra las Interfaces de cada Task.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/pilares/pilares-view.tsx apps/web/app/\(app\)/pilares/pilares.module.css
git commit -m "feat(r4b3): pilares en desktop — split 8fr/12fr sticky, controles globales arriba, tabs verticales"
```

---

## Self-Review

1. **Cobertura del spec (§4.2 y §7):**
   - Ratio 8fr/12fr ✓ (Task 4, `.deskCols`).
   - Izquierda sticky `top:84px`, SOLO la grilla ✓ (Task 4, `.pillarsCol` — el `!data.timeKnown` note y el balance NO están ahí, van a `.readCol`, respetando el "SOLO" del spec).
   - Switch de escritura + "Modo Pro como concepto" arriba del split, a todo el ancho ✓ (Task 4, `.controlsGlobal`, `grid-column:1/-1; grid-row:1`).
   - Derecha: balance + tabs verticales + 7 secciones de ProLamina ✓ (Task 4, `.readCol` → `.tabsRow` → `PilaresTabs` + `ProLamina`).
   - Modo Pro en desktop: toggle oculto, contenido siempre accesible ✓ (Task 4, `.proToggle,.proHint{display:none}` + los 3 overrides `:not([data-pro]){display:...}`).
   - Los DOS lugares con `{pro && ...}` (grilla y ProLamina) migrados a render-siempre + `data-pro` ✓ (Task 1 y Task 3, respectivamente) — más el switch de escritura, tratado explícitamente como una extensión del mismo mecanismo con su razón documentada al inicio de Task 4, no como un tercer lugar silencioso.
   - Componente de tabs verticales LOCAL, no reusa `chart-tabs.tsx` ✓ (Task 2, `pilares-tabs.tsx` es un archivo nuevo e independiente).
   - <1080px intacto ✓ (Global Constraints + nota de orden en Task 4 Step 2 — ningún wrapper nuevo tiene CSS fuera del media query, y el orden JSX de `pillarsCol`/`controlsGlobal`/`readCol` reproduce el orden actual grilla→controles→resto).
   - Gate final (tsc + tests + build + verificación real en navegador) ✓ (Task 4 Step 4 + nota del controlador abajo), mismo estilo que R4a/R4b-1.
2. **Escaneo de placeholders:** no hay "TBD"/"implementar luego"/"similar a la Task N sin código". Los únicos bloques que dicen "el resto queda igual" (Task 1 Step 5, Task 3 Step 5) son instrucciones de NO TOCAR código ya mostrado íntegro en el spec/archivo actual, con línea exacta citada — mismo patrón legítimo que usó el plan de R4a ("...EXACTO actual...").
3. **Consistencia de tipos/nombres:** `PilaresTab` se define una sola vez (Task 2, `pilares-tabs.tsx`) y se importa igual en `pro-lamina.tsx` (Task 3) y `pilares-view.tsx` (Task 3/4) — nunca redeclarado. `PillarColumn` recibe `pro: boolean; script: "hanzi" | "hangul"` en Task 1 y se invoca con esos mismos nombres de prop en Task 1 y Task 4 (dos sitios, mismo shape). `GOD_KEY` vive solo en `pillar-column.tsx`, exportado, reusado por su test — no se duplica en `pilares-view.tsx` (que lo borra en Task 1) ni en `pro-lamina.tsx` (que ya tenía su propia copia local, sin tocar, correcto porque son dos consumidores independientes del mismo mapa i18n, igual que ya pasaba con `godName`/`GOD_KEY` en `carta` vs `pilares` antes de este plan — no es una regresión, es el estado preexistente).
4. **Riesgo/duda dejada abierta (para el ejecutor y para Gio):** la decisión de migrar `scriptRow` junto con la grilla (en vez de dejarlo puramente `{pro && ...}` como hoy) es una interpretación de este plan, no una instrucción literal del spec (que solo cuenta "dos lugares") — está documentada con su razonamiento completo al inicio de Task 4 para que el ejecutor y el reviewer la puedan auditar; si Gio prefiere que el switch de escritura NO sea alcanzable en desktop sin pro, Task 4/Step 3 se simplifica quitando la regla `.scriptRow:not([data-pro])` y sus dos overrides. El ancho del riel de tabs (168px) y el ratio 8fr/12fr son puntos de partida citados del spec — a calibrar contra contenido real (nombres largos en EN, décadas de Suerte) en la verificación de navegador, mismo criterio que R2.

**Verificación del controlador (Fase 5 de build-fable-g, NO es tarea del plan):** navegador real a ≥1080px en `/pilares` — grilla de 4 pilares sticky a la izquierda (con badges de Dios y troncos ocultos siempre visibles, sin togglear nada), controles (switch 漢字/한글) arriba del split a todo el ancho y funcionando, columna derecha con balance + 7 tabs verticales conmutando el pane correcto de `ProLamina` (Na Yin/Fuerza/Favorables/Suerte con scroll de décadas/Etapas/Interacciones/Estrellas), sin botón de Modo Pro visible. Y a <1080px — TODO idéntico a hoy: grilla, luego proToggle, y con Modo Pro apagado el switch de escritura y las 7 secciones de la lámina deben seguir ocultos; al prender el toggle, badges/troncos ocultos/switch/lámina deben aparecer exactamente como antes de este plan. Después: review whole-branch + merge.
