# Modo Pro de Cuatro Pilares (Ba Zi/Saju) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la lámina técnica profesional del lente Pilares (Na Yin, 12 etapas, interacciones 刑沖合害, estrellas 神煞+空亡, fuerza del Maestro del Día con puntaje transparente + 喜用神, Pilares de Suerte 大運 + años de flujo 流年) en web Y móvil, con toggle Ba Zi ↔ Saju.

**Architecture:** Todo el dominio nuevo son módulos PUROS y RN-safe en `packages/core/src/bazi/` (tablas canónicas + funciones, cada una testeada contra ejemplos publicados). Lo único astronómico nuevo — distancia a los términos solares de mes (節) para la edad de inicio de los 大運 — vive en `@aluna/ephemeris` (`jieBoundaries`, iteración Newton como la Revolución Solar). `/api/bazi` gana Bearer auth (paridad `/api/chart`) y devuelve los datos crudos; web y móvil componen la lámina client-side desde `@aluna/core`.

**Tech Stack:** TypeScript strict, Vitest, Next.js 15 (web, CSS Modules), Expo SDK 56 (móvil, RN core), pnpm+Turborepo.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-08-bazi-modo-pro-design.md` (decisiones de producto en §2).
- `@aluna/core` NUNCA importa node:/efemérides (RN-safe). El móvil NUNCA importa `@aluna/ephemeris`.
- Género `neutral` en 大運 → devolver AMBAS direcciones (decisión Gio).
- Fuerza del DM: puntaje transparente con drivers; umbrales en UNA constante exportada; banda "equilibrado" 45–55; escuelas 從格 FUERA de alcance.
- Transformaciones 化 de combinaciones FUERA de alcance (solo se reporta la combinación).
- Glifos hanzi/hangul y romanizaciones = datos de dominio → `@aluna/core`. Nombres ES/EN → i18n de cada app.
- Gate real del web = `next build` (corre ESLint+bundler), no solo tsc/tests. Gate del móvil = `npx expo export --platform ios` (borrar `dist/` después).
- Commits frecuentes; mensajes estilo repo (`feat(bazi): …` en español).
- Tests con vitest: core `cd packages/core && npx vitest run`, ephemeris `cd packages/ephemeris && npx vitest run`, web `cd apps/web && npx vitest run`, mobile `cd apps/mobile && npx vitest run`.

---

### Task 1: Core — `sexagenaryIndex` + Na Yin 納音

**Files:**
- Create: `packages/core/src/bazi/nayin.ts`
- Test: `packages/core/src/bazi/__tests__/nayin.test.ts`
- Modify: `packages/core/src/index.ts` (exports)

**Interfaces:**
- Consumes: `Pillar`, `StemDef` de `./bazi`.
- Produces: `sexagenaryIndex(p: Pillar): number` (0..59); `interface NayinDef { key: string; hanzi: string; element: "wood"|"fire"|"earth"|"metal"|"water" }`; `NAYIN: readonly NayinDef[]` (30); `nayin(p: Pillar): NayinDef`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/nayin.test.ts
import { describe, it, expect } from "vitest";
import { sexagenaryIndex, nayin, NAYIN } from "../nayin";

describe("sexagenaryIndex", () => {
  it("甲子=0, 乙丑=1, 癸亥=59", () => {
    expect(sexagenaryIndex({ stem: 0, branch: 0 })).toBe(0);
    expect(sexagenaryIndex({ stem: 1, branch: 1 })).toBe(1);
    expect(sexagenaryIndex({ stem: 9, branch: 11 })).toBe(59);
  });
  it("甲戌=10 (2ª decena), 庚辰=16", () => {
    expect(sexagenaryIndex({ stem: 0, branch: 10 })).toBe(10);
    expect(sexagenaryIndex({ stem: 6, branch: 4 })).toBe(16);
  });
});

describe("nayin (納音, 30 pares canónicos)", () => {
  it("hay exactamente 30 entradas", () => {
    expect(NAYIN).toHaveLength(30);
  });
  it("甲子/乙丑 = 海中金 (metal)", () => {
    expect(nayin({ stem: 0, branch: 0 })).toMatchObject({ key: "sea_gold", hanzi: "海中金", element: "metal" });
    expect(nayin({ stem: 1, branch: 1 }).key).toBe("sea_gold");
  });
  it("庚辰/辛巳 = 白鑞金", () => {
    expect(nayin({ stem: 6, branch: 4 }).hanzi).toBe("白鑞金");
  });
  it("戊子/己丑 = 霹靂火 (fire); 壬戌/癸亥 = 大海水 (water)", () => {
    expect(nayin({ stem: 4, branch: 0 })).toMatchObject({ hanzi: "霹靂火", element: "fire" });
    expect(nayin({ stem: 8, branch: 10 })).toMatchObject({ hanzi: "大海水", element: "water" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/nayin.test.ts`
Expected: FAIL — cannot resolve `../nayin`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/nayin.ts
// 納音 (elementos melódicos): cada PAR consecutivo del ciclo de 60 comparte un
// elemento "melódico" con nombre poético. Tabla canónica de 30 entradas (淵海子平).
// El nombre localizado (ES/EN) vive en la capa i18n de cada app, indexado por `key`.
import type { Pillar, StemDef } from "./bazi";

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Índice 0..59 del ciclo sexagenario (CRT: n≡stem mod 10, n≡branch mod 12). */
export function sexagenaryIndex(p: Pillar): number {
  return mod(6 * p.stem - 5 * p.branch, 60);
}

export interface NayinDef {
  key: string;
  hanzi: string;
  element: StemDef["element"];
}

/** Los 30 Na Yin en orden del ciclo (índice = sexagenaryIndex/2). */
export const NAYIN: readonly NayinDef[] = [
  { key: "sea_gold", hanzi: "海中金", element: "metal" },
  { key: "furnace_fire", hanzi: "爐中火", element: "fire" },
  { key: "forest_wood", hanzi: "大林木", element: "wood" },
  { key: "roadside_earth", hanzi: "路旁土", element: "earth" },
  { key: "sword_metal", hanzi: "劍鋒金", element: "metal" },
  { key: "mountaintop_fire", hanzi: "山頭火", element: "fire" },
  { key: "stream_water", hanzi: "澗下水", element: "water" },
  { key: "citywall_earth", hanzi: "城頭土", element: "earth" },
  { key: "pewter_metal", hanzi: "白鑞金", element: "metal" },
  { key: "willow_wood", hanzi: "楊柳木", element: "wood" },
  { key: "spring_water", hanzi: "泉中水", element: "water" },
  { key: "rooftop_earth", hanzi: "屋上土", element: "earth" },
  { key: "thunderbolt_fire", hanzi: "霹靂火", element: "fire" },
  { key: "pine_wood", hanzi: "松柏木", element: "wood" },
  { key: "longriver_water", hanzi: "長流水", element: "water" },
  { key: "sand_gold", hanzi: "沙中金", element: "metal" },
  { key: "mountainfoot_fire", hanzi: "山下火", element: "fire" },
  { key: "plain_wood", hanzi: "平地木", element: "wood" },
  { key: "wall_earth", hanzi: "壁上土", element: "earth" },
  { key: "goldfoil_metal", hanzi: "金箔金", element: "metal" },
  { key: "lamp_fire", hanzi: "覆燈火", element: "fire" },
  { key: "skyriver_water", hanzi: "天河水", element: "water" },
  { key: "highway_earth", hanzi: "大驛土", element: "earth" },
  { key: "hairpin_metal", hanzi: "釵釧金", element: "metal" },
  { key: "mulberry_wood", hanzi: "桑柘木", element: "wood" },
  { key: "greatstream_water", hanzi: "大溪水", element: "water" },
  { key: "sand_earth", hanzi: "沙中土", element: "earth" },
  { key: "heavenly_fire", hanzi: "天上火", element: "fire" },
  { key: "pomegranate_wood", hanzi: "石榴木", element: "wood" },
  { key: "ocean_water", hanzi: "大海水", element: "water" },
] as const;

export function nayin(p: Pillar): NayinDef {
  return NAYIN[Math.floor(sexagenaryIndex(p) / 2)]!;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/nayin.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Export from index and run full core suite**

En `packages/core/src/index.ts`, junto a los exports de bazi existentes, añadir:

```ts
export { sexagenaryIndex, nayin, NAYIN, type NayinDef } from "./bazi/nayin";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json`
Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/bazi/nayin.ts packages/core/src/bazi/__tests__/nayin.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): índice sexagenario + tabla Na Yin 納音 (30 pares canónicos)"
```

---

### Task 2: Core — 12 Etapas de Vida 十二長生

**Files:**
- Create: `packages/core/src/bazi/stages.ts`
- Test: `packages/core/src/bazi/__tests__/stages.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `HEAVENLY_STEMS` de `./bazi`.
- Produces: `type StageKey = "birth"|"bath"|"cap"|"office"|"peak"|"decline"|"sickness"|"death"|"tomb"|"cut"|"womb"|"nurture"`; `interface StageDef { key: StageKey; hanzi: string; hangul: string }`; `TWELVE_STAGES: readonly StageDef[]` (12, en orden); `lifeStage(dayStem: number, branch: number): StageKey`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/stages.test.ts
import { describe, it, expect } from "vitest";
import { lifeStage, TWELVE_STAGES } from "../stages";

describe("十二長生 (12 etapas de vida del DM por rama)", () => {
  it("las 12 etapas en orden canónico", () => {
    expect(TWELVE_STAGES.map((s) => s.hanzi)).toEqual([
      "長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養",
    ]);
  });
  it("甲 (yang wood) nace 長生 en 亥 y avanza: 子=沐浴, 卯=帝旺, 未=墓", () => {
    expect(lifeStage(0, 11)).toBe("birth");
    expect(lifeStage(0, 0)).toBe("bath");
    expect(lifeStage(0, 3)).toBe("peak");
    expect(lifeStage(0, 7)).toBe("tomb");
  });
  it("乙 (yin wood) nace en 午 y RETROCEDE: 巳=沐浴, 寅=帝旺", () => {
    expect(lifeStage(1, 6)).toBe("birth");
    expect(lifeStage(1, 5)).toBe("bath");
    expect(lifeStage(1, 2)).toBe("peak");
  });
  it("庚 nace en 巳; 辛 nace en 子; 壬 en 申; 癸 en 卯 (tabla estándar)", () => {
    expect(lifeStage(6, 5)).toBe("birth");
    expect(lifeStage(7, 0)).toBe("birth");
    expect(lifeStage(8, 8)).toBe("birth");
    expect(lifeStage(9, 3)).toBe("birth");
  });
  it("戊/己 siguen al fuego: 戊 nace en 寅, 己 en 酉", () => {
    expect(lifeStage(4, 2)).toBe("birth");
    expect(lifeStage(5, 9)).toBe("birth");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/stages.test.ts`
Expected: FAIL — cannot resolve `../stages`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/stages.ts
// 十二長生: la "vida" del Maestro del Día a través de las 12 ramas. Cada tronco
// tiene su rama de nacimiento (長生); los troncos YANG avanzan por las ramas y los
// YIN retroceden (陽順陰逆). 戊/己 (tierra) siguen al fuego (escuela estándar).
const mod = (n: number, m: number) => ((n % m) + m) % m;

export type StageKey =
  | "birth" | "bath" | "cap" | "office" | "peak" | "decline"
  | "sickness" | "death" | "tomb" | "cut" | "womb" | "nurture";

export interface StageDef {
  key: StageKey;
  hanzi: string;
  hangul: string;
}

export const TWELVE_STAGES: readonly StageDef[] = [
  { key: "birth", hanzi: "長生", hangul: "장생" },
  { key: "bath", hanzi: "沐浴", hangul: "목욕" },
  { key: "cap", hanzi: "冠帶", hangul: "관대" },
  { key: "office", hanzi: "臨官", hangul: "건록" },
  { key: "peak", hanzi: "帝旺", hangul: "제왕" },
  { key: "decline", hanzi: "衰", hangul: "쇠" },
  { key: "sickness", hanzi: "病", hangul: "병" },
  { key: "death", hanzi: "死", hangul: "사" },
  { key: "tomb", hanzi: "墓", hangul: "묘" },
  { key: "cut", hanzi: "絕", hangul: "절" },
  { key: "womb", hanzi: "胎", hangul: "태" },
  { key: "nurture", hanzi: "養", hangul: "양" },
] as const;

/** Rama de 長生 por tronco (índices en EARTHLY_BRANCHES): 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯. */
const BIRTH_BRANCH: readonly number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3] as const;

export function lifeStage(dayStem: number, branch: number): StageKey {
  const s = mod(dayStem, 10);
  const start = BIRTH_BRANCH[s]!;
  const yang = s % 2 === 0;
  const idx = yang ? mod(branch - start, 12) : mod(start - branch, 12);
  return TWELVE_STAGES[idx]!.key;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/stages.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export { lifeStage, TWELVE_STAGES, type StageKey, type StageDef } from "./bazi/stages";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/stages.ts packages/core/src/bazi/__tests__/stages.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): 12 etapas de vida 十二長生 (yang avanza, yin retrocede)"
```

---

### Task 3: Core — Interacciones 刑沖合害 + 天干五合

**Files:**
- Create: `packages/core/src/bazi/interactions.ts`
- Test: `packages/core/src/bazi/__tests__/interactions.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Pillar`, `StemDef` de `./bazi`.
- Produces:
  - `type PillarPos = "year"|"month"|"day"|"hour"`
  - `interface PillarSet { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar | null }`
  - `type InteractionType = "stem_combo"|"six_combo"|"trine"|"half_trine"|"clash"|"punishment"|"self_punishment"|"harm"`
  - `interface Interaction { type: InteractionType; positions: PillarPos[]; element?: StemDef["element"] }`
  - `detectInteractions(pillars: PillarSet): Interaction[]`
  - `branchPairInteractions(a: number, b: number): { type: InteractionType; element?: StemDef["element"] }[]` (solo pares: six_combo/clash/harm/punishment/self_punishment — para marcar 流年).

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/interactions.test.ts
import { describe, it, expect } from "vitest";
import { detectInteractions, branchPairInteractions, type Interaction } from "../interactions";

const P = (stem: number, branch: number) => ({ stem, branch });
const has = (list: Interaction[], type: string, positions: string[]) =>
  list.some((i) => i.type === type && positions.every((p) => i.positions.includes(p as never)) && i.positions.length === positions.length);

describe("branchPairInteractions (pares, para marcas de 流年)", () => {
  it("子午 = choque; 子丑 = 六合→tierra; 子未 = daño; 子卯 = castigo", () => {
    expect(branchPairInteractions(0, 6).map((x) => x.type)).toContain("clash");
    const combo = branchPairInteractions(0, 1).find((x) => x.type === "six_combo");
    expect(combo?.element).toBe("earth");
    expect(branchPairInteractions(0, 7).map((x) => x.type)).toContain("harm");
    expect(branchPairInteractions(0, 3).map((x) => x.type)).toContain("punishment");
  });
  it("辰辰 = auto-castigo; 寅亥 = 六合→madera (y también daño NO: 寅巳 es daño)", () => {
    expect(branchPairInteractions(4, 4).map((x) => x.type)).toContain("self_punishment");
    expect(branchPairInteractions(2, 11).find((x) => x.type === "six_combo")?.element).toBe("wood");
    expect(branchPairInteractions(2, 5).map((x) => x.type)).toContain("harm");
  });
});

describe("detectInteractions (set natal)", () => {
  it("detecta trino completo 申子辰→agua con las 3 posiciones", () => {
    const list = detectInteractions({ year: P(0, 8), month: P(1, 0), day: P(2, 4), hour: P(3, 3) });
    expect(has(list, "trine", ["year", "month", "day"])).toBe(true);
    expect(list.find((i) => i.type === "trine")?.element).toBe("water");
  });
  it("medio trino requiere la rama pivote (子午卯酉): 申+子 sí; 申+辰 no", () => {
    const a = detectInteractions({ year: P(0, 8), month: P(1, 0), day: P(2, 2), hour: null });
    expect(a.some((i) => i.type === "half_trine")).toBe(true);
    const b = detectInteractions({ year: P(0, 8), month: P(1, 4), day: P(2, 2), hour: null });
    expect(b.some((i) => i.type === "half_trine")).toBe(false);
  });
  it("castigo de 3 (寅巳申) con las tres presentes; 丑戌未 igual", () => {
    const list = detectInteractions({ year: P(0, 2), month: P(1, 5), day: P(2, 8), hour: null });
    expect(has(list, "punishment", ["year", "month", "day"])).toBe(true);
  });
  it("天干五合: 甲+己→tierra entre año y mes", () => {
    const list = detectInteractions({ year: P(0, 0), month: P(5, 2), day: P(2, 4), hour: null });
    const sc = list.find((i) => i.type === "stem_combo");
    expect(sc?.positions).toEqual(expect.arrayContaining(["year", "month"]));
    expect(sc?.element).toBe("earth");
  });
  it("sin hora, no inventa interacciones con la hora", () => {
    const list = detectInteractions({ year: P(0, 0), month: P(1, 6), day: P(2, 2), hour: null });
    expect(list.every((i) => !i.positions.includes("hour"))).toBe(true);
    expect(has(list, "clash", ["year", "month"])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/interactions.test.ts`
Expected: FAIL — cannot resolve `../interactions`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/interactions.ts
// Interacciones clásicas entre PILARES NATALES: combinaciones de tronco 天干五合,
// combinaciones de rama 六合, trinos 三合 (completos y medios con pivote), choques
// 六沖, castigos 刑 (grupos, par 子卯 y auto-castigos) y daños 六害.
// La TRANSFORMACIÓN (化) de las combinaciones NO se evalúa (fuera de alcance, spec §10):
// solo se reporta la combinación y su elemento asociado.
import type { Pillar, StemDef } from "./bazi";

export type PillarPos = "year" | "month" | "day" | "hour";
export interface PillarSet {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour?: Pillar | null;
}
export type InteractionType =
  | "stem_combo" | "six_combo" | "trine" | "half_trine"
  | "clash" | "punishment" | "self_punishment" | "harm";
export interface Interaction {
  type: InteractionType;
  positions: PillarPos[];
  element?: StemDef["element"];
}

type El = StemDef["element"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 天干五合: pares de troncos (a<b) → elemento de la combinación. */
const STEM_COMBOS: readonly { a: number; b: number; element: El }[] = [
  { a: 0, b: 5, element: "earth" }, // 甲己
  { a: 1, b: 6, element: "metal" }, // 乙庚
  { a: 2, b: 7, element: "water" }, // 丙辛
  { a: 3, b: 8, element: "wood" }, // 丁壬
  { a: 4, b: 9, element: "fire" }, // 戊癸
] as const;

/** 六合: pares de ramas → elemento. */
const SIX_COMBOS: readonly { a: number; b: number; element: El }[] = [
  { a: 0, b: 1, element: "earth" }, // 子丑
  { a: 2, b: 11, element: "wood" }, // 寅亥
  { a: 3, b: 10, element: "fire" }, // 卯戌
  { a: 4, b: 9, element: "metal" }, // 辰酉
  { a: 5, b: 8, element: "water" }, // 巳申
  { a: 6, b: 7, element: "earth" }, // 午未
] as const;

/** 三合: trinos [inicio, pivote, tumba] → elemento. El pivote (子午卯酉) define el medio trino. */
export const TRINES: readonly { branches: readonly [number, number, number]; element: El }[] = [
  { branches: [8, 0, 4], element: "water" }, // 申子辰
  { branches: [2, 6, 10], element: "fire" }, // 寅午戌
  { branches: [5, 9, 1], element: "metal" }, // 巳酉丑
  { branches: [11, 3, 7], element: "wood" }, // 亥卯未
] as const;

/** 六害: pares de ramas que se dañan. */
const HARMS: readonly (readonly [number, number])[] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
] as const;

/** 刑 de grupo: 寅巳申 (ingratitud), 丑戌未 (abuso). El par 子卯 y los auto-castigos van aparte. */
const PUNISH_GROUPS: readonly (readonly [number, number, number])[] = [
  [2, 5, 8],
  [1, 10, 7],
] as const;
const SELF_PUNISH = new Set([4, 6, 9, 11]); // 辰午酉亥

const pairMatch = (a: number, b: number, x: number, y: number) =>
  (a === x && b === y) || (a === y && b === x);

/** Interacciones de UN PAR de ramas (para marcar 流年 contra las natales). */
export function branchPairInteractions(
  a: number,
  b: number,
): { type: InteractionType; element?: El }[] {
  const A = mod(a, 12);
  const B = mod(b, 12);
  const out: { type: InteractionType; element?: El }[] = [];
  const combo = SIX_COMBOS.find((c) => pairMatch(A, B, c.a, c.b));
  if (combo) out.push({ type: "six_combo", element: combo.element });
  if (mod(A + 6, 12) === B) out.push({ type: "clash" });
  if (HARMS.some(([x, y]) => pairMatch(A, B, x, y))) out.push({ type: "harm" });
  if (pairMatch(A, B, 0, 3)) out.push({ type: "punishment" }); // 子卯
  if (A === B && SELF_PUNISH.has(A)) out.push({ type: "self_punishment" });
  // Pares dentro de un grupo de castigo (寅巳, 巳申, 寅申, 丑戌, 戌未, 丑未) también son 刑.
  if (PUNISH_GROUPS.some((g) => g.includes(A) && g.includes(B) && A !== B)) {
    out.push({ type: "punishment" });
  }
  return out;
}

/** Todas las interacciones del set natal (3 o 4 pilares). Determinista y sin duplicados. */
export function detectInteractions(pillars: PillarSet): Interaction[] {
  const entries: { pos: PillarPos; pillar: Pillar }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
  ];
  if (pillars.hour) entries.push({ pos: "hour", pillar: pillars.hour });

  const out: Interaction[] = [];

  // Troncos: 五合 por pares.
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sc = STEM_COMBOS.find((c) =>
        pairMatch(entries[i]!.pillar.stem, entries[j]!.pillar.stem, c.a, c.b),
      );
      if (sc) out.push({ type: "stem_combo", positions: [entries[i]!.pos, entries[j]!.pos], element: sc.element });
    }
  }

  // Trinos completos y grupos de castigo (tríos) — busca las 3 ramas presentes.
  const tri = (branches: readonly [number, number, number]): PillarPos[][] => {
    const found = branches.map((b) => entries.filter((e) => e.pillar.branch === b).map((e) => e.pos));
    if (found.some((f) => f.length === 0)) return [];
    // una sola instancia por trío (primera aparición de cada rama) — suficiente y sin explosión combinatoria
    return [[found[0]![0]!, found[1]![0]!, found[2]![0]!]];
  };
  for (const t of TRINES) {
    for (const positions of tri(t.branches)) out.push({ type: "trine", positions, element: t.element });
  }
  for (const g of PUNISH_GROUPS) {
    for (const positions of tri(g)) out.push({ type: "punishment", positions });
  }

  // Pares de ramas.
  const trinePositions = new Set(
    out.filter((i) => i.type === "trine").flatMap((i) => i.positions),
  );
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!;
      const b = entries[j]!;
      for (const hit of branchPairInteractions(a.pillar.branch, b.pillar.branch)) {
        // castigo de grupo por pares ya cubierto arriba cuando está el trío completo:
        if (hit.type === "punishment" && PUNISH_GROUPS.some((g) => g.includes(a.pillar.branch) && g.includes(b.pillar.branch))) {
          const full = out.some((x) => x.type === "punishment" && x.positions.length === 3 && x.positions.includes(a.pos) && x.positions.includes(b.pos));
          if (full) continue;
        }
        out.push({ type: hit.type, positions: [a.pos, b.pos], ...(hit.element ? { element: hit.element } : {}) });
      }
      // Medio trino: dos ramas de un mismo trino incluyendo el PIVOTE, sin el trío completo.
      const t = TRINES.find(
        (tr) =>
          tr.branches.includes(a.pillar.branch as never) &&
          tr.branches.includes(b.pillar.branch as never) &&
          a.pillar.branch !== b.pillar.branch &&
          (a.pillar.branch === tr.branches[1] || b.pillar.branch === tr.branches[1]),
      );
      if (t && !(trinePositions.has(a.pos) && trinePositions.has(b.pos))) {
        out.push({ type: "half_trine", positions: [a.pos, b.pos], element: t.element });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/interactions.test.ts`
Expected: PASS (7 tests). Si el test del medio trino falla porque el trino completo también está presente, revisar la condición `trinePositions`.

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export {
  detectInteractions, branchPairInteractions, TRINES,
  type Interaction, type InteractionType, type PillarPos, type PillarSet,
} from "./bazi/interactions";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/interactions.ts packages/core/src/bazi/__tests__/interactions.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): interacciones 刑沖合害 + 天干五合 (natal + pares para flujo)"
```

---

### Task 4: Core — Estrellas simbólicas 神煞 + Vacíos 空亡

**Files:**
- Create: `packages/core/src/bazi/stars.ts`
- Test: `packages/core/src/bazi/__tests__/stars.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Pillar` de `./bazi`; `sexagenaryIndex` de `./nayin`; `PillarSet`, `PillarPos` de `./interactions`; `TRINES` de `./interactions`.
- Produces: `type StarKey = "nobleman"|"peach_blossom"|"sky_horse"|"academic"|"canopy"|"goat_blade"|"void"`; `interface StarDef { key: StarKey; hanzi: string; hangul: string }`; `STARS: readonly StarDef[]`; `interface StarHit { star: StarKey; pillar: PillarPos }`; `voidBranches(day: Pillar): [number, number]`; `symbolicStars(pillars: PillarSet): StarHit[]`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/stars.test.ts
import { describe, it, expect } from "vitest";
import { symbolicStars, voidBranches, STARS } from "../stars";

const P = (stem: number, branch: number) => ({ stem, branch });
const hit = (list: { star: string; pillar: string }[], star: string, pillar: string) =>
  list.some((h) => h.star === star && h.pillar === pillar);

describe("空亡 (vacíos por decena del pilar de día)", () => {
  it("甲子旬 (día 甲子) → vacíos 戌亥 (10, 11)", () => {
    expect(voidBranches(P(0, 0))).toEqual([10, 11]);
  });
  it("甲戌旬 (día 甲戌) → 申酉 (8, 9); 甲申旬 → 午未 (6, 7)", () => {
    expect(voidBranches(P(0, 10))).toEqual([8, 9]);
    expect(voidBranches(P(0, 8))).toEqual([6, 7]);
  });
});

describe("神煞 núcleo (tablas canónicas por tronco/trino de día)", () => {
  it("天乙貴人: día 甲 → 丑/未 (mnemónico 甲戊庚牛羊)", () => {
    const stars = symbolicStars({ year: P(2, 1), month: P(3, 7), day: P(0, 4), hour: null });
    expect(hit(stars, "nobleman", "year")).toBe(true);
    expect(hit(stars, "nobleman", "month")).toBe(true);
  });
  it("文昌: día 甲 → 巳; 羊刃: día 甲 → 卯", () => {
    const stars = symbolicStars({ year: P(2, 5), month: P(3, 3), day: P(0, 4), hour: null });
    expect(hit(stars, "academic", "year")).toBe(true);
    expect(hit(stars, "goat_blade", "month")).toBe(true);
  });
  it("桃花 por trino del día: día en 申子辰 → 酉; 驛馬 → 寅; 華蓋 → 辰", () => {
    const stars = symbolicStars({ year: P(2, 9), month: P(3, 2), day: P(0, 0), hour: P(4, 4) });
    expect(hit(stars, "peach_blossom", "year")).toBe(true);
    expect(hit(stars, "sky_horse", "month")).toBe(true);
    expect(hit(stars, "canopy", "hour")).toBe(true);
  });
  it("空亡 como StarHit: día 甲子 marca void en pilares con rama 戌/亥", () => {
    const stars = symbolicStars({ year: P(2, 10), month: P(3, 11), day: P(0, 0), hour: null });
    expect(hit(stars, "void", "year")).toBe(true);
    expect(hit(stars, "void", "month")).toBe(true);
  });
  it("catálogo STARS tiene los 7 con hanzi y hangul", () => {
    expect(STARS.map((s) => s.key).sort()).toEqual(
      ["academic", "canopy", "goat_blade", "nobleman", "peach_blossom", "sky_horse", "void"].sort(),
    );
    expect(STARS.every((s) => s.hanzi.length > 0 && s.hangul.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/stars.test.ts`
Expected: FAIL — cannot resolve `../stars`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/stars.ts
// 神煞 núcleo (set consensuado) + 空亡. Tablas clásicas:
// - 天乙貴人 por tronco de DÍA (甲戊庚牛羊 / 乙己鼠猴鄉 / 丙丁豬雞位 / 六辛逢馬虎 / 壬癸兔蛇藏)
// - 文昌 y 羊刃 por tronco de DÍA (羊刃 solo troncos yang — escuela estándar)
// - 桃花/驛馬/華蓋 por TRINO de la rama de día Y de año (ambas bases, deduplicado)
// - 空亡: par de ramas ausentes de la decena (旬) del pilar de DÍA
import type { Pillar } from "./bazi";
import { sexagenaryIndex } from "./nayin";
import type { PillarPos, PillarSet } from "./interactions";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type StarKey =
  | "nobleman" | "peach_blossom" | "sky_horse" | "academic" | "canopy" | "goat_blade" | "void";

export interface StarDef {
  key: StarKey;
  hanzi: string;
  hangul: string;
}
export const STARS: readonly StarDef[] = [
  { key: "nobleman", hanzi: "天乙貴人", hangul: "천을귀인" },
  { key: "peach_blossom", hanzi: "桃花", hangul: "도화" },
  { key: "sky_horse", hanzi: "驛馬", hangul: "역마" },
  { key: "academic", hanzi: "文昌", hangul: "문창" },
  { key: "canopy", hanzi: "華蓋", hangul: "화개" },
  { key: "goat_blade", hanzi: "羊刃", hangul: "양인" },
  { key: "void", hanzi: "空亡", hangul: "공망" },
] as const;

export interface StarHit {
  star: StarKey;
  pillar: PillarPos;
}

/** 天乙貴人 por tronco de día → ramas nobles. */
const NOBLEMAN: readonly (readonly number[])[] = [
  [1, 7], // 甲 → 丑未
  [0, 8], // 乙 → 子申
  [11, 9], // 丙 → 亥酉
  [11, 9], // 丁 → 亥酉
  [1, 7], // 戊 → 丑未
  [0, 8], // 己 → 子申
  [1, 7], // 庚 → 丑未
  [6, 2], // 辛 → 午寅
  [3, 5], // 壬 → 卯巳
  [3, 5], // 癸 → 卯巳
] as const;

/** 文昌 por tronco de día → rama. */
const ACADEMIC: readonly number[] = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3] as const;

/** 羊刃 por tronco de día (solo yang; -1 = no aplica). */
const GOAT_BLADE: readonly number[] = [3, -1, 6, -1, 6, -1, 9, -1, 0, -1] as const;

/** Por grupo de trino (índice del grupo en TRINES-orden agua/fuego/metal/madera). */
const TRINE_GROUPS: readonly (readonly [number, number, number])[] = [
  [8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7],
] as const;
const PEACH: readonly number[] = [9, 3, 6, 0] as const; // 酉 卯 午 子
const HORSE: readonly number[] = [2, 8, 11, 5] as const; // 寅 申 亥 巳
const CANOPY: readonly number[] = [4, 10, 1, 7] as const; // 辰 戌 丑 未

function trineGroupOf(branch: number): number {
  return TRINE_GROUPS.findIndex((g) => g.includes(mod(branch, 12)));
}

/** 空亡: las 2 ramas ausentes de la decena (旬) a la que pertenece el pilar de día. */
export function voidBranches(day: Pillar): [number, number] {
  const n = sexagenaryIndex(day);
  const decadeStart = n - (n % 10);
  return [mod(decadeStart + 10, 12), mod(decadeStart + 11, 12)];
}

export function symbolicStars(pillars: PillarSet): StarHit[] {
  const entries: { pos: PillarPos; pillar: Pillar }[] = [
    { pos: "year", pillar: pillars.year },
    { pos: "month", pillar: pillars.month },
    { pos: "day", pillar: pillars.day },
  ];
  if (pillars.hour) entries.push({ pos: "hour", pillar: pillars.hour });

  const out: StarHit[] = [];
  const push = (star: StarKey, pillar: PillarPos) => {
    if (!out.some((h) => h.star === star && h.pillar === pillar)) out.push({ star, pillar });
  };

  const dayStem = mod(pillars.day.stem, 10);

  // Por tronco de día:
  const noble = NOBLEMAN[dayStem]!;
  const academic = ACADEMIC[dayStem]!;
  const blade = GOAT_BLADE[dayStem]!;
  for (const e of entries) {
    if (noble.includes(e.pillar.branch)) push("nobleman", e.pos);
    if (e.pillar.branch === academic) push("academic", e.pos);
    if (blade >= 0 && e.pillar.branch === blade) push("goat_blade", e.pos);
  }

  // Por trino, con base en rama de DÍA y de AÑO:
  for (const base of [pillars.day.branch, pillars.year.branch]) {
    const g = trineGroupOf(base);
    if (g < 0) continue;
    for (const e of entries) {
      if (e.pillar.branch === PEACH[g]) push("peach_blossom", e.pos);
      if (e.pillar.branch === HORSE[g]) push("sky_horse", e.pos);
      if (e.pillar.branch === CANOPY[g]) push("canopy", e.pos);
    }
  }

  // 空亡:
  const [v1, v2] = voidBranches(pillars.day);
  for (const e of entries) {
    if (e.pos !== "day" && (e.pillar.branch === v1 || e.pillar.branch === v2)) push("void", e.pos);
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/stars.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export {
  symbolicStars, voidBranches, STARS,
  type StarKey, type StarDef, type StarHit,
} from "./bazi/stars";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/stars.ts packages/core/src/bazi/__tests__/stars.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): estrellas simbólicas 神煞 núcleo + vacíos 空亡"
```

---

### Task 5: Core — Fuerza del Maestro del Día + 喜用神 (puntaje transparente)

**Files:**
- Create: `packages/core/src/bazi/strength.ts`
- Test: `packages/core/src/bazi/__tests__/strength.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `HEAVENLY_STEMS`, `EARTHLY_BRANCHES`, `hiddenStems` de `./bazi`; `PillarSet`, `PillarPos` de `./interactions`.
- Produces:
  - `type SeasonState = "wang"|"xiang"|"xiu"|"qiu"|"si"` (旺相休囚死)
  - `type StrengthVerdict = "strong"|"weak"|"balanced"`
  - `interface StrengthDriver { key: "season"|"root_principal"|"root_residual"|"visible_support"; points: number; pillar: PillarPos }`
  - `interface DayMasterStrength { score: number; verdict: StrengthVerdict; seasonState: SeasonState; drivers: StrengthDriver[] }`
  - `STRENGTH_THRESHOLDS: { weakBelow: 45, strongAbove: 55 }` (fuente única)
  - `dayMasterStrength(pillars: PillarSet): DayMasterStrength`
  - `favorableElements(verdict: StrengthVerdict, dayStem: number): { favor: Element[]; avoid: Element[] }` donde `Element = StemDef["element"]`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/strength.test.ts
import { describe, it, expect } from "vitest";
import { dayMasterStrength, favorableElements, STRENGTH_THRESHOLDS } from "../strength";

const P = (stem: number, branch: number) => ({ stem, branch });

describe("dayMasterStrength (puntaje transparente)", () => {
  it("caso claramente FUERTE: 甲 nacido en primavera (mes 寅) rodeado de madera/agua", () => {
    // día 甲子 (agua bajo el DM = recurso), mes 甲寅 (madera plena), año 壬寅, hora 乙亥
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: P(1, 11) });
    expect(s.seasonState).toBe("wang");
    expect(s.verdict).toBe("strong");
    expect(s.score).toBeGreaterThan(STRENGTH_THRESHOLDS.strongAbove);
  });
  it("caso claramente DÉBIL: 甲 nacido en otoño (mes 酉) sin raíces ni apoyos", () => {
    // día 甲午, mes 辛酉 (metal pleno), año 庚申, hora 丙午 — puro control/drenaje
    const s = dayMasterStrength({ year: P(6, 8), month: P(7, 9), day: P(0, 6), hour: P(2, 6) });
    expect(s.seasonState).toBe("si");
    expect(s.verdict).toBe("weak");
    expect(s.score).toBeLessThan(STRENGTH_THRESHOLDS.weakBelow);
  });
  it("los drivers suman exactamente el score", () => {
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: P(1, 11) });
    const sum = s.drivers.reduce((a, d) => a + d.points, 0);
    expect(Math.min(100, sum)).toBe(s.score);
  });
  it("estados estacionales: 甲 en 亥 (invierno)=相; 甲 en 午 (verano)=休; 甲 en 未 (tierra)=囚", () => {
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 11), day: P(0, 6), hour: null }).seasonState).toBe("xiang");
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 6), day: P(0, 6), hour: null }).seasonState).toBe("xiu");
    expect(dayMasterStrength({ year: P(2, 0), month: P(2, 7), day: P(0, 6), hour: null }).seasonState).toBe("qiu");
  });
  it("sin hora funciona (3 pilares) y no aporta drivers de hora", () => {
    const s = dayMasterStrength({ year: P(8, 2), month: P(0, 2), day: P(0, 0), hour: null });
    expect(s.drivers.every((d) => d.pillar !== "hour")).toBe(true);
  });
});

describe("favorableElements (喜用神/忌神)", () => {
  it("débil → favorece recurso+par; evita drenaje/riqueza/control (DM 甲 = madera)", () => {
    const f = favorableElements("weak", 0);
    expect(f.favor.sort()).toEqual(["water", "wood"].sort());
    expect(f.avoid.sort()).toEqual(["earth", "fire", "metal"].sort());
  });
  it("fuerte → favorece drenaje/riqueza/control; evita recurso+par", () => {
    const f = favorableElements("strong", 0);
    expect(f.favor.sort()).toEqual(["earth", "fire", "metal"].sort());
    expect(f.avoid.sort()).toEqual(["water", "wood"].sort());
  });
  it("equilibrado → listas vacías (la UI muestra nota de matiz)", () => {
    const f = favorableElements("balanced", 0);
    expect(f.favor).toEqual([]);
    expect(f.avoid).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/strength.test.ts`
Expected: FAIL — cannot resolve `../strength`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/strength.ts
// Fuerza del Maestro del Día (身強/身弱) como PUNTAJE TRANSPARENTE — método declarado:
//   1) Mando del mes 月令 (~40%): estado estacional 旺相休囚死 del elemento del DM
//      respecto a la estación de la rama de mes.
//   2) Raíces 通根: troncos ocultos que apoyan (par o recurso del DM), ponderados por
//      pilar (mes > día > año ≈ hora) y por rango (principal > residual).
//   3) Apoyos visibles: troncos de año/mes/hora que son par o recurso.
// Verdicto con banda honesta "equilibrado" (45–55). Escuelas 從格 fuera de alcance
// (spec §10). Umbrales y pesos = constantes exportadas (fuente única para UI/tests).
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, hiddenStems, type StemDef } from "./bazi";
import type { PillarPos, PillarSet } from "./interactions";

type El = StemDef["element"];
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Ciclo generador: wood→fire→earth→metal→water→wood. */
const GEN: readonly El[] = ["wood", "fire", "earth", "metal", "water"] as const;
const genIdx = (e: El) => GEN.indexOf(e);
/** Elemento a `offset` pasos del elemento `e` en el ciclo generador. */
export function elementAt(e: El, offset: number): El {
  return GEN[mod(genIdx(e) + offset, 5)]!;
}

export type SeasonState = "wang" | "xiang" | "xiu" | "qiu" | "si";
export type StrengthVerdict = "strong" | "weak" | "balanced";

export interface StrengthDriver {
  key: "season" | "root_principal" | "root_residual" | "visible_support";
  points: number;
  pillar: PillarPos;
}
export interface DayMasterStrength {
  score: number;
  verdict: StrengthVerdict;
  seasonState: SeasonState;
  drivers: StrengthDriver[];
}

export const STRENGTH_THRESHOLDS = { weakBelow: 45, strongAbove: 55 } as const;
export const STRENGTH_WEIGHTS = {
  season: { wang: 40, xiang: 28, xiu: 14, qiu: 7, si: 0 } as Record<SeasonState, number>,
  rootPrincipal: { month: 12, day: 9, year: 7, hour: 7 } as Record<PillarPos, number>,
  rootResidual: 3,
  visibleSupport: 7,
} as const;

/** Estación (elemento de mando) por rama de mes: 寅卯=madera, 巳午=fuego, 申酉=metal, 亥子=agua, 辰未戌丑=tierra. */
function seasonElement(monthBranch: number): El {
  return EARTHLY_BRANCHES[mod(monthBranch, 12)]!.element;
}

/** 旺相休囚死: relación del elemento del DM con el elemento de la estación. */
export function seasonState(dmElement: El, monthBranch: number): SeasonState {
  const m = seasonElement(monthBranch);
  const d = mod(genIdx(dmElement) - genIdx(m), 5); // fase del DM respecto a la estación
  // d=0 mismo → 旺; d=1 la estación lo genera → 相; d=4 el DM genera la estación → 休;
  // d=3 el DM controla la estación → 囚; d=2 la estación controla al DM → 死.
  switch (d) {
    case 0: return "wang";
    case 1: return "xiang";
    case 4: return "xiu";
    case 3: return "qiu";
    default: return "si";
  }
}

const helps = (dm: El, other: El) => other === dm || elementAt(dm, -1) === other; // par o recurso

export function dayMasterStrength(pillars: PillarSet): DayMasterStrength {
  const dm = HEAVENLY_STEMS[mod(pillars.day.stem, 10)]!;
  const drivers: StrengthDriver[] = [];

  const state = seasonState(dm.element, pillars.month.branch);
  drivers.push({ key: "season", points: STRENGTH_WEIGHTS.season[state], pillar: "month" });

  const entries: { pos: PillarPos; stem: number; branch: number }[] = [
    { pos: "year", stem: pillars.year.stem, branch: pillars.year.branch },
    { pos: "month", stem: pillars.month.stem, branch: pillars.month.branch },
    { pos: "day", stem: pillars.day.stem, branch: pillars.day.branch },
  ];
  if (pillars.hour) entries.push({ pos: "hour", stem: pillars.hour.stem, branch: pillars.hour.branch });

  // Raíces en troncos ocultos:
  for (const e of entries) {
    const hs = hiddenStems(e.branch);
    hs.forEach((h, i) => {
      const el = HEAVENLY_STEMS[h]!.element;
      if (!helps(dm.element, el)) return;
      if (i === 0) {
        drivers.push({ key: "root_principal", points: STRENGTH_WEIGHTS.rootPrincipal[e.pos], pillar: e.pos });
      } else {
        drivers.push({ key: "root_residual", points: STRENGTH_WEIGHTS.rootResidual, pillar: e.pos });
      }
    });
  }

  // Apoyos visibles (troncos que no son el propio DM):
  for (const e of entries) {
    if (e.pos === "day") continue;
    const el = HEAVENLY_STEMS[mod(e.stem, 10)]!.element;
    if (helps(dm.element, el)) {
      drivers.push({ key: "visible_support", points: STRENGTH_WEIGHTS.visibleSupport, pillar: e.pos });
    }
  }

  const raw = drivers.reduce((a, d) => a + d.points, 0);
  const score = Math.min(100, raw);
  const verdict: StrengthVerdict =
    score > STRENGTH_THRESHOLDS.strongAbove ? "strong"
    : score < STRENGTH_THRESHOLDS.weakBelow ? "weak"
    : "balanced";
  return { score, verdict, seasonState: state, drivers };
}

/** 喜用神/忌神 por verdicto. Offsets desde el DM: par 0, drenaje +1, riqueza +2, control +3, recurso +4(=-1). */
export function favorableElements(
  verdict: StrengthVerdict,
  dayStem: number,
): { favor: El[]; avoid: El[] } {
  const dm = HEAVENLY_STEMS[mod(dayStem, 10)]!.element;
  if (verdict === "weak") {
    return { favor: [elementAt(dm, -1), dm], avoid: [elementAt(dm, 1), elementAt(dm, 2), elementAt(dm, 3)] };
  }
  if (verdict === "strong") {
    return { favor: [elementAt(dm, 1), elementAt(dm, 2), elementAt(dm, 3)], avoid: [elementAt(dm, -1), dm] };
  }
  return { favor: [], avoid: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/strength.test.ts`
Expected: PASS (8 tests). Verificación manual del caso débil: 甲午 día — 午 esconde 丁己 (ninguno ayuda), 酉 esconde 辛 (no), 申 esconde 庚壬戊 (壬 agua = recurso → residual +3)… el score queda muy bajo (≈3–10) < 45 ✓.

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export {
  dayMasterStrength, favorableElements, seasonState, elementAt,
  STRENGTH_THRESHOLDS, STRENGTH_WEIGHTS,
  type DayMasterStrength, type StrengthDriver, type StrengthVerdict, type SeasonState,
} from "./bazi/strength";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/strength.ts packages/core/src/bazi/__tests__/strength.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): fuerza del Maestro del Día (puntaje transparente) + 喜用神"
```

---

### Task 6: Core — 大運 (Pilares de Suerte) + 流年 (años de flujo)

**Files:**
- Create: `packages/core/src/bazi/luck.ts`
- Test: `packages/core/src/bazi/__tests__/luck.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Pillar`, `yearPillar`, `tenGod`, `type TenGod` de `./bazi`; `sexagenaryIndex`, `nayin`, `type NayinDef` de `./nayin`; `branchPairInteractions`, `type PillarSet`, `type PillarPos`, `type InteractionType` de `./interactions`.
- Produces:
  - `type LuckDirection = "forward"|"backward"`
  - `luckDirection(yearStem: number, gender: "masculine"|"feminine"): LuckDirection`
  - `interface LuckPillarItem { pillar: Pillar; startAge: number; startYear: number; tenGod: TenGod; nayin: NayinDef }`
  - `interface LuckSequence { direction: LuckDirection; startAgeYears: number; startAgeMonths: number; pillars: LuckPillarItem[] }`
  - `interface LuckInput { pillars: PillarSet; gender: "feminine"|"masculine"|"neutral"; birthYear: number; daysToPrevJie: number; daysToNextJie: number }`
  - `luckPillars(input: LuckInput): LuckSequence[]` (1 elemento, o 2 si `neutral` — forward primero)
  - `interface AnnualPillarItem { year: number; pillar: Pillar; tenGod: TenGod; marks: { type: InteractionType; vs: PillarPos }[] }`
  - `annualPillars(pillars: PillarSet, fromYear: number, count: number): AnnualPillarItem[]`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/luck.test.ts
import { describe, it, expect } from "vitest";
import { luckDirection, luckPillars, annualPillars } from "../luck";
import { yearPillar, tenGod } from "../bazi";

const P = (stem: number, branch: number) => ({ stem, branch });
const natal = { year: P(6, 6), month: P(3, 1), day: P(0, 0), hour: P(4, 4) }; // año 庚午 (yang)

describe("luckDirection (陽男陰女順行)", () => {
  it("año yang + masculino = adelante; yang + femenino = atrás", () => {
    expect(luckDirection(6, "masculine")).toBe("forward");
    expect(luckDirection(6, "feminine")).toBe("backward");
  });
  it("año yin + femenino = adelante; yin + masculino = atrás", () => {
    expect(luckDirection(7, "feminine")).toBe("forward");
    expect(luckDirection(7, "masculine")).toBe("backward");
  });
});

describe("luckPillars", () => {
  const base = { pillars: natal, birthYear: 1990, daysToPrevJie: 9, daysToNextJie: 21 };

  it("regla 3 días = 1 año: adelante usa daysToNextJie (21/3 = 7 años 0 meses)", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    expect(seq!.direction).toBe("forward");
    expect(seq!.startAgeYears).toBe(7);
    expect(seq!.startAgeMonths).toBe(0);
  });
  it("atrás usa daysToPrevJie (9/3 = 3 años); fracción → meses (10/3 días = 3a 4m)", () => {
    const [seq] = luckPillars({ ...base, gender: "feminine" });
    expect(seq!.direction).toBe("backward");
    expect(seq!.startAgeYears).toBe(3);
    const [seq2] = luckPillars({ ...base, daysToPrevJie: 10, gender: "feminine" });
    expect(seq2!.startAgeYears).toBe(3);
    expect(seq2!.startAgeMonths).toBe(4);
  });
  it("la secuencia avanza el ciclo sexagenario desde el pilar de MES (mes 丁丑 → 1º 大運 adelante = 戊寅)", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    expect(seq!.pillars[0]!.pillar).toEqual({ stem: 4, branch: 2 });
    expect(seq!.pillars[1]!.pillar).toEqual({ stem: 5, branch: 3 });
    expect(seq!.pillars).toHaveLength(9);
  });
  it("atrás retrocede: mes 丁丑 → 1º = 丙子", () => {
    const [seq] = luckPillars({ ...base, gender: "feminine" });
    expect(seq!.pillars[0]!.pillar).toEqual({ stem: 2, branch: 0 });
  });
  it("cada década trae edad, año civil, Dios y Na Yin; décadas espaciadas 10 años", () => {
    const [seq] = luckPillars({ ...base, gender: "masculine" });
    const p0 = seq!.pillars[0]!;
    expect(p0.startAge).toBe(7);
    expect(p0.startYear).toBe(1997);
    expect(p0.tenGod).toBe(tenGod(0, 4));
    expect(p0.nayin.hanzi.length).toBeGreaterThan(0);
    expect(seq!.pillars[1]!.startAge).toBe(17);
  });
  it("género neutral → DOS secuencias (forward primero)", () => {
    const seqs = luckPillars({ ...base, gender: "neutral" });
    expect(seqs).toHaveLength(2);
    expect(seqs[0]!.direction).toBe("forward");
    expect(seqs[1]!.direction).toBe("backward");
  });
});

describe("annualPillars (流年)", () => {
  it("el pilar del año N es yearPillar(N), con Dios vs DM", () => {
    const rows = annualPillars(natal, 2026, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.year).toBe(2026);
    expect(rows[0]!.pillar).toEqual(yearPillar(2026));
    expect(rows[0]!.tenGod).toBe(tenGod(0, yearPillar(2026).stem));
  });
  it("marca interacciones de la rama del año contra las ramas natales (ej: año 午 choca 子 del día)", () => {
    // 2026 = 丙午 → rama 午 choca con la rama 子 del pilar de día del natal de prueba
    const rows = annualPillars(natal, 2026, 1);
    expect(rows[0]!.marks.some((m) => m.type === "clash" && m.vs === "day")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/luck.test.ts`
Expected: FAIL — cannot resolve `../luck`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/luck.ts
// 大運 (Pilares de Suerte): décadas que avanzan (o retroceden) el ciclo sexagenario
// desde el pilar de MES. Dirección clásica 陽男陰女順行: (año yang × hombre) o
// (año yin × mujer) → adelante; los cruces → atrás. Género `neutral` → se devuelven
// AMBAS secuencias (decisión de producto, spec §2). Edad de inicio: regla clásica
// 3 días = 1 año sobre la distancia al término solar de mes (節) siguiente (adelante)
// o anterior (atrás) — el dato astronómico lo aporta el servidor (jieBoundaries).
// 流年: el pilar del año civil N es yearPillar(N); la ambigüedad ene–feb (Lichun)
// se anota en la UI, no se resuelve por persona (spec §3.6).
import { yearPillar, tenGod, type Pillar, type TenGod } from "./bazi";
import { sexagenaryIndex, nayin, type NayinDef } from "./nayin";
import {
  branchPairInteractions,
  type InteractionType,
  type PillarPos,
  type PillarSet,
} from "./interactions";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export type LuckDirection = "forward" | "backward";

export function luckDirection(yearStem: number, gender: "masculine" | "feminine"): LuckDirection {
  const yang = mod(yearStem, 10) % 2 === 0;
  return (yang && gender === "masculine") || (!yang && gender === "feminine")
    ? "forward"
    : "backward";
}

export interface LuckPillarItem {
  pillar: Pillar;
  startAge: number; // años cumplidos al entrar (entero)
  startYear: number; // año civil aproximado de entrada
  tenGod: TenGod;
  nayin: NayinDef;
}
export interface LuckSequence {
  direction: LuckDirection;
  startAgeYears: number;
  startAgeMonths: number;
  pillars: LuckPillarItem[];
}
export interface LuckInput {
  pillars: PillarSet;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}

function pillarFromIndex(n: number): Pillar {
  const i = mod(n, 60);
  return { stem: i % 10, branch: i % 12 };
}

function buildSequence(input: LuckInput, direction: LuckDirection): LuckSequence {
  const days = direction === "forward" ? input.daysToNextJie : input.daysToPrevJie;
  const ageExact = days / 3; // 3 días = 1 año
  let years = Math.floor(ageExact);
  let months = Math.round((ageExact - years) * 12);
  if (months === 12) {
    years += 1;
    months = 0;
  }
  const dayMaster = input.pillars.day.stem;
  const monthIdx = sexagenaryIndex(input.pillars.month);
  const step = direction === "forward" ? 1 : -1;
  const pillars: LuckPillarItem[] = [];
  for (let i = 1; i <= 9; i++) {
    const pillar = pillarFromIndex(monthIdx + step * i);
    const startAge = years + 10 * (i - 1);
    pillars.push({
      pillar,
      startAge,
      startYear: input.birthYear + startAge,
      tenGod: tenGod(dayMaster, pillar.stem),
      nayin: nayin(pillar),
    });
  }
  return { direction, startAgeYears: years, startAgeMonths: months, pillars };
}

/** 1 secuencia (o 2 si gender=neutral: forward primero). */
export function luckPillars(input: LuckInput): LuckSequence[] {
  if (input.gender === "neutral") {
    return [buildSequence(input, "forward"), buildSequence(input, "backward")];
  }
  return [buildSequence(input, luckDirection(input.pillars.year.stem, input.gender))];
}

export interface AnnualPillarItem {
  year: number;
  pillar: Pillar;
  tenGod: TenGod;
  marks: { type: InteractionType; vs: PillarPos }[];
}

export function annualPillars(pillars: PillarSet, fromYear: number, count: number): AnnualPillarItem[] {
  const dayMaster = pillars.day.stem;
  const natal: { pos: PillarPos; branch: number }[] = [
    { pos: "year", branch: pillars.year.branch },
    { pos: "month", branch: pillars.month.branch },
    { pos: "day", branch: pillars.day.branch },
  ];
  if (pillars.hour) natal.push({ pos: "hour", branch: pillars.hour.branch });

  const out: AnnualPillarItem[] = [];
  for (let y = fromYear; y < fromYear + count; y++) {
    const pillar = yearPillar(y);
    const marks: { type: InteractionType; vs: PillarPos }[] = [];
    for (const n of natal) {
      for (const hit of branchPairInteractions(pillar.branch, n.branch)) {
        marks.push({ type: hit.type, vs: n.pos });
      }
    }
    out.push({ year: y, pillar, tenGod: tenGod(dayMaster, pillar.stem), marks });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/luck.test.ts`
Expected: PASS (9 tests). Verificación manual del test de secuencia: mes 丁丑 → sexagenaryIndex({3,1}) = 13 (丁丑); +1 = 14 → stem 4, branch 2 = 戊寅 ✓; −1 = 12 → stem 2, branch 0 = 丙子 ✓.

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export {
  luckDirection, luckPillars, annualPillars,
  type LuckDirection, type LuckPillarItem, type LuckSequence, type LuckInput, type AnnualPillarItem,
} from "./bazi/luck";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/luck.ts packages/core/src/bazi/__tests__/luck.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): pilares de suerte 大運 (regla 3 días = 1 año, ambas direcciones para neutro) + años de flujo 流年"
```

---

### Task 7: Core — Etiquetas de dominio (hangul, pinyin, romanización coreana)

**Files:**
- Create: `packages/core/src/bazi/labels.ts`
- Test: `packages/core/src/bazi/__tests__/labels.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `TenGod` de `./bazi`.
- Produces: `STEM_LABELS: readonly { pinyin: string; hangul: string; romanKo: string }[]` (10, por índice de tronco); `BRANCH_LABELS: readonly { pinyin: string; hangul: string; romanKo: string }[]` (12); `TEN_GOD_KO: Record<TenGod, string>` (hangul).

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/bazi/__tests__/labels.test.ts
import { describe, it, expect } from "vitest";
import { STEM_LABELS, BRANCH_LABELS, TEN_GOD_KO } from "../labels";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, TEN_GODS } from "../bazi";

describe("etiquetas de dominio Ba Zi ↔ Saju", () => {
  it("10 troncos con hangul: 甲=갑, 癸=계; pinyin 甲=jiǎ", () => {
    expect(STEM_LABELS).toHaveLength(HEAVENLY_STEMS.length);
    expect(STEM_LABELS[0]).toEqual({ pinyin: "jiǎ", hangul: "갑", romanKo: "gap" });
    expect(STEM_LABELS[9]!.hangul).toBe("계");
  });
  it("12 ramas con hangul: 子=자, 亥=해; romanización 子=ja", () => {
    expect(BRANCH_LABELS).toHaveLength(EARTHLY_BRANCHES.length);
    expect(BRANCH_LABELS[0]).toEqual({ pinyin: "zǐ", hangul: "자", romanKo: "ja" });
    expect(BRANCH_LABELS[11]!.hangul).toBe("해");
  });
  it("los 10 Dioses tienen hangul (比肩=비견, 正印=정인)", () => {
    for (const g of TEN_GODS) expect(TEN_GOD_KO[g.key]).toBeTruthy();
    expect(TEN_GOD_KO.peer).toBe("비견");
    expect(TEN_GOD_KO.resource_direct).toBe("정인");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/labels.test.ts`
Expected: FAIL — cannot resolve `../labels`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/core/src/bazi/labels.ts
// Glifos y romanizaciones = DATOS del dominio (spec §8): una sola fuente para web y
// móvil. Los NOMBRES ES/EN viven en la capa i18n de cada app. Hangul y romanización
// coreana revisada estándar; pinyin con tono.
import type { TenGod } from "./bazi";

export interface ScriptLabel {
  pinyin: string;
  hangul: string;
  romanKo: string;
}

/** Por índice de tronco (0=甲 … 9=癸). */
export const STEM_LABELS: readonly ScriptLabel[] = [
  { pinyin: "jiǎ", hangul: "갑", romanKo: "gap" },
  { pinyin: "yǐ", hangul: "을", romanKo: "eul" },
  { pinyin: "bǐng", hangul: "병", romanKo: "byeong" },
  { pinyin: "dīng", hangul: "정", romanKo: "jeong" },
  { pinyin: "wù", hangul: "무", romanKo: "mu" },
  { pinyin: "jǐ", hangul: "기", romanKo: "gi" },
  { pinyin: "gēng", hangul: "경", romanKo: "gyeong" },
  { pinyin: "xīn", hangul: "신", romanKo: "sin" },
  { pinyin: "rén", hangul: "임", romanKo: "im" },
  { pinyin: "guǐ", hangul: "계", romanKo: "gye" },
] as const;

/** Por índice de rama (0=子 … 11=亥). */
export const BRANCH_LABELS: readonly ScriptLabel[] = [
  { pinyin: "zǐ", hangul: "자", romanKo: "ja" },
  { pinyin: "chǒu", hangul: "축", romanKo: "chuk" },
  { pinyin: "yín", hangul: "인", romanKo: "in" },
  { pinyin: "mǎo", hangul: "묘", romanKo: "myo" },
  { pinyin: "chén", hangul: "진", romanKo: "jin" },
  { pinyin: "sì", hangul: "사", romanKo: "sa" },
  { pinyin: "wǔ", hangul: "오", romanKo: "o" },
  { pinyin: "wèi", hangul: "미", romanKo: "mi" },
  { pinyin: "shēn", hangul: "신", romanKo: "sin" },
  { pinyin: "yǒu", hangul: "유", romanKo: "yu" },
  { pinyin: "xū", hangul: "술", romanKo: "sul" },
  { pinyin: "hài", hangul: "해", romanKo: "hae" },
] as const;

/** Diez Dioses en coreano (십신). */
export const TEN_GOD_KO: Record<TenGod, string> = {
  peer: "비견",
  rob: "겁재",
  eating: "식신",
  hurting: "상관",
  wealth_indirect: "편재",
  wealth_direct: "정재",
  power_indirect: "편관",
  power_direct: "정관",
  resource_indirect: "편인",
  resource_direct: "정인",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/bazi/__tests__/labels.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`:

```ts
export { STEM_LABELS, BRANCH_LABELS, TEN_GOD_KO, type ScriptLabel } from "./bazi/labels";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/core/src/bazi/labels.ts packages/core/src/bazi/__tests__/labels.test.ts packages/core/src/index.ts
git commit -m "feat(bazi): etiquetas de dominio hangul/pinyin/romanización (toggle Ba Zi↔Saju)"
```

---

### Task 8: Ephemeris — `jieBoundaries` (distancia a los términos solares de mes)

**Files:**
- Create: `packages/ephemeris/src/jie.ts`
- Test: `packages/ephemeris/src/__tests__/jie.test.ts`
- Modify: `packages/ephemeris/src/index.ts`

**Interfaces:**
- Consumes: `computeChart` de `./chart`, `ChartInput` de `@aluna/core`, `DateTime` de luxon (patrón exacto de `derived.ts`).
- Produces: `jieBoundaries(input: ChartInput): { daysToPrevJie: number; daysToNextJie: number }` — días (con fracción) del instante de nacimiento al cruce ANTERIOR y SIGUIENTE de longitud solar múltiplo de 30° partiendo de 315° (315°, 345°, 15°, 45°, … — los 節 que abren mes Ba Zi).

- [ ] **Step 1: Write the failing test**

```ts
// packages/ephemeris/src/__tests__/jie.test.ts
import { describe, it, expect } from "vitest";
import { jieBoundaries } from "../jie";
import type { ChartInput } from "@aluna/core";

const base: Omit<ChartInput, "year" | "month" | "day" | "hour" | "minute"> = {
  timeZone: "America/Guayaquil",
  latitude: -2.17,
  longitude: -79.92,
};

describe("jieBoundaries (節 de mes: longitud solar múltiplo de 30° desde 315°)", () => {
  it("nacer ~4 días después de Lichun 1990 (4-feb): prevJie ≈ 4, nextJie ≈ 26 (mes solar ~30d)", () => {
    const r = jieBoundaries({ ...base, year: 1990, month: 2, day: 8, hour: 12, minute: 0 });
    expect(r.daysToPrevJie).toBeGreaterThan(2.5);
    expect(r.daysToPrevJie).toBeLessThan(5.5);
    expect(r.daysToNextJie).toBeGreaterThan(24);
    expect(r.daysToNextJie).toBeLessThan(29);
  });
  it("prev + next ≈ duración del mes solar (29–31.5 días)", () => {
    const r = jieBoundaries({ ...base, year: 1990, month: 6, day: 15, hour: 12, minute: 0 });
    const span = r.daysToPrevJie + r.daysToNextJie;
    expect(span).toBeGreaterThan(29);
    expect(span).toBeLessThan(31.6);
  });
  it("ambos positivos y con fracción razonable en cualquier fecha", () => {
    const r = jieBoundaries({ ...base, year: 2000, month: 1, day: 7, hour: 3, minute: 30 });
    expect(r.daysToPrevJie).toBeGreaterThan(0);
    expect(r.daysToNextJie).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ephemeris && npx vitest run src/__tests__/jie.test.ts`
Expected: FAIL — cannot resolve `../jie`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/ephemeris/src/jie.ts
// Distancia (en días, con fracción) del nacimiento a los términos solares de MES
// (節): cruces de longitud solar múltiplo de 30° partiendo de 315° (Lichun). Los usa
// la edad de inicio de los 大運 (regla 3 días = 1 año). Newton sobre la longitud
// solar, mismo patrón que la revolución solar en derived.ts.
import { DateTime } from "luxon";
import type { ChartInput } from "@aluna/core";
import { computeChart } from "./chart";

const SUN_DEG_PER_DAY = 0.98563;

function inputAt(natal: ChartInput, dt: DateTime): ChartInput {
  return { ...natal, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute };
}
function sunLongitude(input: ChartInput): number {
  return computeChart(input).bodies.find((b) => b.body === "sun")!.longitude;
}
/** Diferencia angular con signo hacia el objetivo, en (-180, 180]. */
function signedDelta(target: number, lon: number): number {
  return ((target - lon + 540) % 360) - 180;
}

/** Busca (Newton) el instante en que el Sol cruza `target`; devuelve el DateTime. */
function findCrossing(natal: ChartInput, from: DateTime, target: number): DateTime {
  let dt = from;
  for (let i = 0; i < 12; i++) {
    const diff = signedDelta(target, sunLongitude(inputAt(natal, dt)));
    if (Math.abs(diff) < 1e-5) break;
    dt = dt.plus({ days: diff / SUN_DEG_PER_DAY });
  }
  return dt;
}

export function jieBoundaries(input: ChartInput): { daysToPrevJie: number; daysToNextJie: number } {
  const birth = DateTime.fromObject(
    { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute },
    { zone: input.timeZone },
  );
  const lon = sunLongitude(input);
  // Sector de mes: 節 anterior = múltiplo de 30° (desde 315) alcanzado; siguiente = +30°.
  const sector = Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
  const prevTarget = (315 + sector * 30) % 360;
  const nextTarget = (prevTarget + 30) % 360;

  // Semillas: el Sol recorre ~30° en ~30 días.
  const prevSeed = birth.minus({ days: signedDelta(lon, prevTarget) / SUN_DEG_PER_DAY });
  const nextSeed = birth.plus({ days: signedDelta(nextTarget, lon) / SUN_DEG_PER_DAY });

  const prev = findCrossing(input, prevSeed, prevTarget);
  const next = findCrossing(input, nextSeed, nextTarget);
  return {
    daysToPrevJie: Math.max(0, birth.diff(prev, "days").days),
    daysToNextJie: Math.max(0, next.diff(birth, "days").days),
  };
}
```

Nota al implementador: `signedDelta(lon, prevTarget)` en la semilla `prevSeed` es la distancia angular RECORRIDA desde el término anterior (positiva) — se resta en días. Verificar signos con el primer test antes de tocar nada más.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ephemeris && npx vitest run src/__tests__/jie.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/ephemeris/src/index.ts`:

```ts
export { jieBoundaries } from "./jie";
```

Run: `cd packages/ephemeris && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde.

```bash
git add packages/ephemeris/src/jie.ts packages/ephemeris/src/__tests__/jie.test.ts packages/ephemeris/src/index.ts
git commit -m "feat(ephemeris): jieBoundaries — distancia a los términos solares de mes (para 大運)"
```

---

### Task 9: API — `/api/bazi` con Bearer auth + payload Pro

**Files:**
- Modify: `apps/web/app/api/bazi/route.ts`

**Interfaces:**
- Consumes: `authenticateRoute` de `@/lib/supabase/route-auth` (existente); `jieBoundaries` de `@aluna/ephemeris` (Task 8).
- Produces: respuesta JSON `{ year, month, day, hour, solarYear, timeKnown, gender, birthYear, daysToPrevJie, daysToNextJie }` — `gender: "feminine"|"masculine"|"neutral"`, `birthYear: number`. Campos existentes intactos (compatibilidad con la UI actual).

- [ ] **Step 1: Modificar la ruta**

Cambios exactos sobre `apps/web/app/api/bazi/route.ts`:

1. Reemplazar el import `import { createClient } from "@/lib/supabase/server";` por `import { authenticateRoute } from "@/lib/supabase/route-auth";`.
2. Añadir `jieBoundaries` al import de `@aluna/ephemeris`:
   `import { computeChart, jieBoundaries, setEphePath } from "@aluna/ephemeris";`
3. Reemplazar el bloque de auth:

```ts
  const { supabase, user } = await authenticateRoute(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
```

4. Añadir `gender` al select del perfil:

```ts
  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("birth_date, birth_time, time_known, latitude, longitude, time_zone, gender")
    .eq("id", profileId)
    .maybeSingle();
```

5. Antes del `return NextResponse.json(...)` final, calcular:

```ts
    const { daysToPrevJie, daysToNextJie } = jieBoundaries(input);
    const rawGender = String((profile as { gender?: unknown }).gender ?? "");
    const gender =
      rawGender === "feminine" || rawGender === "masculine" ? rawGender : "neutral";
```

6. Return final:

```ts
    return NextResponse.json({
      year, month, day, hour, solarYear, timeKnown,
      gender, birthYear: cy, daysToPrevJie, daysToNextJie,
    });
```

- [ ] **Step 2: Verificar con typecheck + build**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: verde (no hay test unitario de la ruta; el gate es typecheck + el build de la Task 12).

- [ ] **Step 3: Prueba en vivo con curl (requiere dev server + Supabase activo)**

Con el dev server corriendo (`npx pnpm dev --port 3002` en apps/web) y un usuario/perfil de prueba (crear vía signup + SQL confirm, como en sesiones anteriores):

```bash
curl -s -X POST http://localhost:3002/api/bazi \
  -H "content-type: application/json" -H "authorization: Bearer <TOKEN>" \
  -d '{"profileId":"<PROFILE_ID>"}' | python3 -m json.tool
```

Expected: 200 con `gender`, `birthYear`, `daysToPrevJie`, `daysToNextJie` presentes y positivos. Sin token → 307/401 (nunca datos). Borrar el usuario de prueba después.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/bazi/route.ts
git commit -m "feat(api): /api/bazi con Bearer auth + datos Pro (género, términos solares, año civil)"
```

---

### Task 10: Web — catálogo `bazi-labels` + claves i18n ES/EN

**Files:**
- Create: `apps/web/lib/content/bazi-labels.ts`
- Test: `apps/web/lib/content/__tests__/bazi-labels.test.ts`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (namespace `pilares`)

**Interfaces:**
- Consumes: tipos de `@aluna/core` (`TenGod`, `StageKey`, `StarKey`, `InteractionType`, `SeasonState`, `StrengthVerdict`).
- Produces: `baziLabels(locale: string): BaziLabelMaps` con `{ nayin: Record<string,string>, stages: Record<StageKey,string>, stars: Record<StarKey,string>, interactions: Record<InteractionType,string>, seasonStates: Record<SeasonState,string>, verdicts: Record<StrengthVerdict,string>, drivers: Record<string,string> }` — nombres ES/EN por key. Los glifos hanzi/hangul NO van aquí (vienen de `@aluna/core`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/content/__tests__/bazi-labels.test.ts
import { describe, it, expect } from "vitest";
import { baziLabels } from "../bazi-labels";
import { NAYIN, TWELVE_STAGES, STARS } from "@aluna/core";

describe("baziLabels", () => {
  it("cubre los 30 Na Yin en ES y EN", () => {
    for (const loc of ["es", "en"]) {
      const L = baziLabels(loc);
      for (const n of NAYIN) expect(L.nayin[n.key], `${loc}:${n.key}`).toBeTruthy();
    }
  });
  it("cubre las 12 etapas, las 7 estrellas y los 8 tipos de interacción", () => {
    const L = baziLabels("es");
    for (const s of TWELVE_STAGES) expect(L.stages[s.key]).toBeTruthy();
    for (const s of STARS) expect(L.stars[s.key]).toBeTruthy();
    for (const k of ["stem_combo","six_combo","trine","half_trine","clash","punishment","self_punishment","harm"] as const)
      expect(L.interactions[k]).toBeTruthy();
  });
  it("estados estacionales, veredictos y drivers presentes", () => {
    const L = baziLabels("en");
    for (const k of ["wang","xiang","xiu","qiu","si"] as const) expect(L.seasonStates[k]).toBeTruthy();
    for (const k of ["strong","weak","balanced"] as const) expect(L.verdicts[k]).toBeTruthy();
    for (const k of ["season","root_principal","root_residual","visible_support"]) expect(L.drivers[k]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/content/__tests__/bazi-labels.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the catalog**

```ts
// apps/web/lib/content/bazi-labels.ts
// Nombres ES/EN de la lámina Ba Zi/Saju, por key de dominio. Los glifos (hanzi/
// hangul) y romanizaciones vienen de @aluna/core; aquí SOLO traducciones.
import type { StageKey, StarKey, InteractionType, SeasonState, StrengthVerdict } from "@aluna/core";

export interface BaziLabelMaps {
  nayin: Record<string, string>;
  stages: Record<StageKey, string>;
  stars: Record<StarKey, string>;
  interactions: Record<InteractionType, string>;
  seasonStates: Record<SeasonState, string>;
  verdicts: Record<StrengthVerdict, string>;
  drivers: Record<string, string>;
}

const ES: BaziLabelMaps = {
  nayin: {
    sea_gold: "Oro en el Mar", furnace_fire: "Fuego de Fragua", forest_wood: "Madera del Gran Bosque",
    roadside_earth: "Tierra del Camino", sword_metal: "Metal de Espada", mountaintop_fire: "Fuego de la Cima",
    stream_water: "Agua del Arroyo", citywall_earth: "Tierra de Muralla", pewter_metal: "Metal de Peltre",
    willow_wood: "Madera de Sauce", spring_water: "Agua de Manantial", rooftop_earth: "Tierra del Tejado",
    thunderbolt_fire: "Fuego del Relámpago", pine_wood: "Madera de Pino y Ciprés", longriver_water: "Agua de Río Largo",
    sand_gold: "Oro en la Arena", mountainfoot_fire: "Fuego al Pie del Monte", plain_wood: "Madera de Llanura",
    wall_earth: "Tierra del Muro", goldfoil_metal: "Metal de Pan de Oro", lamp_fire: "Fuego de Lámpara",
    skyriver_water: "Agua del Río Celeste", highway_earth: "Tierra del Gran Camino", hairpin_metal: "Metal de Horquilla",
    mulberry_wood: "Madera de Morera", greatstream_water: "Agua del Gran Torrente", sand_earth: "Tierra en la Arena",
    heavenly_fire: "Fuego Celeste", pomegranate_wood: "Madera de Granado", ocean_water: "Agua del Océano",
  },
  stages: {
    birth: "Nacimiento", bath: "Baño", cap: "Vestidura", office: "Madurez", peak: "Cumbre",
    decline: "Declive", sickness: "Enfermedad", death: "Muerte", tomb: "Tumba", cut: "Corte",
    womb: "Gestación", nurture: "Crianza",
  },
  stars: {
    nobleman: "Noble Celestial", peach_blossom: "Flor de Durazno", sky_horse: "Caballo Viajero",
    academic: "Estrella Académica", canopy: "Dosel de Flores", goat_blade: "Filo de Cabra", void: "Vacío",
  },
  interactions: {
    stem_combo: "Combinación de troncos", six_combo: "Combinación", trine: "Trino completo",
    half_trine: "Medio trino", clash: "Choque", punishment: "Castigo", self_punishment: "Auto-castigo", harm: "Daño",
  },
  seasonStates: { wang: "Pleno", xiang: "Apoyado", xiu: "En reposo", qiu: "Contenido", si: "Sin apoyo" },
  verdicts: { strong: "Fuerte", weak: "Suave", balanced: "Equilibrado" },
  drivers: {
    season: "Mando del mes (estación)", root_principal: "Raíz principal", root_residual: "Raíz residual",
    visible_support: "Apoyo visible",
  },
};

const EN: BaziLabelMaps = {
  nayin: {
    sea_gold: "Gold in the Sea", furnace_fire: "Furnace Fire", forest_wood: "Great Forest Wood",
    roadside_earth: "Roadside Earth", sword_metal: "Sword-edge Metal", mountaintop_fire: "Mountaintop Fire",
    stream_water: "Stream Water", citywall_earth: "City-wall Earth", pewter_metal: "Pewter Metal",
    willow_wood: "Willow Wood", spring_water: "Spring Water", rooftop_earth: "Rooftop Earth",
    thunderbolt_fire: "Thunderbolt Fire", pine_wood: "Pine and Cypress Wood", longriver_water: "Long-river Water",
    sand_gold: "Gold in the Sand", mountainfoot_fire: "Mountain-foot Fire", plain_wood: "Plain Wood",
    wall_earth: "Wall Earth", goldfoil_metal: "Gold-foil Metal", lamp_fire: "Lamp Fire",
    skyriver_water: "Sky-river Water", highway_earth: "Highway Earth", hairpin_metal: "Hairpin Metal",
    mulberry_wood: "Mulberry Wood", greatstream_water: "Great-stream Water", sand_earth: "Sand Earth",
    heavenly_fire: "Heavenly Fire", pomegranate_wood: "Pomegranate Wood", ocean_water: "Ocean Water",
  },
  stages: {
    birth: "Birth", bath: "Bath", cap: "Coming of Age", office: "Maturity", peak: "Peak",
    decline: "Decline", sickness: "Sickness", death: "Death", tomb: "Tomb", cut: "Severance",
    womb: "Conception", nurture: "Nurture",
  },
  stars: {
    nobleman: "Heavenly Noble", peach_blossom: "Peach Blossom", sky_horse: "Traveling Horse",
    academic: "Academic Star", canopy: "Flower Canopy", goat_blade: "Goat Blade", void: "Void",
  },
  interactions: {
    stem_combo: "Stem combination", six_combo: "Combination", trine: "Full trine",
    half_trine: "Half trine", clash: "Clash", punishment: "Punishment", self_punishment: "Self-punishment", harm: "Harm",
  },
  seasonStates: { wang: "In command", xiang: "Supported", xiu: "Resting", qiu: "Restrained", si: "Unsupported" },
  verdicts: { strong: "Strong", weak: "Gentle", balanced: "Balanced" },
  drivers: {
    season: "Month command (season)", root_principal: "Principal root", root_residual: "Residual root",
    visible_support: "Visible support",
  },
};

export function baziLabels(locale: string): BaziLabelMaps {
  return locale === "en" ? EN : ES;
}
```

- [ ] **Step 4: i18n del namespace `pilares` (es.json / en.json)**

Añadir dentro de `"pilares": { … }` en `apps/web/messages/es.json` (antes de cerrar el objeto):

```json
    "scriptBazi": "Ba Zi",
    "scriptSaju": "Saju",
    "nayinTitle": "Na Yin · elementos melódicos",
    "strengthTitle": "Fuerza del Maestro del Día",
    "strengthMethod": "Método: mando del mes + raíces y apoyos ponderados",
    "favorTitle": "Elementos favorables",
    "avoidTitle": "A moderar",
    "balancedNote": "Tu Maestro del Día está en equilibrio: ninguna familia de elementos domina; observa el matiz de cada década.",
    "luckTitle": "Pilares de Suerte",
    "luckStart": "Primer pilar a los {years} años y {months} meses",
    "luckForward": "Ciclo ascendente",
    "luckBackward": "Ciclo descendente",
    "luckNeutralNote": "La tradición deriva la dirección del sexo de nacimiento; te mostramos ambas.",
    "luckNoTimeNote": "Sin hora exacta, la edad de inicio tiene una imprecisión de ±2 meses.",
    "annualTitle": "Años de flujo",
    "annualJanFebNote": "Si naciste en enero–febrero, el pilar del año cambia en Lichun (~4 feb), no el 1 de enero.",
    "currentDecade": "Década actual",
    "age": "años",
    "stagesTitle": "Las 12 etapas",
    "interactionsTitle": "Interacciones",
    "interactionsEmpty": "Sin interacciones mayores entre tus pilares: un mapa sereno.",
    "starsTitle": "Estrellas simbólicas",
    "threePillarsNote": "Sin hora de nacimiento el cálculo usa 3 pilares; el pilar de hora y sus estrellas se omiten.",
    "seasonState": "Estado estacional",
    "score": "Puntaje"
```

Y su espejo EN en `apps/web/messages/en.json`:

```json
    "scriptBazi": "Ba Zi",
    "scriptSaju": "Saju",
    "nayinTitle": "Na Yin · melodic elements",
    "strengthTitle": "Day Master strength",
    "strengthMethod": "Method: month command + weighted roots and support",
    "favorTitle": "Favorable elements",
    "avoidTitle": "To moderate",
    "balancedNote": "Your Day Master is balanced: no element family dominates; watch the nuance of each decade.",
    "luckTitle": "Luck Pillars",
    "luckStart": "First pillar at {years} years and {months} months",
    "luckForward": "Ascending cycle",
    "luckBackward": "Descending cycle",
    "luckNeutralNote": "Tradition derives the direction from birth sex; we show you both.",
    "luckNoTimeNote": "Without an exact time, the starting age has ±2 months of imprecision.",
    "annualTitle": "Flow years",
    "annualJanFebNote": "If you were born in January–February, the year pillar changes at Lichun (~Feb 4), not January 1.",
    "currentDecade": "Current decade",
    "age": "yrs",
    "stagesTitle": "The 12 stages",
    "interactionsTitle": "Interactions",
    "interactionsEmpty": "No major interactions between your pillars: a serene map.",
    "starsTitle": "Symbolic stars",
    "threePillarsNote": "Without a birth time the calculation uses 3 pillars; the hour pillar and its stars are omitted.",
    "seasonState": "Seasonal state",
    "score": "Score"
```

Además REEMPLAZAR el valor de `proSoon` NO se borra aún (lo quita la Task 11 al dejar de usarse).

- [ ] **Step 5: Run tests + commit**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: verde (incluye el test nuevo de labels).

```bash
git add apps/web/lib/content/bazi-labels.ts apps/web/lib/content/__tests__/bazi-labels.test.ts apps/web/messages/es.json apps/web/messages/en.json
git commit -m "feat(web): catálogo bazi-labels ES/EN + claves i18n de la lámina Pro"
```

---

### Task 11: Web — lámina Pro en `/pilares` (toggle Saju + 8 secciones)

**Files:**
- Create: `apps/web/app/(app)/pilares/pro-lamina.tsx`
- Modify: `apps/web/app/(app)/pilares/pilares-view.tsx`
- Modify: `apps/web/app/(app)/pilares/pilares.module.css`
- Modify: `apps/web/messages/es.json`, `apps/web/messages/en.json` (borrar clave `proSoon`)

**Interfaces:**
- Consumes: TODO lo exportado en Tasks 1–7 desde `@aluna/core`; `BaZiData` extendido con `{ gender, birthYear, daysToPrevJie, daysToNextJie }` (Task 9); `baziLabels` (Task 10).
- Produces: componente `<ProLamina data={BaZiData} script={"hanzi"|"hangul"} locale={string} />`; `pilares-view` gana estado `script` con toggle y renderiza `<ProLamina/>` cuando `pro`.

- [ ] **Step 1: Extender `BaZiData` y montar el toggle en `pilares-view.tsx`**

En `pilares-view.tsx`:
1. Extender la interfaz:

```ts
interface BaZiData {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  solarYear: number;
  timeKnown: boolean;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}
```

2. Estado nuevo junto a `pro`: `const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");`
3. Junto al botón Modo Pro (dentro del fragmento `pro &&` o al lado del toggle), añadir el conmutador:

```tsx
{pro && (
  <div className={styles.scriptRow} role="tablist" aria-label="Ba Zi / Saju">
    {(["hanzi", "hangul"] as const).map((s) => (
      <button key={s} type="button" role="tab" aria-selected={script === s}
        className={`${styles.scriptBtn} ${script === s ? styles.scriptOn : ""}`}
        onClick={() => setScript(s)}>
        {t(s === "hanzi" ? "pilares.scriptBazi" : "pilares.scriptSaju")}
      </button>
    ))}
  </div>
)}
```

4. Los glifos de la REJILLA existente respetan el script: donde hoy pinta `stem.hanzi` / `branch.hanzi`, cambiar a:

```tsx
{script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : stem.hanzi}
```

(y equivalente con `BRANCH_LABELS[pillar.branch]!.hangul` para la rama; importar `STEM_LABELS, BRANCH_LABELS` de `@aluna/core`).
5. Al final del bloque `pro && …` reemplazar `<p className={styles.proSoon}>…</p>` por:

```tsx
{pro && data && <ProLamina data={data} script={script} />}
```

6. Borrar la clave `proSoon` de `es.json`/`en.json` y el estilo `.proSoon` si queda sin uso.

- [ ] **Step 2: Crear `pro-lamina.tsx` (las 8 secciones)**

```tsx
// apps/web/app/(app)/pilares/pro-lamina.tsx
"use client";
import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_LABELS, BRANCH_LABELS, TEN_GODS, TEN_GOD_KO,
  nayin, lifeStage, TWELVE_STAGES, detectInteractions, symbolicStars, STARS,
  dayMasterStrength, favorableElements, luckPillars, annualPillars,
  type Pillar, type PillarSet, type TenGod, type LuckSequence,
} from "@aluna/core";
import { baziLabels } from "@/lib/content/bazi-labels";
import styles from "./pilares.module.css";

interface BaZiData {
  year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null;
  solarYear: number; timeKnown: boolean;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number; daysToPrevJie: number; daysToNextJie: number;
}
type Script = "hanzi" | "hangul";
const POS_KEYS = ["year", "month", "day", "hour"] as const;

const godName = (t: ReturnType<typeof useTranslations>, key: TenGod) => t(`pilares.god${key.split("_").map((w) => w[0]!.toUpperCase() + w.slice(1)).join("")}`);

export function ProLamina({ data, script }: { data: BaZiData; script: Script }) {
  const t = useTranslations();
  const locale = useLocale();
  const L = baziLabels(locale);
  const [openDecade, setOpenDecade] = useState<number | null>(null);

  const set: PillarSet = { year: data.year, month: data.month, day: data.day, hour: data.hour };
  const glyphStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.hangul : HEAVENLY_STEMS[i]!.hanzi);
  const glyphBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.hangul : EARTHLY_BRANCHES[i]!.hanzi);
  const glyphGod = (g: TenGod) => (script === "hangul" ? TEN_GOD_KO[g] : TEN_GODS.find((x) => x.key === g)!.hanzi);
  const glyphPillar = (p: Pillar) => `${glyphStem(p.stem)}${glyphBranch(p.branch)}`;

  const strength = useMemo(() => dayMasterStrength(set), [data]);
  const favor = favorableElements(strength.verdict, data.day.stem);
  const interactions = useMemo(() => detectInteractions(set), [data]);
  const stars = useMemo(() => symbolicStars(set), [data]);
  const sequences = useMemo(
    () => luckPillars({ pillars: set, gender: data.gender, birthYear: data.birthYear, daysToPrevJie: data.daysToPrevJie, daysToNextJie: data.daysToNextJie }),
    [data],
  );
  const nowYear = new Date().getFullYear();
  const entries = POS_KEYS.map((k) => ({ key: k, pillar: k === "hour" ? data.hour : data[k] })).filter(
    (e): e is { key: (typeof POS_KEYS)[number]; pillar: Pillar } => !!e.pillar,
  );
  const elName = (el: string) => t(`pilares.el${el[0]!.toUpperCase()}${el.slice(1)}`);

  return (
    <div className={styles.lamina}>
      {!data.timeKnown && <p className={styles.note}>{t("pilares.threePillarsNote")}</p>}

      {/* Na Yin */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.nayinTitle")}</h3>
        {entries.map((e) => {
          const n = nayin(e.pillar);
          return (
            <div key={e.key} className={styles.row}>
              <span className={styles.rowLabel}>{t(`pilares.${e.key}`)}</span>
              <span className={styles.rowGlyph}>{glyphPillar(e.pillar)}</span>
              <span className={`${styles.rowValue} ${styles[`el_${n.element}`] ?? ""}`}>
                {n.hanzi} · {L.nayin[n.key]}
              </span>
            </div>
          );
        })}
      </section>

      {/* Fuerza del DM */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.strengthTitle")}</h3>
        <div className={styles.meterRow}>
          <span className={styles.verdict}>{L.verdicts[strength.verdict]}</span>
          <span className={styles.meterTrack}><span className={styles.meterFill} style={{ width: `${strength.score}%` }} /></span>
          <span className={styles.meterScore}>{strength.score}</span>
        </div>
        <p className={styles.subRow}>{t("pilares.seasonState")}: {L.seasonStates[strength.seasonState]}</p>
        <div className={styles.drivers}>
          {strength.drivers.map((d, i) => (
            <div key={i} className={styles.driver}>
              <span>{L.drivers[d.key]} · {t(`pilares.${d.pillar}`)}</span>
              <span className={styles.driverPts}>+{d.points}</span>
            </div>
          ))}
        </div>
        <p className={styles.method}>{t("pilares.strengthMethod")}</p>
      </section>

      {/* Favorables */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.favorTitle")}</h3>
        {strength.verdict === "balanced" ? (
          <p className={styles.note}>{t("pilares.balancedNote")}</p>
        ) : (
          <>
            <div className={styles.chips}>
              {favor.favor.map((el) => <span key={el} className={`${styles.chip} ${styles[`elBg_${el}`] ?? ""}`}>{elName(el)}</span>)}
            </div>
            <p className={styles.subRow}>{t("pilares.avoidTitle")}</p>
            <div className={styles.chips}>
              {favor.avoid.map((el) => <span key={el} className={`${styles.chip} ${styles.chipDim}`}>{elName(el)}</span>)}
            </div>
          </>
        )}
      </section>

      {/* 大運 */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.luckTitle")}</h3>
        {data.gender === "neutral" && <p className={styles.note}>{t("pilares.luckNeutralNote")}</p>}
        {!data.timeKnown && <p className={styles.note}>{t("pilares.luckNoTimeNote")}</p>}
        {sequences.map((seq) => (
          <LuckRow key={seq.direction} seq={seq} nowYear={nowYear} glyphPillar={glyphPillar}
            godName={(g) => godName(t, g)} glyphGod={glyphGod} L={L} t={t}
            open={openDecade} setOpen={setOpenDecade} natal={set} />
        ))}
      </section>

      {/* 12 etapas */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.stagesTitle")}</h3>
        {entries.map((e) => {
          const st = lifeStage(data.day.stem, e.pillar.branch);
          const def = TWELVE_STAGES.find((x) => x.key === st)!;
          return (
            <div key={e.key} className={styles.row}>
              <span className={styles.rowLabel}>{t(`pilares.${e.key}`)}</span>
              <span className={styles.rowGlyph}>{glyphBranch(e.pillar.branch)}</span>
              <span className={styles.rowValue}>{script === "hangul" ? def.hangul : def.hanzi} · {L.stages[st]}</span>
            </div>
          );
        })}
      </section>

      {/* Interacciones */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.interactionsTitle")}</h3>
        {interactions.length === 0 ? (
          <p className={styles.note}>{t("pilares.interactionsEmpty")}</p>
        ) : (
          interactions.map((x, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.rowLabel}>{x.positions.map((p) => t(`pilares.${p}`)).join(" · ")}</span>
              <span className={styles.rowValue}>
                {L.interactions[x.type]}{x.element ? ` → ${elName(x.element)}` : ""}
              </span>
            </div>
          ))
        )}
      </section>

      {/* Estrellas */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.starsTitle")}</h3>
        {stars.length === 0 ? (
          <p className={styles.note}>—</p>
        ) : (
          <div className={styles.chips}>
            {stars.map((h, i) => {
              const def = STARS.find((s) => s.key === h.star)!;
              return (
                <span key={i} className={styles.chip}>
                  {script === "hangul" ? def.hangul : def.hanzi} {L.stars[h.star]} · {t(`pilares.${h.pillar}`)}
                </span>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function LuckRow({ seq, nowYear, glyphPillar, godName, glyphGod, L, t, open, setOpen, natal }: {
  seq: LuckSequence; nowYear: number;
  glyphPillar: (p: Pillar) => string; godName: (g: TenGod) => string; glyphGod: (g: TenGod) => string;
  L: ReturnType<typeof baziLabels>; t: ReturnType<typeof useTranslations>;
  open: number | null; setOpen: (n: number | null) => void; natal: PillarSet;
}) {
  return (
    <div className={styles.luckBlock}>
      <p className={styles.subRow}>
        {t(seq.direction === "forward" ? "pilares.luckForward" : "pilares.luckBackward")} — {" "}
        {t("pilares.luckStart", { years: seq.startAgeYears, months: seq.startAgeMonths })}
      </p>
      <div className={styles.luckScroll}>
        {seq.pillars.map((p, i) => {
          const current = nowYear >= p.startYear && nowYear < p.startYear + 10;
          const id = seq.direction === "forward" ? i : 100 + i;
          return (
            <button key={i} type="button"
              className={`${styles.luckCol} ${current ? styles.luckNow : ""} ${open === id ? styles.luckOpen : ""}`}
              onClick={() => setOpen(open === id ? null : id)}>
              <span className={styles.luckAge}>{p.startAge} {t("pilares.age")}</span>
              <span className={styles.luckGlyph}>{glyphPillar(p.pillar)}</span>
              <span className={styles.luckGod}>{glyphGod(p.tenGod)} {godName(p.tenGod)}</span>
              <span className={styles.luckNayin}>{L.nayin[p.nayin.key]}</span>
              {current && <span className={styles.luckTag}>{t("pilares.currentDecade")}</span>}
            </button>
          );
        })}
      </div>
      {seq.pillars.map((p, i) => {
        const id = seq.direction === "forward" ? i : 100 + i;
        if (open !== id) return null;
        const rows = annualPillars(natal, p.startYear, 10);
        return (
          <div key={`fy-${i}`} className={styles.annual}>
            <p className={styles.subRow}>{t("pilares.annualTitle")} · {t("pilares.annualJanFebNote")}</p>
            {rows.map((r) => (
              <div key={r.year} className={styles.row}>
                <span className={styles.rowLabel}>{r.year}</span>
                <span className={styles.rowGlyph}>{glyphPillar(r.pillar)}</span>
                <span className={styles.rowValue}>
                  {godName(r.tenGod)}
                  {r.marks.map((m, j) => (
                    <em key={j} className={styles.mark}> {L.interactions[m.type]}·{t(`pilares.${m.vs}`)}</em>
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: CSS — añadir a `pilares.module.css`**

```css
/* ── Lámina Pro ── */
.lamina { display: grid; gap: 16px; width: 100%; max-width: 720px; margin-top: 24px; }
.card { border: 1px solid var(--line); border-radius: 18px; background: var(--surface); padding: 20px; }
.cardH { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--acc); margin: 0 0 12px; }
.row { display: flex; align-items: baseline; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: none; }
.rowLabel { min-width: 64px; color: var(--soft); font-size: 13px; }
.rowGlyph { font-size: 18px; }
.rowValue { flex: 1; font-size: 14px; }
.subRow { color: var(--soft); font-size: 13px; margin: 10px 0 6px; }
.method { color: var(--soft); font-size: 12px; font-style: italic; margin-top: 10px; }
.meterRow { display: flex; align-items: center; gap: 12px; }
.verdict { font-size: 18px; font-family: var(--font-serif, serif); font-style: italic; }
.meterTrack { flex: 1; height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.meterFill { display: block; height: 100%; background: var(--acc); border-radius: 3px; }
.meterScore { font-size: 13px; color: var(--soft); min-width: 24px; text-align: right; }
.drivers { display: grid; gap: 4px; margin-top: 10px; }
.driver { display: flex; justify-content: space-between; font-size: 13px; color: var(--soft); }
.driverPts { color: var(--acc); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; font-size: 13px; }
.chipDim { opacity: 0.6; }
.mark { color: var(--acc); font-size: 12px; font-style: normal; }
.luckBlock { margin-top: 8px; }
.luckScroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
.luckCol { min-width: 108px; border: 1px solid var(--line); border-radius: 14px; background: none; color: inherit; padding: 10px 8px; display: grid; gap: 4px; justify-items: center; cursor: pointer; }
.luckNow { border-color: var(--acc); }
.luckOpen { background: var(--surface); }
.luckAge { font-size: 11px; color: var(--soft); }
.luckGlyph { font-size: 20px; }
.luckGod { font-size: 11px; }
.luckNayin { font-size: 10px; color: var(--soft); }
.luckTag { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--acc); }
.annual { margin-top: 10px; }
.scriptRow { display: flex; gap: 8px; margin-top: 10px; }
.scriptBtn { border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--soft); padding: 5px 16px; font-size: 13px; cursor: pointer; }
.scriptOn { border-color: var(--acc); color: var(--acc); }
```

Nota: usar las MISMAS variables CSS que ya usa `pilares.module.css` (revisar nombres reales — `--line`/`--surface`/`--soft`/`--acc` según el archivo existente; si difieren, adaptarse a los existentes).

- [ ] **Step 4: Verificar**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`
Expected: TODO verde (build incluye ESLint).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/pilares/" apps/web/messages/es.json apps/web/messages/en.json
git commit -m "feat(web): lámina Pro completa de Pilares (Na Yin, fuerza DM, 喜用神, 大運/流年, etapas, interacciones, estrellas) + toggle Ba Zi↔Saju"
```

---

### Task 12: Mobile — `bazi-api` + contenido + pestaña Pilares completa

**Files:**
- Create: `apps/mobile/lib/bazi-api.ts`
- Create: `apps/mobile/content/bazi.ts`
- Create: `apps/mobile/app/(tabs)/pilares.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (tab nueva), `apps/mobile/app/(tabs)/index.tsx` (tarjeta Hoy), `apps/mobile/app/(tabs)/ajustes.tsx` (sysBazi disponible), `apps/mobile/lib/strings.ts` (namespace `pilares` ES/EN + `nav.pilares`)

**Interfaces:**
- Consumes: `API_URL` de `./supabase` y patrón de `lib/chart-api.ts`; todo `@aluna/core` de Tasks 1–7; `baziLabels`-espejo local.
- Produces: `fetchBaZi({ accessToken, profileId }): Promise<BaZiData>` (misma forma que web); `content/bazi.ts` exporta `baziContent(locale)` con los mismos mapas del catálogo web; pantalla con rejilla de pilares + secciones Pro + toggle Ba Zi↔Saju.

- [ ] **Step 1: `lib/bazi-api.ts`**

```ts
// apps/mobile/lib/bazi-api.ts
// Llama /api/bazi con Bearer (patrón de chart-api.ts). El motor sexagenario corre
// client-side desde @aluna/core; el server solo aporta pilares + datos astronómicos.
import type { Pillar } from "@aluna/core";
import { API_URL } from "./supabase";

export interface BaZiData {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  solarYear: number;
  timeKnown: boolean;
  gender: "feminine" | "masculine" | "neutral";
  birthYear: number;
  daysToPrevJie: number;
  daysToNextJie: number;
}

export class BaZiApiError extends Error {}

export async function fetchBaZi(params: { accessToken: string; profileId: string }): Promise<BaZiData> {
  if (!API_URL) throw new BaZiApiError("apiUrl no configurado (app.json → expo.extra.apiUrl)");
  const res = await fetch(`${API_URL}/api/bazi`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({ profileId: params.profileId }),
  });
  if (!res.ok) throw new BaZiApiError(`bazi_${res.status}`);
  const data = (await res.json()) as Partial<BaZiData>;
  if (!data.year || !data.month || !data.day) throw new BaZiApiError("bazi_empty");
  return data as BaZiData;
}
```

- [ ] **Step 2: `content/bazi.ts`**

Espejo EXACTO de los mapas del catálogo web (Task 10), como objeto local con `baziContent(locale: Locale)` que devuelve `{ nayin, stages, stars, interactions, seasonStates, verdicts, drivers, ui }` — donde `ui` añade las cadenas de pantalla (los textos de `pilares.*` de Task 10 en su versión móvil): título, secciones, notas, toggle. Copiar los valores ES/EN literales del catálogo web (misma redacción, para mantener la voz).

- [ ] **Step 3: pantalla `app/(tabs)/pilares.tsx`**

Estructura (patrón EXACTO de `carta.tsx`, mismos helpers de estilo `makeStyles(t)`, `Card`, Starfield/Enso, `useAuth`+`useProfile`):
1. Estados: `data/error/loading`, `pro: boolean`, `script: "hanzi"|"hangul"`.
2. Fetch con `fetchBaZi` cuando hay `profile.id` + `session.access_token` (mismo useEffect con `alive` y caché ref que carta).
3. Rejilla de 4 pilares: columnas con tronco/rama (glifo según `script`), animal (desde `EARTHLY_BRANCHES[i].animal` + labels ES del content), Maestro del Día resaltado, Dios por tronco cuando `pro` (idéntica lógica que la web actual: `tenGod(day.stem, pillar.stem)`), ocultos con sus dioses cuando `pro`.
4. Balance de elementos (conteo igual que la web: elemento de cada tronco+rama visible) con barras nativas (patrón Balance de carta.tsx).
5. Secciones Pro (cuando `pro`): las MISMAS 8 de la web (Task 11) en tarjetas nativas: Na Yin, Fuerza (medidor con `View` de ancho `%`), Favorables (chips), 大運 (ScrollView horizontal de columnas tocables; tap abre sus 10 流年 debajo), Etapas, Interacciones, Estrellas. Todo desde `@aluna/core` + `baziContent(locale)`.
6. Toggle Ba Zi↔Saju como par de chips (patrón kindChip de carta.tsx).
7. Notas honestas: sin hora (3 pilares), neutro (ambas direcciones), ene-feb 流年.

- [ ] **Step 4: wiring**

1. `app/(tabs)/_layout.tsx`: nueva `<Tabs.Screen name="pilares" options={{ title: t("nav.pilares"), tabBarIcon: ({ color }) => <TabGlyph glyph="八" color={color} /> }} />` — entre `carta` y `numeros`.
2. `lib/strings.ts`: `nav.pilares: "Pilares"` / EN `"Pillars"` + namespace `pilares` con las cadenas de pantalla usadas en Step 3 (título "Cuatro Pilares"/"Four Pillars", subtitle, secciones, notas — mismos textos que Task 10).
3. `app/(tabs)/index.tsx` (Hoy): tarjeta de navegación a Pilares igual que la de Carta:

```tsx
<Pressable style={styles.soonCard} onPress={() => router.push("/(tabs)/pilares")}>
  <Text style={styles.soonTitle}>{t("hoy.pilaresTitle")}</Text>
  <Text style={styles.soonBody}>{t("hoy.pilaresBody")}</Text>
</Pressable>
```

con `hoy.pilaresTitle: "Cuatro Pilares"` / `"Four Pillars"` y `hoy.pilaresBody: "Tu mapa Ba Zi / Saju: pilares, dioses y ciclos de suerte."` / `"Your Ba Zi / Saju map: pillars, gods, and luck cycles."` en strings.ts.
4. `app/(tabs)/ajustes.tsx`: `sysBazi` pasa a `status={t("settings.available")} on`.

- [ ] **Step 5: Verificar**

Run: `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist`
Expected: typecheck verde, tests verdes, bundle OK.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): pestaña Pilares completa (Ba Zi/Saju) con lámina Pro nativa"
```

---

### Task 13: Verificación integral + en vivo

**Files:** ninguno nuevo (correcciones que salgan).

- [ ] **Step 1: monorepo completo**

Run: `cd /Users/gio/astro-app && npx pnpm -w exec turbo run typecheck test`
Expected: 6 paquetes verdes.

Run: `cd apps/web && rm -rf .next && npx next build`
Expected: build verde.

- [ ] **Step 2: verificación en vivo (la hace la sesión principal, no un subagente)**

1. Dev server en 3002; Supabase aluna activo (restaurar si está pausado).
2. Cuenta+perfil de prueba (nacimiento 1990-02-04 14:00 Guayaquil, género femenino) vía signup + SQL confirm.
3. Browser MCP: `/pilares` → activar Modo Pro → verificar las 8 secciones con datos; toggle Saju cambia glifos; EN también; perfil SIN hora → nota 3 pilares y 大運 con nota; género neutro → dos secuencias.
4. Cotejo numérico manual mínimo: pilares de la fecha de prueba contra una calculadora Ba Zi de referencia (pilar de año 己巳 para nacido 4-feb-1990 después de Lichun — VERIFICAR con la longitud solar real; si cae antes del instante exacto de Lichun 1990, es 戊辰 — el punto es que coincida con la referencia).
5. Borrar usuario de prueba (SQL) y archivos temporales.

- [ ] **Step 3: Commit final de fixes + push**

```bash
git add -A && git commit -m "fix(bazi): ajustes de la verificación en vivo de la lámina Pro" # solo si hubo fixes
git push origin main
```

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec:** §3.1→T1, §3.2→T2, §3.3→T3, §3.4→T4, §3.5→T5, §3.6→T6, §8 glifos→T7, §4→T8, §5→T9, §8 ES/EN→T10, §6→T11, §7→T12, §9→T13, §2 decisiones aplicadas en T5 (umbral/banda), T6 (neutral→ambas), T11/T12 (toggle). §10 exclusiones respetadas (sin 化, sin 從格, sin prosa, sin 流月).
- **Placeholders:** el Step 2 de Task 12 pide "copiar los valores del catálogo web" — aceptable porque el catálogo COMPLETO con valores literales está en Task 10 de este mismo plan.
- **Consistencia de tipos:** `PillarSet`/`PillarPos` definidos en T3 y consumidos en T4/T5/T6/T11/T12; `BaZiData` extendido idéntico en T9 (API), T11 (web) y T12 (móvil); `LuckSequence[]` (no objeto) decidido en T6 y usado así en T11.
