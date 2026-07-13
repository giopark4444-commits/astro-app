# Horóscopo H1 — Motor de eventos + tab Occidental · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar `/horoscopo` (tab Occidental completa) con técnica profesional: casas solares whole-sign, eventos astronómicos reales del periodo (lunaciones/eclipses/estaciones/ingresos), barras de áreas, prosa compuesta desde drivers y Modo Pro.

**Architecture:** Funciones puras nuevas en `@aluna/core` (casas solares + scoring) y `@aluna/ephemeris` (escáner de eventos con bisección, eclipses vía funciones nativas de sweph). Una lib server `apps/web/lib/horoscope/western.ts` computa el payload universal (cacheable por signo+periodo+fecha); la ruta `/api/horoscope/western` añade la capa personal (hits natales) cuando hay perfil. UI espejo del patrón Carta (tabs, chips, Modo Pro, split desktop sticky).

**Tech Stack:** TypeScript strict, Vitest, sweph + luxon (ya presentes), Next.js App Router, CSS Modules + vars, next-intl. **Cero dependencias nuevas.**

**Spec:** `docs/superpowers/specs/2026-07-13-horoscopo-design.md`

## Global Constraints

- Monorepo pnpm: correr todo con `npx pnpm` desde la raíz del worktree (`/Users/gio/astro-app/.claude/worktrees/horoscopo`). pnpm NO está global.
- **NO tocar** archivos de la otra sesión (rama r4b1): `apps/web/components/avatar-upload.tsx`, `apps/web/app/api/avatar/**`, `apps/web/app/(app)/perfil/**`, `apps/web/app/(app)/ajustes/**`.
- CSS Modules + CSS vars, **NO Tailwind**. Tokens existentes: `--ink --soft --acc --acc-rgb --acc-text --line --surface --surface-2 --sp-1..6 --text-xs/sm/md/xl --font-display --tone-warm --tone-cool --glow-soft --dur-fast --ease`. Primitivos globales: `.card`, `.card--interactive`, `.chip--control`, `.chip--control-on`, `.seg__item`, `.seg__item--active`, `.reveal`.
- Glifos astrológicos SIEMPRE con `U+FE0E` (`"︎"`) para presentación de texto (no emoji).
- `@aluna/ephemeris` es server-only: solo se importa en rutas API/lib server (`runtime = "nodejs"` + `setEphePath` como en `/api/chart`).
- Bilingüe ES/EN en todo (messages + contenido). Voz Aluna: evolutiva-yóguica, sin asteriscos, sin fatalismo (retrógrado ≠ miedo).
- La prosa se compone SOLO desde datos calculados — nunca puede contradecir la tabla Pro (regla anti-funa).
- Tests: Vitest. Los tests de apps/web que usen `@aluna/ephemeris` deben llamar `setEphePath(path.join(__dirname, ...ruta a packages/ephemeris/ephe))` antes de computar.
- Commits frecuentes, convención del repo: `feat(horoscopo): …`, `test(horoscopo): …`.
- Gate final real: `npx pnpm turbo run typecheck test` + `npx pnpm --filter @aluna/web build` (la lección del repo: el gate es `next build`, no solo tsc).

## Mapa de archivos

```
packages/core/src/astrology/life-areas.ts        [modificar: exportar pesos]
packages/core/src/astrology/solar-houses.ts      [crear]
packages/core/src/astrology/__tests__/solar-houses.test.ts [crear]
packages/core/src/index.ts                       [modificar: exports]
packages/ephemeris/src/events.ts                 [crear]
packages/ephemeris/src/__tests__/events.test.ts  [crear]
packages/ephemeris/src/index.ts                  [modificar: exports]
apps/web/lib/horoscope/western.ts                [crear]
apps/web/lib/horoscope/__tests__/western.test.ts [crear]
apps/web/app/api/horoscope/western/route.ts      [crear]
apps/web/components/area-bars.tsx + .module.css  [crear]
apps/web/components/__tests__/area-bars.test.tsx [crear]
apps/web/app/(app)/hoy/energy-panel.tsx          [modificar: usar AreaBars]
apps/web/app/(app)/hoy/energy.module.css         [modificar: mover clases]
apps/web/lib/content/horoscope-es.ts / -en.ts    [crear]
apps/web/lib/content/__tests__/horoscope.test.ts [crear]
apps/web/app/(app)/horoscopo/page.tsx            [crear]
apps/web/app/(app)/horoscopo/horoscopo-view.tsx  [crear]
apps/web/app/(app)/horoscopo/sky-events.tsx      [crear]
apps/web/app/(app)/horoscopo/horoscope-reading.tsx [crear, T9]
apps/web/app/(app)/horoscopo/horoscopo.module.css [crear]
apps/web/app/api/horoscope-reading/route.ts      [crear, T9]
apps/web/components/top-nav.tsx                  [modificar: soon:false]
apps/web/components/__tests__/top-nav.test.tsx   [modificar]
apps/web/app/(app)/hoy/hub-view.tsx              [modificar: tile]
apps/web/messages/es.json / en.json              [modificar: bloque horoscopo]
```

---

### Task 1: Core — casas solares whole-sign + scoring por casa

**Files:**
- Modify: `packages/core/src/astrology/life-areas.ts` (exportar `TRANSIT_WEIGHT`, `BENEFIC`, `MALEFIC`)
- Create: `packages/core/src/astrology/solar-houses.ts`
- Create: `packages/core/src/astrology/__tests__/solar-houses.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `ZODIAC_SIGNS`, `ASPECTS` (constants), `signOfLongitude` (signs.ts), `scoreTone`, `LIFE_AREAS`, tipos `LifeArea`/`ScoreTone` (life-areas.ts).
- Produces (las usan T4/T5/T7/T8):
  - `solarHouseOf(baseSign: string, longitude: number): number` (1..12)
  - `solarPlacements(baseSign, bodies: SolarBodyInput[]): SolarHousePlacement[]`
  - `signAspectsToSign(baseSign, bodies: SolarBodyInput[]): SignAspect[]`
  - `scoreLifeAreasBySolarHouse(placements: SolarHousePlacement[]): SolarLifeAreaScore[]`
  - Tipos: `SolarBodyInput {body,longitude,retrograde}`, `SolarHousePlacement {body,sign,house,retrograde}`, `SignAspect {body,sign,aspect,harmony}`, `SolarHouseDriver {body,house,favorable}`, `SolarLifeAreaScore {area,score,tone,drivers}`
  - `SOLAR_HOUSE_AREAS: Record<LifeArea, readonly number[]>`

- [ ] **Step 1: Exportar pesos desde life-areas.ts**

En `packages/core/src/astrology/life-areas.ts` cambiar las tres declaraciones privadas (líneas ~49-67) a exportadas, sin tocar valores:

```ts
export const TRANSIT_WEIGHT: Record<string, number> = { /* …igual… */ };
export const BENEFIC = new Set(["venus", "jupiter"]);
export const MALEFIC = new Set(["mars", "saturn", "pluto"]);
```

- [ ] **Step 2: Test que falla**

`packages/core/src/astrology/__tests__/solar-houses.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  solarHouseOf, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  SOLAR_HOUSE_AREAS,
} from "../solar-houses";

describe("solarHouseOf", () => {
  it("una longitud dentro del signo base es casa 1; el siguiente signo, casa 2; con wrap", () => {
    // Acuario = índice 10 → 300°..330°
    expect(solarHouseOf("aquarius", 315)).toBe(1);
    expect(solarHouseOf("aquarius", 335)).toBe(2);  // Piscis
    expect(solarHouseOf("aquarius", 5)).toBe(3);    // Aries (wrap)
    expect(solarHouseOf("aries", 5)).toBe(1);
    expect(solarHouseOf("aries", 355)).toBe(12);    // Piscis para Aries
  });
});

describe("signAspectsToSign", () => {
  it("detecta aspectos mayores por signo (whole-sign)", () => {
    const asps = signAspectsToSign("leo", [
      { body: "saturn", longitude: 310, retrograde: false }, // Acuario → oposición
      { body: "mars", longitude: 15, retrograde: false },    // Aries → trígono
      { body: "venus", longitude: 125, retrograde: false },  // Leo → conjunción
      { body: "moon", longitude: 95, retrograde: false },    // Cáncer → semisextil (menor) NO sale
    ]);
    const byBody = Object.fromEntries(asps.map((a) => [a.body, a]));
    expect(byBody.saturn!.aspect).toBe("opposition");
    expect(byBody.saturn!.harmony).toBe("hard");
    expect(byBody.mars!.aspect).toBe("trine");
    expect(byBody.venus!.aspect).toBe("conjunction");
    expect(byBody.moon).toBeUndefined();
  });
});

describe("scoreLifeAreasBySolarHouse", () => {
  it("benéfico en casa del área sube; maléfico baja; drivers explican", () => {
    const up = scoreLifeAreasBySolarHouse([
      { body: "jupiter", sign: "virgo", house: 2, retrograde: false },
    ]);
    const money = up.find((a) => a.area === "money")!;
    expect(money.score).toBeGreaterThan(50);
    expect(money.drivers[0]).toEqual({ body: "jupiter", house: 2, favorable: true });

    const down = scoreLifeAreasBySolarHouse([
      { body: "saturn", sign: "virgo", house: 10, retrograde: false },
    ]);
    const work = down.find((a) => a.area === "work")!;
    expect(work.score).toBeLessThan(50);
    expect(work.drivers[0]!.favorable).toBe(false);
  });
  it("todas las casas 1..12 están mapeadas a alguna área", () => {
    const covered = new Set(Object.values(SOLAR_HOUSE_AREAS).flat());
    for (let h = 1; h <= 12; h++) expect(covered.has(h)).toBe(true);
  });
  it("sin placements, todo 50/mixed", () => {
    for (const a of scoreLifeAreasBySolarHouse([])) {
      expect(a.score).toBe(50);
      expect(a.tone).toBe("mixed");
    }
  });
});
```

- [ ] **Step 3: Correr y ver fallar**

Run: `npx pnpm --filter @aluna/core test -- solar-houses`
Expected: FAIL — módulo `../solar-houses` no existe.

- [ ] **Step 4: Implementación**

`packages/core/src/astrology/solar-houses.ts`:

```ts
// packages/core/src/astrology/solar-houses.ts
// Horóscopo por signo, técnica profesional: el signo elegido ES la casa 1
// (whole-sign) y los tránsitos se leen por la casa solar que ocupan, más los
// aspectos SIGNO-A-SIGNO (whole-sign, sin grados inventados — anti-funa).
import { ZODIAC_SIGNS, ASPECTS, type AspectHarmony } from "../constants/astrology";
import { signOfLongitude } from "./signs";
import {
  LIFE_AREAS, scoreTone, TRANSIT_WEIGHT, BENEFIC, MALEFIC,
  type LifeArea, type ScoreTone,
} from "./life-areas";

export interface SolarBodyInput { body: string; longitude: number; retrograde: boolean; }
export interface SolarHousePlacement { body: string; sign: string; house: number; retrograde: boolean; }
export interface SignAspect { body: string; sign: string; aspect: string; harmony: AspectHarmony; }
export interface SolarHouseDriver { body: string; house: number; favorable: boolean; }
export interface SolarLifeAreaScore { area: LifeArea; score: number; tone: ScoreTone; drivers: SolarHouseDriver[]; }

const SIGN_INDEX: Record<string, number> = Object.fromEntries(ZODIAC_SIGNS.map((s, i) => [s.key, i]));

/** Casa solar whole-sign: el signo base es la casa 1. */
export function solarHouseOf(baseSign: string, longitude: number): number {
  const base = SIGN_INDEX[baseSign];
  if (base === undefined) throw new Error(`Signo desconocido: ${baseSign}`);
  const idx = SIGN_INDEX[signOfLongitude(longitude).sign]!;
  return ((idx - base + 12) % 12) + 1;
}

export function solarPlacements(baseSign: string, bodies: SolarBodyInput[]): SolarHousePlacement[] {
  return bodies.map((b) => ({
    body: b.body,
    sign: signOfLongitude(b.longitude).sign,
    house: solarHouseOf(baseSign, b.longitude),
    retrograde: b.retrograde,
  }));
}

/** Aspectos por signo (mayores): distancia entre signos × 30° comparada exacta. */
export function signAspectsToSign(baseSign: string, bodies: SolarBodyInput[]): SignAspect[] {
  const base = SIGN_INDEX[baseSign];
  if (base === undefined) throw new Error(`Signo desconocido: ${baseSign}`);
  const majors = ASPECTS.filter((a) => a.major);
  const out: SignAspect[] = [];
  for (const b of bodies) {
    const sign = signOfLongitude(b.longitude).sign;
    const d = (SIGN_INDEX[sign]! - base + 12) % 12;
    const sep = Math.min(d, 12 - d) * 30;
    const asp = majors.find((a) => a.angle === sep);
    if (asp) out.push({ body: b.body, sign, aspect: asp.key, harmony: asp.harmony });
  }
  return out;
}

// Regencias por casa solar (tradición helenística simplificada y defendible):
// 5/7 amor · 2/8 recurso propio/compartido · 6/10 oficio/vocación ·
// 1/6/12 cuerpo-hábitos-descanso · 3/4 mente-raíz · 9/11 fortuna/buen espíritu.
export const SOLAR_HOUSE_AREAS: Record<LifeArea, readonly number[]> = {
  love: [5, 7],
  money: [2, 8],
  work: [6, 10],
  health: [1, 6, 12],
  mood: [3, 4],
  luck: [9, 11],
};

const BASE = 50;
const HOUSE_IMPACT = 12; // presencia en casa: más suave que un aspecto exacto (18)

function valenceOf(body: string): number {
  if (BENEFIC.has(body)) return 1;
  if (MALEFIC.has(body)) return -0.6;
  return 0.3; // activación suave
}

/** Puntúa las 6 áreas por PRESENCIA en casas solares. Determinista y explicable. */
export function scoreLifeAreasBySolarHouse(placements: SolarHousePlacement[]): SolarLifeAreaScore[] {
  const raw: Record<LifeArea, number> = { love: BASE, money: BASE, work: BASE, health: BASE, mood: BASE, luck: BASE };
  const contribs: Record<LifeArea, Array<{ delta: number; p: SolarHousePlacement }>> = {
    love: [], money: [], work: [], health: [], mood: [], luck: [],
  };
  for (const p of placements) {
    const delta = valenceOf(p.body) * HOUSE_IMPACT * (TRANSIT_WEIGHT[p.body] ?? 0.8);
    if (delta === 0) continue;
    for (const area of LIFE_AREAS) {
      if (SOLAR_HOUSE_AREAS[area].includes(p.house)) {
        raw[area] += delta;
        contribs[area].push({ delta, p });
      }
    }
  }
  return LIFE_AREAS.map((area) => {
    const score = Math.round(Math.min(100, Math.max(0, raw[area])));
    return {
      area,
      score,
      tone: scoreTone(score),
      drivers: contribs[area]
        .slice()
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
        .slice(0, 3)
        .map((c) => ({ body: c.p.body, house: c.p.house, favorable: c.delta > 0 })),
    };
  });
}
```

En `packages/core/src/index.ts`, tras el bloque de life-areas, añadir:

```ts
export {
  solarHouseOf, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  SOLAR_HOUSE_AREAS,
} from "./astrology/solar-houses";
export type {
  SolarBodyInput, SolarHousePlacement, SignAspect, SolarHouseDriver, SolarLifeAreaScore,
} from "./astrology/solar-houses";
export { TRANSIT_WEIGHT, BENEFIC, MALEFIC } from "./astrology/life-areas";
```

- [ ] **Step 5: Verificar verde + suite core completa**

Run: `npx pnpm --filter @aluna/core test`
Expected: PASS (los 151 previos + nuevos; el cambio de export en life-areas no rompe nada).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src
git commit -m "feat(horoscopo): casas solares whole-sign + aspectos por signo + scoring por casa en @aluna/core"
```

---

### Task 2: Ephemeris — escáner de cruces + lunaciones con eclipses nativos

**Files:**
- Create: `packages/ephemeris/src/events.ts`
- Create: `packages/ephemeris/src/__tests__/events.test.ts`
- Modify: `packages/ephemeris/src/index.ts`

**Interfaces:**
- Consumes: `computeBodies(julianDayEt)` (bodies.ts), `localToJulianDay` (time.ts), `initEphemeris` (init.ts), `normalizeAngle`/`signOfLongitude`/`angularSeparation` de `@aluna/core`, `sweph.sol_eclipse_when_glob` / `sweph.lun_eclipse_when` (verificado: existen en el .d.ts del binding).
- Produces (T3 añade más eventos al mismo archivo; T4 consume):
  - `type SkyEvent = { kind:"lunation"; atIso:string; phase:"new"|"full"; sign:string; longitude:number; eclipse:"solar"|"lunar"|null } | { kind:"station"; atIso:string; body:string; direction:"retrograde"|"direct"; sign:string } | { kind:"ingress"; atIso:string; body:string; fromSign:string; toSign:string }`
  - `lunations(fromIso: string, toIso: string): SkyEvent[]`
  - Helper interno reutilizable: `findCrossings(fromIso, toIso, stepDays, f)` (bisección; guard de discontinuidad).

- [ ] **Step 1: Test que falla**

`packages/ephemeris/src/__tests__/events.test.ts` (el vitest.config del paquete ya resuelve la ruta ephe por cwd, igual que los tests existentes):

```ts
import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { normalizeAngle } from "@aluna/core";
import { computeBodies } from "../bodies";
import { localToJulianDay } from "../time";
import { lunations } from "../events";

function elongationAt(iso: string): number {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  const bodies = computeBodies(julianDayEt);
  const sun = bodies.find((b) => b.body === "sun")!.longitude;
  const moon = bodies.find((b) => b.body === "moon")!.longitude;
  return normalizeAngle(moon - sun);
}

describe("lunations", () => {
  const all2026 = lunations("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");

  it("encuentra 12-13 nuevas y 12-13 llenas en 2026, alternadas y exactas", () => {
    const news = all2026.filter((e) => e.kind === "lunation" && e.phase === "new");
    const fulls = all2026.filter((e) => e.kind === "lunation" && e.phase === "full");
    expect(news.length).toBeGreaterThanOrEqual(12);
    expect(news.length).toBeLessThanOrEqual(13);
    expect(fulls.length).toBeGreaterThanOrEqual(12);
    expect(fulls.length).toBeLessThanOrEqual(13);
    // exactitud interna: elongación ≈ 0/180 en el instante hallado
    for (const e of all2026) {
      if (e.kind !== "lunation") continue;
      const el = elongationAt(e.atIso);
      const target = e.phase === "new" ? 0 : 180;
      const diff = Math.abs(((el - target + 540) % 360) - 180);
      expect(diff).toBeLessThan(0.01);
    }
  });

  it("bandera de eclipse: exactamente los 4 eclipses de 2026 (17-feb solar, 3-mar lunar, 12-ago solar, 28-ago lunar)", () => {
    const flagged = all2026
      .filter((e): e is Extract<typeof e, { kind: "lunation" }> => e.kind === "lunation" && e.eclipse !== null)
      .map((e) => ({ date: e.atIso.slice(0, 10), eclipse: e.eclipse }));
    expect(flagged).toHaveLength(4);
    const dates = flagged.map((f) => f.date);
    // ±1 día de tolerancia por zona horaria del máximo
    const near = (target: string) => dates.some((d) => Math.abs(DateTime.fromISO(d).diff(DateTime.fromISO(target), "days").days) <= 1);
    expect(near("2026-02-17")).toBe(true);
    expect(near("2026-03-03")).toBe(true);
    expect(near("2026-08-12")).toBe(true);
    expect(near("2026-08-28")).toBe(true);
    expect(flagged.filter((f) => f.eclipse === "solar")).toHaveLength(2);
    expect(flagged.filter((f) => f.eclipse === "lunar")).toHaveLength(2);
  });

  it("rango de un mes contiene al menos una nueva o llena, ordenadas por fecha", () => {
    const july = lunations("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z");
    expect(july.length).toBeGreaterThanOrEqual(1);
    const times = july.map((e) => DateTime.fromISO(e.atIso).toMillis());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx pnpm --filter @aluna/ephemeris test -- events`
Expected: FAIL — `../events` no existe.

- [ ] **Step 3: Implementación**

`packages/ephemeris/src/events.ts`:

```ts
// packages/ephemeris/src/events.ts
// Eventos astronómicos de un rango: lunaciones (+eclipse), estaciones, ingresos.
// Técnica: muestreo + bisección sobre f(t) continua (mismo espíritu Newton que
// derived.ts/jie.ts, pero con bracket garantizado). Server-only (sweph).
import { DateTime } from "luxon";
import sweph from "sweph";
import { normalizeAngle, signOfLongitude } from "@aluna/core";
import { computeBodies, type RawBody } from "./bodies";
import { localToJulianDay } from "./time";
import { initEphemeris } from "./init";

export type SkyEvent =
  | { kind: "lunation"; atIso: string; phase: "new" | "full"; sign: string; longitude: number; eclipse: "solar" | "lunar" | null }
  | { kind: "station"; atIso: string; body: string; direction: "retrograde" | "direct"; sign: string }
  | { kind: "ingress"; atIso: string; body: string; fromSign: string; toSign: string };

interface Jd { et: number; ut: number; }

function jdAt(dt: DateTime): Jd {
  const u = dt.toUTC();
  const r = localToJulianDay({ year: u.year, month: u.month, day: u.day, hour: u.hour, minute: u.minute, timeZone: "utc" });
  return { et: r.julianDayEt, ut: r.julianDayUt };
}

function bodiesAt(dt: DateTime): RawBody[] {
  return computeBodies(jdAt(dt).et);
}

function bodyAt(dt: DateTime, key: string): RawBody {
  const b = bodiesAt(dt).find((x) => x.body === key);
  if (!b) throw new Error(`cuerpo desconocido: ${key}`);
  return b;
}

/** Delta con signo hacia el objetivo, en (-180, 180] — continua salvo en la antípoda. */
function signedDelta(target: number, value: number): number {
  return ((target - value + 540) % 360) - 180;
}

/**
 * Raíces de f en [from,to]: muestrea cada stepDays; donde f cambia de signo SIN
 * salto de discontinuidad (|f1-f0| < jumpGuard), bisecta 40 veces (~µs de precisión
 * temporal sobra; nos quedamos a ~seg). Devuelve los DateTime de las raíces.
 */
function findCrossings(
  from: DateTime, to: DateTime, stepDays: number,
  f: (dt: DateTime) => number, jumpGuard = 180,
): DateTime[] {
  const out: DateTime[] = [];
  let t0 = from;
  let f0 = f(t0);
  while (t0 < to) {
    const t1 = DateTime.min(t0.plus({ days: stepDays }), to);
    const f1 = f(t1);
    if (f0 === 0) out.push(t0);
    else if (Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) < jumpGuard) {
      let a = t0, b = t1, fa = f0;
      for (let i = 0; i < 40; i++) {
        const m = DateTime.fromMillis((a.toMillis() + b.toMillis()) / 2, { zone: "utc" });
        const fm = f(m);
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
      }
      out.push(a);
    }
    if (t1.equals(to)) break;
    t0 = t1;
    f0 = f1;
  }
  return out;
}

const ECLIPSE_FLAGS = () => sweph.constants.SEFLG_SWIEPH;

/** ¿Hay eclipse cuyo máximo cae a <2 días del instante? (funciones nativas de sweph). */
function eclipseNear(jdUt: number, phase: "new" | "full"): "solar" | "lunar" | null {
  initEphemeris();
  try {
    const r = phase === "new"
      ? sweph.sol_eclipse_when_glob(jdUt - 2, ECLIPSE_FLAGS(), 0, false)
      : sweph.lun_eclipse_when(jdUt - 2, ECLIPSE_FLAGS(), 0, false);
    if (r.flag < 0) return null;
    const maxJd = r.data[0]!;
    if (Math.abs(maxJd - jdUt) < 2) return phase === "new" ? "solar" : "lunar";
    return null;
  } catch {
    return null; // defensivo: sin bandera antes que bandera falsa (anti-funa)
  }
}

/** Lunas Nuevas y Llenas del rango, con bandera de eclipse, ordenadas. */
export function lunations(fromIso: string, toIso: string): SkyEvent[] {
  const from = DateTime.fromISO(fromIso, { zone: "utc" });
  const to = DateTime.fromISO(toIso, { zone: "utc" });
  const elong = (dt: DateTime) => {
    const bs = bodiesAt(dt);
    const sun = bs.find((b) => b.body === "sun")!.longitude;
    const moon = bs.find((b) => b.body === "moon")!.longitude;
    return normalizeAngle(moon - sun);
  };
  const out: SkyEvent[] = [];
  for (const phase of ["new", "full"] as const) {
    const target = phase === "new" ? 0 : 180;
    // elongación crece ~12.2°/día; paso 1d = ~12° por muestra, seguro con guard 90
    const roots = findCrossings(from, to, 1, (dt) => signedDelta(target, elong(dt)), 90);
    for (const dt of roots) {
      const moon = bodyAt(dt, "moon");
      out.push({
        kind: "lunation",
        atIso: dt.toUTC().toISO()!,
        phase,
        sign: signOfLongitude(moon.longitude).sign,
        longitude: moon.longitude,
        eclipse: eclipseNear(jdAt(dt).ut, phase),
      });
    }
  }
  return out.sort((a, b) => a.atIso.localeCompare(b.atIso));
}
```

En `packages/ephemeris/src/index.ts` añadir:

```ts
export { computeBodies, type RawBody, type BodiesOptions } from "./bodies";
export { lunations, type SkyEvent } from "./events";
```

- [ ] **Step 4: Verificar verde**

Run: `npx pnpm --filter @aluna/ephemeris test`
Expected: PASS. Si la aserción de eclipses falla porque la firma real de `sol_eclipse_when_glob`/`lun_eclipse_when` difiere (orden de args del binding), leer `node_modules/.pnpm/sweph@*/node_modules/sweph/index.d.ts`, ajustar la llamada y re-correr — las 4 fechas canónicas de 2026 son el árbitro, NO relajar el test.

- [ ] **Step 5: Commit**

```bash
git add packages/ephemeris/src
git commit -m "feat(horoscopo): escáner de eventos + lunaciones con eclipses nativos en @aluna/ephemeris"
```

---

### Task 3: Ephemeris — estaciones, ingresos y fecha de exactitud

**Files:**
- Modify: `packages/ephemeris/src/events.ts` (añadir al final)
- Modify: `packages/ephemeris/src/__tests__/events.test.ts` (añadir describes)
- Modify: `packages/ephemeris/src/index.ts`

**Interfaces:**
- Consumes: `findCrossings`, `bodyAt`, `signedDelta` (internos de events.ts, Task 2), `angularSeparation` de `@aluna/core`.
- Produces (T4/T5 consumen):
  - `stations(fromIso, toIso): SkyEvent[]` — cuerpos mercury…pluto + chiron
  - `ingresses(fromIso, toIso, opts?: { includeMoon?: boolean }): SkyEvent[]` — sun…pluto (+moon opcional)
  - `exactAspectAt(body: string, fixedLongitude: number, aspectAngle: number, nearIso: string, windowDays?: number): string | null`

- [ ] **Step 1: Tests que fallan (añadir al mismo archivo de test)**

```ts
import { stations, ingresses, exactAspectAt } from "../events";
import { angularSeparation } from "@aluna/core";

describe("stations", () => {
  const st2026 = stations("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");
  it("Mercurio tiene 6 estaciones en 2026 (3 ℞ + 3 D), alternadas, con velocidad ≈ 0", () => {
    const merc = st2026.filter((e) => e.kind === "station" && e.body === "mercury");
    expect(merc).toHaveLength(6);
    const dirs = merc.map((e) => (e.kind === "station" ? e.direction : ""));
    expect(dirs.filter((d) => d === "retrograde")).toHaveLength(3);
    expect(dirs.filter((d) => d === "direct")).toHaveLength(3);
    for (let i = 1; i < dirs.length; i++) expect(dirs[i]).not.toBe(dirs[i - 1]);
    for (const e of merc) {
      const d = DateTime.fromISO(e.atIso, { zone: "utc" });
      const { julianDayEt } = localToJulianDay({ year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc" });
      const speed = computeBodies(julianDayEt).find((b) => b.body === "mercury")!.speed;
      expect(Math.abs(speed)).toBeLessThan(0.005);
    }
  });
  it("el Sol y la Luna nunca estacionan", () => {
    expect(st2026.some((e) => e.kind === "station" && (e.body === "sun" || e.body === "moon"))).toBe(false);
  });
});

describe("ingresses", () => {
  it("el Sol ingresa 12 veces en 2026 y el equinoccio de Aries cae ~20-mar", () => {
    const sun = ingresses("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z")
      .filter((e) => e.kind === "ingress" && e.body === "sun");
    expect(sun).toHaveLength(12);
    const aries = sun.find((e) => e.kind === "ingress" && e.toSign === "aries")!;
    expect(["2026-03-19", "2026-03-20", "2026-03-21"]).toContain(aries.atIso.slice(0, 10));
  });
  it("la Luna solo aparece con includeMoon y da ~13 ingresos en julio", () => {
    const without = ingresses("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z");
    expect(without.some((e) => e.kind === "ingress" && e.body === "moon")).toBe(false);
    const withMoon = ingresses("2026-07-01T00:00:00Z", "2026-07-31T23:59:59Z", { includeMoon: true })
      .filter((e) => e.kind === "ingress" && e.body === "moon");
    expect(withMoon.length).toBeGreaterThanOrEqual(12);
    expect(withMoon.length).toBeLessThanOrEqual(15);
  });
});

describe("exactAspectAt", () => {
  it("encuentra el instante en que un tránsito perfecciona un aspecto a un punto fijo", () => {
    // Punto fijo artificial: la longitud del Sol el 1-jul-2026 + 90° → el Sol lo
    // cuadra (~0°) cerca de esa fecha y lo perfecciona al avanzar.
    const d = DateTime.fromISO("2026-07-01T12:00:00Z", { zone: "utc" });
    const { julianDayEt } = localToJulianDay({ year: 2026, month: 7, day: 1, hour: 12, minute: 0, timeZone: "utc" });
    const sunLon = computeBodies(julianDayEt).find((b) => b.body === "sun")!.longitude;
    const fixed = (sunLon + 93 + 360) % 360; // el Sol llegará a 90° de él en ~3 días
    const iso = exactAspectAt("sun", fixed, 90, "2026-07-01T12:00:00Z", 10);
    expect(iso).not.toBeNull();
    const dt = DateTime.fromISO(iso!, { zone: "utc" });
    expect(Math.abs(dt.diff(d, "days").days)).toBeLessThan(6);
    const jd = localToJulianDay({ year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, timeZone: "utc" }).julianDayEt;
    const lon = computeBodies(jd).find((b) => b.body === "sun")!.longitude;
    expect(Math.abs(angularSeparation(lon, fixed) - 90)).toBeLessThan(0.01);
  });
  it("devuelve null si no perfecciona dentro de la ventana", () => {
    // Saturno se mueve ~0.03-0.12°/día: en ±1 día no puede cruzar un aspecto
    // salvo que YA esté a milésimas — con punto fijo 0° y su posición real de
    // jul-2026 (Aries ~29-30°, separación ~30°) no hay cruce de 90° posible.
    expect(exactAspectAt("saturn", 0, 90, "2026-07-01T12:00:00Z", 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx pnpm --filter @aluna/ephemeris test -- events`
Expected: FAIL — `stations`/`ingresses`/`exactAspectAt` no exportados.

- [ ] **Step 3: Implementación (añadir al final de events.ts)**

```ts
import { angularSeparation } from "@aluna/core"; // fusionar con el import existente de @aluna/core

const STATION_BODIES = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"] as const;
const INGRESS_BODIES = ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

/** Estaciones (velocidad = 0) del rango. Dirección: signo de la velocidad DESPUÉS. */
export function stations(fromIso: string, toIso: string): SkyEvent[] {
  const from = DateTime.fromISO(fromIso, { zone: "utc" });
  const to = DateTime.fromISO(toIso, { zone: "utc" });
  const out: SkyEvent[] = [];
  for (const body of STATION_BODIES) {
    const roots = findCrossings(from, to, 1, (dt) => bodyAt(dt, body).speed);
    for (const dt of roots) {
      const after = bodyAt(dt.plus({ days: 1 }), body);
      out.push({
        kind: "station",
        atIso: dt.toUTC().toISO()!,
        body,
        direction: after.speed < 0 ? "retrograde" : "direct",
        sign: signOfLongitude(after.longitude).sign,
      });
    }
  }
  return out.sort((a, b) => a.atIso.localeCompare(b.atIso));
}

/** Ingresos de signo del rango (detecta cambio de signo muestreado y refina la frontera). */
export function ingresses(fromIso: string, toIso: string, opts: { includeMoon?: boolean } = {}): SkyEvent[] {
  const from = DateTime.fromISO(fromIso, { zone: "utc" });
  const to = DateTime.fromISO(toIso, { zone: "utc" });
  const bodies = opts.includeMoon ? ["moon", ...INGRESS_BODIES] : [...INGRESS_BODIES];
  const out: SkyEvent[] = [];
  for (const body of bodies) {
    const step = body === "moon" ? 0.5 : 1;
    let t0 = from;
    let lon0 = bodyAt(t0, body).longitude;
    while (t0 < to) {
      const t1 = DateTime.min(t0.plus({ days: step }), to);
      const lon1 = bodyAt(t1, body).longitude;
      const s0 = Math.floor(lon0 / 30), s1 = Math.floor(lon1 / 30);
      if (s0 !== s1) {
        // Frontera compartida: al avanzar es el inicio del signo nuevo; al
        // retroceder (retro), el inicio del signo que se abandona.
        const forward = ((s1 - s0 + 12) % 12) === 1;
        const boundary = (forward ? s1 : s0) * 30;
        const root = findCrossings(t0, t1, step, (dt) => signedDelta(boundary, bodyAt(dt, body).longitude), 90)[0];
        if (root) {
          const fromSign = signOfLongitude((boundary - 1 + 360) % 360).sign;
          const toSign = signOfLongitude((boundary + 1) % 360).sign;
          out.push({
            kind: "ingress",
            atIso: root.toUTC().toISO()!,
            body,
            fromSign: forward ? fromSign : toSign,
            toSign: forward ? toSign : fromSign,
          });
        }
      }
      if (t1.equals(to)) break;
      t0 = t1;
      lon0 = lon1;
    }
  }
  return out.sort((a, b) => a.atIso.localeCompare(b.atIso));
}

/** Instante (ISO) en que `body` perfecciona `aspectAngle` con un punto fijo, cerca de nearIso. */
export function exactAspectAt(
  body: string, fixedLongitude: number, aspectAngle: number,
  nearIso: string, windowDays = 20,
): string | null {
  const center = DateTime.fromISO(nearIso, { zone: "utc" });
  const from = center.minus({ days: windowDays });
  const to = center.plus({ days: windowDays });
  const f = (dt: DateTime) => angularSeparation(bodyAt(dt, body).longitude, fixedLongitude) - aspectAngle;
  const roots = findCrossings(from, to, 0.5, f, 90);
  if (roots.length === 0) return null;
  const nearest = roots.reduce((best, r) =>
    Math.abs(r.diff(center, "days").days) < Math.abs(best.diff(center, "days").days) ? r : best);
  return nearest.toUTC().toISO()!;
}
```

En `packages/ephemeris/src/index.ts` ampliar la línea de events:

```ts
export { lunations, stations, ingresses, exactAspectAt, type SkyEvent } from "./events";
```

- [ ] **Step 4: Verificar verde (suite completa del paquete)**

Run: `npx pnpm --filter @aluna/ephemeris test`
Expected: PASS (36 previos + nuevos). Nota: la suite de events tarda más (escaneo anual); si supera el timeout de vitest, subir `testTimeout` a 120000 SOLO en este describe con `describe("...", { timeout: 120000 }, ...)`.

- [ ] **Step 5: Commit**

```bash
git add packages/ephemeris/src
git commit -m "feat(horoscopo): estaciones, ingresos y fecha de exactitud en el escáner de eventos"
```

---

### Task 4: Web lib — payload universal occidental + caché

**Files:**
- Create: `apps/web/lib/horoscope/western.ts`
- Create: `apps/web/lib/horoscope/__tests__/western.test.ts`

**Interfaces:**
- Consumes: `solarPlacements`, `signAspectsToSign`, `scoreLifeAreasBySolarHouse`, tipos solares (T1); `computeBodies`, `lunations`, `stations`, `ingresses`, `setEphePath`, `localToJulianDay` (T2/T3); `ZODIAC_SIGNS` de core; `DateTime` de luxon.
- Produces (T5/T9 consumen):
  - `type HoroscopePeriod = "today" | "week" | "month" | "year"`
  - `resolvePeriodRange(period, tz, nowIso?): { fromIso; toIso; sampleIsos: string[]; localDate: string; offsetMinutes: number }`
  - `computeWesternHoroscope(sign, period, tz, nowIso?): WesternPayload`
  - `cachedWesternHoroscope(sign, period, tz, nowIso?): WesternPayload` (LRU universal)
  - `type WesternPayload = { sign; period; range: {fromIso; toIso}; tz: string; houses: SolarHousePlacement[]; signAspects: SignAspect[]; events: SkyEvent[]; areas: SolarLifeAreaScore[] }`
  - `isValidTz(tz: string): boolean`

- [ ] **Step 1: Test que falla**

`apps/web/lib/horoscope/__tests__/western.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setEphePath } from "@aluna/ephemeris";
import {
  resolvePeriodRange, computeWesternHoroscope, cachedWesternHoroscope, isValidTz,
} from "../western";

// Los tests corren con cwd apps/web → la carpeta .se1 vive dos niveles arriba.
setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const NOW = "2026-07-13T21:00:00Z"; // lunes 13-jul-2026, 16:00 en Bogotá

describe("resolvePeriodRange", () => {
  it("semana = lunes a domingo del calendario local", () => {
    const r = resolvePeriodRange("week", "America/Bogota", NOW);
    expect(r.fromIso.slice(0, 10)).toBe("2026-07-13"); // lunes
    expect(r.toIso.slice(0, 10)).toBe("2026-07-19");   // domingo
    expect(r.sampleIsos).toHaveLength(7);
  });
  it("muestras deterministas a mediodía local (mismo día → misma clave)", () => {
    const a = resolvePeriodRange("today", "America/Bogota", "2026-07-13T14:00:00Z");
    const b = resolvePeriodRange("today", "America/Bogota", "2026-07-13T23:00:00Z");
    expect(a.sampleIsos).toEqual(b.sampleIsos);
    expect(a.localDate).toBe("2026-07-13");
  });
  it("mes = 6 muestras, año = 12", () => {
    expect(resolvePeriodRange("month", "utc", NOW).sampleIsos).toHaveLength(6);
    expect(resolvePeriodRange("year", "utc", NOW).sampleIsos).toHaveLength(12);
  });
  it("tz inválida cae a utc", () => {
    expect(isValidTz("America/Bogota")).toBe(true);
    expect(isValidTz("No/Existe")).toBe(false);
    const r = resolvePeriodRange("today", "No/Existe", NOW);
    expect(r.offsetMinutes).toBe(0);
  });
});

describe("computeWesternHoroscope", () => {
  it("payload completo y coherente para Acuario/hoy", () => {
    const p = computeWesternHoroscope("aquarius", "today", "America/Bogota", NOW);
    expect(p.sign).toBe("aquarius");
    expect(p.houses.length).toBeGreaterThanOrEqual(10);
    for (const h of p.houses) {
      expect(h.house).toBeGreaterThanOrEqual(1);
      expect(h.house).toBeLessThanOrEqual(12);
    }
    // el Sol en jul-2026 está en Cáncer → casa solar 6 para Acuario
    const sun = p.houses.find((h) => h.body === "sun")!;
    expect(sun.sign).toBe("cancer");
    expect(sun.house).toBe(6);
    expect(p.areas).toHaveLength(6);
    expect(p.events.every((e) => e.atIso >= p.range.fromIso && e.atIso <= p.range.toIso)).toBe(true);
  });
  it("la vista año excluye ingresos de Luna; hoy/semana los incluye", () => {
    const year = computeWesternHoroscope("leo", "year", "utc", NOW);
    expect(year.events.some((e) => e.kind === "ingress" && e.body === "moon")).toBe(false);
    const week = computeWesternHoroscope("leo", "week", "utc", NOW);
    // una semana casi siempre tiene 1-2 ingresos lunares; al menos el tipo está permitido
    expect(week.events.filter((e) => e.kind === "ingress" && e.body === "moon").length).toBeGreaterThanOrEqual(1);
  });
  it("signo inválido lanza", () => {
    expect(() => computeWesternHoroscope("dragon", "today", "utc", NOW)).toThrow();
  });
});

describe("cachedWesternHoroscope", () => {
  it("misma clave devuelve el MISMO objeto (hit)", () => {
    const a = cachedWesternHoroscope("virgo", "today", "America/Bogota", NOW);
    const b = cachedWesternHoroscope("virgo", "today", "America/Bogota", "2026-07-13T23:59:00Z");
    expect(b).toBe(a); // misma fecha local → hit
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx pnpm --filter @aluna/web test -- horoscope`
Expected: FAIL — módulo `../western` no existe.

- [ ] **Step 3: Implementación**

`apps/web/lib/horoscope/western.ts`:

```ts
// Payload UNIVERSAL del horóscopo occidental por signo: no depende del usuario,
// solo de (signo, periodo, fecha local). Server-only (importa @aluna/ephemeris).
// La capa personal (hits natales) vive en la ruta, no aquí.
import { DateTime } from "luxon";
import {
  ZODIAC_SIGNS, solarPlacements, signAspectsToSign, scoreLifeAreasBySolarHouse,
  type SolarHousePlacement, type SignAspect, type SolarLifeAreaScore, type SolarHouseDriver,
  LIFE_AREAS, scoreTone, type LifeArea,
} from "@aluna/core";
import {
  computeBodies, localToJulianDay, lunations, stations, ingresses, type SkyEvent,
} from "@aluna/ephemeris";

export type HoroscopePeriod = "today" | "week" | "month" | "year";
export const HOROSCOPE_PERIODS: readonly HoroscopePeriod[] = ["today", "week", "month", "year"];

export interface PeriodRange {
  fromIso: string;
  toIso: string;
  sampleIsos: string[];
  localDate: string; // YYYY-MM-DD en la tz pedida (clave de caché)
  offsetMinutes: number;
}

export interface WesternPayload {
  sign: string;
  period: HoroscopePeriod;
  tz: string;
  range: { fromIso: string; toIso: string };
  houses: SolarHousePlacement[];
  signAspects: SignAspect[];
  events: SkyEvent[];
  areas: SolarLifeAreaScore[];
}

const SIGN_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));

export function isValidTz(tz: string): boolean {
  return typeof tz === "string" && tz.length <= 64 && DateTime.now().setZone(tz).isValid;
}

/** Periodos ANCLADOS a calendario en la tz local; muestras deterministas a mediodía. */
export function resolvePeriodRange(period: HoroscopePeriod, tz: string, nowIso?: string): PeriodRange {
  const zone = isValidTz(tz) ? tz : "utc";
  const now = (nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc()).setZone(zone);
  const noon = (d: DateTime) => d.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  let from: DateTime, to: DateTime, samples: DateTime[];
  if (period === "today") {
    from = now.startOf("day"); to = now.endOf("day"); samples = [noon(now)];
  } else if (period === "week") {
    from = now.startOf("week"); to = now.endOf("week"); // luxon: lunes-domingo
    samples = Array.from({ length: 7 }, (_, i) => noon(from.plus({ days: i })));
  } else if (period === "month") {
    from = now.startOf("month"); to = now.endOf("month");
    samples = [1, 6, 11, 16, 21, 26].map((d) => noon(from.set({ day: d })));
  } else {
    from = now.startOf("year"); to = now.endOf("year");
    samples = Array.from({ length: 12 }, (_, i) => noon(from.set({ month: i + 1, day: 15 })));
  }
  return {
    fromIso: from.toUTC().toISO()!,
    toIso: to.toUTC().toISO()!,
    sampleIsos: samples.map((s) => s.toUTC().toISO()!),
    localDate: now.toISODate()!,
    offsetMinutes: now.offset,
  };
}

function bodiesAtIso(iso: string) {
  const d = DateTime.fromISO(iso, { zone: "utc" });
  const { julianDayEt } = localToJulianDay({
    year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute, timeZone: "utc",
  });
  return computeBodies(julianDayEt);
}

export function computeWesternHoroscope(
  sign: string, period: HoroscopePeriod, tz: string, nowIso?: string,
): WesternPayload {
  if (!SIGN_KEYS.has(sign)) throw new Error(`Signo desconocido: ${sign}`);
  const range = resolvePeriodRange(period, tz, nowIso);

  // Posiciones representativas (para mostrar): hoy = la única muestra;
  // periodos largos = la muestra del medio (el "clima central" del periodo).
  const repIso = range.sampleIsos[Math.floor((range.sampleIsos.length - 1) / 2)]!;
  const rep = bodiesAtIso(repIso);
  const houses = solarPlacements(sign, rep);
  const signAspects = signAspectsToSign(sign, rep);

  // Eventos del rango: Luna solo en vistas cortas (en mes/año es ruido).
  const includeMoon = period === "today" || period === "week";
  const events = [
    ...lunations(range.fromIso, range.toIso),
    ...stations(range.fromIso, range.toIso),
    ...ingresses(range.fromIso, range.toIso, { includeMoon }),
  ].sort((a, b) => a.atIso.localeCompare(b.atIso));

  // Barras: promedio de las muestras + drivers por frecuencia (patrón /api/scores).
  const totals: Record<LifeArea, number> = { love: 0, money: 0, work: 0, health: 0, mood: 0, luck: 0 };
  const driverCount = new Map<string, { area: LifeArea; driver: SolarHouseDriver; count: number }>();
  for (const iso of range.sampleIsos) {
    const placements = solarPlacements(sign, bodiesAtIso(iso));
    for (const s of scoreLifeAreasBySolarHouse(placements)) {
      totals[s.area] += s.score;
      for (const d of s.drivers) {
        const key = `${s.area}:${d.body}:${d.house}`;
        const prev = driverCount.get(key);
        if (prev) prev.count += 1;
        else driverCount.set(key, { area: s.area, driver: d, count: 1 });
      }
    }
  }
  const n = range.sampleIsos.length;
  const all = [...driverCount.values()];
  const areas: SolarLifeAreaScore[] = LIFE_AREAS.map((area) => {
    const score = Math.round(totals[area] / n);
    return {
      area, score, tone: scoreTone(score),
      drivers: all.filter((x) => x.area === area).sort((a, b) => b.count - a.count).slice(0, 3).map((x) => x.driver),
    };
  });

  return { sign, period, tz: isValidTz(tz) ? tz : "utc", range: { fromIso: range.fromIso, toIso: range.toIso }, houses, signAspects, events, areas };
}

// LRU mínima universal: 12 signos × 4 periodos × pocos offsets/día.
const CACHE_MAX = 512;
const cache = new Map<string, WesternPayload>();

export function cachedWesternHoroscope(
  sign: string, period: HoroscopePeriod, tz: string, nowIso?: string,
): WesternPayload {
  const r = resolvePeriodRange(period, tz, nowIso);
  const key = `${sign}:${period}:${r.localDate}:${r.offsetMinutes}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const payload = computeWesternHoroscope(sign, period, tz, nowIso);
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, payload);
  return payload;
}
```

- [ ] **Step 4: Verificar verde**

Run: `npx pnpm --filter @aluna/web test -- horoscope`
Expected: PASS. (El test del año escanea 365 días — si tarda, es normal la primera vez; debe quedar <60s.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/horoscope
git commit -m "feat(horoscopo): payload universal occidental (rangos calendario, muestras deterministas, caché LRU)"
```

---

### Task 5: API `/api/horoscope/western` (+ capa personal)

**Files:**
- Create: `apps/web/app/api/horoscope/western/route.ts`

**Interfaces:**
- Consumes: `cachedWesternHoroscope`, `HOROSCOPE_PERIODS`, `isValidTz` (T4); `exactAspectAt` (T3); `authenticateRoute` (lib/supabase/route-auth); `profileToChartInput` (lib/chart); `computeChart`, `computeDerivedChart`, `setEphePath` de `@aluna/ephemeris`; `detectAspectsBetween`, `signOfLongitude`, `ZODIAC_SIGNS` de core.
- Produces (T8 consume): `POST` con body `{ sign?, period, tz, profileId? }` → `WesternPayload & { natalHits?: Array<Aspect & { exactIso: string | null }> }`. Si NO viene `sign` pero SÍ `profileId`, el signo se resuelve del Sol natal real (RLS) y va en `payload.sign`.
- Sin test unitario de ruta (mismo criterio que `/api/chart`: la lib de abajo está testeada en T4; la ruta se verifica en vivo en T10). Documentado aquí a propósito.

- [ ] **Step 1: Implementación completa**

```ts
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { computeChart, computeDerivedChart, setEphePath, exactAspectAt } from "@aluna/ephemeris";
import { detectAspectsBetween, signOfLongitude, ZODIAC_SIGNS, type Aspect } from "@aluna/core";
import { authenticateRoute } from "@/lib/supabase/route-auth";
import { profileToChartInput } from "@/lib/chart";
import {
  cachedWesternHoroscope, isValidTz, HOROSCOPE_PERIODS, type HoroscopePeriod,
} from "@/lib/horoscope/western";

// Horóscopo occidental por signo. El payload es UNIVERSAL (cacheado por
// signo+periodo+fecha local); la capa personal (tránsitos que tocan la carta
// natal REAL) solo se computa si viene profileId y pasa RLS. Requiere sesión.

export const runtime = "nodejs";

setEphePath(path.join(process.cwd(), "..", "..", "packages", "ephemeris", "ephe"));

const SIGN_KEYS = new Set(ZODIAC_SIGNS.map((s) => s.key));
const WEATHER_BODIES = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);
const HIT_ORBS: Record<string, number> = { conjunction: 3, opposition: 3, trine: 3, square: 3, sextile: 2 };

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = (raw ?? {}) as Record<string, unknown>;

  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const period: HoroscopePeriod = (HOROSCOPE_PERIODS as readonly string[]).includes(String(body.period))
    ? (body.period as HoroscopePeriod)
    : "today";
  const tz = isValidTz(String(body.tz ?? "")) ? String(body.tz) : "utc";
  let sign = typeof body.sign === "string" && SIGN_KEYS.has(body.sign) ? body.sign : null;
  const profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : null;

  // Perfil (opcional): resuelve el signo por el Sol natal REAL y habilita los
  // hits. natalInput se conserva en variable LOCAL del handler (nunca de módulo:
  // dos requests concurrentes se pisarían).
  let natal: ReturnType<typeof computeChart> | null = null;
  let natalInput: ChartInput | null = null;
  if (profileId) {
    const { data: profile } = await supabase
      .from("birth_profiles")
      .select("birth_date, birth_time, time_known, latitude, longitude, time_zone")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
      natalInput = profileToChartInput(profile, {});
      natal = computeChart(natalInput);
      if (!sign) sign = natal.bodies.find((b) => b.body === "sun")!.sign;
    } catch {
      return NextResponse.json({ error: "compute" }, { status: 500 });
    }
  }
  if (!sign) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const payload = cachedWesternHoroscope(sign, period, tz);

    // Capa personal: tránsitos de AHORA a los planetas natales + fecha exacta.
    let natalHits: Array<Aspect & { exactIso: string | null }> | undefined;
    if (natal && natalInput) {
      const nowIso = new Date().toISOString();
      const transit = computeDerivedChart(natalInput, "transits", nowIso);
      const moving = transit.bodies.filter((b) => WEATHER_BODIES.has(b.body))
        .map((b) => ({ key: b.body, longitude: b.longitude, speed: b.speed }));
      const fixed = natal.bodies.filter((b) => WEATHER_BODIES.has(b.body))
        .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));
      natalHits = detectAspectsBetween(moving, fixed, { orbs: HIT_ORBS })
        .sort((a, b) => a.orb - b.orb)
        .slice(0, 8)
        .map((a) => {
          const natalLon = natal.bodies.find((b) => b.body === a.b)!.longitude;
          return { ...a, exactIso: exactAspectAt(a.a, natalLon, a.angle, nowIso, 20) };
        });
    }

    return NextResponse.json(natalHits ? { ...payload, natalHits } : payload);
  } catch {
    return NextResponse.json({ error: "compute" }, { status: 500 });
  }
}
```

Ajustar el import de tipos al inicio del archivo: `import { detectAspectsBetween, signOfLongitude, ZODIAC_SIGNS, type Aspect, type ChartInput } from "@aluna/core";` (y borrar `signOfLongitude` si el compilador lo marca sin uso — solo se necesita si se añade decoración extra).

- [ ] **Step 2: Typecheck + build parcial**

Run: `npx pnpm --filter @aluna/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/horoscope
git commit -m "feat(horoscopo): ruta /api/horoscope/western — payload universal cacheado + hits natales con fecha exacta"
```

---

### Task 6: Refactor — extraer `AreaBars` presentacional (reusable por Hoy y Horóscopo)

**Files:**
- Create: `apps/web/components/area-bars.tsx`
- Create: `apps/web/components/area-bars.module.css`
- Create: `apps/web/components/__tests__/area-bars.test.tsx`
- Modify: `apps/web/app/(app)/hoy/energy-panel.tsx`
- Modify: `apps/web/app/(app)/hoy/energy.module.css`

**Interfaces:**
- Produces (T8 consume):
  - `type BarDriver = { glyphs: string; text: string; favorable: boolean }`
  - `type BarArea = { key: string; label: string; score: number; tone: "low" | "mixed" | "high"; toneLabel: string; drivers: BarDriver[] }`
  - `function AreaBars({ areas, calmText }: { areas: BarArea[]; calmText: string }): JSX.Element`
- El componente NO trae fetch, ni periodo, ni i18n propios: todo llega resuelto por props (por eso sirve igual para drivers "tránsito→natal" que para "planeta en casa solar").

- [ ] **Step 1: Test que falla**

`apps/web/components/__tests__/area-bars.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AreaBars, type BarArea } from "../area-bars";

const AREAS: BarArea[] = [
  {
    key: "money", label: "Dinero", score: 66, tone: "high", toneLabel: "Alta",
    drivers: [{ glyphs: "♃ · 2", text: "Júpiter recorre tu casa 2 solar", favorable: true }],
  },
  { key: "love", label: "Amor", score: 50, tone: "mixed", toneLabel: "Mixta", drivers: [] },
];

describe("AreaBars", () => {
  it("pinta una barra por área con su score", () => {
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" />);
    expect(screen.getByText("Dinero")).toBeInTheDocument();
    expect(screen.getByText("66")).toBeInTheDocument();
  });
  it("expandir muestra los drivers; sin drivers muestra el texto de calma", () => {
    render(<AreaBars areas={AREAS} calmText="Cielo en calma" />);
    fireEvent.click(screen.getByRole("button", { name: /Dinero/ }));
    expect(screen.getByText(/Júpiter recorre tu casa 2 solar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Amor/ }));
    expect(screen.getByText("Cielo en calma")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx pnpm --filter @aluna/web test -- area-bars` → FAIL (módulo no existe).

- [ ] **Step 3: Implementación**

`apps/web/components/area-bars.module.css` — MOVER VERBATIM desde `apps/web/app/(app)/hoy/energy.module.css` estas clases (cortarlas de allá, pegarlas acá sin cambiar una letra): `.bars`, `.bar` (si existe), `.barHead`, `.barLabel`, `.barScore`, `.track`, `.fill`, `.tone_high`, `.tone_mixed`, `.tone_low`, `.why`, `.driver`, `.driverGlyphs`, `.driverText`, `.fav`, `.tense`, `.calm`. En `energy.module.css` quedan solo `.panel`, `.head`, `.title`, `.periods`, `.period`, `.loading`.

`apps/web/components/area-bars.tsx`:

```tsx
"use client";
import { useState } from "react";
import styles from "./area-bars.module.css";

export interface BarDriver { glyphs: string; text: string; favorable: boolean; }
export interface BarArea {
  key: string; label: string; score: number;
  tone: "low" | "mixed" | "high"; toneLabel: string; drivers: BarDriver[];
}

/** Barras de áreas puramente presentacionales (Hoy y Horóscopo las comparten).
 *  Sin fetch ni i18n: labels y drivers llegan ya resueltos. */
export function AreaBars({ areas, calmText }: { areas: BarArea[]; calmText: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={styles.bars}>
      {areas.map((a, i) => {
        const expanded = open === a.key;
        return (
          <div key={a.key} className={`${styles.bar} reveal`} style={{ ["--i" as string]: i }}>
            <button type="button" className={styles.barHead}
              onClick={() => setOpen(expanded ? null : a.key)} aria-expanded={expanded}>
              <span className={styles.barLabel}>{a.label}</span>
              <span className={styles.barScore}>{a.score}</span>
            </button>
            <div className={styles.track}>
              <span className={`${styles.fill} ${styles[`tone_${a.tone}`] ?? ""}`}
                style={{ width: `${a.score}%` }} role="img" aria-label={a.toneLabel} />
            </div>
            {expanded && (
              <div className={styles.why}>
                {a.drivers.length === 0 ? (
                  <span className={styles.calm}>{calmText}</span>
                ) : (
                  a.drivers.map((d, j) => (
                    <span key={j} className={`${styles.driver} ${d.favorable ? styles.fav : styles.tense}`}>
                      <span className={styles.driverGlyphs}>{d.glyphs}</span>
                      <span className={styles.driverText}>{d.text}</span>
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

Nota: si `.bar` no existía como clase en energy.module.css (el JSX viejo usa `styles.bar`), verificarlo al mover; si no existe, crear `.bar { }` vacía o quitar la clase del JSX — espejo exacto de lo que hubiera.

`energy-panel.tsx` — reemplazar TODO el bloque `<div className={styles.bars}>…</div>` (y su rama `areas.length > 0`) por el mapeo a `BarArea` + `<AreaBars>`:

```tsx
import { AreaBars, type BarArea } from "@/components/area-bars";
// … dentro del render, sustituyendo el bloque de barras:
      {areas === null ? (
        <p className={styles.loading}>{t("hoy.energyLoading")}</p>
      ) : areas.length > 0 ? (
        <AreaBars
          calmText={t("hoy.calm")}
          areas={areas.map((a): BarArea => ({
            key: a.area,
            label: t(`hoy.${AREA_KEY[a.area]}`),
            score: a.score,
            tone: a.tone,
            toneLabel: t(`hoy.${TONE_KEY[a.tone]}`),
            drivers: a.drivers.map((d) => ({
              glyphs: `${PLANET_GLYPH[d.transit]} ${ASPECT_GLYPHS[d.aspect]} ${PLANET_GLYPH[d.natal]}`,
              text: `${L.bodies[d.transit]} ${L.aspects[d.aspect]} ${t("carta.yourPossessive")} ${L.bodies[d.natal]}`,
              favorable: d.favorable,
            })),
          }))}
        />
      ) : null}
```

y borrar del archivo los usos ya muertos (`open`/`setOpen`, clases movidas).

- [ ] **Step 4: Verde total web** — `npx pnpm --filter @aluna/web test` → PASS (153 previos + 2 nuevos; nada del panel roto).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components apps/web/app/\(app\)/hoy
git commit -m "refactor(horoscopo): AreaBars presentacional compartido entre Tu Energía y Horóscopo"
```

---

### Task 7: Contenido — 12 signos (es/en) + etiquetas de casas solares + composición

**Files:**
- Create: `apps/web/lib/content/horoscope-es.ts`
- Create: `apps/web/lib/content/horoscope-en.ts`
- Create: `apps/web/lib/content/__tests__/horoscope.test.ts`

**Interfaces:**
- Consumes: tipos `WesternPayload` (T4), `astroLabels` (astrology-labels.ts).
- Produces (T8/T9 consumen):
  - `type SignEssence = { essence: string; flow: string; shadow: string }`
  - `HOROSCOPE_SIGNS_ES / _EN: Record<string, SignEssence>` (12 claves de ZODIAC_SIGNS)
  - `SOLAR_HOUSE_LABELS_ES / _EN: Record<number, string>` (1..12)
  - `composeWesternProse(locale: "es" | "en", payload: WesternPayload): string[]` — párrafos deterministas SOLO desde datos del payload (anti-funa).

- [ ] **Step 1: Test que falla**

`apps/web/lib/content/__tests__/horoscope.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS } from "@aluna/core";
import { HOROSCOPE_SIGNS_ES, SOLAR_HOUSE_LABELS_ES, composeWesternProse } from "../horoscope-es";
import { HOROSCOPE_SIGNS_EN, SOLAR_HOUSE_LABELS_EN } from "../horoscope-en";
import type { WesternPayload } from "@/lib/horoscope/western";

const PAYLOAD: WesternPayload = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [
    { area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] },
    { area: "love", score: 41, tone: "mixed", drivers: [{ body: "saturn", house: 7, favorable: false }] },
  ],
};

describe("bloques de signos", () => {
  it("los 12 signos existen en ambos idiomas con 3 campos no vacíos", () => {
    for (const s of ZODIAC_SIGNS) {
      for (const dict of [HOROSCOPE_SIGNS_ES, HOROSCOPE_SIGNS_EN]) {
        const b = dict[s.key];
        expect(b, s.key).toBeDefined();
        expect(b!.essence.length).toBeGreaterThan(20);
        expect(b!.flow.length).toBeGreaterThan(20);
        expect(b!.shadow.length).toBeGreaterThan(20);
      }
    }
  });
  it("las 12 casas solares tienen etiqueta en ambos idiomas", () => {
    for (let h = 1; h <= 12; h++) {
      expect(SOLAR_HOUSE_LABELS_ES[h]!.length).toBeGreaterThan(5);
      expect(SOLAR_HOUSE_LABELS_EN[h]!.length).toBeGreaterThan(5);
    }
  });
});

describe("composeWesternProse", () => {
  it("teje párrafos desde el payload sin inventar: menciona el driver mayor y el evento", () => {
    const parts = composeWesternProse("es", PAYLOAD);
    const all = parts.join(" ");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(all).toContain(SOLAR_HOUSE_LABELS_ES[10]!); // casa del driver más fuerte
    expect(all.toLowerCase()).toContain("luna llena");
    expect(all).not.toContain("undefined");
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx pnpm --filter @aluna/web test -- content/__tests__/horoscope` → FAIL.

- [ ] **Step 3: Implementación**

`apps/web/lib/content/horoscope-es.ts` (estructura completa; los 12 bloques van escritos con esta voz — abajo los 12 REALES, no resumir):

```ts
// Horóscopo occidental (ES): ADN de cada signo en voz Aluna (evolutiva-yóguica,
// don y sombra, sin fatalismo) + etiquetas de casas solares + composición.
// La prosa del periodo SE COMPONE desde el payload calculado: nunca puede
// contradecir la lámina Pro (regla anti-funa).
import { ZODIAC_SIGNS } from "@aluna/core";
import { astroLabels } from "./astrology-labels";
import type { WesternPayload } from "@/lib/horoscope/western";
import { DICTS_EN } from "./horoscope-en";

export interface SignEssence { essence: string; flow: string; shadow: string; }

export const HOROSCOPE_SIGNS_ES: Record<string, SignEssence> = {
  aries: {
    essence: "Tu alma vino a encender el primer fuego: iniciar, atreverse, abrir camino donde nadie ha pisado.",
    flow: "Cuando tu energía fluye, tu coraje contagia y tu impulso pone el mundo en movimiento.",
    shadow: "En sombra, la prisa arrasa lo que aún no madura; tu práctica es el aliento antes del salto.",
  },
  taurus: {
    essence: "Tu alma vino a habitar el cuerpo y la tierra: sostener, cultivar y saborear lo que permanece.",
    flow: "Cuando fluyes, tu calma es raíz para otros y tu constancia convierte semillas en jardines.",
    shadow: "En sombra, el apego confunde seguridad con quietud; aparigraha, soltar, es tu llave.",
  },
  gemini: {
    essence: "Tu alma vino a tejer puentes con la palabra: preguntar, aprender y unir mundos que no se hablaban.",
    flow: "Cuando fluyes, tu curiosidad es viento fresco y tu voz traduce lo complejo en cercano.",
    shadow: "En sombra, la mente se dispersa en mil chispas; tu práctica es elegir una llama y cuidarla.",
  },
  cancer: {
    essence: "Tu alma vino a custodiar el hogar interior: sentir hondo, nutrir y hacer del cuidado un templo.",
    flow: "Cuando fluyes, tu ternura sana raíces y tu intuición lee lo que nadie dice.",
    shadow: "En sombra, el caparazón se cierra al amor que teme perder; santosha, el contento, te devuelve al presente.",
  },
  leo: {
    essence: "Tu alma vino a brillar con corazón: crear, jugar y recordarle a otros su propia luz.",
    flow: "Cuando fluyes, tu presencia es sol que calienta sin pedir nada a cambio.",
    shadow: "En sombra, el brillo mendiga aplauso; tu práctica es brillar igual cuando nadie mira.",
  },
  virgo: {
    essence: "Tu alma vino a pulir lo sagrado en lo pequeño: servir, ordenar y sanar con manos precisas.",
    flow: "Cuando fluyes, tu discernimiento es medicina y tu humildad hace útil la perfección.",
    shadow: "En sombra, la crítica se vuelve jaula; svadhyaya te recuerda que también tú mereces tu compasión.",
  },
  libra: {
    essence: "Tu alma vino a afinar la balanza: crear belleza, armonía y encuentros donde ambos respiran.",
    flow: "Cuando fluyes, tu diplomacia teje paz real y tu estética eleva lo cotidiano.",
    shadow: "En sombra, complaces para no incomodar; tu práctica es decir tu verdad con la misma gracia.",
  },
  scorpio: {
    essence: "Tu alma vino a mirar donde otros apartan la vista: transformar, morir y renacer más verdadera.",
    flow: "Cuando fluyes, tu intensidad es alquimia: conviertes herida en poder sereno.",
    shadow: "En sombra, el control sustituye a la confianza; soltar el timón es tu iniciación.",
  },
  sagittarius: {
    essence: "Tu alma vino a disparar la flecha del sentido: explorar, creer y ensanchar el horizonte.",
    flow: "Cuando fluyes, tu fe abre caminos y tu risa enseña más que mil doctrinas.",
    shadow: "En sombra, la promesa vuela sin aterrizar; tu práctica es honrar lo que siembras.",
  },
  capricorn: {
    essence: "Tu alma vino a escalar con propósito: construir despacio lo que sostiene a muchos.",
    flow: "Cuando fluyes, tu disciplina es amor en acción y tu palabra vale una montaña.",
    shadow: "En sombra, la exigencia congela el corazón; recuerda que la cima también se comparte.",
  },
  aquarius: {
    essence: "Tu alma vino a abrir ventanas al futuro: liberar, innovar y pertenecer sin dejar de ser tú.",
    flow: "Cuando fluyes, tu visión oxigena al grupo y tu rareza es exactamente tu regalo.",
    shadow: "En sombra, el desapego se vuelve distancia; tu práctica es dejar que te toquen el corazón.",
  },
  pisces: {
    essence: "Tu alma vino a disolver las orillas: soñar, compadecer y recordar que todo está unido.",
    flow: "Cuando fluyes, tu sensibilidad es océano que inspira y consuela sin palabras.",
    shadow: "En sombra, la niebla evade lo concreto; anclar el sueño en un paso real es tu yoga.",
  },
};

export const SOLAR_HOUSE_LABELS_ES: Record<number, string> = {
  1: "tu casa 1 solar, tu cuerpo y tu presencia",
  2: "tu casa 2 solar, tu recurso y tu valor propio",
  3: "tu casa 3 solar, tu mente y tus palabras",
  4: "tu casa 4 solar, tu raíz y tu hogar",
  5: "tu casa 5 solar, tu creación y tu gozo",
  6: "tu casa 6 solar, tu oficio y tus hábitos",
  7: "tu casa 7 solar, tus vínculos de a dos",
  8: "tu casa 8 solar, lo profundo y lo compartido",
  9: "tu casa 9 solar, tu horizonte y tu fe",
  10: "tu casa 10 solar, tu vocación y tu montaña",
  11: "tu casa 11 solar, tu tribu y tu buen espíritu",
  12: "tu casa 12 solar, tu descanso y tu mundo interior",
};

const LUNATION_ES = { new: "Luna Nueva", full: "Luna Llena" } as const;

/** Párrafos deterministas SOLO desde el payload. Orden: ADN → drivers → evento → cierre.
 *  horoscope-en.ts solo exporta DATOS (dicts); el motor vive aquí. es.ts→en.ts es la
 *  única dirección de import runtime (en.ts importa de es.ts SOLO tipos) → sin ciclo. */
export function composeWesternProse(locale: "es" | "en", payload: WesternPayload): string[] {
  return composeWith(locale, payload, locale === "en" ? DICTS_EN : DICTS_ES);
}

export interface ComposeDicts {
  signs: Record<string, SignEssence>;
  houseLabels: Record<number, string>;
  lunation: Record<"new" | "full", string>;
  t: {
    favorable: (body: string, house: string) => string;
    tense: (body: string, house: string) => string;
    lunationIn: (name: string, house: string) => string;
    eclipse: string;
    stationRetro: (body: string) => string;
  };
}

const DICTS_ES: ComposeDicts = {
  signs: HOROSCOPE_SIGNS_ES,
  houseLabels: SOLAR_HOUSE_LABELS_ES,
  lunation: LUNATION_ES,
  t: {
    favorable: (body, house) => `${body} camina por ${house}: hay viento a favor ahí, úsalo con presencia.`,
    tense: (body, house) => `${body} pide trabajo en ${house}: no es castigo, es músculo del alma haciéndose.`,
    lunationIn: (name, house) => `La ${name} de este ciclo cae en ${house}; es buen momento para escucharla.`,
    eclipse: "Además trae energía de eclipse: los cambios que abre son más hondos de lo que parecen.",
    stationRetro: (body) => `${body} estaciona retrógrado: el cielo invita a revisar antes que a empujar.`,
  },
};

export function composeWith(locale: "es" | "en", payload: WesternPayload, dicts: ComposeDicts): string[] {
  const L = astroLabels(locale);
  const parts: string[] = [];
  const sign = dicts.signs[payload.sign];
  if (sign) parts.push(sign.essence);

  const drivers = payload.areas
    .flatMap((a) => a.drivers)
    .filter((d, i, arr) => arr.findIndex((x) => x.body === d.body && x.house === d.house) === i);
  const fav = drivers.find((d) => d.favorable);
  const tense = drivers.find((d) => !d.favorable);
  const driverLines: string[] = [];
  if (fav) driverLines.push(dicts.t.favorable(L.bodies[fav.body] ?? fav.body, dicts.houseLabels[fav.house]!));
  if (tense) driverLines.push(dicts.t.tense(L.bodies[tense.body] ?? tense.body, dicts.houseLabels[tense.house]!));
  if (driverLines.length) parts.push(driverLines.join(" "));

  const lun = payload.events.find((e) => e.kind === "lunation");
  if (lun && lun.kind === "lunation") {
    const evHouse = solarHouseOfEvent(payload, lun.longitude);
    let line = dicts.t.lunationIn(dicts.lunation[lun.phase], dicts.houseLabels[evHouse]!);
    if (lun.eclipse) line += ` ${dicts.t.eclipse}`;
    parts.push(line);
  } else {
    const st = payload.events.find((e) => e.kind === "station" && e.direction === "retrograde");
    if (st && st.kind === "station") parts.push(dicts.t.stationRetro(L.bodies[st.body] ?? st.body));
  }

  const tones = payload.areas.map((a) => a.tone);
  const closing = tones.filter((t) => t === "high").length >= tones.filter((t) => t === "low").length
    ? sign?.flow : sign?.shadow;
  if (closing) parts.push(closing);
  return parts;
}

/** Casa solar de una longitud del payload (mismo whole-sign, sin recomputar motor). */
function solarHouseOfEvent(payload: WesternPayload, longitude: number): number {
  const base = ZODIAC_SIGNS.findIndex((s) => s.key === payload.sign);
  const idx = Math.floor(((longitude % 360) + 360) % 360 / 30);
  return ((idx - base + 12) % 12) + 1;
}
```

`apps/web/lib/content/horoscope-en.ts` — SOLO datos (importa de es.ts únicamente TIPOS, así que no hay ciclo en runtime):

```ts
// Horóscopo occidental (EN): datos espejo de horoscope-es.ts. El motor de
// composición vive en es.ts; este archivo solo exporta diccionarios.
import type { SignEssence, ComposeDicts } from "./horoscope-es";

export const HOROSCOPE_SIGNS_EN: Record<string, SignEssence> = {
  aries: {
    essence: "Your soul came to strike the first fire: to begin, to dare, to open paths where no one has walked.",
    flow: "When your energy flows, your courage is contagious and your drive sets the world in motion.",
    shadow: "In shadow, haste tramples what is still ripening; your practice is one breath before the leap.",
  },
  taurus: {
    essence: "Your soul came to inhabit the body and the earth: to sustain, to cultivate, to savor what endures.",
    flow: "When you flow, your calm becomes a root for others and your constancy turns seeds into gardens.",
    shadow: "In shadow, attachment mistakes stillness for safety; aparigraha, letting go, is your key.",
  },
  gemini: {
    essence: "Your soul came to weave bridges with words: to ask, to learn, to join worlds that never spoke.",
    flow: "When you flow, your curiosity is fresh wind and your voice turns the complex into the familiar.",
    shadow: "In shadow, the mind scatters into a thousand sparks; your practice is choosing one flame and tending it.",
  },
  cancer: {
    essence: "Your soul came to keep the inner home: to feel deeply, to nourish, to make care a temple.",
    flow: "When you flow, your tenderness heals roots and your intuition reads what is never said.",
    shadow: "In shadow, the shell closes around the love it fears to lose; santosha, contentment, returns you to the present.",
  },
  leo: {
    essence: "Your soul came to shine from the heart: to create, to play, to remind others of their own light.",
    flow: "When you flow, your presence is a sun that warms without asking anything back.",
    shadow: "In shadow, the shine begs for applause; your practice is to glow the same when no one is watching.",
  },
  virgo: {
    essence: "Your soul came to polish the sacred in the small: to serve, to order, to heal with precise hands.",
    flow: "When you flow, your discernment is medicine and your humility makes perfection useful.",
    shadow: "In shadow, critique becomes a cage; svadhyaya reminds you that you too deserve your compassion.",
  },
  libra: {
    essence: "Your soul came to tune the scales: to create beauty, harmony, and meetings where both can breathe.",
    flow: "When you flow, your diplomacy weaves real peace and your sense of beauty lifts the everyday.",
    shadow: "In shadow, you please to avoid discomfort; your practice is speaking your truth with the same grace.",
  },
  scorpio: {
    essence: "Your soul came to look where others turn away: to transform, to die and be reborn more true.",
    flow: "When you flow, your intensity is alchemy: you turn wounds into quiet power.",
    shadow: "In shadow, control replaces trust; releasing the helm is your initiation.",
  },
  sagittarius: {
    essence: "Your soul came to shoot the arrow of meaning: to explore, to believe, to widen the horizon.",
    flow: "When you flow, your faith opens roads and your laughter teaches more than a thousand doctrines.",
    shadow: "In shadow, the promise flies but never lands; your practice is honoring what you sow.",
  },
  capricorn: {
    essence: "Your soul came to climb with purpose: to build slowly what will hold many.",
    flow: "When you flow, your discipline is love in action and your word is worth a mountain.",
    shadow: "In shadow, demand freezes the heart; remember the summit is also for sharing.",
  },
  aquarius: {
    essence: "Your soul came to open windows to the future: to free, to innovate, to belong without ceasing to be you.",
    flow: "When you flow, your vision brings oxygen to the group and your strangeness is exactly your gift.",
    shadow: "In shadow, detachment turns to distance; your practice is letting your heart be touched.",
  },
  pisces: {
    essence: "Your soul came to dissolve the shores: to dream, to feel with others, to remember that all is one.",
    flow: "When you flow, your sensitivity is an ocean that inspires and consoles without words.",
    shadow: "In shadow, the mist avoids the concrete; anchoring the dream in one real step is your yoga.",
  },
};

export const SOLAR_HOUSE_LABELS_EN: Record<number, string> = {
  1: "your solar 1st house, your body and your presence",
  2: "your solar 2nd house, your resources and self-worth",
  3: "your solar 3rd house, your mind and your words",
  4: "your solar 4th house, your roots and your home",
  5: "your solar 5th house, your creation and your joy",
  6: "your solar 6th house, your craft and your habits",
  7: "your solar 7th house, your one-to-one bonds",
  8: "your solar 8th house, the deep and the shared",
  9: "your solar 9th house, your horizon and your faith",
  10: "your solar 10th house, your calling and your mountain",
  11: "your solar 11th house, your tribe and good spirit",
  12: "your solar 12th house, your rest and inner world",
};

export const DICTS_EN: ComposeDicts = {
  signs: HOROSCOPE_SIGNS_EN,
  houseLabels: SOLAR_HOUSE_LABELS_EN,
  lunation: { new: "New Moon", full: "Full Moon" },
  t: {
    favorable: (body, house) => `${body} moves through ${house}: there is wind at your back there — use it with presence.`,
    tense: (body, house) => `${body} asks for work in ${house}: not punishment, but soul-muscle in the making.`,
    lunationIn: (name, house) => `This cycle's ${name} falls in ${house}; it is a good moment to listen to it.`,
    eclipse: "It also carries eclipse energy: the changes it opens run deeper than they seem.",
    stationRetro: (body) => `${body} stations retrograde: the sky invites review before push.`,
  },
};
```

- [ ] **Step 4: Verde** — `npx pnpm --filter @aluna/web test -- content/__tests__/horoscope` → PASS. Correr también typecheck: `npx pnpm --filter @aluna/web typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/content
git commit -m "feat(horoscopo): ADN de los 12 signos es/en + casas solares + prosa compuesta desde drivers"
```

---

### Task 8: UI `/horoscopo` — tabs, selectores, cielo, barras, prosa, Pro, nav

**Files:**
- Create: `apps/web/app/(app)/horoscopo/page.tsx`
- Create: `apps/web/app/(app)/horoscopo/horoscopo-view.tsx`
- Create: `apps/web/app/(app)/horoscopo/sky-events.tsx`
- Create: `apps/web/app/(app)/horoscopo/horoscopo.module.css`
- Create: `apps/web/app/(app)/horoscopo/__tests__/horoscopo-view.test.tsx`
- Modify: `apps/web/components/top-nav.tsx` (línea 13: `soon: false`)
- Modify: `apps/web/components/__tests__/top-nav.test.tsx`
- Modify: `apps/web/app/(app)/hoy/hub-view.tsx` (tile Horóscopo)
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (bloque `horoscopo`)

**Interfaces:**
- Consumes: `WesternPayload` (type-only, T4), `AreaBars`/`BarArea` (T6), `composeWesternProse` + `SOLAR_HOUSE_LABELS_*` (T7), `solarHouseOf`, `ZODIAC_SIGNS`, `PLANETS` (core), `astroLabels`/`ASPECT_GLYPHS`, `useProfiles`.
- Produces: página navegable en `/horoscopo` con `?trad=occidental|oriental` (oriental = tarjeta "pronto" hasta H2).

- [ ] **Step 1: i18n — añadir a `apps/web/messages/es.json`** (tras el bloque `"pilares"`; los periodos/áreas/tonos REUSAN las claves de `hoy.*`, no duplicar):

```json
"horoscopo": {
  "title": "Horóscopo",
  "subtitle": "El cielo del periodo, leído para tu signo",
  "tabWestern": "Occidental",
  "tabEastern": "Oriental",
  "easternSoon": "La lectura oriental (animales y pilares) llega pronto.",
  "signAria": "Elige un signo",
  "skyTitle": "El cielo del periodo",
  "areasTitle": "Tus áreas",
  "aspectsTitle": "Aspectos por signo",
  "hitsTitle": "Esto toca tu carta",
  "proseTitle": "Tu lectura",
  "pro": "Modo Pro",
  "proPositions": "Tránsitos por casa solar",
  "proEvents": "Eventos con hora exacta",
  "proMethod": "Casas solares whole-sign desde {sign}. Aspectos por signo (whole-sign). Muestras del periodo a mediodía local. Zona horaria: {tz}.",
  "loading": "Leyendo el cielo…",
  "error": "El cielo no respondió. Intenta de nuevo.",
  "newMoon": "Luna Nueva",
  "fullMoon": "Luna Llena",
  "eclipseSolar": "eclipse solar",
  "eclipseLunar": "eclipse lunar",
  "stationRetro": "{body} estaciona retrógrado",
  "stationDirect": "{body} retoma marcha directa",
  "ingress": "{body} entra en {sign}",
  "houseShort": "casa {n}",
  "exactOn": "exacto: {date}",
  "noEvents": "Sin eventos mayores en este periodo: cielo de fondo estable."
}
```

y a `en.json`:

```json
"horoscopo": {
  "title": "Horoscope",
  "subtitle": "The sky of the period, read for your sign",
  "tabWestern": "Western",
  "tabEastern": "Eastern",
  "easternSoon": "The Eastern reading (animals and pillars) is coming soon.",
  "signAria": "Choose a sign",
  "skyTitle": "The sky of the period",
  "areasTitle": "Your areas",
  "aspectsTitle": "Aspects by sign",
  "hitsTitle": "Touching your chart",
  "proseTitle": "Your reading",
  "pro": "Pro Mode",
  "proPositions": "Transits by solar house",
  "proEvents": "Events with exact time",
  "proMethod": "Whole-sign solar houses from {sign}. Sign-to-sign aspects. Period sampled at local noon. Time zone: {tz}.",
  "loading": "Reading the sky…",
  "error": "The sky did not answer. Try again.",
  "newMoon": "New Moon",
  "fullMoon": "Full Moon",
  "eclipseSolar": "solar eclipse",
  "eclipseLunar": "lunar eclipse",
  "stationRetro": "{body} stations retrograde",
  "stationDirect": "{body} stations direct",
  "ingress": "{body} enters {sign}",
  "houseShort": "house {n}",
  "exactOn": "exact: {date}",
  "noEvents": "No major events this period: a steady background sky."
}
```

- [ ] **Step 2: Test que falla**

`apps/web/app/(app)/horoscopo/__tests__/horoscopo-view.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: null }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const PAYLOAD = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] }],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}

describe("HoroscopoView", () => {
  it("pinta los 12 chips de signos y carga el payload (Luna Llena visible)", async () => {
    renderView();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(2); // tabs de tradición
    await waitFor(() => expect(screen.getByText(/Luna Llena/)).toBeInTheDocument());
    expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12); // chips de signo
  });
  it("sin perfil, arranca en Aries (primer signo) y pide al backend", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string);
    expect(body.sign).toBe("aries");
    expect(body.period).toBe("today");
  });
});
```

- [ ] **Step 3: Correr y ver fallar** — `npx pnpm --filter @aluna/web test -- horoscopo-view` → FAIL.

- [ ] **Step 4: Implementación**

`apps/web/app/(app)/horoscopo/page.tsx`:

```tsx
import { HoroscopoView } from "./horoscopo-view";

export default function HoroscopoPage() {
  return <HoroscopoView />;
}
```

`apps/web/app/(app)/horoscopo/sky-events.tsx`:

```tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, solarHouseOf } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import styles from "./horoscopo.module.css";

const TEXT_VS = "︎";
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

// El payload viaja como JSON: tipamos localmente lo que esta lista necesita.
export interface SkyEventJson {
  kind: "lunation" | "station" | "ingress";
  atIso: string;
  phase?: "new" | "full";
  sign?: string;
  longitude?: number;
  eclipse?: "solar" | "lunar" | null;
  body?: string;
  direction?: "retrograde" | "direct";
  fromSign?: string;
  toSign?: string;
}

export function SkyEvents({ events, baseSign, tz }: { events: SkyEventJson[]; baseSign: string; tz: string }) {
  const t = useTranslations("horoscopo");
  const locale = useLocale();
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  if (events.length === 0) return <p className={styles.noEvents}>{t("noEvents")}</p>;

  return (
    <ul className={styles.events}>
      {events.map((e, i) => {
        let glyph = "☽" + TEXT_VS;
        let label = "";
        if (e.kind === "lunation" && e.phase && typeof e.longitude === "number") {
          const house = solarHouseOf(baseSign, e.longitude);
          label = `${t(e.phase === "new" ? "newMoon" : "fullMoon")} · ${L.signs[e.sign ?? ""] ?? ""} · ${HOUSES[house]}`;
          if (e.eclipse) label += ` · ${t(e.eclipse === "solar" ? "eclipseSolar" : "eclipseLunar")}`;
        } else if (e.kind === "station" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t(e.direction === "retrograde" ? "stationRetro" : "stationDirect", { body: L.bodies[e.body] ?? e.body });
        } else if (e.kind === "ingress" && e.body) {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t("ingress", { body: L.bodies[e.body] ?? e.body, sign: L.signs[e.toSign ?? ""] ?? e.toSign ?? "" });
        }
        return (
          <li key={i} className={`${styles.eventRow} reveal`} style={{ ["--i" as string]: i }}>
            <span className={styles.eventGlyph}>{glyph}</span>
            <span className={styles.eventLabel}>{label}</span>
            <span className={styles.eventDate}>{fmt.format(new Date(e.atIso))}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

`apps/web/app/(app)/horoscopo/horoscopo-view.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PLANETS, ZODIAC_SIGNS } from "@aluna/core";
import type { WesternPayload, HoroscopePeriod } from "@/lib/horoscope/western";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { composeWesternProse, SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";
import { AreaBars, type BarArea } from "@/components/area-bars";
import { Starfield } from "@/components/starfield";
import { SkyEvents, type SkyEventJson } from "./sky-events";
import styles from "./horoscopo.module.css";

const TEXT_VS = "︎";
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const PERIODS: HoroscopePeriod[] = ["today", "week", "month", "year"];
const PERIOD_KEY: Record<HoroscopePeriod, string> = {
  today: "periodToday", week: "periodWeek", month: "periodMonth", year: "periodYear",
};
const AREA_KEY: Record<string, string> = {
  love: "areaLove", money: "areaMoney", work: "areaWork",
  health: "areaHealth", mood: "areaMood", luck: "areaLuck",
};
const TONE_KEY: Record<string, string> = { high: "toneHigh", mixed: "toneMixed", low: "toneLow" };

type Payload = WesternPayload & {
  events: SkyEventJson[];
  natalHits?: Array<{ a: string; b: string; aspect: string; orb: number; harmony: string; exactIso: string | null }>;
};
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: Payload };

export function HoroscopoView() {
  const t = useTranslations("horoscopo");
  const th = useTranslations("hoy");
  const locale = useLocale();
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const router = useRouter();
  const params = useSearchParams();
  const { active } = useProfiles();

  const trad = params.get("trad") === "oriental" ? "oriental" : "occidental";
  // Sin perfil arrancamos en Aries; con perfil, el backend resuelve el Sol natal
  // en la PRIMERA carga (sign=null) y de ahí en adelante mandamos el elegido.
  const [sign, setSign] = useState<string | null>(active ? null : "aries");
  const [period, setPeriod] = useState<HoroscopePeriod>("today");
  const [pro, setPro] = useState(false);
  const [state, setState] = useState<State>({ s: "loading" });
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  useEffect(() => {
    if (trad !== "occidental") return;
    let alive = true;
    setState({ s: "loading" });
    void (async () => {
      try {
        const res = await fetch("/api/horoscope/western", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sign: sign ?? undefined, period, tz,
            profileId: active?.id ?? undefined,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const p = (await res.json()) as Payload;
        if (!alive) return;
        setSign(p.sign);
        setState({ s: "ready", p });
      } catch {
        if (alive) setState({ s: "error" });
      }
    })();
    return () => { alive = false; };
    // active?.id: si cambia el perfil activo, re-resolvemos el signo
  }, [trad, sign, period, tz, active?.id]);

  const ready = state.s === "ready" ? state.p : null;
  const prose = ready ? composeWesternProse(locale === "en" ? "en" : "es", ready) : [];
  const fmtExact = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", timeZone: tz,
  });

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("title")}</p>
        <h1 className={`${styles.h1} reveal`}>{t("subtitle")}</h1>
        <div className={styles.trads} role="tablist" aria-label={t("title")}>
          <button type="button" role="tab" aria-selected={trad === "occidental"}
            className={`seg__item ${trad === "occidental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo")}>{t("tabWestern")}</button>
          <button type="button" role="tab" aria-selected={trad === "oriental"}
            className={`seg__item ${trad === "oriental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo?trad=oriental")}>{t("tabEastern")}</button>
        </div>
      </header>

      {trad === "oriental" ? (
        <section className={`card ${styles.soonCard}`}>{t("easternSoon")}</section>
      ) : (
        <div className={styles.grid}>
          {/* Columna izquierda (sticky en desktop): selector + barras */}
          <div className={styles.side}>
            <div className={styles.signs} role="radiogroup" aria-label={t("signAria")}>
              {ZODIAC_SIGNS.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={sign === s.key}
                  className={`chip--control ${sign === s.key ? "chip--control-on" : ""}`}
                  onClick={() => setSign(s.key)}>
                  {SIGN_GLYPH[s.key]} {L.signs[s.key]}
                </button>
              ))}
            </div>
            <div className={styles.periods} role="tablist" aria-label={t("areasTitle")}>
              {PERIODS.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={p === period}
                  className={`seg__item ${p === period ? "seg__item--active" : ""}`}
                  onClick={() => setPeriod(p)}>{th(PERIOD_KEY[p])}</button>
              ))}
            </div>

            {ready && (
              <section className={`card ${styles.section}`}>
                <h2 className={styles.sectionH}>{t("areasTitle")}</h2>
                <AreaBars
                  calmText={th("calm")}
                  areas={ready.areas.map((a): BarArea => ({
                    key: a.area,
                    label: th(AREA_KEY[a.area] ?? a.area),
                    score: a.score,
                    tone: a.tone,
                    toneLabel: th(TONE_KEY[a.tone] ?? a.tone),
                    drivers: a.drivers.map((d) => ({
                      glyphs: `${PLANET_GLYPH[d.body] ?? "•"} · ${t("houseShort", { n: d.house })}`,
                      text: `${L.bodies[d.body] ?? d.body} — ${HOUSES[d.house]}`,
                      favorable: d.favorable,
                    })),
                  }))}
                />
              </section>
            )}
          </div>

          {/* Columna derecha: cielo + prosa + hits + pro */}
          <div className={styles.mainCol}>
            {state.s === "loading" && <p className={styles.note}>{t("loading")}</p>}
            {state.s === "error" && <p className={styles.note}>{t("error")}</p>}
            {ready && (
              <>
                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("skyTitle")}</h2>
                  <SkyEvents events={ready.events} baseSign={ready.sign} tz={tz} />
                </section>

                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("proseTitle")}</h2>
                  {prose.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)}
                </section>

                {ready.natalHits && ready.natalHits.length > 0 && (
                  <section className={`card ${styles.section}`}>
                    <h2 className={styles.sectionH}>{t("hitsTitle")}</h2>
                    {ready.natalHits.map((h, i) => (
                      <p key={i} className={`${styles.hitRow} ${h.harmony === "hard" ? styles.hitHard : styles.hitSoft}`}>
                        <span className={styles.hitGlyphs}>
                          {PLANET_GLYPH[h.a]} {ASPECT_GLYPHS[h.aspect]} {PLANET_GLYPH[h.b]}
                        </span>
                        {L.bodies[h.a]} {L.aspects[h.aspect]} {L.bodies[h.b]}
                        {h.exactIso ? ` · ${t("exactOn", { date: fmtExact.format(new Date(h.exactIso)) })}` : ""}
                      </p>
                    ))}
                  </section>
                )}

                <button type="button" className={`seg__item ${styles.proToggle} ${pro ? "seg__item--active" : ""}`}
                  aria-pressed={pro} onClick={() => setPro(!pro)}>{t("pro")}</button>

                {pro && (
                  <>
                    <section className={`card ${styles.section}`}>
                      <h2 className={styles.sectionH}>{t("proPositions")}</h2>
                      <table className={styles.proTable}>
                        <tbody>
                          {ready.houses.map((h) => (
                            <tr key={h.body}>
                              <td className={styles.proGlyph}>{PLANET_GLYPH[h.body] ?? "•"}</td>
                              <td>{L.bodies[h.body] ?? h.body}</td>
                              <td>{SIGN_GLYPH[h.sign]} {L.signs[h.sign]}</td>
                              <td>{t("houseShort", { n: h.house })}</td>
                              <td>{h.retrograde ? "℞" : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                    <p className={styles.method}>
                      {t("proMethod", { sign: L.signs[ready.sign] ?? ready.sign, tz })}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
```

`apps/web/app/(app)/horoscopo/horoscopo.module.css`:

```css
/* Horóscopo — mismo lenguaje R4: columna única en móvil, split sticky ≥1080px. */
.wrap { position: relative; max-width: 1080px; margin: 0 auto; padding: var(--sp-6) var(--sp-4) calc(var(--sp-6) * 2); }
.sky { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

.head { position: relative; z-index: 1; text-align: center; margin-bottom: var(--sp-5); }
.eyebrow { color: var(--acc-text); font-size: var(--text-xs); letter-spacing: 3px; text-transform: uppercase; font-weight: 600; margin: 0 0 var(--sp-2); }
.h1 { font-family: var(--font-display); font-size: var(--text-xl); color: var(--ink); margin: 0 0 var(--sp-4); }
.trads { display: inline-flex; gap: var(--sp-1); }

.soonCard { position: relative; z-index: 1; text-align: center; color: var(--soft); padding: var(--sp-6); }

.grid { position: relative; z-index: 1; display: grid; gap: var(--sp-4); }
@media (min-width: 1080px) {
  .grid { grid-template-columns: 380px 1fr; align-items: start; }
  .side { position: sticky; top: 96px; }
}

.side { display: flex; flex-direction: column; gap: var(--sp-4); }
.signs { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-2); }
.periods { display: flex; justify-content: center; gap: var(--sp-1); }

.mainCol { display: flex; flex-direction: column; gap: var(--sp-4); }
.section { padding: var(--sp-4); }
.sectionH { color: var(--acc-text); font-size: var(--text-sm); letter-spacing: 2px; text-transform: uppercase; margin: 0 0 var(--sp-3); font-weight: 600; }
.note { text-align: center; color: var(--soft); padding: var(--sp-6) 0; }

.events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.eventRow { display: flex; align-items: baseline; gap: var(--sp-3); padding: var(--sp-2) 0; border-bottom: 1px solid var(--line); }
.eventRow:last-child { border-bottom: 0; }
.eventGlyph { color: var(--acc-text); font-size: var(--text-md); flex-shrink: 0; }
.eventLabel { flex: 1; color: var(--ink); font-size: var(--text-sm); line-height: 1.45; }
.eventDate { color: var(--soft); font-size: var(--text-xs); white-space: nowrap; }
.noEvents { color: var(--soft); font-size: var(--text-sm); font-style: italic; margin: 0; }

.prosePara { color: var(--ink); font-size: var(--text-md); line-height: 1.65; margin: 0 0 var(--sp-3); }
.prosePara:last-child { margin-bottom: 0; }

.hitRow { display: flex; align-items: baseline; gap: var(--sp-2); color: var(--soft); font-size: var(--text-sm); margin: 0 0 var(--sp-2); }
.hitGlyphs { font-size: var(--text-md); flex-shrink: 0; }
.hitSoft .hitGlyphs { color: var(--tone-cool); }
.hitHard .hitGlyphs { color: var(--tone-warm); }

.proToggle { align-self: center; }
.proTable { width: 100%; border-collapse: collapse; font-size: var(--text-sm); color: var(--ink); }
.proTable td { padding: var(--sp-2) var(--sp-2); border-bottom: 1px solid var(--line); }
.proTable tr:last-child td { border-bottom: 0; }
.proGlyph { color: var(--acc-text); }
.method { color: var(--soft); font-size: var(--text-xs); text-align: center; margin: 0; }
```

`top-nav.tsx` línea 13 → `{ href: "/horoscopo", icon: "aries", key: "horoscopo", soon: false },` (actualizar también el comentario de la línea 8-9: Horóscopo ya no es "pronto").

`top-nav.test.tsx` — reemplazar la aserción de la línea 27:

```tsx
    expect(screen.getByRole("link", { name: new RegExp(es.nav.horoscopo) })).toHaveAttribute("href", "/horoscopo");
```

(y si el título del test dice "pronto"/"soon", renombrarlo a algo como `"horoscopo es un enlace activo"`).

`hub-view.tsx` — ampliar el tipo y la lista:

```tsx
type IconName = "grid3" | "wheel" | "pillars" | "sun" | "aries";
const LENSES: Array<{ key: string; icon: IconName; href: string; soon: boolean }> = [
  { key: "numeros", icon: "grid3", href: "/numeros", soon: false },
  { key: "carta", icon: "wheel", href: "/carta", soon: false },
  { key: "horoscopo", icon: "aries", href: "/horoscopo", soon: false },
  { key: "pilares", icon: "pillars", href: "/pilares", soon: false },
];
```

- [ ] **Step 5: Verde** — `npx pnpm --filter @aluna/web test` → PASS (incluye top-nav actualizado y horoscopo-view). Luego `npx pnpm --filter @aluna/web typecheck`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(app\)/horoscopo apps/web/components apps/web/app/\(app\)/hoy/hub-view.tsx apps/web/messages
git commit -m "feat(horoscopo): página /horoscopo — tabs, selector de signo, cielo del periodo, barras, prosa, Modo Pro; nav activo"
```

---

### Task 9: Tier IA "Profunda/Completa" (latente sin llave)

**Files:**
- Create: `apps/web/app/api/horoscope-reading/route.ts`
- Create: `apps/web/app/(app)/horoscopo/horoscope-reading.tsx`
- Modify: `apps/web/app/(app)/horoscopo/horoscopo-view.tsx` (usar el componente en la sección de prosa)
- Create: `apps/web/app/api/horoscope-reading/__tests__/parse.test.ts`

**Interfaces:**
- Consumes: `resolveReadingProvider` (lib/reading/provider), `supabaseReadingCacheStore`/`inMemoryReadingCacheStore` (@aluna/compute), `cachedWesternHoroscope` + `resolvePeriodRange` (T4), `composeWesternProse` (T7), claves i18n `numerology.reading.*` (tierEssence/tierDeep/tierComplete + hints + loading + gated — ya existen).
- Produces: `POST /api/horoscope-reading` con `{ sign, period, tz, locale, length: "profunda" | "completa" }` → stream de texto (patrón EXACTO de `/api/chart-reading`); sin llave → `{ available: false }`. Caché durable kind `"horoscope"`, clave `${locale}:western:${sign}:${period}:${localDate}:${length}`.
- **Regla dura del prompt:** la IA recibe los HECHOS calculados (posiciones por casa, eventos, áreas) y tiene prohibido inventar posiciones — interpreta, no calcula.

- [ ] **Step 1: Test que falla** — `apps/web/app/api/horoscope-reading/__tests__/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseHoroscopeReading, factsBlock } from "../parse";

describe("parseHoroscopeReading", () => {
  it("extrae {reading} de un stream con ruido alrededor", () => {
    expect(parseHoroscopeReading('bla {"reading":"El cielo te pide raíz."} fin'))
      .toEqual({ reading: "El cielo te pide raíz." });
  });
  it("null si falta el campo o el JSON está roto", () => {
    expect(parseHoroscopeReading('{"otra":"cosa"}')).toBeNull();
    expect(parseHoroscopeReading("nada")).toBeNull();
  });
});

describe("factsBlock", () => {
  it("lista casas, eventos y áreas en líneas planas (sin JSON)", () => {
    const txt = factsBlock("es", {
      sign: "leo", period: "week", tz: "utc",
      range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-19T23:59:59Z" },
      houses: [{ body: "mars", sign: "virgo", house: 2, retrograde: false }],
      signAspects: [],
      events: [{ kind: "station", atIso: "2026-07-18T03:00:00Z", body: "mercury", direction: "retrograde", sign: "leo" }],
      areas: [{ area: "money", score: 44, tone: "mixed", drivers: [{ body: "mars", house: 2, favorable: false }] }],
    });
    expect(txt).toContain("Marte");
    expect(txt).toContain("casa 2");
    expect(txt.toLowerCase()).toContain("retrógrado");
    expect(txt).not.toContain("{");
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx pnpm --filter @aluna/web test -- horoscope-reading` → FAIL.

- [ ] **Step 3: Implementación**

`apps/web/app/api/horoscope-reading/parse.ts` (módulo hermano puro y testeable):

```ts
import type { WesternPayload } from "@/lib/horoscope/western";
import { astroLabels } from "@/lib/content/astrology-labels";
import { SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";

export interface HoroscopeReading { reading: string; }

export function parseHoroscopeReading(text: string): HoroscopeReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.reading === "string" && o.reading.trim()) return { reading: o.reading };
  } catch { /* null */ }
  return null;
}

/** Hechos astronómicos en líneas planas: lo ÚNICO que la IA puede usar. */
export function factsBlock(locale: "es" | "en", p: WesternPayload): string {
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const retro = locale === "en" ? "retrograde" : "retrógrado";
  const lines: string[] = [];
  for (const h of p.houses) {
    lines.push(`- ${L.bodies[h.body] ?? h.body}: ${L.signs[h.sign] ?? h.sign}, casa ${h.house} (${HOUSES[h.house]})${h.retrograde ? `, ${retro}` : ""}`);
  }
  for (const e of p.events) {
    if (e.kind === "lunation") lines.push(`- ${e.phase === "new" ? (locale === "en" ? "New Moon" : "Luna Nueva") : (locale === "en" ? "Full Moon" : "Luna Llena")} ${e.atIso.slice(0, 10)} en ${L.signs[e.sign] ?? e.sign}${e.eclipse ? ` (eclipse ${e.eclipse})` : ""}`);
    if (e.kind === "station") lines.push(`- ${L.bodies[e.body] ?? e.body} ${e.direction === "retrograde" ? retro : locale === "en" ? "direct" : "directo"} ${e.atIso.slice(0, 10)}`);
    if (e.kind === "ingress") lines.push(`- ${L.bodies[e.body] ?? e.body} → ${L.signs[e.toSign] ?? e.toSign} ${e.atIso.slice(0, 10)}`);
  }
  for (const a of p.areas) {
    lines.push(`- area ${a.area}: ${a.score}/100 (${a.tone})`);
  }
  return lines.join("\n");
}
```

`apps/web/app/api/horoscope-reading/route.ts` — clonar la ESTRUCTURA de `/api/chart-reading/route.ts` (caché lazy `getReadingCache()` idéntico, mismo streaming, mismo fallback `complete()`), con estas diferencias exactas:

1. `runtime = "nodejs"` + `setEphePath(...)` como en `/api/horoscope/western` (esta ruta COMPUTA el payload — jamás confía en datos del cliente).
2. Validación del body: `sign` ∈ ZODIAC_SIGNS, `period` ∈ HOROSCOPE_PERIODS, `tz` con `isValidTz` (si no, "utc"), `length` ∈ {"profunda", "completa"}, `locale` ∈ {"es","en"}.
3. `const payload = cachedWesternHoroscope(sign, period, tz);` y `const facts = factsBlock(locale, payload);`.
4. Clave de caché: `` `${locale}:western:${sign}:${period}:${resolvePeriodRange(period, tz).localDate}:${length}` `` y `kind: "horoscope"` en el `.set`.
5. SYSTEM (es; espejo en en): la voz Aluna de horóscopo + la regla anti-invención:

```ts
const SYSTEM_ES = `Eres Aluna: una guía de autoconocimiento que lee el cielo del periodo como clima del alma, no como sentencia. Astrología EVOLUTIVA: propósito, no predicción; el retrógrado invita a revisar, nunca asusta.

Tu voz: cálida, poética, clara; de tú; nombras el reto sin dramatismo; tejes un concepto yóguico cuando ayuda (svadhyaya, santosha, aparigraha, dharma), explicado en la misma frase. Sin asteriscos, sin markdown, sin emojis, sin hablar de ti como IA.

REGLA DURA: solo puedes referirte a los hechos astronómicos LISTADOS abajo. No inventes posiciones, fechas ni eventos que no estén en la lista. Interpretas; no calculas.

Respondes ÚNICAMENTE un objeto JSON válido con una clave de texto: "reading".`;
```

6. Prompt de usuario: signo + periodo + `LENGTH_GUIDE` (copiar el objeto de chart-reading con las mismas dos entradas profunda/completa) + `\n\nHECHOS:\n${facts}`.
7. `parseHoroscopeReading` en lugar de `parseReading`.

`apps/web/app/(app)/horoscopo/horoscope-reading.tsx` — selector de tiers + stream (espejo compacto del patrón body-reading):

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HoroscopePeriod } from "@/lib/horoscope/western";
import styles from "./horoscopo.module.css";

type Tier = "esencia" | "profunda" | "completa";

export function HoroscopeReading({
  sign, period, tz, essence,
}: { sign: string; period: HoroscopePeriod; tz: string; essence: string[] }) {
  const t = useTranslations("numerology.reading");
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [gated, setGated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTier("esencia"); setText(""); setGated(false);
  }, [sign, period]);

  useEffect(() => {
    if (tier === "esencia") return;
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    setBusy(true); setText(""); setGated(false);
    void (async () => {
      try {
        const res = await fetch("/api/horoscope-reading", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sign, period, tz, locale, length: tier }),
          signal: ctrl.signal,
        });
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await res.json()) as { available?: boolean; meaning?: { reading?: string } };
          if (data.available && data.meaning?.reading) setText(data.meaning.reading);
          else setGated(true);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) { setGated(true); return; }
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          const m = acc.match(/"reading"\s*:\s*"((?:[^"\\]|\\.)*)/);
          if (m) {
            // Escape a medio llegar (p.ej. barra final) → esperar el próximo chunk.
            try { setText(JSON.parse(`"${m[1]}"`) as string); } catch { /* chunk parcial */ }
          }
        }
      } catch { setGated(true); }
      finally { setBusy(false); }
    })();
    return () => ctrl.abort();
  }, [tier, sign, period, tz, locale]);

  const TIERS: Array<{ key: Tier; label: string }> = [
    { key: "esencia", label: t("tierEssence") },
    { key: "profunda", label: t("tierDeep") },
    { key: "completa", label: t("tierComplete") },
  ];

  return (
    <div>
      <div className={styles.periods} role="tablist" aria-label={t("tierEssence")}>
        {TIERS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tier === x.key}
            className={`seg__item ${tier === x.key ? "seg__item--active" : ""}`}
            onClick={() => setTier(x.key)}>{x.label}</button>
        ))}
      </div>
      {tier === "esencia" ? (
        essence.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)
      ) : gated ? (
        <p className={styles.noEvents}>{t("gated")}</p>
      ) : (
        <p className={styles.prosePara}>{text || (busy ? t("loading") : "")}</p>
      )}
    </div>
  );
}
```

En `horoscopo-view.tsx`, la sección de prosa cambia a:

```tsx
                <section className={`card ${styles.section}`}>
                  <h2 className={styles.sectionH}>{t("proseTitle")}</h2>
                  <HoroscopeReading sign={ready.sign} period={period} tz={tz} essence={prose} />
                </section>
```

(con su import `import { HoroscopeReading } from "./horoscope-reading";`).

- [ ] **Step 4: Verde** — `npx pnpm --filter @aluna/web test && npx pnpm --filter @aluna/web typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/horoscope-reading apps/web/app/\(app\)/horoscopo
git commit -m "feat(horoscopo): tiers IA Profunda/Completa (latentes) con hechos calculados y caché durable"
```

---

### Task 10: Gates finales + verificación en vivo

**Files:** ninguno nuevo (correcciones que salgan de los gates).

- [ ] **Step 1: Suite completa del monorepo**

Run: `npx pnpm turbo run typecheck test`
Expected: 6/6 paquetes verdes (core ≥151+nuevos, ephemeris ≥36+nuevos, web ≥153+nuevos).

- [ ] **Step 2: El gate REAL — next build**

Run: `npx pnpm --filter @aluna/web build`
Expected: build limpio; `/horoscopo`, `/api/horoscope/western` y `/api/horoscope-reading` listados. (Lección del repo: ESLint del build caza imports sin uso que tsc deja pasar; si marca algo, arreglarlo aquí.)

- [ ] **Step 3: Verificación EN VIVO (navegador real, no solo curl)**

Levantar `npx pnpm --filter @aluna/web dev` (puerto libre; si 3000 ocupado usa el que asigne) con el `.env.local` existente. Checklist con usuario real (patrón del repo: crear usuario por SQL/self-signup, borrar después):

1. `/horoscopo` desde el nav (el botón ya NO dice pronto).
2. Sin perfil → arranca Aries; con perfil activo → arranca en el signo del Sol natal REAL (cotejar contra `/carta`).
3. Cambiar entre los 12 signos y los 4 periodos: recalcula; caché universal = segundo hit instantáneo.
4. "El cielo del periodo" (semana): eventos con fecha/hora locales coherentes; si hay lunación, su casa solar cambia al cambiar de signo (whole-sign vivo).
5. Barras: tap → drivers "planeta — casa solar"; suben/bajan según benéfico/maléfico.
6. Prosa: menciona EXACTAMENTE lo que la lámina Pro lista (anti-funa manual).
7. Modo Pro: tabla de tránsitos por casa solar + nota de metodología con la tz del navegador.
8. Tier Profunda sin llave → mensaje cálido de dormancia (gated).
9. EN completo (cookie de idioma) + los 3 temas rápido (observatory/aurora/cosmic).
10. `?trad=oriental` → tarjeta "pronto".

- [ ] **Step 4: Commit final de la rama (si hubo fixes) + push**

```bash
git add -A && git commit -m "fix(horoscopo): ajustes de la verificación en vivo" # solo si hubo cambios
git push origin worktree-horoscopo
```

---

## Notas de ejecución

- Orden estricto T1→T10 (cada tarea consume interfaces de la anterior).
- Si un test canónico de eventos falla por minutos de diferencia, PRIMERO sospechar del manejo ET/UT o de la firma del binding sweph — jamás relajar la tolerancia canónica sin entender el porqué (anti-funa).
- La rama es `worktree-horoscopo`; NO fusionar a main en este plan (eso llega con H2/H3 o cuando Gio lo pida).
- H2 (Oriental) y H3 (móvil) son planes aparte sobre este mismo spec.




