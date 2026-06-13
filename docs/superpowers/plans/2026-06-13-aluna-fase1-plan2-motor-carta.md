# Aluna · Fase 1 · Plan 2 — Motor de Carta Astral (`@aluna/core` dominio + `@aluna/ephemeris`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor de **carta astral**: dado fecha/hora/lugar de nacimiento, producir una carta precisa (posiciones de 14 puntos, casas, ángulos, aspectos con orbe, dignidades, distribución y patrones), validada **al arcominuto** contra la carta real de Gio (referencia Astrodienst).

**Architecture:** Dos capas. (1) **Dominio puro** en `@aluna/core` (`astrology/`): funciones isomórficas, sin dependencias nativas, que operan sobre longitudes ya calculadas — signos/grados, dignidades, aspectos, distribución, patrones, casas. Totalmente TDD con datos sintéticos. (2) **`@aluna/ephemeris`** (paquete Node): envuelve **Swiss Ephemeris** vía `sweph` + zona horaria histórica vía `luxon`, calcula las posiciones/casas crudas y **ensambla** la carta usando las funciones puras de `@aluna/core`. Validado contra la carta de Gio.

> **Compatibilidad móvil (App Store / Play Store):** esta división NO es casual — `@aluna/core` es RN-safe (se usa en la app Expo), y `@aluna/ephemeris` (addon nativo) corre **solo en el servidor**; el móvil obtiene la carta por API. Ver "REGLA ARQUITECTÓNICA" en la sección 4 del spec. En este plan: `@aluna/core` no puede importar `node:*` ni nada nativo; `@aluna/ephemeris` sí (es servidor).

**Tech Stack:** TypeScript strict, Vitest, `sweph` (Swiss Ephemeris 2.10 binding), `luxon` (IANA tz histórica), archivos de efemérides `.se1` (DE431, rango 1800–2400).

---

## ⚖️ DECISIÓN/RIESGO de licencia (leer antes de empezar — es de negocio, no técnico)

Swiss Ephemeris (la librería C que envuelve `sweph`) es **dual-licencia: AGPL-3.0 _o_ licencia profesional de pago** (Astrodienst, pago único ~CHF 750). Usarla bajo AGPL obliga a **liberar el código de Aluna**. Como Aluna es comercial y cerrada:
- **Durante el desarrollo:** se usa bajo AGPL (sin distribuir la app), sin problema.
- **Antes del lanzamiento comercial público:** Gio debe **adquirir la licencia profesional** de Swiss Ephemeris. (Coste único, conocido, asumible — y a cambio se obtiene el estándar de oro en precisión que pide el spec.)
- **Alternativa permisiva descartada:** motores MIT (p. ej. astronomy-engine/VSOP87) no entregan **Quirón** ni la precisión/dignidades que exige la "credibilidad no negociable". Swiss Ephemeris es la elección correcta; la licencia es un coste planificado, no un bloqueo.

Los **archivos de datos `.se1`** son de **libre distribución** (no requieren licencia para incluirse), así que se versionan en el repo. Esta decisión queda registrada aquí y debe reflejarse en la memoria del proyecto.

---

## Estructura de archivos (se crea en este plan)

```
packages/core/src/astrology/                 # DOMINIO PURO (isomórfico, sin nativo)
├── types.ts            # ChartInput, BodyPosition, HousesResult, Aspect, Distribution, Pattern, ChartResult
├── signs.ts            # normalizeAngle, signOfLongitude, angularSeparation
├── houses.ts           # houseOfLongitude (en qué casa cae una longitud dadas las cúspides)
├── dignity.ts          # dignityOf(body, sign) -> domicilio/exilio/exaltación/caída
├── aspects.ts          # detectAspects(points, opts) con orbe y aplicativo/separativo
├── distribution.ts     # computeDistribution (elemento/modalidad/polaridad + dominante) + quadrantOfHouse
├── patterns.ts         # detectPatterns: stellium, gran trígono, T-cuadrada
└── __tests__/*.test.ts

packages/ephemeris/                           # @aluna/ephemeris (Node + nativo)
├── package.json        # deps: sweph, luxon, @aluna/core (workspace)
├── tsconfig.json
├── vitest.config.ts
├── ephe/               # archivos Swiss Ephemeris .se1 (versionados)
│   ├── sepl_18.se1     # planetas 1800-2399
│   ├── semo_18.se1     # Luna 1800-2399
│   └── seas_18.se1     # asteroides (incl. Quirón) 1800-2399
└── src/
    ├── init.ts         # resuelve ruta de ./ephe y llama set_ephe_path una vez
    ├── time.ts         # localToJulianDay (fecha local + IANA tz -> UTC -> utc_to_jd)
    ├── bodies.ts       # computeBodies (calc de los 14 puntos, retrógrado, tropical/sideral)
    ├── houses.ts       # computeHouses (houses_ex2, 6 sistemas, asc/mc)
    ├── chart.ts        # computeChart: ensambla todo usando @aluna/core
    ├── index.ts
    └── __tests__/*.test.ts
```

**Los 14 puntos** (decididos en el spec): Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno, Plutón, **Quirón**, **Nodo Norte** (verdadero por defecto; medio opcional), **Nodo Sur** (derivado = Norte + 180°), **Lilith** (media por defecto; osculatriz opcional).

**Fixture de referencia (carta de Gio, Astrodienst "Web Style / Placidus", nodo verdadero):**
n. 5 feb 1984, 09:00 local Quito (America/Guayaquil) → **TU 14:00**. Longitudes eclípticas tropicales esperadas (°):

| Cuerpo | Esperado | ° |
|---|---|---|
| Sol | 15°57′ Acuario | 315.96 |
| Luna | 25°01′ Piscis | 355.02 |
| Mercurio | 24°58′ Capricornio | 294.97 |
| Venus | 13°14′ Capricornio | 283.24 |
| Marte | 12°18′ Escorpio | 222.31 |
| Júpiter | 3°29′ Capricornio | 273.48 |
| Saturno | 16°04′ Escorpio | 226.07 |
| Urano | 12°48′ Sagitario | 252.80 |
| Neptuno | 0°33′ Capricornio | 270.55 |
| Plutón | 2°08′ Escorpio ℞ | 212.14 (retrógrado) |
| Nodo N. (verdadero) | 13°36′ Géminis | 73.61 |
| Quirón | 27°45′ Tauro | 57.76 |
| Ascendente | 26°06′ Piscis | 356.10 |
| Medio Cielo | 26°43′ Sagitario | 266.72 |

Tolerancia de los tests: **±0.05° (3 arcmin)** — holgada para diferencias DE431/DE441, pero atrapa cualquier error grueso (signo equivocado, mala TU, etc.). Con los mismos archivos que Astrodienst el match real es sub-arcsec.

---

## Task 1: Tipos del dominio de carta (`astrology/types.ts`)

**Files:**
- Create: `packages/core/src/astrology/types.ts`

- [ ] **Step 1: Crear `packages/core/src/astrology/types.ts`**

```ts
// packages/core/src/astrology/types.ts
import type { Element, Modality, Polarity, AspectHarmony } from "../constants/astrology";

export type HouseSystem = "placidus" | "koch" | "equal" | "whole" | "regiomontanus" | "porphyry";
export type Zodiac = "tropical" | "sidereal";
export type NodeType = "true" | "mean";
export type LilithType = "mean" | "oscu";

export interface ChartInput {
  /** fecha y hora CIVIL local de nacimiento */
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** zona horaria IANA, p.ej. "America/Guayaquil" */
  timeZone: string;
  latitude: number;
  longitude: number;
  houseSystem?: HouseSystem; // por defecto placidus
  zodiac?: Zodiac; // por defecto tropical
  ayanamsha?: string; // si sidereal; por defecto "lahiri"
  nodeType?: NodeType; // por defecto true
  lilithType?: LilithType; // por defecto mean
}

export type Dignity = "domicile" | "exaltation" | "exile" | "fall" | null;

export interface BodyPosition {
  body: string; // clave del cuerpo
  longitude: number; // 0-360 eclíptica
  sign: string; // clave de signo
  signDegree: number; // 0-30
  degree: number; // grados enteros dentro del signo
  minute: number;
  second: number;
  speed: number; // °/día (longitud)
  retrograde: boolean;
  house: number; // 1-12
  dignity: Dignity;
}

export interface HousesResult {
  system: HouseSystem;
  cusps: number[]; // 12 cúspides (cusps[0] = casa 1 = Ascendente)
  ascendant: number;
  midheaven: number;
}

export interface Aspect {
  a: string;
  b: string;
  aspect: string; // clave de aspecto
  angle: number; // ángulo ideal
  orb: number; // |actual - ideal|
  applying: boolean;
  harmony: AspectHarmony;
}

export interface Distribution {
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  polarities: Record<Polarity, number>;
  dominantElement: Element;
  dominantModality: Modality;
}

export interface Pattern {
  type: "stellium" | "grand_trine" | "t_square";
  bodies: string[];
}

export interface ChartMeta {
  julianDayUt: number;
  julianDayEt: number;
  utcHour: number; // hora UTC para verificación de cabecera
  zodiac: Zodiac;
}

export interface ChartResult {
  bodies: BodyPosition[];
  houses: HousesResult;
  aspects: Aspect[];
  distribution: Distribution;
  patterns: Pattern[];
  meta: ChartMeta;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/astrology/types.ts
git commit -m "feat(core): chart domain types (astrology)"
```

---

## Task 2: Signos, ángulos y casas (`astrology/signs.ts`, `astrology/houses.ts`)

**Files:**
- Create: `packages/core/src/astrology/signs.ts`
- Create: `packages/core/src/astrology/houses.ts`
- Test: `packages/core/src/astrology/__tests__/signs.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/astrology/__tests__/signs.test.ts
import { describe, it, expect } from "vitest";
import { normalizeAngle, signOfLongitude, angularSeparation } from "../signs";
import { houseOfLongitude } from "../houses";

describe("normalizeAngle", () => {
  it("envuelve a 0-360", () => {
    expect(normalizeAngle(370)).toBe(10);
    expect(normalizeAngle(-10)).toBe(350);
  });
});

describe("signOfLongitude", () => {
  it("Sol de Gio 315.96 -> Acuario 15°", () => {
    const p = signOfLongitude(315.96);
    expect(p.sign).toBe("aquarius");
    expect(p.degree).toBe(15);
    expect(p.signDegree).toBeCloseTo(15.96, 1);
  });
  it("0° -> Aries 0°", () => {
    expect(signOfLongitude(0).sign).toBe("aries");
  });
});

describe("angularSeparation", () => {
  it("calcula la separación mínima 0-180", () => {
    expect(angularSeparation(10, 130)).toBe(120);
    expect(angularSeparation(350, 10)).toBe(20);
  });
});

describe("houseOfLongitude", () => {
  it("ubica una longitud en la casa correcta (cúspides simples cada 30°)", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30); // casa1=0, casa2=30...
    expect(houseOfLongitude(15, cusps)).toBe(1);
    expect(houseOfLongitude(45, cusps)).toBe(2);
    expect(houseOfLongitude(355, cusps)).toBe(12);
  });
  it("maneja el envolvente cuando la casa cruza 0° Aries", () => {
    const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
    expect(houseOfLongitude(355, cusps)).toBe(1); // 350..20 envuelve
    expect(houseOfLongitude(10, cusps)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/core test signs`
Expected: FAIL — "Cannot find module '../signs'".

- [ ] **Step 3: Implementar `packages/core/src/astrology/signs.ts`**

```ts
// packages/core/src/astrology/signs.ts
import { ZODIAC_SIGNS } from "../constants/astrology";

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export interface SignPosition {
  sign: string;
  signIndex: number;
  signDegree: number;
  degree: number;
  minute: number;
  second: number;
}

export function signOfLongitude(longitude: number): SignPosition {
  const lon = normalizeAngle(longitude);
  const signIndex = Math.floor(lon / 30);
  const signDegree = lon - signIndex * 30;
  const degree = Math.floor(signDegree);
  const minuteFloat = (signDegree - degree) * 60;
  const minute = Math.floor(minuteFloat);
  const second = Math.min(59, Math.round((minuteFloat - minute) * 60));
  const sign = ZODIAC_SIGNS[signIndex]!.key;
  return { sign, signIndex, signDegree, degree, minute, second };
}

/** Separación angular mínima (0-180) entre dos longitudes. */
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % 360;
  return diff > 180 ? 360 - diff : diff;
}
```

- [ ] **Step 4: Implementar `packages/core/src/astrology/houses.ts`**

```ts
// packages/core/src/astrology/houses.ts
import { normalizeAngle } from "./signs";

/** Casa (1-12) en la que cae una longitud, dadas las 12 cúspides (cusps[0]=casa1). */
export function houseOfLongitude(longitude: number, cusps: number[]): number {
  const lon = normalizeAngle(longitude);
  for (let i = 0; i < 12; i++) {
    const start = normalizeAngle(cusps[i]!);
    const end = normalizeAngle(cusps[(i + 1) % 12]!);
    if (start <= end) {
      if (lon >= start && lon < end) return i + 1;
    } else if (lon >= start || lon < end) {
      return i + 1;
    }
  }
  return 1;
}
```

- [ ] **Step 5: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/core test signs && pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/astrology/signs.ts packages/core/src/astrology/houses.ts packages/core/src/astrology/__tests__/signs.test.ts
git commit -m "feat(core): sign/angle helpers and house placement"
```

---

## Task 3: Dignidades (`astrology/dignity.ts`)

**Files:**
- Create: `packages/core/src/astrology/dignity.ts`
- Test: `packages/core/src/astrology/__tests__/dignity.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/astrology/__tests__/dignity.test.ts
import { describe, it, expect } from "vitest";
import { dignityOf } from "../dignity";

describe("dignityOf", () => {
  it("Sol en Acuario -> exilio (regente de Leo, opuesto)", () => {
    expect(dignityOf("sun", "aquarius")).toBe("exile");
  });
  it("Sol en Leo -> domicilio", () => {
    expect(dignityOf("sun", "leo")).toBe("domicile");
  });
  it("Marte en Escorpio -> domicilio", () => {
    expect(dignityOf("mars", "scorpio")).toBe("domicile");
  });
  it("Júpiter en Capricornio -> caída (exaltación en Cáncer, opuesto)", () => {
    expect(dignityOf("jupiter", "capricorn")).toBe("fall");
  });
  it("Saturno en Escorpio -> sin dignidad (null)", () => {
    expect(dignityOf("saturn", "scorpio")).toBeNull();
  });
  it("cuerpo sin dignidades (quirón) -> null", () => {
    expect(dignityOf("chiron", "taurus")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/core test dignity`
Expected: FAIL — "Cannot find module '../dignity'".

- [ ] **Step 3: Implementar `packages/core/src/astrology/dignity.ts`**

```ts
// packages/core/src/astrology/dignity.ts
import { PLANETS, ZODIAC_SIGNS } from "../constants/astrology";
import type { Dignity } from "./types";

function oppositeSign(signKey: string): string {
  const idx = ZODIAC_SIGNS.findIndex((s) => s.key === signKey);
  if (idx < 0) return signKey;
  return ZODIAC_SIGNS[(idx + 6) % 12]!.key;
}

/** Dignidad esencial de un cuerpo en un signo: domicilio/exaltación/exilio/caída/null. */
export function dignityOf(bodyKey: string, signKey: string): Dignity {
  const planet = PLANETS.find((p) => p.key === bodyKey);
  if (!planet) return null;
  if (planet.domicile?.includes(signKey)) return "domicile";
  if (planet.exaltation?.includes(signKey)) return "exaltation";
  if (planet.domicile?.some((d) => oppositeSign(d) === signKey)) return "exile";
  if (planet.exaltation?.some((e) => oppositeSign(e) === signKey)) return "fall";
  return null;
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/core test dignity && pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/astrology/dignity.ts packages/core/src/astrology/__tests__/dignity.test.ts
git commit -m "feat(core): essential dignity (domicile/exile/exaltation/fall)"
```

---

## Task 4: Aspectos (`astrology/aspects.ts`)

**Files:**
- Create: `packages/core/src/astrology/aspects.ts`
- Test: `packages/core/src/astrology/__tests__/aspects.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/astrology/__tests__/aspects.test.ts
import { describe, it, expect } from "vitest";
import { detectAspects } from "../aspects";

describe("detectAspects", () => {
  it("detecta un trígono exacto (120°) dentro de orbe", () => {
    const points = [
      { key: "sun", longitude: 10, speed: 1 },
      { key: "moon", longitude: 130, speed: 13 },
    ];
    const asp = detectAspects(points);
    expect(asp).toHaveLength(1);
    expect(asp[0]).toMatchObject({ a: "sun", b: "moon", aspect: "trine", harmony: "soft" });
    expect(asp[0]!.orb).toBeCloseTo(0, 5);
  });

  it("no detecta aspecto fuera de orbe", () => {
    const points = [
      { key: "sun", longitude: 0, speed: 1 },
      { key: "mars", longitude: 100, speed: 0.5 }, // 100° no es aspecto mayor
    ];
    expect(detectAspects(points)).toHaveLength(0);
  });

  it("incluye menores solo si se pide", () => {
    const points = [
      { key: "a", longitude: 0, speed: 1 },
      { key: "b", longitude: 150, speed: 0 }, // quincuncio (menor)
    ];
    expect(detectAspects(points)).toHaveLength(0);
    expect(detectAspects(points, { includeMinor: true })).toHaveLength(1);
  });

  it("marca aplicativo cuando los cuerpos se acercan al aspecto", () => {
    // Luna a 118° de un Sol fijo, acercándose al trígono 120
    const points = [
      { key: "sun", longitude: 0, speed: 0 },
      { key: "moon", longitude: 118, speed: 13 },
    ];
    const asp = detectAspects(points);
    expect(asp[0]!.applying).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/core test aspects`
Expected: FAIL — "Cannot find module '../aspects'".

- [ ] **Step 3: Implementar `packages/core/src/astrology/aspects.ts`**

```ts
// packages/core/src/astrology/aspects.ts
import { ASPECTS, DEFAULT_ORBS } from "../constants/astrology";
import type { Aspect } from "./types";
import { angularSeparation, normalizeAngle } from "./signs";

export interface AspectPoint {
  key: string;
  longitude: number;
  speed?: number; // °/día; omitir para ángulos (AC/MC)
}

export interface AspectOptions {
  orbs?: Record<string, number>;
  includeMinor?: boolean;
}

export function detectAspects(points: AspectPoint[], opts: AspectOptions = {}): Aspect[] {
  const orbs = opts.orbs ?? DEFAULT_ORBS;
  const includeMinor = opts.includeMinor ?? false;
  const usable = ASPECTS.filter((a) => a.major || includeMinor);
  const result: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i]!;
      const q = points[j]!;
      const sep = angularSeparation(p.longitude, q.longitude);
      for (const asp of usable) {
        const maxOrb = orbs[asp.key] ?? 0;
        const orb = Math.abs(sep - asp.angle);
        if (orb <= maxOrb) {
          result.push({
            a: p.key,
            b: q.key,
            aspect: asp.key,
            angle: asp.angle,
            orb: Number(orb.toFixed(2)),
            applying: isApplying(p, q, asp.angle),
            harmony: asp.harmony,
          });
          break; // un aspecto por par (el más ajustado por orden de ASPECTS)
        }
      }
    }
  }
  return result;
}

function isApplying(p: AspectPoint, q: AspectPoint, idealAngle: number): boolean {
  if (p.speed === undefined || q.speed === undefined) return false;
  const dt = 0.02; // pequeño paso en días
  const sepNow = angularSeparation(p.longitude, q.longitude);
  const sepNext = angularSeparation(
    normalizeAngle(p.longitude + p.speed * dt),
    normalizeAngle(q.longitude + q.speed * dt),
  );
  return Math.abs(sepNext - idealAngle) < Math.abs(sepNow - idealAngle);
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/core test aspects && pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/astrology/aspects.ts packages/core/src/astrology/__tests__/aspects.test.ts
git commit -m "feat(core): aspect detection with orb and applying/separating"
```

---

## Task 5: Distribución (`astrology/distribution.ts`)

**Files:**
- Create: `packages/core/src/astrology/distribution.ts`
- Test: `packages/core/src/astrology/__tests__/distribution.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/astrology/__tests__/distribution.test.ts
import { describe, it, expect } from "vitest";
import { computeDistribution, quadrantOfHouse } from "../distribution";

describe("computeDistribution", () => {
  it("cuenta elementos y modalidades y halla el dominante", () => {
    const bodies = [
      { key: "sun", longitude: 315 }, // Acuario: aire/fijo/yang
      { key: "moon", longitude: 355 }, // Piscis: agua/mutable/yin
      { key: "venus", longitude: 283 }, // Capricornio: tierra/cardinal/yin
      { key: "mars", longitude: 222 }, // Escorpio: agua/fijo/yin
    ];
    const d = computeDistribution(bodies);
    expect(d.elements.water).toBe(2);
    expect(d.elements.air).toBe(1);
    expect(d.elements.earth).toBe(1);
    expect(d.dominantElement).toBe("water");
    expect(d.polarities.yin).toBe(3);
  });
});

describe("quadrantOfHouse", () => {
  it("mapea casa a cuadrante 1-4", () => {
    expect(quadrantOfHouse(1)).toBe(1);
    expect(quadrantOfHouse(4)).toBe(2);
    expect(quadrantOfHouse(7)).toBe(3);
    expect(quadrantOfHouse(12)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/core test distribution`
Expected: FAIL — "Cannot find module '../distribution'".

- [ ] **Step 3: Implementar `packages/core/src/astrology/distribution.ts`**

```ts
// packages/core/src/astrology/distribution.ts
import { ZODIAC_SIGNS } from "../constants/astrology";
import type { Element, Modality, Polarity } from "../constants/astrology";
import type { Distribution } from "./types";
import { signOfLongitude } from "./signs";

export interface DistributionBody {
  key: string;
  longitude: number;
}

export function computeDistribution(bodies: DistributionBody[]): Distribution {
  const elements: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  const polarities: Record<Polarity, number> = { yang: 0, yin: 0 };
  for (const b of bodies) {
    const { signIndex } = signOfLongitude(b.longitude);
    const sign = ZODIAC_SIGNS[signIndex]!;
    elements[sign.element] += 1;
    modalities[sign.modality] += 1;
    polarities[sign.polarity] += 1;
  }
  return {
    elements,
    modalities,
    polarities,
    dominantElement: maxKey(elements),
    dominantModality: maxKey(modalities),
  };
}

/** Cuadrante (1-4) a partir del número de casa (1-12). */
export function quadrantOfHouse(house: number): number {
  return Math.floor((house - 1) / 3) + 1;
}

function maxKey<T extends string>(rec: Record<T, number>): T {
  return (Object.entries(rec) as Array<[T, number]>).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/core test distribution && pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/astrology/distribution.ts packages/core/src/astrology/__tests__/distribution.test.ts
git commit -m "feat(core): element/modality/polarity distribution + quadrant helper"
```

---

## Task 6: Patrones (`astrology/patterns.ts`)

**Files:**
- Create: `packages/core/src/astrology/patterns.ts`
- Test: `packages/core/src/astrology/__tests__/patterns.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/core/src/astrology/__tests__/patterns.test.ts
import { describe, it, expect } from "vitest";
import { detectPatterns } from "../patterns";

describe("detectPatterns", () => {
  it("detecta un stellium (3+ cuerpos en el mismo signo)", () => {
    const bodies = [
      { key: "mars", longitude: 222 }, // Escorpio
      { key: "saturn", longitude: 226 }, // Escorpio
      { key: "pluto", longitude: 212 }, // Escorpio
      { key: "sun", longitude: 315 }, // Acuario (fuera)
    ];
    const p = detectPatterns(bodies);
    const stellium = p.find((x) => x.type === "stellium");
    expect(stellium).toBeDefined();
    expect(stellium!.bodies.sort()).toEqual(["mars", "pluto", "saturn"]);
  });

  it("detecta un gran trígono (3 cuerpos ~120° entre sí)", () => {
    const bodies = [
      { key: "a", longitude: 10 },
      { key: "b", longitude: 130 },
      { key: "c", longitude: 250 },
    ];
    const p = detectPatterns(bodies);
    expect(p.some((x) => x.type === "grand_trine")).toBe(true);
  });

  it("detecta una T-cuadrada (oposición + 2 cuadraturas)", () => {
    const bodies = [
      { key: "a", longitude: 0 },
      { key: "b", longitude: 180 }, // oposición a
      { key: "c", longitude: 90 }, // cuadratura a a y b
    ];
    const p = detectPatterns(bodies);
    expect(p.some((x) => x.type === "t_square")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/core test patterns`
Expected: FAIL — "Cannot find module '../patterns'".

- [ ] **Step 3: Implementar `packages/core/src/astrology/patterns.ts`**

```ts
// packages/core/src/astrology/patterns.ts
import { ZODIAC_SIGNS } from "../constants/astrology";
import type { Pattern } from "./types";
import { signOfLongitude, angularSeparation } from "./signs";

export interface PatternBody {
  key: string;
  longitude: number;
}

const TRINE_ORB = 8;
const OPP_ORB = 8;
const SQUARE_ORB = 7;

export function detectPatterns(bodies: PatternBody[]): Pattern[] {
  return [...stelliums(bodies), ...grandTrines(bodies), ...tSquares(bodies)];
}

function stelliums(bodies: PatternBody[]): Pattern[] {
  const bySign = new Map<string, string[]>();
  for (const b of bodies) {
    const { signIndex } = signOfLongitude(b.longitude);
    const key = ZODIAC_SIGNS[signIndex]!.key;
    bySign.set(key, [...(bySign.get(key) ?? []), b.key]);
  }
  const out: Pattern[] = [];
  for (const members of bySign.values()) {
    if (members.length >= 3) out.push({ type: "stellium", bodies: members });
  }
  return out;
}

function isAspect(a: PatternBody, b: PatternBody, angle: number, orb: number): boolean {
  return Math.abs(angularSeparation(a.longitude, b.longitude) - angle) <= orb;
}

function grandTrines(bodies: PatternBody[]): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      for (let k = j + 1; k < bodies.length; k++) {
        const [a, b, c] = [bodies[i]!, bodies[j]!, bodies[k]!];
        if (isAspect(a, b, 120, TRINE_ORB) && isAspect(b, c, 120, TRINE_ORB) && isAspect(a, c, 120, TRINE_ORB)) {
          out.push({ type: "grand_trine", bodies: [a.key, b.key, c.key] });
        }
      }
    }
  }
  return out;
}

function tSquares(bodies: PatternBody[]): Pattern[] {
  const out: Pattern[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]!;
      const b = bodies[j]!;
      if (!isAspect(a, b, 180, OPP_ORB)) continue;
      for (let k = 0; k < bodies.length; k++) {
        if (k === i || k === j) continue;
        const c = bodies[k]!;
        if (isAspect(a, c, 90, SQUARE_ORB) && isAspect(b, c, 90, SQUARE_ORB)) {
          out.push({ type: "t_square", bodies: [a.key, b.key, c.key] });
        }
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/core test patterns && pnpm --filter @aluna/core typecheck`
Expected: PASS.

- [ ] **Step 5: Exportar el dominio de astrología desde `index.ts`** — añadir al final de `packages/core/src/index.ts`:

```ts
// Dominio de carta astral (puro)
export * from "./astrology/types";
export { normalizeAngle, signOfLongitude, angularSeparation } from "./astrology/signs";
export { houseOfLongitude } from "./astrology/houses";
export { dignityOf } from "./astrology/dignity";
export { detectAspects } from "./astrology/aspects";
export type { AspectPoint, AspectOptions } from "./astrology/aspects";
export { computeDistribution, quadrantOfHouse } from "./astrology/distribution";
export { detectPatterns } from "./astrology/patterns";
```

- [ ] **Step 6: Suite completa de core + typecheck**

Run: `pnpm --filter @aluna/core test && pnpm --filter @aluna/core typecheck`
Expected: PASS (numerología previa + nuevo dominio de astrología).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): chart patterns (stellium, grand trine, t-square) + export astrology domain"
```

---

## Task 7: Scaffold de `@aluna/ephemeris` + archivos de efemérides + smoke test

**Files:**
- Create: `packages/ephemeris/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/init.ts`, `src/index.ts`
- Create: `packages/ephemeris/ephe/{sepl_18.se1,semo_18.se1,seas_18.se1}` (descargados)
- Test: `packages/ephemeris/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Crear `packages/ephemeris/package.json`**

```json
{
  "name": "@aluna/ephemeris",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@aluna/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

> `sweph`, `luxon` y `@types/luxon` se añaden con `pnpm add` en el Step 4 (así pnpm resuelve la versión publicada correcta en vez de fijar una a ciegas).

- [ ] **Step 2: Crear `packages/ephemeris/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "module": "ESNext", "moduleResolution": "Bundler" },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**"]
}
```

- [ ] **Step 3: Crear `packages/ephemeris/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/__tests__/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Añadir las dependencias de terceros** (compila el addon nativo `sweph`)

Run:
```bash
pnpm --filter @aluna/ephemeris add sweph luxon
pnpm --filter @aluna/ephemeris add -D @types/luxon
```
Expected: pnpm resuelve y escribe las versiones correctas; `sweph` puede compilar binarios nativos con node-gyp (requiere toolchain de C/C++; en macOS, Xcode Command Line Tools). Si la compilación falla, reporta el error (BLOCKED/NEEDS_CONTEXT) — no continúes a ciegas. (Verifica también que `@aluna/core` quedó enlazado como `workspace:*`.)

- [ ] **Step 5: Descargar los archivos de efemérides (libre distribución) a `packages/ephemeris/ephe/`**

Run:
```bash
mkdir -p packages/ephemeris/ephe
curl -fsSL -o packages/ephemeris/ephe/sepl_18.se1 https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1
curl -fsSL -o packages/ephemeris/ephe/semo_18.se1 https://www.astro.com/ftp/swisseph/ephe/semo_18.se1
curl -fsSL -o packages/ephemeris/ephe/seas_18.se1 https://www.astro.com/ftp/swisseph/ephe/seas_18.se1
ls -la packages/ephemeris/ephe/
```
Expected: 3 archivos `.se1` (planetas ~480KB, Luna ~1.3MB, asteroides ~220KB). Si la URL cambió, busca en `https://github.com/aloistr/swisseph/tree/master/ephe` como espejo.

- [ ] **Step 6: Crear `packages/ephemeris/src/init.ts`** (configura la ruta de efemérides una sola vez)

```ts
// packages/ephemeris/src/init.ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sweph from "sweph";

let initialized = false;

/** Resuelve la carpeta ./ephe del paquete y registra la ruta en Swiss Ephemeris (idempotente). */
export function initEphemeris(): void {
  if (initialized) return;
  const here = dirname(fileURLToPath(import.meta.url)); // .../packages/ephemeris/src
  const ephePath = join(here, "..", "ephe");
  sweph.set_ephe_path(ephePath);
  initialized = true;
}
```

- [ ] **Step 7: Crear `packages/ephemeris/src/index.ts`** (placeholder de API que se llena en tareas siguientes)

```ts
// packages/ephemeris/src/index.ts
export { initEphemeris } from "./init";
```

- [ ] **Step 8: Escribir un smoke test** que prueba que el addon carga y calcula el Sol para una fecha conocida — `packages/ephemeris/src/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import sweph from "sweph";
import { initEphemeris } from "../init";

describe("sweph smoke", () => {
  it("calcula el Sol con archivos de efemérides (sin error)", () => {
    initEphemeris();
    const jd = sweph.utc_to_jd(2020, 1, 25, 15, 35, 0, sweph.constants.SE_GREG_CAL);
    expect(jd.flag).toBe(sweph.constants.OK);
    const [jdEt] = jd.data;
    const flags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
    const sun = sweph.calc(jdEt, sweph.constants.SE_SUN, flags);
    expect(sun.flag).toBe(flags); // si difiere, faltan archivos o hubo error
    expect(sun.data[0]).toBeGreaterThanOrEqual(0);
    expect(sun.data[0]).toBeLessThan(360);
  });
});
```

> Nota de interop: `sweph` es CommonJS/nativo. Importar como `import sweph from "sweph"` (default) y usar `sweph.calc`, `sweph.constants`, etc. es lo robusto bajo Vitest y bajo Node ESM. Si `import sweph from "sweph"` diera `undefined` en este entorno, usa `import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const sweph = require("sweph");` y repórtalo como concern.

- [ ] **Step 9: Run smoke test + typecheck**

Run: `pnpm --filter @aluna/ephemeris test && pnpm --filter @aluna/ephemeris typecheck`
Expected: PASS (el addon carga, el Sol se calcula con flag == SWIEPH|SPEED).

- [ ] **Step 10: Asegurar que los `.se1` se versionan** (no deben caer en .gitignore). Verifica:

Run: `git check-ignore packages/ephemeris/ephe/sepl_18.se1 || echo "NO IGNORADO (correcto)"`
Expected: "NO IGNORADO (correcto)".

- [ ] **Step 11: Commit**

```bash
git add packages/ephemeris pnpm-lock.yaml
git commit -m "feat(ephemeris): scaffold @aluna/ephemeris with sweph + bundled ephemeris files + smoke test"
```

---

## Task 8: Tiempo → Día Juliano (`src/time.ts`)

**Files:**
- Create: `packages/ephemeris/src/time.ts`
- Test: `packages/ephemeris/src/__tests__/time.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// packages/ephemeris/src/__tests__/time.test.ts
import { describe, it, expect } from "vitest";
import { localToJulianDay } from "../time";

describe("localToJulianDay", () => {
  it("convierte la hora local de Gio (Quito 09:00) a TU 14:00", () => {
    const r = localToJulianDay({
      year: 1984, month: 2, day: 5, hour: 9, minute: 0,
      timeZone: "America/Guayaquil",
    });
    expect(r.utcHour).toBeCloseTo(14, 5); // Ecuador UTC-5, sin DST en 1984
    expect(r.julianDayUt).toBeGreaterThan(2445000);
    expect(r.julianDayEt).toBeGreaterThan(r.julianDayUt - 0.01);
  });

  it("respeta el horario de verano histórico (Madrid en verano = UTC+2)", () => {
    const r = localToJulianDay({
      year: 2000, month: 7, day: 1, hour: 12, minute: 0,
      timeZone: "Europe/Madrid",
    });
    expect(r.utcHour).toBeCloseTo(10, 5); // CEST = UTC+2 en julio
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/ephemeris test time`
Expected: FAIL — "Cannot find module '../time'".

- [ ] **Step 3: Implementar `packages/ephemeris/src/time.ts`**

```ts
// packages/ephemeris/src/time.ts
import { DateTime } from "luxon";
import sweph from "sweph";

export interface LocalTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string; // IANA
}

export interface JulianDayResult {
  julianDayEt: number; // tiempo de efemérides (para planetas)
  julianDayUt: number; // tiempo universal (para casas)
  utcHour: number; // hora UTC decimal (verificación de cabecera)
}

/** Fecha/hora civil local + zona IANA -> UTC -> Día Juliano (ET y UT). */
export function localToJulianDay(input: LocalTimeInput): JulianDayResult {
  const local = DateTime.fromObject(
    { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute },
    { zone: input.timeZone },
  );
  if (!local.isValid) {
    throw new Error(`Fecha/zona inválida: ${local.invalidReason ?? "desconocido"}`);
  }
  const utc = local.toUTC();
  const jd = sweph.utc_to_jd(
    utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second,
    sweph.constants.SE_GREG_CAL,
  );
  if (jd.flag !== sweph.constants.OK) {
    throw new Error(`utc_to_jd falló: ${jd.error}`);
  }
  const [julianDayEt, julianDayUt] = jd.data;
  return {
    julianDayEt,
    julianDayUt,
    utcHour: utc.hour + utc.minute / 60 + utc.second / 3600,
  };
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/ephemeris test time && pnpm --filter @aluna/ephemeris typecheck`
Expected: PASS (utcHour ≈ 14 para Gio; ≈ 10 para Madrid en julio).

- [ ] **Step 5: Commit**

```bash
git add packages/ephemeris/src/time.ts packages/ephemeris/src/__tests__/time.test.ts
git commit -m "feat(ephemeris): local time + historical tz -> Julian Day (luxon + sweph)"
```

---

## Task 9: Posiciones de los cuerpos (`src/bodies.ts`)

**Files:**
- Create: `packages/ephemeris/src/bodies.ts`
- Test: `packages/ephemeris/src/__tests__/bodies.test.ts`

- [ ] **Step 1: Escribir el test que falla** (valida contra la carta real de Gio)

```ts
// packages/ephemeris/src/__tests__/bodies.test.ts
import { describe, it, expect } from "vitest";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";

const GIO_JD = localToJulianDay({
  year: 1984, month: 2, day: 5, hour: 9, minute: 0, timeZone: "America/Guayaquil",
});

function lonOf(bodies: ReturnType<typeof computeBodies>, key: string): number {
  return bodies.find((b) => b.body === key)!.longitude;
}

describe("computeBodies (carta de Gio, tropical)", () => {
  const bodies = computeBodies(GIO_JD.julianDayEt, { nodeType: "true", lilithType: "mean" });

  it("devuelve 14 puntos", () => {
    expect(bodies).toHaveLength(14);
  });

  const TOL = 0.05; // 3 arcmin
  it.each([
    ["sun", 315.96], ["moon", 355.02], ["mercury", 294.97], ["venus", 283.24],
    ["mars", 222.31], ["jupiter", 273.48], ["saturn", 226.07], ["uranus", 252.80],
    ["neptune", 270.55], ["pluto", 212.14], ["north_node", 73.61], ["chiron", 57.76],
  ])("%s ≈ %f°", (key, expected) => {
    expect(Math.abs(lonOf(bodies, key) - expected)).toBeLessThan(TOL);
  });

  it("Plutón está retrógrado y el Sol no", () => {
    expect(bodies.find((b) => b.body === "pluto")!.retrograde).toBe(true);
    expect(bodies.find((b) => b.body === "sun")!.retrograde).toBe(false);
  });

  it("el Nodo Sur es opuesto al Norte", () => {
    const n = lonOf(bodies, "north_node");
    const s = lonOf(bodies, "south_node");
    expect((s - n + 360) % 360).toBeCloseTo(180, 3);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/ephemeris test bodies`
Expected: FAIL — "Cannot find module '../bodies'".

- [ ] **Step 3: Implementar `packages/ephemeris/src/bodies.ts`**

```ts
// packages/ephemeris/src/bodies.ts
import sweph from "sweph";
import { initEphemeris } from "./init";
import { normalizeAngle } from "@aluna/core";

export interface BodiesOptions {
  nodeType?: "true" | "mean"; // por defecto true
  lilithType?: "mean" | "oscu"; // por defecto mean
  sidereal?: boolean; // por defecto false (tropical)
}

export interface RawBody {
  body: string;
  longitude: number;
  speed: number; // °/día
  retrograde: boolean;
}

const BASE_PLANETS: Array<[string, number]> = [
  ["sun", 0], ["moon", 1], ["mercury", 2], ["venus", 3], ["mars", 4],
  ["jupiter", 5], ["saturn", 6], ["uranus", 7], ["neptune", 8], ["pluto", 9],
  ["chiron", 15],
];

/** Posiciones eclípticas de los 14 puntos para un Día Juliano (ET). */
export function computeBodies(julianDayEt: number, opts: BodiesOptions = {}): RawBody[] {
  initEphemeris();
  const sidereal = opts.sidereal ?? false;
  if (sidereal) {
    sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  }
  let flags = sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED;
  if (sidereal) flags |= sweph.constants.SEFLG_SIDEREAL;

  const out: RawBody[] = [];

  for (const [name, id] of BASE_PLANETS) {
    out.push(calcBody(name, id, julianDayEt, flags));
  }

  // Nodo Norte (verdadero o medio)
  const nodeId = (opts.nodeType ?? "true") === "true"
    ? sweph.constants.SE_TRUE_NODE
    : sweph.constants.SE_MEAN_NODE;
  const north = calcBody("north_node", nodeId, julianDayEt, flags);
  out.push(north);
  // Nodo Sur = Norte + 180°
  out.push({
    body: "south_node",
    longitude: normalizeAngle(north.longitude + 180),
    speed: north.speed,
    retrograde: north.retrograde,
  });

  // Lilith (media u osculatriz)
  const lilithId = (opts.lilithType ?? "mean") === "mean"
    ? sweph.constants.SE_MEAN_APOG
    : sweph.constants.SE_OSCU_APOG;
  out.push(calcBody("lilith", lilithId, julianDayEt, flags));

  return out;
}

function calcBody(name: string, id: number, jd: number, flags: number): RawBody {
  const r = sweph.calc(jd, id, flags);
  if (r.flag < 0) {
    throw new Error(`calc(${name}) falló: ${r.error}`);
  }
  const longitude = normalizeAngle(r.data[0]);
  const speed = r.data[3];
  return { body: name, longitude, speed, retrograde: speed < 0 };
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/ephemeris test bodies && pnpm --filter @aluna/ephemeris typecheck`
Expected: PASS — las 12 longitudes comprobadas dentro de 3 arcmin de la carta de Gio; Plutón retrógrado; nodo sur opuesto. (Si alguna falla por > tolerancia, revisa flags/jd ET vs UT, no relajes la tolerancia sin entender por qué.)

- [ ] **Step 5: Commit**

```bash
git add packages/ephemeris/src/bodies.ts packages/ephemeris/src/__tests__/bodies.test.ts
git commit -m "feat(ephemeris): compute 14 body positions (validated vs Gio chart)"
```

---

## Task 10: Casas y ángulos (`src/houses.ts`)

**Files:**
- Create: `packages/ephemeris/src/houses.ts`
- Test: `packages/ephemeris/src/__tests__/houses.test.ts`

- [ ] **Step 1: Escribir el test que falla** (valida AC/MC de Gio)

```ts
// packages/ephemeris/src/__tests__/houses.test.ts
import { describe, it, expect } from "vitest";
import { computeHouses } from "../houses";
import { localToJulianDay } from "../time";

const GIO = localToJulianDay({
  year: 1984, month: 2, day: 5, hour: 9, minute: 0, timeZone: "America/Guayaquil",
});
// Quito según la referencia Astrodienst de Gio (0s13, 78w30)
const LAT = -0.2167; // 0°13′ S
const LON = -78.5; // 78°30′ O

describe("computeHouses (Gio, Placidus)", () => {
  const h = computeHouses(GIO.julianDayUt, LAT, LON, "placidus", false);
  const TOL = 0.1; // 6 arcmin (las casas dependen mucho de la hora exacta)

  it("Ascendente ≈ 356.10° (26°06′ Piscis)", () => {
    expect(Math.abs(h.ascendant - 356.10)).toBeLessThan(TOL);
  });
  it("Medio Cielo ≈ 266.72° (26°43′ Sagitario)", () => {
    expect(Math.abs(h.midheaven - 266.72)).toBeLessThan(TOL);
  });
  it("devuelve 12 cúspides, la primera = Ascendente", () => {
    expect(h.cusps).toHaveLength(12);
    expect(Math.abs(h.cusps[0]! - h.ascendant)).toBeLessThan(0.001);
  });
});

describe("computeHouses soporta varios sistemas", () => {
  it("acepta whole sign sin romper", () => {
    const h = computeHouses(GIO.julianDayUt, LAT, LON, "whole", false);
    expect(h.cusps).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/ephemeris test houses`
Expected: FAIL — "Cannot find module '../houses'".

- [ ] **Step 3: Implementar `packages/ephemeris/src/houses.ts`**

```ts
// packages/ephemeris/src/houses.ts
import sweph from "sweph";
import { initEphemeris } from "./init";
import { normalizeAngle } from "@aluna/core";
import type { HouseSystem, HousesResult } from "@aluna/core";

const HSYS: Record<HouseSystem, string> = {
  placidus: "P",
  koch: "K",
  equal: "E",
  whole: "W",
  regiomontanus: "R",
  porphyry: "O",
};

/** Cúspides + Ascendente + Medio Cielo para un Día Juliano (UT). */
export function computeHouses(
  julianDayUt: number,
  latitude: number,
  longitude: number,
  system: HouseSystem,
  sidereal: boolean,
): HousesResult {
  initEphemeris();
  const flags = sidereal ? sweph.constants.SEFLG_SIDEREAL : 0;
  const res = sweph.houses_ex2(julianDayUt, flags, latitude, longitude, HSYS[system]);
  if (res.flag !== sweph.constants.OK) {
    throw new Error(`houses_ex2 falló: ${res.error ?? "error desconocido"}`);
  }
  const cusps = res.data.houses.slice(0, 12).map((c: number) => normalizeAngle(c));
  const ascendant = normalizeAngle(res.data.points[0]); // points[0] = Ascendente
  const midheaven = normalizeAngle(res.data.points[1]); // points[1] = Medio Cielo
  return { system, cusps, ascendant, midheaven };
}
```

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm --filter @aluna/ephemeris test houses && pnpm --filter @aluna/ephemeris typecheck`
Expected: PASS — AC ≈ 356.10°, MC ≈ 266.72°; whole sign no rompe.

- [ ] **Step 5: Commit**

```bash
git add packages/ephemeris/src/houses.ts packages/ephemeris/src/__tests__/houses.test.ts
git commit -m "feat(ephemeris): houses + angles (6 systems, validated vs Gio AC/MC)"
```

---

## Task 11: Ensamblar `computeChart()` + fixture integral (`src/chart.ts`)

**Files:**
- Create: `packages/ephemeris/src/chart.ts`
- Modify: `packages/ephemeris/src/index.ts`
- Test: `packages/ephemeris/src/__tests__/chart.test.ts`

- [ ] **Step 1: Escribir el test que falla** (la carta completa de Gio)

```ts
// packages/ephemeris/src/__tests__/chart.test.ts
import { describe, it, expect } from "vitest";
import { signOfLongitude } from "@aluna/core";
import { computeChart } from "../chart";

describe("computeChart (carta completa de Gio)", () => {
  const chart = computeChart({
    year: 1984, month: 2, day: 5, hour: 9, minute: 0,
    timeZone: "America/Guayaquil",
    latitude: -0.2167, longitude: -78.5, // 0s13, 78w30 (referencia Astrodienst)
  });

  it("Sol en Acuario casa 11, en exilio", () => {
    const sun = chart.bodies.find((b) => b.body === "sun")!;
    expect(sun.sign).toBe("aquarius");
    expect(sun.dignity).toBe("exile");
    expect(sun.house).toBe(11); // cúspides reales: c11=24°32′Cap, c12=24°08′Acu -> Sol 15°57′Acu en la 11
  });

  it("Marte en Escorpio en domicilio; Júpiter en Capricornio en caída", () => {
    expect(chart.bodies.find((b) => b.body === "mars")!.dignity).toBe("domicile");
    expect(chart.bodies.find((b) => b.body === "jupiter")!.dignity).toBe("fall");
  });

  it("Ascendente Piscis, Medio Cielo Sagitario", () => {
    expect(signOfLongitude(chart.houses.ascendant).sign).toBe("pisces");
    expect(signOfLongitude(chart.houses.midheaven).sign).toBe("sagittarius");
  });

  it("detecta el stellium en Escorpio (Marte+Saturno+Plutón)", () => {
    const stellium = chart.patterns.find((p) => p.type === "stellium");
    expect(stellium).toBeDefined();
    expect(stellium!.bodies).toEqual(expect.arrayContaining(["mars", "saturn", "pluto"]));
  });

  it("incluye aspectos, distribución dominante y meta (TU 14:00)", () => {
    expect(chart.aspects.length).toBeGreaterThan(0);
    expect(chart.distribution.dominantElement).toBeDefined();
    expect(chart.meta.utcHour).toBeCloseTo(14, 5);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter @aluna/ephemeris test chart`
Expected: FAIL — "Cannot find module '../chart'".

- [ ] **Step 3: Implementar `packages/ephemeris/src/chart.ts`**

```ts
// packages/ephemeris/src/chart.ts
import {
  signOfLongitude, houseOfLongitude, dignityOf, detectAspects,
  computeDistribution, detectPatterns,
} from "@aluna/core";
import type { ChartInput, ChartResult, BodyPosition, AspectPoint } from "@aluna/core";
import { localToJulianDay } from "./time";
import { computeBodies } from "./bodies";
import { computeHouses } from "./houses";

const DISTRIBUTION_BODIES = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
]);

export function computeChart(input: ChartInput): ChartResult {
  const system = input.houseSystem ?? "placidus";
  const zodiac = input.zodiac ?? "tropical";
  const sidereal = zodiac === "sidereal";

  const jd = localToJulianDay(input);
  const raw = computeBodies(jd.julianDayEt, {
    nodeType: input.nodeType ?? "true",
    lilithType: input.lilithType ?? "mean",
    sidereal,
  });
  const houses = computeHouses(jd.julianDayUt, input.latitude, input.longitude, system, sidereal);

  const bodies: BodyPosition[] = raw.map((b) => {
    const sp = signOfLongitude(b.longitude);
    return {
      body: b.body,
      longitude: b.longitude,
      sign: sp.sign,
      signDegree: sp.signDegree,
      degree: sp.degree,
      minute: sp.minute,
      second: sp.second,
      speed: b.speed,
      retrograde: b.retrograde,
      house: houseOfLongitude(b.longitude, houses.cusps),
      dignity: dignityOf(b.body, sp.sign),
    };
  });

  // aspectos: cuerpos (con velocidad) + ángulos AC/MC (sin velocidad)
  const aspectPoints: AspectPoint[] = [
    ...bodies.map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed })),
    { key: "ascendant", longitude: houses.ascendant },
    { key: "midheaven", longitude: houses.midheaven },
  ];
  const aspects = detectAspects(aspectPoints);

  const distribution = computeDistribution(
    bodies.filter((b) => DISTRIBUTION_BODIES.has(b.body)).map((b) => ({ key: b.body, longitude: b.longitude })),
  );

  const patterns = detectPatterns(
    bodies.filter((b) => DISTRIBUTION_BODIES.has(b.body)).map((b) => ({ key: b.body, longitude: b.longitude })),
  );

  return {
    bodies,
    houses,
    aspects,
    distribution,
    patterns,
    meta: {
      julianDayUt: jd.julianDayUt,
      julianDayEt: jd.julianDayEt,
      utcHour: jd.utcHour,
      zodiac,
    },
  };
}
```

- [ ] **Step 4: Actualizar `packages/ephemeris/src/index.ts`**

```ts
// packages/ephemeris/src/index.ts
export { initEphemeris } from "./init";
export { localToJulianDay } from "./time";
export { computeBodies } from "./bodies";
export { computeHouses } from "./houses";
export { computeChart } from "./chart";
```

- [ ] **Step 5: Run la suite completa de ephemeris + typecheck**

Run: `pnpm --filter @aluna/ephemeris test && pnpm --filter @aluna/ephemeris typecheck`
Expected: PASS — la carta de Gio completa (Sol Acuario c12 exilio, Marte domicilio, Júpiter caída, Asc Piscis, MC Sagitario, stellium en Escorpio, aspectos, TU 14:00).

- [ ] **Step 6: Commit**

```bash
git add packages/ephemeris/src/chart.ts packages/ephemeris/src/index.ts packages/ephemeris/src/__tests__/chart.test.ts
git commit -m "feat(ephemeris): computeChart() full natal chart assembly (validated vs Gio)"
```

---

## Task 12: Verificación final del monorepo y merge

- [ ] **Step 1: Lint + test + typecheck de TODO el monorepo**

Run: `pnpm lint && pnpm test && pnpm typecheck`
Expected: `@aluna/core` y `@aluna/ephemeris` verdes en los tres.

- [ ] **Step 2: Revisión de calidad** (la maneja el controlador con un subagente revisor; ver subagent-driven-development).

- [ ] **Step 3: Merge a main** (vía finishing-a-development-branch): merge `feat/aluna-fase1-plan2`, verificar tests sobre el merge, borrar rama, push.

---

## Self-review (cobertura contra el spec)

- **Carta natal con 14+ puntos (10 planetas + Quirón, Nodos, Lilith) con signo, grado y dignidad:** Tasks 1-3, 9, 11. ✅
- **Tabla de aspectos con orbes (+ aplicativo/separativo), incluye ángulos AC/MC:** Task 4 + ensamblado Task 11. ✅ (aspectos a ángulos = decisión abierta del spec, resuelta: incluidos.)
- **Triple balance (elemento/modalidad/polaridad) + dominante; cuadrantes:** Task 5. ✅ (hemisferios N/S/E/O se derivan de casas; ampliable en el cliente.)
- **Patrones (stellium, gran trígono, T-cuadrada):** Task 6. ✅ (yod/gran cruz = ampliación futura; el stellium de Gio se valida.)
- **Sistema de casas configurable (Placidus default + Koch/Iguales/Whole/Regiomontano/Porfirio):** Task 10. ✅
- **Zodiaco tropical + sideral (ayanamsha Lahiri):** Tasks 9-11 (flag SIDEREAL + set_sid_mode). ✅ (Jyotish completo = fase futura, fuera de alcance.)
- **Nodo verdadero/medio + Lilith media/osculatriz configurables:** Task 9. ✅
- **Precisión grado/segundo (Swiss Ephemeris + archivos .se1) + zona horaria histórica:** Tasks 7-9 (sweph SWIEPH + luxon). ✅ Validado al arcominuto contra Astrodienst.
- **Cabecera verificable (TU):** `meta.utcHour` (Task 11). ✅ (Tiempo Sideral se puede exponer luego desde houses_ex2 si se requiere en UI.)
- **Decisión de licencia (AGPL vs profesional):** documentada en cabecera. ✅
- **Fuera de alcance (planes siguientes):** Supabase/RLS/caché (Plan 3), clientes web/móvil (Planes 4-5), interpretaciones (Plan 6). ✅

Sin placeholders salvo la nota explícita de limpieza de imports en Task 11 (resuelta en Step 4). Tipos consistentes: `ChartInput/ChartResult/BodyPosition/HousesResult/Aspect/Distribution/Pattern` definidos en Task 1 y usados igual en Tasks 9-11.
