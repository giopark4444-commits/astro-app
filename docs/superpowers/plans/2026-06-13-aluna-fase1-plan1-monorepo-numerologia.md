# Aluna · Fase 1 · Plan 1 — Monorepo + Motor de Numerología (`@aluna/core`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar el monorepo de Aluna y construir, con TDD, el paquete compartido `@aluna/core` con el **motor de numerología pitagórica completo** (núcleo, ciclos, kármicos, tabla de inclusión, con reducción paso a paso) — software que funciona y se prueba por sí solo.

**Architecture:** Monorepo pnpm + Turborepo. Un paquete `packages/core` (`@aluna/core`) isomórfico (sin dependencias nativas ni de red) que contiene tipos, constantes y la lógica de numerología pura. Los planes siguientes añaden el servicio de efemérides, Supabase, web y móvil sobre esta misma base. El cálculo es puro y determinista, validado contra valores calculados a mano (incluida la fecha real de Gio, 1984-02-05 → Camino de Vida 11).

**Tech Stack:** TypeScript (strict), Node 20+, pnpm workspaces, Turborepo, Vitest, ESLint + Prettier.

> **Nota de alcance — este es el Plan 1 de una serie para la Fase 1:**
> 1. **Monorepo + `@aluna/core` numerología** ← *este plan*
> 2. Servicio de efemérides (`@aluna/ephemeris`, Swiss Ephemeris vía `sweph`, carta natal precisa)
> 3. Supabase: esquema, RLS, auth, caché de cartas
> 4. Cliente web (Next.js PWA): onboarding, rueda, Modo Pro, temas
> 5. Cliente móvil (Expo) sobre el mismo backend
> 6. Biblioteca de interpretaciones (pipeline de contenido ES/EN)
>
> Cada uno produce software que funciona y se prueba solo. **El paquete se llama `@aluna/core`** (el spec lo nombraba `@astro/core`; se renombra a la marca).

---

## Estructura de archivos (se crea en este plan)

```
aluna/                              # raíz del monorepo (= ~/astro-app)
├── package.json                    # raíz: scripts, workspaces, devDeps
├── pnpm-workspace.yaml             # declara packages/* y apps/*
├── turbo.json                      # pipeline de build/test/lint
├── tsconfig.base.json              # config TS compartida (strict)
├── .eslintrc.cjs                   # lint compartido
├── .prettierrc.json                # formato
├── .gitignore                      # (ya existe; se amplía)
└── packages/
    └── core/                       # @aluna/core
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        └── src/
            ├── index.ts                        # API pública del paquete
            ├── constants/
            │   └── astrology.ts                # signos, planetas, aspectos, dignidades
            └── numerology/
                ├── types.ts                    # tipos del resultado numerológico
                ├── reduction.ts                # digitsSum, reduceNumber, reducción con kármico
                ├── name.ts                     # mapa pitagórico letra→número, vocales/consonantes
                ├── core-numbers.ts             # Camino de Vida, Expresión, Alma, Personalidad, Día, Madurez
                ├── cycles.ts                   # Año/Mes/Día personal, Pináculos+edades, Desafíos
                ├── karmic.ts                   # deudas, lecciones, tabla de inclusión, pasión oculta
                ├── compute.ts                  # computeNumerology() ensambla todo
                └── __tests__/
                    ├── reduction.test.ts
                    ├── name.test.ts
                    ├── core-numbers.test.ts
                    ├── cycles.test.ts
                    ├── karmic.test.ts
                    └── compute.test.ts
```

**Convención de método numerológico (documentada, para que sea defendible ante un numerólogo):**
- **Reducción:** sumar dígitos hasta 1–9, **preservando números maestros 11/22/33** cuando se pide.
- **Camino de Vida:** se reduce **cada componente** (mes, día, año) a un dígito (sin preservar maestros en el componente), se suman y se reduce el total **preservando maestros**. Para 1984-02-05: mes 02→2, día 05→5, año 1984→22→4 ⇒ 2+5+4 = 11 (maestro). Coincide con el mock.
- **Número del Día (Birthday):** el día reducido **preservando maestros** (día 29 → 11).
- **Vocales/consonantes:** vocales = A E I O U; **Y es vocal** cuando no está junto a otra vocal (letras adyacentes consonantes o borde de palabra), si no, consonante. Regla explícita y testeada.

---

## Task 1: Scaffold del monorepo (pnpm + Turborepo + TS)

**Files:**
- Create: `package.json` (raíz)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`

- [ ] **Step 1: Verificar herramientas y versión de Node**

Run: `node -v && corepack --version`
Expected: Node v20+ y corepack disponible. Si pnpm no está: `corepack enable`.

- [ ] **Step 2: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "services/*"
```

- [ ] **Step 3: Crear `package.json` en la raíz**

```json
{
  "name": "aluna",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.7.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^7.16.0",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "prettier": "^3.3.0"
  }
}
```

- [ ] **Step 4: Crear `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "test": {},
    "lint": {},
    "typecheck": {}
  }
}
```

> **Patrón "internal package":** `@aluna/core` se consume como **fuente TypeScript** (sin paso de
> build ni `dist`). Vitest corre los tests sobre el fuente; los planes de web (Next.js,
> `transpilePackages`) y móvil (Expo) transpilan el paquete al compilar. El servicio de efemérides
> (Plan 2) lo correrá con `tsx`/bundler. Esto evita el problema de extensiones `.js` en ESM al
> emitir con `tsc`. Si más adelante hace falta publicar el paquete, se añade `tsup` en su momento.

- [ ] **Step 5: Crear `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 6: Ampliar `.gitignore`**

Añadir al final del `.gitignore` existente:

```
# build / deps
node_modules/
dist/
.turbo/
*.tsbuildinfo
coverage/
```

- [ ] **Step 7: Instalar dependencias raíz**

Run: `pnpm install`
Expected: pnpm crea `pnpm-lock.yaml` y `node_modules` sin errores.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold monorepo (pnpm + turborepo + ts strict)"
```

---

## Task 2: Crear el paquete `@aluna/core` (esqueleto)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `.eslintrc.cjs`, `.prettierrc.json`

- [ ] **Step 1: Crear `packages/core/package.json`**

```json
{
  "name": "@aluna/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": { "typescript": "^5.5.0", "vitest": "^2.0.0" }
}
```

- [ ] **Step 2: Crear `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**"]
}
```

- [ ] **Step 3: Crear `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/__tests__/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Crear `packages/core/src/index.ts` (placeholder de API)**

```ts
export const ALUNA_CORE_VERSION = "0.0.0";
```

- [ ] **Step 5: Crear `.eslintrc.cjs` en la raíz**

```cjs
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  env: { node: true, es2022: true },
  ignorePatterns: ["dist", "node_modules", "*.config.ts"],
};
```

- [ ] **Step 6: Crear `.prettierrc.json` en la raíz**

```json
{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 7: Instalar y verificar typecheck del paquete**

Run: `pnpm install && pnpm --filter @aluna/core typecheck`
Expected: sin errores de tipos (el paquete se consume como fuente; no hay `dist`).

- [ ] **Step 8: Commit**

```bash
git add packages/core .eslintrc.cjs .prettierrc.json pnpm-lock.yaml
git commit -m "chore(core): scaffold @aluna/core package"
```

---

## Task 3: Constantes astrológicas (`constants/astrology.ts`)

> Se incluyen aquí (no en un plan posterior) porque son datos puros compartidos y el render/validación de la carta los necesitará; ahora dejan la base lista y testeada.

**Files:**
- Create: `packages/core/src/constants/astrology.ts`
- Test: `packages/core/src/constants/__tests__/astrology.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/constants/__tests__/astrology.test.ts
import { describe, it, expect } from "vitest";
import { ZODIAC_SIGNS, PLANETS, ASPECTS, DEFAULT_ORBS } from "../astrology";

describe("astrology constants", () => {
  it("tiene 12 signos en orden tropical empezando por Aries", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    expect(ZODIAC_SIGNS[0]).toMatchObject({ key: "aries", element: "fire", modality: "cardinal" });
    expect(ZODIAC_SIGNS[11]).toMatchObject({ key: "pisces", element: "water" });
  });

  it("incluye los 14 puntos requeridos por la voz (10 planetas + Quirón, Nodos, Lilith)", () => {
    const keys = PLANETS.map((p) => p.key);
    for (const k of ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron","north_node","lilith"]) {
      expect(keys).toContain(k);
    }
  });

  it("define los aspectos mayores con su ángulo", () => {
    const conj = ASPECTS.find((a) => a.key === "conjunction");
    expect(conj).toMatchObject({ angle: 0, harmony: "neutral" });
    expect(ASPECTS.find((a) => a.key === "trine")).toMatchObject({ angle: 120, harmony: "soft" });
    expect(ASPECTS.find((a) => a.key === "square")).toMatchObject({ angle: 90, harmony: "hard" });
  });

  it("tiene orbe por defecto para los aspectos mayores", () => {
    expect(DEFAULT_ORBS.conjunction).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test`
Expected: FAIL — "Cannot find module '../astrology'".

- [ ] **Step 3: Implementar `constants/astrology.ts`**

```ts
// packages/core/src/constants/astrology.ts
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";
export type Polarity = "yang" | "yin";

export interface SignDef {
  key: string;
  element: Element;
  modality: Modality;
  polarity: Polarity;
  glyph: string;
}

export const ZODIAC_SIGNS: readonly SignDef[] = [
  { key: "aries", element: "fire", modality: "cardinal", polarity: "yang", glyph: "♈" },
  { key: "taurus", element: "earth", modality: "fixed", polarity: "yin", glyph: "♉" },
  { key: "gemini", element: "air", modality: "mutable", polarity: "yang", glyph: "♊" },
  { key: "cancer", element: "water", modality: "cardinal", polarity: "yin", glyph: "♋" },
  { key: "leo", element: "fire", modality: "fixed", polarity: "yang", glyph: "♌" },
  { key: "virgo", element: "earth", modality: "mutable", polarity: "yin", glyph: "♍" },
  { key: "libra", element: "air", modality: "cardinal", polarity: "yang", glyph: "♎" },
  { key: "scorpio", element: "water", modality: "fixed", polarity: "yin", glyph: "♏" },
  { key: "sagittarius", element: "fire", modality: "mutable", polarity: "yang", glyph: "♐" },
  { key: "capricorn", element: "earth", modality: "cardinal", polarity: "yin", glyph: "♑" },
  { key: "aquarius", element: "air", modality: "fixed", polarity: "yang", glyph: "♒" },
  { key: "pisces", element: "water", modality: "mutable", polarity: "yin", glyph: "♓" },
] as const;

export interface PlanetDef {
  key: string;
  glyph: string;
  /** dignidades por signo: domicilio/exaltación/exilio/caída */
  domicile?: string[];
  exaltation?: string[];
}

export const PLANETS: readonly PlanetDef[] = [
  { key: "sun", glyph: "☉", domicile: ["leo"], exaltation: ["aries"] },
  { key: "moon", glyph: "☽", domicile: ["cancer"], exaltation: ["taurus"] },
  { key: "mercury", glyph: "☿", domicile: ["gemini", "virgo"], exaltation: ["virgo"] },
  { key: "venus", glyph: "♀", domicile: ["taurus", "libra"], exaltation: ["pisces"] },
  { key: "mars", glyph: "♂", domicile: ["aries", "scorpio"], exaltation: ["capricorn"] },
  { key: "jupiter", glyph: "♃", domicile: ["sagittarius", "pisces"], exaltation: ["cancer"] },
  { key: "saturn", glyph: "♄", domicile: ["capricorn", "aquarius"], exaltation: ["libra"] },
  { key: "uranus", glyph: "♅", domicile: ["aquarius"] },
  { key: "neptune", glyph: "♆", domicile: ["pisces"] },
  { key: "pluto", glyph: "♇", domicile: ["scorpio"] },
  { key: "chiron", glyph: "⚷" },
  { key: "north_node", glyph: "☊" },
  { key: "south_node", glyph: "☋" },
  { key: "lilith", glyph: "⚸" },
] as const;

export type AspectHarmony = "hard" | "soft" | "neutral";

export interface AspectDef {
  key: string;
  angle: number;
  harmony: AspectHarmony;
  major: boolean;
}

export const ASPECTS: readonly AspectDef[] = [
  { key: "conjunction", angle: 0, harmony: "neutral", major: true },
  { key: "sextile", angle: 60, harmony: "soft", major: true },
  { key: "square", angle: 90, harmony: "hard", major: true },
  { key: "trine", angle: 120, harmony: "soft", major: true },
  { key: "opposition", angle: 180, harmony: "hard", major: true },
  { key: "semisextile", angle: 30, harmony: "neutral", major: false },
  { key: "semisquare", angle: 45, harmony: "hard", major: false },
  { key: "sesquisquare", angle: 135, harmony: "hard", major: false },
  { key: "quincunx", angle: 150, harmony: "neutral", major: false },
  { key: "quintile", angle: 72, harmony: "soft", major: false },
] as const;

export const DEFAULT_ORBS: Readonly<Record<string, number>> = {
  conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 6,
  semisextile: 2, semisquare: 2, sesquisquare: 2, quincunx: 3, quintile: 1.5,
};
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @aluna/core test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/constants
git commit -m "feat(core): astrology constants (signs, planets, aspects, orbs)"
```

---

## Task 4: Tipos de numerología (`numerology/types.ts`)

**Files:**
- Create: `packages/core/src/numerology/types.ts`

- [ ] **Step 1: Crear `numerology/types.ts`** (no necesita test propio; lo validan los tests de cálculo)

```ts
// packages/core/src/numerology/types.ts

/** Fecha de nacimiento desestructurada (sin zona horaria; la numerología usa la fecha civil). */
export interface BirthDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Un paso de la reducción, para mostrar el cálculo (feature "reducción mostrada"). */
export interface ReductionTrace {
  steps: number[]; // p.ej. [29, 11] o [1984, 22, 4]
  value: number; // resultado final
  isMaster: boolean;
  karmicDebt?: 13 | 14 | 16 | 19; // si apareció en el camino
}

export interface CoreNumbers {
  lifePath: ReductionTrace;
  expression: ReductionTrace; // Destino
  soulUrge: ReductionTrace; // Alma
  personality: ReductionTrace;
  birthday: ReductionTrace; // Día
  maturity: ReductionTrace;
}

export interface Pinnacle {
  value: number;
  isMaster: boolean;
  startAge: number;
  endAge: number | null; // null = "en adelante"
}

export interface Challenge {
  value: number;
  startAge: number;
  endAge: number | null;
}

export interface PersonalCycles {
  personalYear: ReductionTrace;
  personalMonth: ReductionTrace;
  personalDay: ReductionTrace;
}

export interface KarmicProfile {
  /** lecciones kármicas: dígitos 1-9 ausentes en el nombre */
  lessons: number[];
  /** deudas kármicas detectadas (13/14/16/19) en los números núcleo */
  debts: Array<14 | 13 | 16 | 19>;
  /** tabla de inclusión: cuántas veces aparece cada dígito 1-9 en el nombre */
  inclusion: Record<number, number>;
  /** pasión oculta: el/los dígitos más frecuentes en el nombre */
  hiddenPassion: number[];
}

export interface NumerologyResult {
  core: CoreNumbers;
  cycles: PersonalCycles;
  pinnacles: Pinnacle[];
  challenges: Challenge[];
  karmic: KarmicProfile;
}

export interface NumerologyInput {
  fullName: string;
  birthDate: BirthDate;
  /** fecha de referencia para los ciclos personales (por defecto hoy) */
  asOf?: BirthDate;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aluna/core typecheck`
Expected: PASS (sin errores de tipos).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/numerology/types.ts
git commit -m "feat(core): numerology result types"
```

---

## Task 5: Reducción de dígitos y maestros (`numerology/reduction.ts`)

**Files:**
- Create: `packages/core/src/numerology/reduction.ts`
- Test: `packages/core/src/numerology/__tests__/reduction.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/numerology/__tests__/reduction.test.ts
import { describe, it, expect } from "vitest";
import { digitsSum, reduce, reduceWithTrace } from "../reduction";

describe("digitsSum", () => {
  it("suma los dígitos de un número", () => {
    expect(digitsSum(1984)).toBe(22);
    expect(digitsSum(29)).toBe(11);
  });
});

describe("reduce", () => {
  it("reduce a un solo dígito cuando no se preservan maestros", () => {
    expect(reduce(1984, { preserveMasters: false })).toBe(4); // 1984->22->4
    expect(reduce(29, { preserveMasters: false })).toBe(2); // 29->11->2
  });
  it("preserva números maestros 11/22/33 por defecto", () => {
    expect(reduce(29)).toBe(11); // 29->11 (maestro, no sigue)
    expect(reduce(1984)).toBe(22); // 1984->22 (maestro)
    expect(reduce(48)).toBe(3); // 48->12->3 (sin maestro)
  });
});

describe("reduceWithTrace", () => {
  it("registra cada paso y marca maestro", () => {
    const t = reduceWithTrace(29);
    expect(t.steps).toEqual([29, 11]);
    expect(t.value).toBe(11);
    expect(t.isMaster).toBe(true);
  });
  it("detecta deuda kármica cuando aparece 13/14/16/19 en el camino", () => {
    const t = reduceWithTrace(13, { preserveMasters: false });
    expect(t.karmicDebt).toBe(13);
    expect(t.value).toBe(4);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test reduction`
Expected: FAIL — "Cannot find module '../reduction'".

- [ ] **Step 3: Implementar `numerology/reduction.ts`**

```ts
// packages/core/src/numerology/reduction.ts
import type { ReductionTrace } from "./types";

export const MASTER_NUMBERS: readonly number[] = [11, 22, 33];
export const KARMIC_DEBTS: readonly number[] = [13, 14, 16, 19];

export function digitsSum(n: number): number {
  return Math.abs(Math.trunc(n))
    .toString()
    .split("")
    .reduce((acc, d) => acc + Number(d), 0);
}

export interface ReduceOptions {
  preserveMasters?: boolean;
}

/** Reduce a 1..9 (o a un maestro 11/22/33 si preserveMasters). */
export function reduce(n: number, opts: ReduceOptions = {}): number {
  const preserve = opts.preserveMasters ?? true;
  let current = Math.abs(Math.trunc(n));
  while (current > 9) {
    if (preserve && MASTER_NUMBERS.includes(current)) return current;
    current = digitsSum(current);
  }
  return current;
}

/** Como `reduce` pero registrando los pasos y la deuda kármica del camino. */
export function reduceWithTrace(n: number, opts: ReduceOptions = {}): ReductionTrace {
  const preserve = opts.preserveMasters ?? true;
  let current = Math.abs(Math.trunc(n));
  const steps: number[] = [current];
  let karmicDebt: ReductionTrace["karmicDebt"];
  while (current > 9) {
    if (KARMIC_DEBTS.includes(current)) karmicDebt = current as ReductionTrace["karmicDebt"];
    if (preserve && MASTER_NUMBERS.includes(current)) break;
    current = digitsSum(current);
    steps.push(current);
  }
  return {
    steps,
    value: current,
    isMaster: MASTER_NUMBERS.includes(current),
    ...(karmicDebt ? { karmicDebt } : {}),
  };
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @aluna/core test reduction`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/numerology/reduction.ts packages/core/src/numerology/__tests__/reduction.test.ts
git commit -m "feat(core): digit reduction with master numbers and karmic-debt trace"
```

---

## Task 6: Mapa pitagórico del nombre (`numerology/name.ts`)

**Files:**
- Create: `packages/core/src/numerology/name.ts`
- Test: `packages/core/src/numerology/__tests__/name.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/numerology/__tests__/name.test.ts
import { describe, it, expect } from "vitest";
import { letterValue, normalizeName, nameLetters, splitVowelsConsonants } from "../name";

describe("letterValue", () => {
  it("mapea letras al sistema pitagórico 1-9", () => {
    expect(letterValue("A")).toBe(1);
    expect(letterValue("I")).toBe(9);
    expect(letterValue("J")).toBe(1);
    expect(letterValue("R")).toBe(9);
    expect(letterValue("Z")).toBe(8);
  });
});

describe("normalizeName", () => {
  it("mayúsculas, sin acentos, solo A-Z; Ñ->N", () => {
    expect(normalizeName("José Muñoz")).toBe("JOSEMUNOZ");
    expect(nameLetters("José Muñoz")).toEqual(["J","O","S","E","M","U","N","O","Z"]);
  });
});

describe("splitVowelsConsonants", () => {
  it("separa vocales y consonantes", () => {
    const { vowels, consonants } = splitVowelsConsonants("JOHN");
    expect(vowels).toEqual(["O"]);
    expect(consonants).toEqual(["J", "H", "N"]);
  });
  it("trata Y como vocal cuando está rodeada de consonantes", () => {
    // EN "GARY": ...R-Y(borde) -> Y vocal
    const { vowels } = splitVowelsConsonants("GARY");
    expect(vowels).toEqual(["A", "Y"]);
  });
  it("trata Y como consonante cuando está junto a una vocal", () => {
    // "YARA": Y-A -> Y consonante
    const { vowels, consonants } = splitVowelsConsonants("YARA");
    expect(consonants).toContain("Y");
    expect(vowels).toEqual(["A", "A"]);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test name`
Expected: FAIL — "Cannot find module '../name'".

- [ ] **Step 3: Implementar `numerology/name.ts`**

```ts
// packages/core/src/numerology/name.ts
const HARD_VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** Valor pitagórico 1-9 de una letra A-Z. */
export function letterValue(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0);
  if (code < 65 || code > 90) return 0;
  return ((code - 65) % 9) + 1;
}

/** Mayúsculas, quita acentos (Ñ->N), conserva solo A-Z. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita marcas diacríticas combinantes (acentos, ~)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function nameLetters(name: string): string[] {
  return normalizeName(name).split("");
}

/** Y es vocal si las letras adyacentes NO son vocales duras (o son borde). */
function isYVowel(letters: string[], i: number): boolean {
  const prev = letters[i - 1];
  const next = letters[i + 1];
  const prevVowel = prev ? HARD_VOWELS.has(prev) : false;
  const nextVowel = next ? HARD_VOWELS.has(next) : false;
  return !prevVowel && !nextVowel;
}

export function splitVowelsConsonants(name: string): { vowels: string[]; consonants: string[] } {
  const letters = nameLetters(name);
  const vowels: string[] = [];
  const consonants: string[] = [];
  letters.forEach((ch, i) => {
    const isVowel = HARD_VOWELS.has(ch) || (ch === "Y" && isYVowel(letters, i));
    (isVowel ? vowels : consonants).push(ch);
  });
  return { vowels, consonants };
}

export function sumLetters(letters: string[]): number {
  return letters.reduce((acc, ch) => acc + letterValue(ch), 0);
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @aluna/core test name`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/numerology/name.ts packages/core/src/numerology/__tests__/name.test.ts
git commit -m "feat(core): pythagorean letter map + vowel/consonant split (Y rule)"
```

---

## Task 7: Números núcleo (`numerology/core-numbers.ts`)

**Files:**
- Create: `packages/core/src/numerology/core-numbers.ts`
- Test: `packages/core/src/numerology/__tests__/core-numbers.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/numerology/__tests__/core-numbers.test.ts
import { describe, it, expect } from "vitest";
import { lifePath, expression, soulUrge, personality, birthday, maturity } from "../core-numbers";

const GIO = { year: 1984, month: 2, day: 5 };

describe("lifePath", () => {
  it("Gio 1984-02-05 -> maestro 11", () => {
    const lp = lifePath(GIO);
    expect(lp.value).toBe(11);
    expect(lp.isMaster).toBe(true);
  });
  it("1990-01-01 -> 3 (no maestro)", () => {
    expect(lifePath({ year: 1990, month: 1, day: 1 }).value).toBe(3);
  });
});

describe("name-based core numbers (JOHN)", () => {
  it("expression suma todas las letras", () => {
    expect(expression("JOHN").value).toBe(2); // J1 O6 H8 N5 = 20 -> 2
  });
  it("soulUrge suma vocales", () => {
    expect(soulUrge("JOHN").value).toBe(6); // O=6
  });
  it("personality suma consonantes", () => {
    expect(personality("JOHN").value).toBe(5); // 1+8+5=14 -> 5
  });
});

describe("birthday y maturity", () => {
  it("birthday preserva maestro (día 29)", () => {
    expect(birthday({ year: 2000, month: 1, day: 29 }).value).toBe(11);
  });
  it("maturity = lifePath + expression, reducido", () => {
    // Gio LP 11 + expression('JOHN')=2(de 20) -> 11+20? usar valores núcleo
    const m = maturity(GIO, "JOHN");
    expect(m.value).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test core-numbers`
Expected: FAIL — "Cannot find module '../core-numbers'".

- [ ] **Step 3: Implementar `numerology/core-numbers.ts`**

```ts
// packages/core/src/numerology/core-numbers.ts
import type { BirthDate, ReductionTrace } from "./types";
import { reduce, reduceWithTrace } from "./reduction";
import { splitVowelsConsonants, nameLetters, sumLetters } from "./name";

/** Camino de Vida: reduce cada componente (sin maestros), suma, reduce total (con maestros).
 *  La traza muestra los componentes y luego la cadena de reducción del total (reducción mostrada). */
export function lifePath(date: BirthDate): ReductionTrace {
  const m = reduce(date.month, { preserveMasters: false });
  const d = reduce(date.day, { preserveMasters: false });
  const y = reduce(date.year, { preserveMasters: false });
  const base = reduceWithTrace(m + d + y); // steps desde la suma; value; isMaster; karmicDebt
  return { ...base, steps: [m, d, y, ...base.steps] };
}

/** Expresión / Destino: todas las letras del nombre completo. */
export function expression(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(nameLetters(fullName)));
}

/** Alma / Anhelo: solo vocales. */
export function soulUrge(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(splitVowelsConsonants(fullName).vowels));
}

/** Personalidad: solo consonantes. */
export function personality(fullName: string): ReductionTrace {
  return reduceWithTrace(sumLetters(splitVowelsConsonants(fullName).consonants));
}

/** Día de nacimiento (preserva maestro). */
export function birthday(date: BirthDate): ReductionTrace {
  return reduceWithTrace(date.day);
}

/** Madurez: Camino de Vida + Expresión, reducido. */
export function maturity(date: BirthDate, fullName: string): ReductionTrace {
  return reduceWithTrace(lifePath(date).value + expression(fullName).value);
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @aluna/core test core-numbers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/numerology/core-numbers.ts packages/core/src/numerology/__tests__/core-numbers.test.ts
git commit -m "feat(core): core numerology numbers (life path, expression, soul, personality, birthday, maturity)"
```

---

## Task 8: Ciclos personales, pináculos y desafíos (`numerology/cycles.ts`)

**Files:**
- Create: `packages/core/src/numerology/cycles.ts`
- Test: `packages/core/src/numerology/__tests__/cycles.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/numerology/__tests__/cycles.test.ts
import { describe, it, expect } from "vitest";
import { personalCycles, pinnacles, challenges } from "../cycles";

const GIO = { year: 1984, month: 2, day: 5 };

describe("personalCycles", () => {
  it("año personal 2026 = mes(2)+día(5)+año(2026->10->1) -> 8", () => {
    const c = personalCycles(GIO, { year: 2026, month: 6, day: 13 });
    expect(c.personalYear.value).toBe(8);
  });
});

describe("pinnacles", () => {
  it("produce 4 pináculos con edades, primero termina a 36 - LP(single)", () => {
    const p = pinnacles(GIO); // LP 11 -> single 2 -> primer fin = 34
    expect(p).toHaveLength(4);
    expect(p[0]).toMatchObject({ startAge: 0, endAge: 34 });
    expect(p[1]).toMatchObject({ startAge: 35, endAge: 43 });
    expect(p[3].endAge).toBeNull();
  });
});

describe("challenges", () => {
  it("produce 4 desafíos (valores absolutos de diferencias)", () => {
    const c = challenges(GIO); // m2 d5 y(1984->4): c1=|2-5|=3, c2=|5-4|=1, c3=|3-1|=2, c4=|2-4|=2
    expect(c.map((x) => x.value)).toEqual([3, 1, 2, 2]);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test cycles`
Expected: FAIL — "Cannot find module '../cycles'".

- [ ] **Step 3: Implementar `numerology/cycles.ts`**

```ts
// packages/core/src/numerology/cycles.ts
import type { BirthDate, PersonalCycles, Pinnacle, Challenge } from "./types";
import { reduce, reduceWithTrace } from "./reduction";
import { lifePath } from "./core-numbers";

const single = (n: number) => reduce(n, { preserveMasters: false });

/** Año/Mes/Día personal respecto a una fecha de referencia (asOf). */
export function personalCycles(birth: BirthDate, asOf: BirthDate): PersonalCycles {
  const m = single(birth.month);
  const d = single(birth.day);
  const yRef = single(asOf.year);
  const personalYear = m + d + yRef;
  const personalMonth = reduce(personalYear) + single(asOf.month);
  const personalDay = reduce(personalMonth) + single(asOf.day);
  return {
    personalYear: reduceWithTrace(personalYear),
    personalMonth: reduceWithTrace(personalMonth),
    personalDay: reduceWithTrace(personalDay),
  };
}

/** 4 pináculos con sus edades. */
export function pinnacles(birth: BirthDate): Pinnacle[] {
  const m = single(birth.month);
  const d = single(birth.day);
  const y = single(birth.year);
  const p1 = reduce(m + d);
  const p2 = reduce(d + y);
  const p3 = reduce(p1 + p2);
  const p4 = reduce(m + y);
  const firstEnd = 36 - single(lifePath(birth).value);
  const make = (value: number, startAge: number, endAge: number | null): Pinnacle => ({
    value,
    isMaster: [11, 22, 33].includes(value),
    startAge,
    endAge,
  });
  return [
    make(p1, 0, firstEnd),
    make(p2, firstEnd + 1, firstEnd + 9),
    make(p3, firstEnd + 10, firstEnd + 18),
    make(p4, firstEnd + 19, null),
  ];
}

/** 4 desafíos (diferencias absolutas; sin maestros). */
export function challenges(birth: BirthDate): Challenge[] {
  const m = single(birth.month);
  const d = single(birth.day);
  const y = single(birth.year);
  const c1 = Math.abs(m - d);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);
  const firstEnd = 36 - single(lifePath(birth).value);
  return [
    { value: c1, startAge: 0, endAge: firstEnd },
    { value: c2, startAge: firstEnd + 1, endAge: firstEnd + 9 },
    { value: c3, startAge: firstEnd + 10, endAge: firstEnd + 18 },
    { value: c4, startAge: firstEnd + 19, endAge: null },
  ];
}
```

- [ ] **Step 4: Ejecutar el test + typecheck (deben pasar)**

Run: `pnpm --filter @aluna/core test cycles && pnpm --filter @aluna/core typecheck`
Expected: PASS (sin código inalcanzable ni variables sin usar).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/numerology/cycles.ts packages/core/src/numerology/__tests__/cycles.test.ts
git commit -m "feat(core): personal cycles, pinnacles with ages, and challenges"
```

---

## Task 9: Kármicos e inclusión (`numerology/karmic.ts`)

**Files:**
- Create: `packages/core/src/numerology/karmic.ts`
- Test: `packages/core/src/numerology/__tests__/karmic.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/numerology/__tests__/karmic.test.ts
import { describe, it, expect } from "vitest";
import { inclusionTable, karmicLessons, hiddenPassion } from "../karmic";

describe("inclusionTable", () => {
  it("cuenta cuántas veces aparece cada dígito 1-9 en el nombre", () => {
    // JOHN: J1 O6 H8 N5 -> {1:1,5:1,6:1,8:1}
    const inc = inclusionTable("JOHN");
    expect(inc[1]).toBe(1);
    expect(inc[5]).toBe(1);
    expect(inc[2]).toBe(0);
  });
});

describe("karmicLessons", () => {
  it("son los dígitos ausentes (cuenta 0)", () => {
    const lessons = karmicLessons("JOHN");
    expect(lessons).toContain(2);
    expect(lessons).toContain(3);
    expect(lessons).not.toContain(1);
  });
});

describe("hiddenPassion", () => {
  it("es el/los dígitos más frecuentes", () => {
    // ANNA: A1 N5 N5 A1 -> 1:2, 5:2 -> [1,5]
    expect(hiddenPassion("ANNA").sort()).toEqual([1, 5]);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test karmic`
Expected: FAIL — "Cannot find module '../karmic'".

- [ ] **Step 3: Implementar `numerology/karmic.ts`**

```ts
// packages/core/src/numerology/karmic.ts
import { nameLetters, letterValue } from "./name";

export function inclusionTable(fullName: string): Record<number, number> {
  const table: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const ch of nameLetters(fullName)) {
    const v = letterValue(ch);
    if (v >= 1 && v <= 9) table[v] = (table[v] ?? 0) + 1;
  }
  return table;
}

export function karmicLessons(fullName: string): number[] {
  const inc = inclusionTable(fullName);
  return Object.entries(inc)
    .filter(([, count]) => count === 0)
    .map(([digit]) => Number(digit));
}

export function hiddenPassion(fullName: string): number[] {
  const inc = inclusionTable(fullName);
  const max = Math.max(...Object.values(inc));
  if (max === 0) return [];
  return Object.entries(inc)
    .filter(([, count]) => count === max)
    .map(([digit]) => Number(digit));
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @aluna/core test karmic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/numerology/karmic.ts packages/core/src/numerology/__tests__/karmic.test.ts
git commit -m "feat(core): inclusion table, karmic lessons, hidden passion"
```

---

## Task 10: Ensamblar `computeNumerology()` + fixture de referencia

**Files:**
- Create: `packages/core/src/numerology/compute.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/numerology/__tests__/compute.test.ts`

- [ ] **Step 1: Escribir el test que falla (fixture de Gio, validación integral)**

```ts
// packages/core/src/numerology/__tests__/compute.test.ts
import { describe, it, expect } from "vitest";
import { computeNumerology } from "../compute";

describe("computeNumerology (fixture Gio)", () => {
  const result = computeNumerology({
    fullName: "Giovanni Andres Park",
    birthDate: { year: 1984, month: 2, day: 5 },
    asOf: { year: 2026, month: 6, day: 13 },
  });

  it("Camino de Vida es 11 (maestro) con reducción mostrada", () => {
    expect(result.core.lifePath.value).toBe(11);
    expect(result.core.lifePath.isMaster).toBe(true);
    expect(result.core.lifePath.steps.length).toBeGreaterThan(1);
  });

  it("incluye todos los números núcleo", () => {
    expect(result.core.expression.value).toBeGreaterThan(0);
    expect(result.core.soulUrge.value).toBeGreaterThan(0);
    expect(result.core.personality.value).toBeGreaterThan(0);
    expect(result.core.birthday.value).toBe(5);
    expect(result.core.maturity.value).toBeGreaterThan(0);
  });

  it("incluye 4 pináculos, 4 desafíos y la malla kármica", () => {
    expect(result.pinnacles).toHaveLength(4);
    expect(result.challenges).toHaveLength(4);
    expect(Object.keys(result.karmic.inclusion)).toHaveLength(9);
    expect(Array.isArray(result.karmic.lessons)).toBe(true);
  });

  it("calcula el año personal 2026", () => {
    expect(result.cycles.personalYear.value).toBe(8);
  });
});
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @aluna/core test compute`
Expected: FAIL — "Cannot find module '../compute'".

- [ ] **Step 3: Implementar `numerology/compute.ts`**

```ts
// packages/core/src/numerology/compute.ts
import type { NumerologyInput, NumerologyResult } from "./types";
import { lifePath, expression, soulUrge, personality, birthday, maturity } from "./core-numbers";
import { personalCycles, pinnacles, challenges } from "./cycles";
import { inclusionTable, karmicLessons, hiddenPassion } from "./karmic";

export function computeNumerology(input: NumerologyInput): NumerologyResult {
  const { fullName, birthDate } = input;
  const asOf = input.asOf ?? todayCivil();

  const core = {
    lifePath: lifePath(birthDate),
    expression: expression(fullName),
    soulUrge: soulUrge(fullName),
    personality: personality(fullName),
    birthday: birthday(birthDate),
    maturity: maturity(birthDate, fullName),
  };

  const debts = Object.values(core)
    .map((t) => t.karmicDebt)
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  return {
    core,
    cycles: personalCycles(birthDate, asOf),
    pinnacles: pinnacles(birthDate),
    challenges: challenges(birthDate),
    karmic: {
      lessons: karmicLessons(fullName),
      debts: [...new Set(debts)],
      inclusion: inclusionTable(fullName),
      hiddenPassion: hiddenPassion(fullName),
    },
  };
}

function todayCivil() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
```

- [ ] **Step 4: Exponer la API pública en `index.ts`**

Reemplazar `packages/core/src/index.ts` por:

```ts
// packages/core/src/index.ts
export const ALUNA_CORE_VERSION = "0.0.0";

// Numerología
export { computeNumerology } from "./numerology/compute";
export * from "./numerology/types";
export {
  lifePath, expression, soulUrge, personality, birthday, maturity,
} from "./numerology/core-numbers";
export { personalCycles, pinnacles, challenges } from "./numerology/cycles";
export { inclusionTable, karmicLessons, hiddenPassion } from "./numerology/karmic";
export { reduce, reduceWithTrace, digitsSum } from "./numerology/reduction";

// Constantes de astrología (para los planes 2+)
export * from "./constants/astrology";
```

- [ ] **Step 5: Ejecutar TODA la suite + typecheck**

Run: `pnpm --filter @aluna/core test && pnpm --filter @aluna/core typecheck`
Expected: PASS (todos los tests verdes, sin errores de tipos).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/numerology/compute.ts packages/core/src/index.ts packages/core/src/numerology/__tests__/compute.test.ts
git commit -m "feat(core): computeNumerology() assembling full pythagorean sheet + Gio reference fixture"
```

---

## Task 11: Verificación final del plan y push

- [ ] **Step 1: Lint de todo el monorepo**

Run: `pnpm lint`
Expected: sin errores (warnings aceptables).

- [ ] **Step 2: Suite + typecheck completos desde la raíz vía Turborepo**

Run: `pnpm test && pnpm typecheck`
Expected: `@aluna/core` PASS en ambos; Turbo cachea resultados.

- [ ] **Step 3: Push de la rama**

```bash
git push origin main
```
Expected: subido a https://github.com/giopark4444-commits/astro-app

---

## Self-review (cobertura contra el spec)

- **Numerología completa (núcleo + pináculos/desafíos con edades + año/mes/día personal + tabla de inclusión + lecciones/deudas kármicas + reducción mostrada):** Tasks 5–10. ✅ (Planos de expresión y letras de tránsito/esencia se añaden en el plan de cliente/contenido cuando se rendericen; el motor base queda listo para extenderlos.)
- **`@aluna/core` como única fuente de verdad, isomórfico, sin deps nativas:** Tasks 1–2. ✅
- **Constantes astrológicas (14 puntos, aspectos, dignidades, orbes) para los planes 2+:** Task 3. ✅
- **Reducción mostrada (feature Modo Pro de numerología):** `ReductionTrace.steps` en Task 5, usado en todo. ✅
- **Validación contra valores calculados a mano, incl. números maestros (criterio de testing del spec):** Tasks 5–10, fixture de Gio (LP 11) en Task 10. ✅
- **Fuera de alcance de ESTE plan (van en planes siguientes):** efemérides/Swiss Ephemeris (Plan 2), Supabase/RLS (Plan 3), clientes (Planes 4–5), textos de interpretación (Plan 6). Declarado en la cabecera. ✅

No se detectaron placeholders ni inconsistencias de tipos (los nombres `ReductionTrace`, `computeNumerology`, `personalCycles`, etc. coinciden entre tareas).
