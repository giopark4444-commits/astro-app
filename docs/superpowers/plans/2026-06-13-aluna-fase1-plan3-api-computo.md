# Aluna · Fase 1 · Plan 3 (cierre) — API de cómputo de carta + SDK Supabase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el Plan 3 construyendo el **puente** que falta entre el motor (`@aluna/ephemeris`) y la base (`charts`): un **SDK tipado de Supabase** (`@aluna/supabase`) y un **servicio de cómputo con caché** (`@aluna/compute`) que, dada una entrada de nacimiento, devuelve la carta —cacheada de forma determinista en la tabla `charts`— lista para que el cliente web/móvil la lea y la pinte.

**Architecture:** Dos paquetes nuevos que siguen el patrón ya establecido (TS crudo, `type: module`, `main: ./src/index.ts`, sin paso de build). (1) **`@aluna/supabase`** — fábricas de cliente tipadas con `Database`: una pública/anon **RN-safe** (web + móvil, respeta RLS) y una **service-role solo-servidor** (omite RLS para el cómputo). Es también el hogar de los tipos generados. (2) **`@aluna/compute`** (solo-servidor) — `cacheKey()` determinista + un **puerto `ChartStore`** (patrón hexagonal: el orquestador depende de una interfaz, no del cliente Supabase → testeable sin red) + su adaptador real + `getOrComputeChart()` que lee-o-calcula-y-cachea. El cómputo usa `computeChart` (que ya inicializa el motor nativo de forma transitiva).

**Decisión de alcance (cerrada aquí):** la **numerología NO entra en este servicio**. Es cálculo puro e isomórfico (`computeNumerology` en `@aluna/core`, RN-safe) → corre en el cliente sin backend. La API de cómputo cubre solo lo que **exige el servidor**: la carta astral (addon nativo `sweph`). Esto honra la regla "core isomórfico se importa tal cual en el móvil" y evita cachear datos que dependen de "hoy" (los ciclos personales numerológicos cambian a diario). Si más adelante se quiere un endpoint unificado "carta + numerología", la ruta API del Plan 4 llama a ambos.

**Tech Stack:** TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Vitest, `@supabase/supabase-js` v2, `node:crypto` (sha256). Reusa `@aluna/ephemeris` (`computeChart`) y `@aluna/core` (tipos `ChartInput`/`ChartResult`).

---

## Contexto del estado actual (lo ya construido)

- `@aluna/core` — numerología + dominio puro de carta (isomórfico, RN-safe). Exporta `computeChart` **no**, pero sí los tipos `ChartInput`, `ChartResult`, etc.
- `@aluna/ephemeris` — `computeChart(input: ChartInput): ChartResult` (solo-servidor; `computeChart` llama a `computeBodies`/`computeHouses`, que invocan `initEphemeris()` internamente con guard idempotente → **no hay que inicializar nada aparte**).
- Supabase proyecto `aluna` (ref `xcilrdpcanielalpfvld`): tabla `charts` con
  `unique (birth_profile_id, cache_key)`, columnas `user_id, kind('natal' default), house_system, zodiac, result jsonb, computed_at`. RLS verificada en vivo.
- Tipos generados en `supabase/database.types.ts` (se **moverán** al nuevo paquete `@aluna/supabase`, su hogar correcto).

Firmas de referencia (no cambian en este plan):

```ts
// @aluna/core
interface ChartInput {
  year: number; month: number; day: number; hour: number; minute: number;
  timeZone: string; latitude: number; longitude: number;
  houseSystem?: "placidus"|"koch"|"equal"|"whole"|"regiomontanus"|"porphyry"; // def placidus
  zodiac?: "tropical"|"sidereal";  // def tropical
  ayanamsha?: string;              // si sidereal; def "lahiri"
  nodeType?: "true"|"mean";        // def true
  lilithType?: "mean"|"oscu";      // def mean
}
interface ChartResult { bodies; houses; aspects; distribution; patterns; meta; }

// @aluna/ephemeris
function computeChart(input: ChartInput): ChartResult;
```

---

## Estructura de archivos (se crea en este plan)

```
packages/supabase/                            # @aluna/supabase (SDK + tipos)
├── package.json          # name @aluna/supabase, exports "." y "./server", dep @supabase/supabase-js
├── tsconfig.json
└── src/
    ├── database.types.ts # MOVIDO desde supabase/database.types.ts (hogar correcto)
    ├── client.ts         # createBrowserSupabaseClient(url, anonKey)  [RN-safe, respeta RLS]
    ├── server.ts         # createServiceSupabaseClient(url, key)      [solo-servidor, omite RLS]
    ├── index.ts          # re-exporta tipos + cliente público + tipo AlunaSupabaseClient
    └── __tests__/clients.test.ts

packages/compute/                             # @aluna/compute (servicio de cómputo, solo-servidor)
├── package.json          # deps: @aluna/core, @aluna/ephemeris, @aluna/supabase
├── tsconfig.json
└── src/
    ├── cache-key.ts      # cacheKey(input, kind?) -> sha256 determinista
    ├── chart-store.ts    # interfaz ChartStore (puerto) + supabaseChartStore(db) (adaptador)
    ├── get-or-compute.ts # getOrComputeChart(): lee-o-calcula-y-cachea
    ├── index.ts          # re-exports públicos del paquete
    └── __tests__/
        ├── cache-key.test.ts
        ├── chart-store.test.ts
        ├── get-or-compute.test.ts
        └── live-smoke.test.ts   # gated (skipped sin credenciales en env)
```

**Disciplina de importación (App Store / RN-safe):** `@aluna/supabase` exporta el cliente público desde `.` (RN-safe) y la fábrica service-role **solo** desde `./server` (para que nunca entre por accidente en el bundle de cliente). `@aluna/compute` es **solo-servidor** (importa `@aluna/ephemeris`, nativo) — el móvil **no** lo empaqueta: lee la carta ya cacheada de `charts` con el cliente público.

---

## Task 1: Paquete `@aluna/supabase` (SDK tipado + hogar de los tipos)

**Files:**
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/tsconfig.json`
- Move:   `supabase/database.types.ts` → `packages/supabase/src/database.types.ts`
- Create: `packages/supabase/src/client.ts`
- Create: `packages/supabase/src/server.ts`
- Create: `packages/supabase/src/index.ts`
- Test:   `packages/supabase/src/__tests__/clients.test.ts`

- [ ] **Step 1: Verificar que nadie importa aún `database.types.ts` (seguro moverlo)**

Run: `cd ~/astro-app && grep -rn "database.types" --include=*.ts . | grep -v node_modules`
Expected: solo aparece la cabecera del propio archivo `supabase/database.types.ts` (ningún `import ... from`). Si hubiera un importador, anotarlo para actualizar su ruta en este task.

- [ ] **Step 2: Crear `packages/supabase/package.json`**

```json
{
  "name": "@aluna/supabase",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Crear `packages/supabase/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "types": []
  },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**"]
}
```

(`DOM` en `lib` cubre `fetch`/`Headers` que `@supabase/supabase-js` referencia; `types: []` porque el código del paquete no usa globales de Node.)

- [ ] **Step 4: Mover el archivo de tipos generado a su hogar correcto**

Run:
```bash
cd ~/astro-app && mkdir -p packages/supabase/src && git mv supabase/database.types.ts packages/supabase/src/database.types.ts
```
Expected: el archivo queda en `packages/supabase/src/database.types.ts` (git lo registra como rename).

- [ ] **Step 5: Actualizar la cabecera del archivo movido (ruta de regeneración)**

En `packages/supabase/src/database.types.ts`, reemplazar el comentario de cabecera (líneas 1-4) por:

```ts
// Aluna · tipos del esquema Supabase (GENERADO — no editar a mano).
// Hogar: packages/supabase/src/database.types.ts (consumido por @aluna/supabase).
// Regenerar tras cambios de esquema:
//   supabase gen types typescript --project-id xcilrdpcanielalpfvld > packages/supabase/src/database.types.ts
// Es solo-tipos (sin runtime) → seguro de importar en cualquier lado.
```

- [ ] **Step 6: Crear `packages/supabase/src/client.ts` (cliente público RN-safe)**

```ts
// packages/supabase/src/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente público/anon. RN-safe (web y móvil). Respeta RLS: solo ve las filas
 * del usuario autenticado. La URL y la llave anon/publishable son públicas.
 */
export function createBrowserSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey);
}
```

- [ ] **Step 7: Crear `packages/supabase/src/server.ts` (cliente service-role solo-servidor)**

```ts
// packages/supabase/src/server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente service-role. SECRETO, SOLO SERVIDOR: omite RLS (lo usa el servicio de
 * cómputo para escribir en `charts`). Nunca debe entrar en un bundle de cliente
 * — por eso se exporta únicamente desde "@aluna/supabase/server", no desde el index.
 * Sin sesión persistente: es una conexión de backend sin usuario.
 */
export function createServiceSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 8: Crear `packages/supabase/src/index.ts`**

```ts
// packages/supabase/src/index.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";

/** Cliente Supabase tipado con el esquema de Aluna (alias reusable). */
export type AlunaSupabaseClient = SupabaseClient<Database>;

export { createBrowserSupabaseClient } from "./client";
// Nota: createServiceSupabaseClient se importa desde "@aluna/supabase/server" (solo-servidor).
```

- [ ] **Step 9: Escribir el test de humo de las fábricas (sin red)**

```ts
// packages/supabase/src/__tests__/clients.test.ts
import { describe, it, expect } from "vitest";
import { createBrowserSupabaseClient } from "../client";
import { createServiceSupabaseClient } from "../server";

describe("fábricas de cliente Supabase", () => {
  it("el cliente público expone .from() sin tocar la red", () => {
    const db = createBrowserSupabaseClient("https://x.supabase.co", "anon-key");
    expect(typeof db.from).toBe("function");
  });

  it("el cliente service-role expone .from() sin tocar la red", () => {
    const db = createServiceSupabaseClient("https://x.supabase.co", "service-key");
    expect(typeof db.from).toBe("function");
  });
});
```

(`createClient` no hace peticiones de red al construirse → el test es offline y determinista.)

- [ ] **Step 10: Instalar dependencias del workspace (linkea el paquete nuevo + baja supabase-js)**

Run: `cd ~/astro-app && pnpm install`
Expected: instala `@supabase/supabase-js`, registra `@aluna/supabase` en el workspace, sin errores.

- [ ] **Step 11: Correr el test del paquete y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/supabase test`
Expected: PASS (2 tests).

- [ ] **Step 12: Typecheck del paquete**

Run: `cd ~/astro-app && pnpm --filter @aluna/supabase typecheck`
Expected: sin errores.

- [ ] **Step 13: Commit**

```bash
cd ~/astro-app && git add packages/supabase pnpm-lock.yaml package.json && git rm --cached supabase/database.types.ts 2>/dev/null; git add -A
git commit -m "feat(supabase): @aluna/supabase — SDK tipado (cliente público RN-safe + service-role) y hogar de los tipos"
```

---

## Task 2: `@aluna/compute` — scaffold + `cacheKey` determinista (TDD)

**Files:**
- Create: `packages/compute/package.json`
- Create: `packages/compute/tsconfig.json`
- Create: `packages/compute/src/cache-key.ts`
- Test:   `packages/compute/src/__tests__/cache-key.test.ts`

- [ ] **Step 1: Crear `packages/compute/package.json`**

```json
{
  "name": "@aluna/compute",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@aluna/core": "workspace:*",
    "@aluna/ephemeris": "workspace:*",
    "@aluna/supabase": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^25.9.3",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Crear `packages/compute/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**"]
}
```

- [ ] **Step 3: `pnpm install` para linkear el paquete nuevo**

Run: `cd ~/astro-app && pnpm install`
Expected: registra `@aluna/compute` y enlaza los `workspace:*` sin errores.

- [ ] **Step 4: Escribir el test de `cacheKey` (falla primero)**

```ts
// packages/compute/src/__tests__/cache-key.test.ts
import { describe, it, expect } from "vitest";
import { cacheKey } from "../cache-key";
import type { ChartInput } from "@aluna/core";

const BASE: ChartInput = {
  year: 1984, month: 2, day: 5, hour: 9, minute: 0,
  timeZone: "America/Guayaquil", latitude: -0.2167, longitude: -78.5,
};

describe("cacheKey", () => {
  it("es determinista: misma entrada -> misma clave", () => {
    expect(cacheKey(BASE)).toBe(cacheKey(BASE));
  });

  it("rellena defaults: sin opciones == con los defaults explícitos", () => {
    const explicit: ChartInput = {
      ...BASE, houseSystem: "placidus", zodiac: "tropical", nodeType: "true", lilithType: "mean",
    };
    expect(cacheKey(explicit)).toBe(cacheKey(BASE));
  });

  it("cambia con el sistema de casas", () => {
    expect(cacheKey({ ...BASE, houseSystem: "koch" })).not.toBe(cacheKey(BASE));
  });

  it("cambia con un dato de nacimiento (minuto)", () => {
    expect(cacheKey({ ...BASE, minute: 1 })).not.toBe(cacheKey(BASE));
  });

  it("en tropical, la ayanamsha NO afecta la clave", () => {
    expect(cacheKey({ ...BASE, ayanamsha: "fagan_bradley" })).toBe(cacheKey(BASE));
  });

  it("en sidereal, la ayanamsha SÍ afecta la clave", () => {
    const lahiri: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "lahiri" };
    const fagan: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "fagan_bradley" };
    expect(cacheKey(lahiri)).not.toBe(cacheKey(fagan));
  });

  it("sidereal por defecto usa lahiri (clave estable)", () => {
    const implicit: ChartInput = { ...BASE, zodiac: "sidereal" };
    const explicit: ChartInput = { ...BASE, zodiac: "sidereal", ayanamsha: "lahiri" };
    expect(cacheKey(implicit)).toBe(cacheKey(explicit));
  });

  it("el kind cambia la clave (natal vs solar_return)", () => {
    expect(cacheKey(BASE, "solar_return")).not.toBe(cacheKey(BASE, "natal"));
  });
});
```

- [ ] **Step 5: Correr el test y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/cache-key.test.ts`
Expected: FAIL — `Failed to resolve import "../cache-key"` (el módulo aún no existe).

- [ ] **Step 6: Implementar `packages/compute/src/cache-key.ts`**

```ts
// packages/compute/src/cache-key.ts
import { createHash } from "node:crypto";
import type { ChartInput } from "@aluna/core";

/** Redondea a 6 decimales (~0.1 m) para evitar ruido de coma flotante en la clave. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Clave de caché determinista para una carta. Codifica los datos de nacimiento +
 * todas las opciones que afectan el resultado, de forma que:
 *  - misma entrada -> misma clave (idempotente),
 *  - cualquier cambio (incluido editar el perfil en sitio) -> clave distinta
 *    (provoca cache-miss y recálculo, nunca sirve una carta obsoleta).
 * En tropical la ayanamsha se ignora (no fragmenta la clave); en sidereal usa
 * "lahiri" por defecto. El orden de los campos es fijo (no depende del orden de
 * claves de un objeto).
 */
export function cacheKey(input: ChartInput, kind = "natal"): string {
  const zodiac = input.zodiac ?? "tropical";
  const canonical: Array<[string, string | number]> = [
    ["kind", kind],
    ["year", input.year],
    ["month", input.month],
    ["day", input.day],
    ["hour", input.hour],
    ["minute", input.minute],
    ["tz", input.timeZone],
    ["lat", round6(input.latitude)],
    ["lon", round6(input.longitude)],
    ["house", input.houseSystem ?? "placidus"],
    ["zodiac", zodiac],
    ["ayanamsha", zodiac === "sidereal" ? (input.ayanamsha ?? "lahiri") : ""],
    ["node", input.nodeType ?? "true"],
    ["lilith", input.lilithType ?? "mean"],
  ];
  const payload = canonical.map(([k, v]) => `${k}=${v}`).join("|");
  return createHash("sha256").update(payload).digest("hex");
}
```

- [ ] **Step 7: Correr el test y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/cache-key.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: Commit**

```bash
cd ~/astro-app && git add packages/compute pnpm-lock.yaml
git commit -m "feat(compute): @aluna/compute scaffold + cacheKey determinista (TDD, 8 casos)"
```

---

## Task 3: Puerto `ChartStore` + adaptador `supabaseChartStore`

**Files:**
- Create: `packages/compute/src/chart-store.ts`
- Test:   `packages/compute/src/__tests__/chart-store.test.ts`

- [ ] **Step 1: Escribir el test del adaptador (falla primero)**

```ts
// packages/compute/src/__tests__/chart-store.test.ts
import { describe, it, expect } from "vitest";
import { supabaseChartStore } from "../chart-store";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

describe("supabaseChartStore (adaptador)", () => {
  it("expone findByKey y save sobre un cliente dado (sin red)", () => {
    const db = createServiceSupabaseClient("https://x.supabase.co", "service-key");
    const store = supabaseChartStore(db);
    expect(typeof store.findByKey).toBe("function");
    expect(typeof store.save).toBe("function");
  });
});
```

(Valida también que el subpath `@aluna/supabase/server` resuelve. No llama a `findByKey`/`save`, así que no toca la red.)

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/chart-store.test.ts`
Expected: FAIL — `Failed to resolve import "../chart-store"`.

- [ ] **Step 3: Implementar `packages/compute/src/chart-store.ts`**

```ts
// packages/compute/src/chart-store.ts
import type { ChartResult } from "@aluna/core";
import type { AlunaSupabaseClient } from "@aluna/supabase";

/** Fila de carta a persistir (forma de dominio; el adaptador la mapea a la tabla). */
export interface StoredChartRow {
  birthProfileId: string;
  userId: string;
  cacheKey: string;
  kind: string;
  houseSystem: string;
  zodiac: string;
  result: ChartResult;
}

/**
 * Puerto de persistencia de cartas. El orquestador depende de esta interfaz
 * (no del cliente Supabase) → se testea con una implementación en memoria, sin red.
 */
export interface ChartStore {
  /** Devuelve la carta cacheada para (perfil, clave) o null si no existe. */
  findByKey(birthProfileId: string, cacheKey: string): Promise<ChartResult | null>;
  /** Guarda una carta calculada (idempotente sobre el índice único). */
  save(row: StoredChartRow): Promise<void>;
}

/** Adaptador real contra la tabla `public.charts` usando un cliente service-role. */
export function supabaseChartStore(db: AlunaSupabaseClient): ChartStore {
  return {
    async findByKey(birthProfileId, cacheKey) {
      const { data, error } = await db
        .from("charts")
        .select("result")
        .eq("birth_profile_id", birthProfileId)
        .eq("cache_key", cacheKey)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.result as unknown as ChartResult) : null;
    },

    async save(row) {
      const { error } = await db.from("charts").upsert(
        {
          birth_profile_id: row.birthProfileId,
          user_id: row.userId,
          cache_key: row.cacheKey,
          kind: row.kind,
          house_system: row.houseSystem,
          zodiac: row.zodiac,
          result: row.result as unknown as Record<string, unknown>,
        },
        { onConflict: "birth_profile_id,cache_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
  };
}
```

(El `upsert` con `ignoreDuplicates` es a prueba de carreras: si dos peticiones calculan a la vez, la segunda no rompe por el índice único `(birth_profile_id, cache_key)`. Los errores reales **se lanzan** —no se tragan— acorde a "no mostrar carta a medias".)

- [ ] **Step 4: Correr el test y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/chart-store.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd ~/astro-app && git add packages/compute/src/chart-store.ts packages/compute/src/__tests__/chart-store.test.ts
git commit -m "feat(compute): puerto ChartStore + adaptador supabaseChartStore (upsert idempotente)"
```

---

## Task 4: `getOrComputeChart` — orquestador lee-o-calcula-y-cachea (TDD)

**Files:**
- Create: `packages/compute/src/get-or-compute.ts`
- Test:   `packages/compute/src/__tests__/get-or-compute.test.ts`

- [ ] **Step 1: Escribir el test con un `ChartStore` en memoria (falla primero)**

```ts
// packages/compute/src/__tests__/get-or-compute.test.ts
import { describe, it, expect } from "vitest";
import { getOrComputeChart } from "../get-or-compute";
import type { ChartStore, StoredChartRow } from "../chart-store";
import type { ChartInput } from "@aluna/core";

// Carta real de Gio (referencia Astrodienst) → ejercita el motor nativo offline.
const GIO: ChartInput = {
  year: 1984, month: 2, day: 5, hour: 9, minute: 0,
  timeZone: "America/Guayaquil", latitude: -0.2167, longitude: -78.5,
};

function makeFakeStore() {
  const saved: StoredChartRow[] = [];
  const store: ChartStore = {
    async findByKey(birthProfileId, cacheKey) {
      const row = saved.find(
        (r) => r.birthProfileId === birthProfileId && r.cacheKey === cacheKey,
      );
      return row ? row.result : null;
    },
    async save(row) {
      saved.push(row);
    },
  };
  return { store, saved };
}

describe("getOrComputeChart", () => {
  it("primera vez: calcula, guarda y marca cached=false", async () => {
    const { store, saved } = makeFakeStore();
    const res = await getOrComputeChart({
      store, userId: "u1", birthProfileId: "p1", input: GIO,
    });
    expect(res.cached).toBe(false);
    expect(res.chart.bodies.find((b) => b.body === "sun")!.sign).toBe("aquarius");
    expect(saved).toHaveLength(1);
    expect(saved[0]!.cacheKey).toBe(res.cacheKey);
    expect(saved[0]!.userId).toBe("u1");
    expect(saved[0]!.houseSystem).toBe("placidus");
    expect(saved[0]!.zodiac).toBe("tropical");
  });

  it("segunda vez con misma entrada: lee de caché (cached=true) sin re-guardar", async () => {
    const { store, saved } = makeFakeStore();
    const first = await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    const second = await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    expect(second.cached).toBe(true);
    expect(saved).toHaveLength(1); // no se guardó de nuevo
    expect(second.chart).toEqual(first.chart);
  });

  it("cambiar el sistema de casas produce otra clave y recalcula", async () => {
    const { store, saved } = makeFakeStore();
    await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    const koch = await getOrComputeChart({
      store, userId: "u1", birthProfileId: "p1", input: { ...GIO, houseSystem: "koch" },
    });
    expect(koch.cached).toBe(false);
    expect(saved).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/get-or-compute.test.ts`
Expected: FAIL — `Failed to resolve import "../get-or-compute"`.

- [ ] **Step 3: Implementar `packages/compute/src/get-or-compute.ts`**

```ts
// packages/compute/src/get-or-compute.ts
import { computeChart } from "@aluna/ephemeris";
import type { ChartInput, ChartResult } from "@aluna/core";
import { cacheKey } from "./cache-key";
import type { ChartStore } from "./chart-store";

export interface GetOrComputeArgs {
  store: ChartStore;
  userId: string;
  birthProfileId: string;
  input: ChartInput;
  /** tipo de carta; por defecto "natal" (Fase 1). */
  kind?: string;
}

export interface GetOrComputeResult {
  chart: ChartResult;
  cacheKey: string;
  /** true si vino de caché; false si se calculó ahora. */
  cached: boolean;
}

/**
 * Devuelve la carta de un perfil. Si está cacheada (mismo cache_key) la lee de
 * `charts`; si no, la calcula con Swiss Ephemeris, la guarda y la devuelve.
 * `computeChart` inicializa el motor nativo de forma transitiva (no hay setup aparte).
 */
export async function getOrComputeChart(args: GetOrComputeArgs): Promise<GetOrComputeResult> {
  const { store, userId, birthProfileId, input } = args;
  const kind = args.kind ?? "natal";
  const key = cacheKey(input, kind);

  const hit = await store.findByKey(birthProfileId, key);
  if (hit) return { chart: hit, cacheKey: key, cached: true };

  const chart = computeChart(input);
  await store.save({
    birthProfileId,
    userId,
    cacheKey: key,
    kind,
    houseSystem: input.houseSystem ?? "placidus",
    zodiac: input.zodiac ?? "tropical",
    result: chart,
  });
  return { chart, cacheKey: key, cached: false };
}
```

- [ ] **Step 4: Correr el test y verificar verde**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/get-or-compute.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd ~/astro-app && git add packages/compute/src/get-or-compute.ts packages/compute/src/__tests__/get-or-compute.test.ts
git commit -m "feat(compute): getOrComputeChart — orquestador lee-o-calcula-y-cachea (TDD, store en memoria)"
```

---

## Task 5: Index público de `@aluna/compute` + verificación completa

**Files:**
- Create: `packages/compute/src/index.ts`

- [ ] **Step 1: Crear `packages/compute/src/index.ts`**

```ts
// packages/compute/src/index.ts
export { cacheKey } from "./cache-key";
export { supabaseChartStore } from "./chart-store";
export type { ChartStore, StoredChartRow } from "./chart-store";
export { getOrComputeChart } from "./get-or-compute";
export type { GetOrComputeArgs, GetOrComputeResult } from "./get-or-compute";
```

- [ ] **Step 2: Typecheck de ambos paquetes nuevos**

Run: `cd ~/astro-app && pnpm --filter @aluna/supabase typecheck && pnpm --filter @aluna/compute typecheck`
Expected: sin errores en ninguno.

- [ ] **Step 3: Lint de ambos paquetes nuevos**

Run: `cd ~/astro-app && pnpm --filter @aluna/supabase lint && pnpm --filter @aluna/compute lint`
Expected: sin errores. (Si ESLint reporta `node:crypto` u otro, ajustar config como en `@aluna/ephemeris`; no debería hacer falta.)

- [ ] **Step 4: Suite completa del monorepo en verde**

Run: `cd ~/astro-app && pnpm test`
Expected: PASS en los 4 paquetes (`@aluna/core`, `@aluna/ephemeris`, `@aluna/supabase`, `@aluna/compute`). El total sube respecto a los 86 previos (supabase 2 + compute 12 = +14 ≈ 100).

- [ ] **Step 5: Commit**

```bash
cd ~/astro-app && git add packages/compute/src/index.ts
git commit -m "feat(compute): index público del paquete (cacheKey, ChartStore, getOrComputeChart)"
```

---

## Task 6: (Opcional) Smoke de integración en vivo contra Supabase — gated

> Este test **no corre** en `pnpm test` por defecto (se salta sin credenciales en el entorno), así que la suite sigue verde offline. Sirve para confirmar a mano que el SDK + las llaves reales funcionan end-to-end.

**Files:**
- Test: `packages/compute/src/__tests__/live-smoke.test.ts`

- [ ] **Step 1: Escribir el test gated**

```ts
// packages/compute/src/__tests__/live-smoke.test.ts
// Gated: solo corre si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY están en el entorno.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @aluna/compute test
import { describe, it, expect } from "vitest";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!url || !key)("supabase live smoke (gated)", () => {
  it("el cliente service-role puede consultar charts sin error", async () => {
    const db = createServiceSupabaseClient(url!, key!);
    const { error } = await db.from("charts").select("id").limit(1);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que se salta por defecto (sin credenciales)**

Run: `cd ~/astro-app && pnpm --filter @aluna/compute exec vitest run src/__tests__/live-smoke.test.ts`
Expected: el `describe` aparece como **skipped** (0 tests corridos), sin fallo.

- [ ] **Step 3: (Manual, si Gio quiere) correrlo con credenciales reales**

Run (con las llaves de `.env.local`):
```bash
cd ~/astro-app && SUPABASE_URL="https://xcilrdpcanielalpfvld.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-secret>" \
  pnpm --filter @aluna/compute exec vitest run src/__tests__/live-smoke.test.ts
```
Expected: PASS (1 test) — confirma conectividad real.

- [ ] **Step 4: Commit**

```bash
cd ~/astro-app && git add packages/compute/src/__tests__/live-smoke.test.ts
git commit -m "test(compute): smoke de integración Supabase en vivo (gated, skip sin credenciales)"
```

---

## Task 7: Documentación + memoria + verificación final

**Files:**
- Modify: `README.md`
- Modify: `supabase/README.md`
- Modify: memoria del proyecto (`project_astro_app.md`)

- [ ] **Step 1: Actualizar el bloque "Monorepo" y la tabla de estado en `README.md`**

En `README.md`, añadir al bloque de monorepo (tras `packages/ephemeris`):

```
packages/supabase      @aluna/supabase — SDK tipado: cliente público (RN-safe) + service-role
                       (solo-servidor) + tipos del esquema
packages/compute       @aluna/compute — SOLO SERVIDOR — servicio de cómputo: cacheKey + getOrComputeChart
                       (lee-o-calcula la carta y la cachea en `charts`)
```

Y en la tabla "Estado de construcción", cambiar la fila del Plan 3 a:

```
| 3 | Backend **Supabase** (esquema + RLS + auth) + **API de cómputo** | ✅ en `main` |
```

- [ ] **Step 2: Actualizar `supabase/README.md` (tipos movidos + cómputo implementado)**

En la sección **"Tipos"**, reemplazar el contenido por:

```markdown
## Tipos

Los tipos generados viven ahora en **`packages/supabase/src/database.types.ts`** (hogar del
paquete `@aluna/supabase`). Regenerar tras cambios de esquema:

    supabase gen types typescript --project-id xcilrdpcanielalpfvld > packages/supabase/src/database.types.ts
```

En la sección **"Arquitectura de cómputo (decisión)"**, reemplazar la última frase
("Pendiente: servicio de cómputo…") por:

```markdown
**Implementado (Plan 3, cierre):** el SDK tipado vive en `@aluna/supabase`
(`createBrowserSupabaseClient` público/RN-safe y `createServiceSupabaseClient` solo-servidor).
El servicio de cómputo vive en `@aluna/compute`: `cacheKey()` (clave determinista) +
`getOrComputeChart()` (lee de `charts` o calcula con `@aluna/ephemeris` y cachea). La
**numerología no pasa por aquí**: es pura e isomórfica (`computeNumerology` en `@aluna/core`)
y corre en el cliente. Falta solo conectar todo desde la ruta API del cliente web (Plan 4).
```

- [ ] **Step 3: Verificación final de toda la suite + typecheck + lint**

Run: `cd ~/astro-app && pnpm test && pnpm typecheck && pnpm lint`
Expected: todo verde en los 4 paquetes.

- [ ] **Step 4: Commit de documentación**

```bash
cd ~/astro-app && git add README.md supabase/README.md
git commit -m "docs: Plan 3 cerrado — API de cómputo (@aluna/compute) + SDK (@aluna/supabase); tipos reubicados"
```

- [ ] **Step 5: Actualizar la memoria del proyecto**

Editar `/Users/usuario/.claude/projects/-Users-usuario/memory/project_astro_app.md` para reflejar:
Plan 3 **completo** (capa de datos + **API de cómputo**): paquetes `@aluna/supabase` (SDK tipado: público RN-safe + service-role) y `@aluna/compute` (`cacheKey` + `getOrComputeChart`, cachea en `charts`); numerología corre client-side (core isomórfico, no backend). Siguiente: **Plan 4 (cliente web Next.js)**.
Actualizar también la línea correspondiente en `MEMORY.md` si hace falta.

---

## Self-Review (cobertura vs. el corte pendiente)

Verificado contra "servicio de cómputo + cache-key + SDK de cliente Supabase" (corte declarado en `supabase/README.md`):

1. **SDK de cliente Supabase** → Task 1: `@aluna/supabase` con cliente público (RN-safe) + service-role (solo-servidor) + tipos reubicados a su hogar. ✅
2. **cache-key** → Task 2: `cacheKey()` determinista, sensible a cada opción, defaults normalizados, 8 casos TDD. ✅
3. **servicio de cómputo** → Tasks 3-4: puerto `ChartStore` + adaptador Supabase + `getOrComputeChart()` (lee-o-calcula-y-cachea), TDD con store en memoria contra la carta real de Gio. ✅
4. **Regla App Store / RN-safe** → cliente público RN-safe en `.`, service-role aislado en `./server`, `@aluna/compute` solo-servidor; numerología documentada como client-side. ✅
5. **Credibilidad / "no carta a medias"** → errores de Supabase se lanzan (no se tragan); `upsert` idempotente a prueba de carreras. ✅
6. **Docs + memoria** → Task 7. ✅

**Consistencia de tipos/nombres:** `cacheKey(input, kind)`, `ChartStore.findByKey/save`, `StoredChartRow`, `getOrComputeChart({store,userId,birthProfileId,input,kind?}) -> {chart,cacheKey,cached}`, `AlunaSupabaseClient`, `createBrowserSupabaseClient`, `createServiceSupabaseClient` — usados idénticos en todas las tasks. **Sin placeholders.** Numerología fuera de alcance (decisión documentada arriba), no es un hueco.
