# Carta Astral móvil Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paridad de la Carta móvil con la web: rueda SVG interactiva (geometría compartida en `@aluna/core`), selectores de casas/zodiaco, y hoja de lectura interpretativa al tocar un planeta (corpus espejado + tiers IA vía Bearer).

**Architecture:** La geometría de la rueda (funciones puras que generan paths SVG) se EXTRAE de la web a `packages/core/src/astrology/wheel-geometry.ts`; la web se refactoriza para consumirla SIN cambio visual; el móvil la renderiza con `react-native-svg` (15.15.4 oficial del SDK 56, incluida en Expo Go). El corpus de lecturas se espeja a `apps/mobile/content/` (patrón numerología). Tiers IA vía `POST /api/chart-reading` con Bearer, sin streaming (respuesta acumulada).

**Tech Stack:** TypeScript strict, Vitest, react-native-svg 15.15.4, Expo SDK 56, Next.js 15.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-carta-movil-fase2-design.md`.
- `@aluna/core` RN-safe (sin node:/DOM); el móvil NUNCA importa `@aluna/ephemeris`/`@aluna/compute`.
- La rueda WEB no debe cambiar NI UN PÍXEL tras el refactor (mismo markup SVG, mismos números).
- Única dependencia móvil nueva: `react-native-svg` en la versión que fije `npx expo install` (15.15.4 según bundledNativeModules).
- Colores: tintes de elemento/armonía = las MISMAS constantes rgba de la web (diseñadas theme-agnostic); anillos/textos de la rueda móvil desde `ThemeTokens` (`useTheme()`).
- Corpus ES/EN espejado VERBATIM (solo cambia el comentario de cabecera con la ruta); prosa idéntica a la web.
- Comentarios en español. Gates web: `npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`. Gates móvil: `npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist`.

---

### Task 1: Core — `wheel-geometry.ts` (extracción con tests)

**Files:**
- Create: `packages/core/src/astrology/wheel-geometry.ts`
- Test: `packages/core/src/astrology/__tests__/wheel-geometry.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `BodyPosition` de `./types`.
- Produces: `WHEEL: { CX: 180; CY: 180; R_SIGN_OUT: 166; R_SIGN_IN: 136; R_SIGN_GLYPH: 151; R_HOUSE_IN: 58; R_HOUSE_NUM: 66; R_BODY: 114; R_ASPECT: 94 }`; `pointAt(r: number, lon: number, asc: number): [number, number]`; `annularSector(rOut: number, rIn: number, lonA: number, lonB: number, asc: number): string`; `spreadBodies(bodies: BodyPosition[], gap: number): Map<string, number>`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/astrology/__tests__/wheel-geometry.test.ts
import { describe, it, expect } from "vitest";
import { WHEEL, pointAt, annularSector, spreadBodies } from "../wheel-geometry";
import type { BodyPosition } from "../types";

const bp = (body: string, longitude: number): BodyPosition => ({
  body, longitude, sign: "aries", signDegree: 0, degree: 0, minute: 0, second: 0,
  speed: 1, retrograde: false, house: 1, dignity: null,
});

describe("wheel-geometry (extraída de la rueda web, validada al arcominuto)", () => {
  it("constantes de radios de la rueda", () => {
    expect(WHEEL).toMatchObject({ CX: 180, CY: 180, R_SIGN_OUT: 166, R_ASPECT: 94 });
  });
  it("pointAt: el Ascendente cae a la IZQUIERDA (9 en punto)", () => {
    const [x, y] = pointAt(100, 50, 50); // lon === asc
    expect(x).toBeCloseTo(WHEEL.CX - 100, 6);
    expect(y).toBeCloseTo(WHEEL.CY, 6);
  });
  it("pointAt: antihorario — asc+90° apunta hacia ABAJO en pantalla (IC)", () => {
    const [x, y] = pointAt(100, 140, 50);
    expect(x).toBeCloseTo(WHEEL.CX, 6);
    expect(y).toBeCloseTo(WHEEL.CY + 100, 6);
  });
  it("annularSector produce un path SVG cerrado con 2 arcos", () => {
    const d = annularSector(166, 136, 0, 30, 0);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.match(/A /g)).toHaveLength(2);
    expect(d.endsWith("Z")).toBe(true);
  });
  it("spreadBodies separa glifos más cercanos que el gap", () => {
    const out = spreadBodies([bp("sun", 10), bp("moon", 12)], 7);
    expect(out.get("sun")).toBe(10);
    expect(out.get("moon")).toBe(17);
  });
  it("spreadBodies no toca cuerpos ya separados", () => {
    const out = spreadBodies([bp("sun", 10), bp("moon", 40)], 7);
    expect(out.get("moon")).toBe(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run src/astrology/__tests__/wheel-geometry.test.ts`
Expected: FAIL — cannot resolve `../wheel-geometry`.

- [ ] **Step 3: Write the implementation (EXTRACCIÓN VERBATIM de la web)**

Copiar la matemática EXACTA de `apps/web/app/(app)/carta/chart-wheel.tsx` (líneas 11-49: constantes, `pointAt`, `annularSector`, `spread`) con dos adaptaciones: constantes agrupadas en `WHEEL`, y `spread` renombrada `spreadBodies` (evita chocar con nombres genéricos al exportar de core):

```ts
// packages/core/src/astrology/wheel-geometry.ts
// Geometría de la rueda de la carta (extraída VERBATIM de la web, donde está
// validada al arcominuto). Puro y RN-safe: genera coordenadas y strings de path
// SVG que renderizan igual en <svg> web y react-native-svg.
// Geometría astrológica estándar: Ascendente a la IZQUIERDA (9 en punto),
// longitud creciente en sentido ANTIHORARIO, Medio Cielo arriba. SVG con y
// hacia abajo → invertimos seno para que el antihorario se vea bien.
import type { BodyPosition } from "./types";

/** Radios y centro de la rueda (viewBox 0 0 360 360). */
export const WHEEL = {
  CX: 180,
  CY: 180,
  R_SIGN_OUT: 166,
  R_SIGN_IN: 136,
  R_SIGN_GLYPH: 151,
  R_HOUSE_IN: 58,
  R_HOUSE_NUM: 66,
  R_BODY: 114,
  R_ASPECT: 94,
} as const;

/** longitud eclíptica → punto en pantalla, con el Ascendente a la izquierda. */
export function pointAt(r: number, lon: number, asc: number): [number, number] {
  const a = ((180 + (lon - asc)) * Math.PI) / 180;
  return [WHEEL.CX + r * Math.cos(a), WHEEL.CY - r * Math.sin(a)];
}

/** Sector anular (anillo de signo) como path SVG cerrado. */
export function annularSector(
  rOut: number,
  rIn: number,
  lonA: number,
  lonB: number,
  asc: number,
): string {
  const [x1o, y1o] = pointAt(rOut, lonA, asc);
  const [x2o, y2o] = pointAt(rOut, lonB, asc);
  const [x2i, y2i] = pointAt(rIn, lonB, asc);
  const [x1i, y1i] = pointAt(rIn, lonA, asc);
  // Antihorario en pantalla = sweep-flag 0 (arco exterior), 1 al volver (interior).
  return `M ${x1o} ${y1o} A ${rOut} ${rOut} 0 0 0 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rIn} ${rIn} 0 0 1 ${x1i} ${y1i} Z`;
}

/** Reparte cuerpos muy juntos para que sus glifos no se encimen. */
export function spreadBodies(bodies: BodyPosition[], gap: number): Map<string, number> {
  const sorted = [...bodies].sort((a, b) => a.longitude - b.longitude);
  const out = new Map<string, number>();
  let last = -1000;
  for (const b of sorted) {
    const a = b.longitude - last < gap ? last + gap : b.longitude;
    out.set(b.body, a);
    last = a;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run src/astrology/__tests__/wheel-geometry.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Export + full suite + commit**

En `packages/core/src/index.ts`, junto a los exports de astrología:

```ts
export { WHEEL, pointAt, annularSector, spreadBodies } from "./astrology/wheel-geometry";
```

Run: `cd packages/core && npx vitest run && npx tsc --noEmit -p tsconfig.json` → verde (157 tests: 151 + 6).

```bash
git add packages/core/src/astrology/wheel-geometry.ts packages/core/src/astrology/__tests__/wheel-geometry.test.ts packages/core/src/index.ts
git commit -m "feat(core): geometría de la rueda extraída de la web (compartida web+móvil)"
```

---

### Task 2: Web — refactor de `chart-wheel.tsx` a la geometría de core (cero cambio visual)

**Files:**
- Modify: `apps/web/app/(app)/carta/chart-wheel.tsx`

**Interfaces:**
- Consumes: `WHEEL`, `pointAt`, `annularSector`, `spreadBodies` de `@aluna/core` (Task 1).
- Produces: el MISMO componente `ChartWheel` con el MISMO markup SVG.

- [ ] **Step 1: Refactor**

En `apps/web/app/(app)/carta/chart-wheel.tsx`:
1. Añadir al import de `@aluna/core`: `WHEEL, pointAt, annularSector, spreadBodies`.
2. BORRAR las definiciones locales: las 9 constantes (`CX`...`R_ASPECT`), `pointAt`, `annularSector`, `spread` (líneas ~11-49).
3. Donde el render usa las constantes sueltas, desestructurar una vez arriba del componente:

```ts
const { CX, CY, R_SIGN_OUT, R_SIGN_IN, R_SIGN_GLYPH, R_HOUSE_IN, R_HOUSE_NUM, R_BODY, R_ASPECT } = WHEEL;
```

4. Reemplazar la única llamada `spread(chart.bodies, 7)` por `spreadBodies(chart.bodies, 7)`.
5. NADA MÁS cambia: mismo JSX, mismas clases CSS, mismo TEXT_VS y PLANET_GLYPH locales.

- [ ] **Step 2: Gates**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run && rm -rf .next && npx next build`
Expected: todo verde.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(app)/carta/chart-wheel.tsx"
git commit -m "refactor(web): la rueda consume la geometría compartida de @aluna/core (cero cambio visual)"
```

(La verificación visual pixel-a-pixel la hace el controller en la Task 6 con captura del navegador.)

---

### Task 3: Móvil — dependencia SVG + componente `ChartWheel` nativo

**Files:**
- Modify: `apps/mobile/package.json` (vía `npx expo install react-native-svg`)
- Create: `apps/mobile/components/ChartWheel.tsx`

**Interfaces:**
- Consumes: `WHEEL`, `pointAt`, `annularSector`, `spreadBodies`, `ZODIAC_SIGNS`, `PLANETS`, tipos `ChartResult`/`BodyPosition` de `@aluna/core`; `useTheme` de `../lib/theme-context`.
- Produces: `<ChartWheel chart={ChartResult} solar={boolean} onSelect={(b: BodyPosition) => void} />` — rueda cuadrada que llena el ancho disponible.

- [ ] **Step 1: Instalar la dependencia con la versión oficial del SDK**

Run: `cd apps/mobile && npx expo install react-native-svg`
Expected: añade `react-native-svg` (15.15.4) a package.json. Luego `cd ../.. && npx pnpm install` para el lockfile del monorepo.

- [ ] **Step 2: Crear el componente**

```tsx
// apps/mobile/components/ChartWheel.tsx
// Rueda de la carta astral en react-native-svg. La GEOMETRÍA viene de
// @aluna/core (la misma que la web, validada al arcominuto): aquí solo se
// pinta. Tintes de elemento/armonía = mismas constantes rgba de la web
// (diseñadas para funcionar sobre cualquier tema); anillos y textos toman
// el tema activo.
import { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  WHEEL, pointAt, annularSector, spreadBodies,
  ZODIAC_SIGNS, PLANETS,
  type ChartResult, type BodyPosition,
} from "@aluna/core";
import { useTheme } from "../lib/theme-context";

const { CX, CY, R_SIGN_OUT, R_SIGN_IN, R_SIGN_GLYPH, R_HOUSE_IN, R_HOUSE_NUM, R_BODY, R_ASPECT } = WHEEL;

const TEXT_VS = "︎"; // U+FE0E: presentación de texto en los glifos
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

// Paridad con apps/web/app/(app)/carta/wheel-colors.ts (theme-agnostic).
const ELEMENT_FILL: Record<string, string> = {
  fire: "rgba(224,121,90,0.12)",
  earth: "rgba(127,176,105,0.12)",
  air: "rgba(122,170,224,0.12)",
  water: "rgba(150,140,214,0.12)",
};
const ELEMENT_INK: Record<string, string> = {
  fire: "#e0795a",
  earth: "#7fb069",
  air: "#7aaae0",
  water: "#9b8fd6",
};
const HARMONY_STROKE: Record<string, string> = {
  hard: "rgba(224,121,90,0.55)",
  soft: "rgba(122,170,224,0.5)",
  neutral: "rgba(231,201,134,0.4)",
};

const ANGLE_MARKS: Array<{ key: string; cusp: number }> = [
  { key: "AC", cusp: 0 },
  { key: "IC", cusp: 3 },
  { key: "DC", cusp: 6 },
  { key: "MC", cusp: 9 },
];

export function ChartWheel({
  chart,
  solar,
  onSelect,
}: {
  chart: ChartResult;
  solar: boolean;
  onSelect: (b: BodyPosition) => void;
}) {
  const { t: tk } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 420);

  const asc = chart.houses.ascendant;
  const disp = useMemo(() => spreadBodies(chart.bodies, 7), [chart]);
  const lonOf = (b: BodyPosition) => disp.get(b.body) ?? b.longitude;
  const houseOpacity = solar ? 0.28 : 1;

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg viewBox="0 0 360 360" width={size} height={size}>
        {/* anillos base */}
        <Circle cx={CX} cy={CY} r={R_SIGN_OUT} stroke={tk.accHair} strokeWidth={1} fill="none" />
        <Circle cx={CX} cy={CY} r={R_SIGN_IN} stroke={tk.accHair} strokeWidth={1} fill="none" />
        <Circle cx={CX} cy={CY} r={R_HOUSE_IN} stroke={tk.accFaint} strokeWidth={1} fill="none" />

        {/* sectores de signos, tintados por elemento */}
        {ZODIAC_SIGNS.map((s, i) => {
          const lonA = i * 30;
          const [gx, gy] = pointAt(R_SIGN_GLYPH, lonA + 15, asc);
          return (
            <G key={s.key}>
              <Path d={annularSector(R_SIGN_OUT, R_SIGN_IN, lonA, lonA + 30, asc)} fill={ELEMENT_FILL[s.element]} />
              <SvgText x={gx} y={gy} fill={ELEMENT_INK[s.element]} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                {s.glyph + TEXT_VS}
              </SvgText>
            </G>
          );
        })}
        {ZODIAC_SIGNS.map((s, i) => {
          const [xo, yo] = pointAt(R_SIGN_OUT, i * 30, asc);
          const [xi, yi] = pointAt(R_SIGN_IN, i * 30, asc);
          return <Line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} stroke={tk.accHair} strokeWidth={1} />;
        })}

        {/* cúspides de casas + números + marcas de ángulos */}
        <G opacity={houseOpacity}>
          {chart.houses.cusps.map((cusp, i) => {
            const [x1, y1] = pointAt(R_HOUSE_IN, cusp, asc);
            const [x2, y2] = pointAt(R_SIGN_IN, cusp, asc);
            const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
            const next = chart.houses.cusps[(i + 1) % 12]!;
            const span = (next - cusp + 360) % 360;
            const [nx, ny] = pointAt(R_HOUSE_NUM, cusp + span / 2, asc);
            return (
              <G key={`h${i}`}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isAngle ? tk.accSoft : tk.accHair} strokeWidth={isAngle ? 1.4 : 0.7} />
                <SvgText x={nx} y={ny} fill={tk.textFaint} fontSize={8} textAnchor="middle" alignmentBaseline="central">
                  {i + 1}
                </SvgText>
              </G>
            );
          })}
          {ANGLE_MARKS.map((m) => {
            const [x, y] = pointAt(R_SIGN_OUT + 9, chart.houses.cusps[m.cusp]!, asc);
            return (
              <SvgText key={m.key} x={x} y={y} fill={tk.textDim} fontSize={9} textAnchor="middle" alignmentBaseline="central">
                {m.key}
              </SvgText>
            );
          })}
        </G>

        {/* líneas de aspecto */}
        <G>
          {chart.aspects.map((asp, i) => {
            const a = chart.bodies.find((b) => b.body === asp.a);
            const b = chart.bodies.find((b) => b.body === asp.b);
            if (!a || !b) return null;
            const [x1, y1] = pointAt(R_ASPECT, lonOf(a), asc);
            const [x2, y2] = pointAt(R_ASPECT, lonOf(b), asc);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={HARMONY_STROKE[asp.harmony]} strokeWidth={1} />;
          })}
        </G>

        {/* cuerpos (área táctil de 32px lógicos: r=16 en viewBox de 360 sobre ~size px) */}
        {chart.bodies.map((b) => {
          const [gx, gy] = pointAt(R_BODY, lonOf(b), asc);
          const [tx, ty] = pointAt(R_BODY + 16, lonOf(b), asc);
          return (
            <G key={b.body} onPress={() => onSelect(b)}>
              <Circle cx={gx} cy={gy} r={16} fill="rgba(0,0,0,0.01)" />
              <SvgText x={gx} y={gy} fill={tk.text} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                {PLANET_GLYPH[b.body] ?? "•"}
              </SvgText>
              <SvgText x={tx} y={ty} fill={tk.textFaint} fontSize={7} textAnchor="middle" alignmentBaseline="central">
                {`${b.degree}°${b.retrograde ? "℞" : ""}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 3: Gates**

Run: `cd apps/mobile && npx tsc --noEmit && npx expo export --platform ios && rm -rf dist`
Expected: typecheck limpio, bundle OK (el componente aún no se usa; el export valida que react-native-svg resuelve en el monorepo pnpm).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/components/ChartWheel.tsx
git commit -m "feat(mobile): rueda de la carta en react-native-svg con geometría compartida"
```

---

### Task 4: Móvil — corpus de lecturas espejado + cliente de /api/chart-reading

**Files:**
- Create: `apps/mobile/content/astrology-readings-es.ts` (espejo VERBATIM de `apps/web/lib/content/astrology-readings-es.ts`)
- Create: `apps/mobile/content/astrology-readings-en.ts` (espejo VERBATIM de `apps/web/lib/content/astrology-readings-en.ts`)
- Create: `apps/mobile/lib/chart-reading-api.ts`
- Test: `apps/mobile/lib/__tests__/chart-reading-api.test.ts`

**Interfaces:**
- Consumes: `API_URL` de `./supabase`.
- Produces: `composeBodyReading(bodyKey, signKey, house, dignity): BodyReading | null` + `interface BodyReading { essence: string; flow: string; shadow: string }` (de cada espejo); `fetchChartReading(params: { accessToken: string; body: string; sign: string; house: number; dignity: string | null; length: "profunda" | "completa"; locale: "es" | "en"; profileName: string }): Promise<{ available: false } | { available: true; reading: BodyReading }>`; `parseReadingText(text: string): BodyReading | null` (exportada para test).

- [ ] **Step 1: Espejar el corpus**

Copiar `apps/web/lib/content/astrology-readings-es.ts` → `apps/mobile/content/astrology-readings-es.ts` y `-en.ts` → `-en.ts`, VERBATIM (prosa intacta), cambiando SOLO la primera línea de comentario a la ruta nueva y una nota: `// Espejo del corpus web (apps/web/lib/content/…) — mantener sincronizados a mano.` Sin imports que adaptar (son módulos puros sin dependencias).

- [ ] **Step 2: Write the failing test del parser**

```ts
// apps/mobile/lib/__tests__/chart-reading-api.test.ts
import { describe, it, expect } from "vitest";
import { parseReadingText } from "../chart-reading-api";

describe("parseReadingText (respuesta acumulada de /api/chart-reading)", () => {
  it("extrae el objeto JSON aunque venga con texto alrededor", () => {
    const r = parseReadingText('ruido {"essence":"a","flow":"b","shadow":"c"} fin');
    expect(r).toEqual({ essence: "a", flow: "b", shadow: "c" });
  });
  it("null si falta un campo o no hay JSON", () => {
    expect(parseReadingText('{"essence":"a","flow":"b"}')).toBeNull();
    expect(parseReadingText("sin json")).toBeNull();
  });
});
```

Run: `cd apps/mobile && npx vitest run lib/__tests__/chart-reading-api.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar el cliente**

```ts
// apps/mobile/lib/chart-reading-api.ts
// Tiers IA de la lectura de carta (Profunda/Completa) vía /api/chart-reading con
// Bearer. La web recibe el texto en streaming; en RN leemos la respuesta
// ACUMULADA (sin efecto máquina — spec §3.4) y parseamos el objeto
// {essence,flow,shadow}. Un HIT de caché vuelve como JSON estructurado directo.
import type { BodyReading } from "../content/astrology-readings-es";
import { API_URL } from "./supabase";

export class ChartReadingApiError extends Error {}

/** Extrae {essence,flow,shadow} del texto del modelo; null si no parsea completo. */
export function parseReadingText(text: string): BodyReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.essence === "string" && typeof o.flow === "string" && typeof o.shadow === "string") {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow };
    }
  } catch {
    /* cae a null */
  }
  return null;
}

export async function fetchChartReading(params: {
  accessToken: string;
  body: string;
  sign: string;
  house: number;
  dignity: string | null;
  length: "profunda" | "completa";
  locale: "es" | "en";
  profileName: string;
}): Promise<{ available: false } | { available: true; reading: BodyReading }> {
  if (!API_URL) throw new ChartReadingApiError("apiUrl no configurado");
  const res = await fetch(`${API_URL}/api/chart-reading`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${params.accessToken}` },
    body: JSON.stringify({
      body: params.body, sign: params.sign, house: params.house, dignity: params.dignity,
      length: params.length, locale: params.locale, profileName: params.profileName,
    }),
  });
  if (!res.ok) throw new ChartReadingApiError(`reading_${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { available?: boolean; meaning?: BodyReading };
    if (!data.available || !data.meaning) return { available: false };
    return { available: true, reading: data.meaning };
  }
  // Stream acumulado como texto plano:
  const text = await res.text();
  const reading = parseReadingText(text);
  if (!reading) throw new ChartReadingApiError("reading_parse");
  return { available: true, reading };
}
```

- [ ] **Step 4: Tests verdes + commit**

Run: `cd apps/mobile && npx vitest run && npx tsc --noEmit` → verde (12 tests: 10 + 2).

```bash
git add apps/mobile/content/astrology-readings-es.ts apps/mobile/content/astrology-readings-en.ts apps/mobile/lib/chart-reading-api.ts apps/mobile/lib/__tests__/chart-reading-api.test.ts
git commit -m "feat(mobile): corpus de lecturas de carta espejado + cliente de tiers IA con Bearer"
```

---

### Task 5: Móvil — hoja `BodyReading` nativa

**Files:**
- Create: `apps/mobile/components/BodyReading.tsx`
- Modify: `apps/mobile/lib/strings.ts` (claves nuevas `carta.*` ES/EN)

**Interfaces:**
- Consumes: `composeBodyReading`/`BodyReading` de los espejos (Task 4); `fetchChartReading` (Task 4); `BottomSheet` existente (`components/BottomSheet.tsx`); `useAuth`/`useProfile`/`useT`/`useTheme` existentes; labels `astroLabels` de `content/astrology.ts` (ya existe con signos/cuerpos/dignidades ES/EN).
- Produces: `<BodyReadingReader body={BodyPosition} profileName={string} />` — contenido para dentro del BottomSheet: título con glifo, Esencia compuesta + secciones don/sombra, selector Esencia/Profunda/Completa (tiers IA dormidos → nota cálida).

- [ ] **Step 1: Claves i18n**

En `apps/mobile/lib/strings.ts`, dentro del namespace `carta` existente, añadir (ES):

```ts
      readingEssence: "Esencia",
      readingDeep: "Profunda",
      readingComplete: "Completa",
      readingFlowH: "✦  Su don",
      readingShadowH: "◐  Su sombra",
      readingWeaving: "Aluna está tejiendo tu lectura…",
      readingGated: "Las lecturas más extensas las teje Aluna cuando despierte su voz interior.",
      readingError: "No se pudo tejer la lectura. Inténtalo de nuevo.",
```

Y su espejo EN:

```ts
      readingEssence: "Essence",
      readingDeep: "Deep",
      readingComplete: "Complete",
      readingFlowH: "✦  Its gift",
      readingShadowH: "◐  Its shadow",
      readingWeaving: "Aluna is weaving your reading…",
      readingGated: "The longer readings are woven by Aluna when she finds her inner voice.",
      readingError: "Couldn't weave the reading. Please try again.",
```

- [ ] **Step 2: Componente**

```tsx
// apps/mobile/components/BodyReading.tsx
// Lectura interpretativa de una posición (planeta-signo-casa-dignidad) para la
// hoja inferior. "Esencia" = lectura compuesta local (instantánea, del corpus
// espejado); "Profunda"/"Completa" = tiers IA vía /api/chart-reading (dormidos
// sin llave → nota cálida). Paridad con body-reading.tsx web, sin streaming.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { BodyPosition } from "@aluna/core";
import { composeBodyReading as composeEs, type BodyReading } from "../content/astrology-readings-es";
import { composeBodyReading as composeEn } from "../content/astrology-readings-en";
import { astroLabels } from "../content/astrology";
import { fetchChartReading } from "../lib/chart-reading-api";
import { useAuth } from "../lib/auth-context";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

const TIERS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIERS)[number];

type St =
  | { s: "base" }
  | { s: "loading" }
  | { s: "ready"; r: BodyReading }
  | { s: "unavailable" }
  | { s: "error" };

export function BodyReadingReader({ body, profileName }: { body: BodyPosition; profileName: string }) {
  const { session } = useAuth();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);

  const [tier, setTier] = useState<Tier>("esencia");
  const [st, setSt] = useState<St>({ s: "base" });
  const cache = useRef<Map<string, BodyReading>>(new Map());

  const compose = locale === "en" ? composeEn : composeEs;
  const base = compose(body.body, body.sign, body.house, body.dignity);

  useEffect(() => {
    setTier("esencia");
    setSt({ s: "base" });
  }, [body.body, body.sign, body.house]);

  useEffect(() => {
    if (tier === "esencia") {
      setSt({ s: "base" });
      return;
    }
    const key = `${locale}:${body.body}:${body.sign}:${body.house}:${tier}`;
    const hit = cache.current.get(key);
    if (hit) {
      setSt({ s: "ready", r: hit });
      return;
    }
    if (!session) {
      setSt({ s: "unavailable" });
      return;
    }
    let alive = true;
    setSt({ s: "loading" });
    fetchChartReading({
      accessToken: session.access_token,
      body: body.body, sign: body.sign, house: body.house, dignity: body.dignity,
      length: tier === "profunda" ? "profunda" : "completa",
      locale: locale === "en" ? "en" : "es",
      profileName,
    })
      .then((res) => {
        if (!alive) return;
        if (!res.available) {
          setSt({ s: "unavailable" });
          return;
        }
        cache.current.set(key, res.reading);
        setSt({ s: "ready", r: res.reading });
      })
      .catch(() => {
        if (alive) setSt({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [tier, body, locale, session, profileName]);

  const shown: BodyReading | null =
    st.s === "ready" ? st.r : st.s === "base" || st.s === "unavailable" ? base : null;

  return (
    <View>
      <Text style={styles.place}>
        {L.bodies[body.body] ?? body.body} · {L.signs[body.sign] ?? body.sign} · {body.house}
        {body.dignity ? ` · ${L.dignities[body.dignity]}` : ""}
      </Text>

      {/* selector de profundidad */}
      <View style={styles.tiers}>
        {TIERS.map((id) => {
          const on = tier === id;
          const label =
            id === "esencia" ? t("carta.readingEssence") : id === "profunda" ? t("carta.readingDeep") : t("carta.readingComplete");
          return (
            <Pressable key={id} style={[styles.tier, on && styles.tierOn]} onPress={() => setTier(id)}>
              <Text style={[styles.tierText, on && styles.tierTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {st.s === "loading" && (
        <View style={styles.loading}>
          <ActivityIndicator color={tk.acc} />
          <Text style={styles.note}>{t("carta.readingWeaving")}</Text>
        </View>
      )}
      {st.s === "error" && <Text style={styles.note}>{t("carta.readingError")}</Text>}
      {st.s === "unavailable" && <Text style={styles.note}>{t("carta.readingGated")}</Text>}

      {shown && (
        <View style={styles.blocks}>
          <Text style={styles.essence}>{shown.essence}</Text>
          <Text style={styles.blockH}>{t("carta.readingFlowH")}</Text>
          <Text style={styles.blockText}>{shown.flow}</Text>
          <Text style={styles.blockH}>{t("carta.readingShadowH")}</Text>
          <Text style={styles.blockText}>{shown.shadow}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    place: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, marginBottom: space.md },
    tiers: {
      flexDirection: "row", backgroundColor: t.panel, borderRadius: radius.pill, padding: 4,
      borderWidth: 1, borderColor: t.accHair, marginBottom: space.lg,
    },
    tier: { flex: 1, paddingVertical: space.sm + 2, alignItems: "center", borderRadius: radius.pill },
    tierOn: { backgroundColor: t.accFaint },
    tierText: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans },
    tierTextOn: { color: t.acc, fontWeight: "600" },
    loading: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.md },
    note: { color: t.textDim, fontSize: 13, fontFamily: fonts.serif, fontStyle: "italic", marginBottom: space.md, lineHeight: 19 },
    blocks: { gap: space.sm },
    essence: { color: t.text, fontSize: 15, lineHeight: 23, fontFamily: fonts.serif },
    blockH: { color: t.acc, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sans, marginTop: space.md },
    blockText: { color: t.textDim, fontSize: 14, lineHeight: 21, fontFamily: fonts.sans },
  });
}
```

- [ ] **Step 3: Gates + commit**

Run: `cd apps/mobile && npx tsc --noEmit && npx vitest run` → verde.

```bash
git add apps/mobile/components/BodyReading.tsx apps/mobile/lib/strings.ts
git commit -m "feat(mobile): hoja de lectura interpretativa (esencia + tiers IA dormidos)"
```

---

### Task 6: Móvil — integración en Carta (rueda + selectores + hoja)

**Files:**
- Modify: `apps/mobile/app/(tabs)/carta.tsx`
- Modify: `apps/mobile/content/astrology.ts` (labels de sistemas de casas)
- Modify: `apps/mobile/lib/strings.ts` (claves `carta.houses`, `carta.zodiacT`, `carta.zodiacS` ES/EN)

**Interfaces:**
- Consumes: `ChartWheel` (Task 3), `BodyReadingReader` (Task 5), `BottomSheet` existente, `fetchChart` existente (ya acepta `houseSystem`/`zodiac`), tipos `HouseSystem`/`Zodiac` de `@aluna/core`.
- Produces: pantalla Carta con rueda arriba, selectores y hoja funcionando.

- [ ] **Step 1: Labels de casas en `content/astrology.ts`**

Añadir a `AstroLabelMaps` el campo `houses: Record<string, string>` y a ES/EN:

```ts
  houses: {
    placidus: "Placidus", koch: "Koch", equal: "Iguales", whole: "Signo entero",
    regiomontanus: "Regiomontano", porphyry: "Porfirio",
  },
```

(EN: `equal: "Equal", whole: "Whole sign"`, resto igual.) Y en strings.ts, namespace `carta`: ES `houses: "Casas"`, `zodiacT: "Tropical"`, `zodiacS: "Sideral"`; EN `houses: "Houses"`, `zodiacT: "Tropical"`, `zodiacS: "Sidereal"`.

- [ ] **Step 2: Integrar en `carta.tsx`**

1. Imports nuevos: `ChartWheel`, `BodyReadingReader`, `BottomSheet` (de `../../components/...`), `type HouseSystem, type Zodiac` en el import de `@aluna/core`.
2. Estados nuevos junto a `kind`: `const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");`, `const [zodiac, setZodiac] = useState<Zodiac>("tropical");`, `const [sheet, setSheet] = useState<BodyPosition | null>(null);`.
3. Clave de caché y fetch: `const cacheKey = `${kind}:${houseSystem}:${zodiac}`;` — el `useEffect` usa `cache.current.get(cacheKey)` / `.set(cacheKey, res)` y llama `fetchChart({ accessToken, profileId, kind, houseSystem, zodiac })`; deps del efecto: `[profileId, accessToken, kind, houseSystem, zodiac]`.
4. Selectores: bajo la fila `kindRow` existente, dos filas más con el MISMO patrón de chips (`kindChip`/`kindChipOn`): una mapea los 6 sistemas (`(["placidus","koch","equal","whole","regiomontanus","porphyry"] as HouseSystem[])`, label `L.houses[h]`) y otra los 2 zodiacos (labels `t("carta.zodiacT")`/`t("carta.zodiacS")`).
5. Rueda: dentro del bloque `ready`, ANTES de las tarjetas núcleo:

```tsx
<ChartWheel chart={ready.chart} solar={ready.solar} onSelect={setSheet} />
<Text style={styles.kindHint}>{t("carta.tapHint")}</Text>
```

(la clave `carta.tapHint` ya existe en strings.ts).
6. Hoja al final del componente (fuera del ScrollView):

```tsx
<BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet ? (astroLabels(locale).bodies[sheet.body] ?? sheet.body) : ""}>
  {sheet && <BodyReadingReader body={sheet} profileName={profile.name} />}
</BottomSheet>
```

(revisar la firma real de `components/BottomSheet.tsx` — `open`/`onClose`/`title`/`children` — y ajustar si difiere).

- [ ] **Step 3: Gates completos + commit**

Run: `cd apps/mobile && npx tsc --noEmit && npx vitest run && npx expo export --platform ios && rm -rf dist`
Expected: todo verde.

```bash
git add "apps/mobile/app/(tabs)/carta.tsx" apps/mobile/content/astrology.ts apps/mobile/lib/strings.ts
git commit -m "feat(mobile): Carta con rueda interactiva, selectores de casas/zodiaco y hoja de lectura"
```

---

### Task 7: Verificación integral (la hace el controller)

- [ ] **Step 1:** `npx pnpm -w exec turbo run typecheck test` → 12/12 verdes; `cd apps/web && rm -rf .next && npx next build` → verde.
- [ ] **Step 2:** Verificación visual WEB: dev server + usuario de prueba + captura de `/carta` — la rueda debe verse IDÉNTICA a antes del refactor (comparar contra una captura de main previa o verificar elementos clave: AC a la izquierda, sectores tintados, aspectos, glifos con grados).
- [ ] **Step 3:** Prueba en vivo del endpoint `/api/chart-reading` con Bearer (sin llave → `{available:false}`).
- [ ] **Step 4:** Limpieza de datos de prueba; merge a main + push; actualizar memoria. Visual móvil = Gio en Expo Go.

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec:** §3.1→T1, §3.2→T3, §3.3→T6, §3.4→T4+T5, §3.5→T6, §5→T1 (tests geometría) + T7 (visual web + gates). Refactor web (§2 tabla "Fuente de geometría")→T2.
- **Placeholders:** el espejo del corpus (T4 Step 1) referencia archivos fuente exactos con instrucción verbatim — completo. La nota de T6 sobre verificar la firma del BottomSheet es una instrucción de verificación, no un hueco (la firma esperada está escrita).
- **Type consistency:** `spreadBodies` (T1) usada en T2 y T3; `BodyReading`/`composeBodyReading` (T4) usadas en T5; `fetchChartReading` (T4) usada en T5; `BodyReadingReader` (T5) usada en T6; `houseSystem`/`zodiac` de T6 coinciden con los opcionales ya existentes de `fetchChart`.
