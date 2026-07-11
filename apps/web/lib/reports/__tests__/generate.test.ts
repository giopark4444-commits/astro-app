// apps/web/lib/reports/__tests__/generate.test.ts
// Orquestador runReportGeneration: arma prompt según kind, llama la cascada
// (inyectada, sin red), parsea, y escribe la fila final en un Supabase fake.
// Foco de estos tests: NUNCA debe propagar una excepción al caller (corre
// dentro de `after()` en producción, sin conexión que reciba el throw), y el
// filtro por `year` debe usar `.is("year", null)` para el caso natal (year
// NULL) y `.eq("year", N)` para el caso solar (year numérico) — un
// `.eq("year", null)` de Postgrest nunca matchea NULL en SQL.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import type { BodyPosition, ChartResult } from "@aluna/core";
import type { ChatOptions, CompleteOptions, ReadingProvider } from "../../reading/provider";
import { runReportGeneration } from "../generate";

// ---------------------------------------------------------------------------
// Fixtures: misma forma mínima de ChartResult que reports.test.ts (Task 3).
// ---------------------------------------------------------------------------

function body(overrides: Partial<BodyPosition> & { body: string; longitude: number }): BodyPosition {
  return {
    signDegree: 0,
    degree: 0,
    minute: 0,
    second: 0,
    speed: 1,
    retrograde: false,
    house: 1,
    dignity: null,
    sign: "aries",
    ...overrides,
  };
}

function makeChart(overrides: Partial<ChartResult> = {}): ChartResult {
  return {
    bodies: [
      body({ body: "sun", longitude: 125, sign: "leo", house: 5, dignity: "domicile" }),
      body({ body: "moon", longitude: 95, sign: "cancer", house: 4, dignity: "domicile" }),
    ],
    houses: {
      system: "placidus",
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 0,
      midheaven: 270,
    },
    aspects: [],
    distribution: {
      elements: { fire: 3, earth: 1, air: 0, water: 3 },
      modalities: { cardinal: 2, fixed: 3, mutable: 2 },
      polarities: { yang: 4, yin: 3 },
      dominantElement: "fire",
      dominantModality: "fixed",
    },
    patterns: [],
    meta: { julianDayUt: 2451545, julianDayEt: 2451545.0007, utcHour: 12, zodiac: "tropical" },
    ...overrides,
  };
}

const NATAL_CHART = makeChart();
const SOLAR_CHART = makeChart({
  bodies: [body({ body: "sun", longitude: 125, sign: "leo", house: 3 })],
  houses: {
    system: "placidus",
    cusps: [40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340, 10],
    ascendant: 40,
    midheaven: 310,
  },
});

// ---------------------------------------------------------------------------
// Respuestas "bien formadas" del modelo (mismas formas que parse.test cubre).
// ---------------------------------------------------------------------------

const WELL_FORMED_NATAL_JSON = JSON.stringify({
  intro: "Bienvenida a tu mapa.",
  sections: [
    { key: "essence", title: "Quién eres", body: "Cuerpo 1." },
    { key: "emotional", title: "Tu mundo emocional", body: "Cuerpo 2." },
    { key: "path", title: "Tu camino", body: "Cuerpo 3." },
    { key: "challenges", title: "Tus retos", body: "Cuerpo 4." },
  ],
  outro: "Cierre integrador.",
});

const WELL_FORMED_SOLAR_JSON = JSON.stringify({
  essay: "Ensayo del año.",
  themes: Array.from({ length: 10 }, (_, i) => ({
    title: `Tema ${i + 1}`,
    why: `Por qué ${i + 1}`,
    invitation: `Invitación ${i + 1}`,
  })),
  mantra: "Confío en el proceso.",
});

// ---------------------------------------------------------------------------
// Proveedor fake (mismo estilo que lib/reading/__tests__/cascade.test.ts).
// ---------------------------------------------------------------------------

function fakeProvider(name: string, behavior: () => Promise<string>): ReadingProvider {
  return {
    name,
    model: `${name}-model`,
    complete: behavior,
    async *completeStream(_opts: CompleteOptions) {
      yield await behavior();
    },
    async chat(_opts: ChatOptions) {
      return behavior();
    },
    async *chatStream(_opts: ChatOptions) {
      yield await behavior();
    },
  };
}

// ---------------------------------------------------------------------------
// Supabase fake: `.from("user_reports").update(payload).eq(...).eq(...)...`
// encadenable, terminado en `.eq("year", N)` o `.is("year", null)`. Registra
// cada escritura (tabla + payload + filtros acumulados) para que los tests
// la inspeccionen. `then()` la hace awaitable como el builder real de
// postgrest-js (resuelve a {data, error} al ser esperado en cualquier punto
// de la cadena).
// ---------------------------------------------------------------------------

interface RecordedUpdate {
  table: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
}

function makeFakeSupabase(): { supabase: AlunaSupabaseClient; updates: RecordedUpdate[] } {
  const updates: RecordedUpdate[] = [];

  const from = (table: string) => ({
    update(payload: Record<string, unknown>) {
      const filters: Record<string, unknown> = {};
      const builder = {
        eq(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        is(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        then(
          onFulfilled: (value: { data: null; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          updates.push({ table, payload, filters: { ...filters } });
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  });

  return { supabase: { from } as unknown as AlunaSupabaseClient, updates };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Limpiamos las llaves de la cascada real: un test ejercita a propósito el
// camino "sin providers inyectados" (usa resolveReportCascade() de verdad), y
// no debe depender de si el entorno local/CI trae alguna llave real puesta.
const ENV_KEYS = ["NOUS_API_KEY", "DEEPSEEK_API_KEY", "OPENAI_API_KEY"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    originalEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

describe("runReportGeneration", () => {
  it("éxito natal: escribe ready + content + model_used, filtrando year con .is (year null)", async () => {
    const { supabase, updates } = makeFakeSupabase();
    const provider = fakeProvider("hermes", async () => WELL_FORMED_NATAL_JSON);

    await runReportGeneration({
      supabase,
      userId: "user-1",
      kind: "natal",
      year: null,
      locale: "es",
      natalChart: NATAL_CHART,
      providers: [provider],
    });

    expect(updates).toHaveLength(1);
    const [u] = updates;
    expect(u!.table).toBe("user_reports");
    expect(u!.payload.status).toBe("ready");
    expect(u!.payload.model_used).toBe("hermes");
    expect(u!.payload.updated_at).toEqual(expect.any(String));
    expect(u!.payload.content).toMatchObject({
      intro: "Bienvenida a tu mapa.",
      outro: "Cierre integrador.",
    });
    expect((u!.payload.content as { sections: unknown[] }).sections).toHaveLength(4);
    // year null -> .is("year", null), NUNCA .eq("year", null) (que nunca matchea NULL en SQL).
    expect(u!.filters).toEqual({ user_id: "user-1", kind: "natal", locale: "es", year: null });
  });

  it("éxito solar: escribe ready con forma solar, filtrando year con .eq (year numérico)", async () => {
    const { supabase, updates } = makeFakeSupabase();
    const provider = fakeProvider("deepseek", async () => WELL_FORMED_SOLAR_JSON);

    await runReportGeneration({
      supabase,
      userId: "user-2",
      kind: "solar_return",
      year: 2027,
      locale: "en",
      natalChart: NATAL_CHART,
      solarChart: SOLAR_CHART,
      providers: [provider],
    });

    expect(updates).toHaveLength(1);
    const [u] = updates;
    expect(u!.payload.status).toBe("ready");
    expect(u!.payload.model_used).toBe("deepseek");
    expect(u!.payload.content).toMatchObject({
      year: 2027,
      essay: "Ensayo del año.",
      mantra: "Confío en el proceso.",
    });
    expect((u!.payload.content as { themes: unknown[] }).themes).toHaveLength(10);
    expect(u!.filters).toEqual({ user_id: "user-2", kind: "solar_return", locale: "en", year: 2027 });
  });

  it("si todos los proveedores de la cascada fallan, escribe status:'error' y NO relanza", async () => {
    const { supabase, updates } = makeFakeSupabase();
    const failing = fakeProvider("hermes", async () => {
      throw new Error("hermes caído");
    });

    await expect(
      runReportGeneration({
        supabase,
        userId: "user-3",
        kind: "natal",
        year: null,
        locale: "es",
        natalChart: NATAL_CHART,
        providers: [failing],
      }),
    ).resolves.toBeUndefined();

    expect(updates).toHaveLength(1);
    expect(updates[0]!.payload.status).toBe("error");
    expect(updates[0]!.payload.content).toBeUndefined();
    expect(updates[0]!.payload.model_used).toBeUndefined();
  });

  it("si el modelo responde JSON malformado (parse rechaza), escribe status:'error' y NO relanza", async () => {
    const { supabase, updates } = makeFakeSupabase();
    const malformed = fakeProvider("hermes", async () => "esto no es JSON de ninguna forma");

    await expect(
      runReportGeneration({
        supabase,
        userId: "user-4",
        kind: "natal",
        year: null,
        locale: "es",
        natalChart: NATAL_CHART,
        providers: [malformed],
      }),
    ).resolves.toBeUndefined();

    expect(updates).toHaveLength(1);
    expect(updates[0]!.payload.status).toBe("error");
  });

  it("si el propio Supabase revienta al escribir, NUNCA propaga (try/catch total)", async () => {
    const throwingSupabase = {
      from() {
        throw new Error("conexión caída");
      },
    } as unknown as AlunaSupabaseClient;
    const provider = fakeProvider("hermes", async () => WELL_FORMED_NATAL_JSON);

    await expect(
      runReportGeneration({
        supabase: throwingSupabase,
        userId: "user-5",
        kind: "natal",
        year: null,
        locale: "es",
        natalChart: NATAL_CHART,
        providers: [provider],
      }),
    ).resolves.toBeUndefined();
  });

  it("sin `providers` inyectado, usa resolveReportCascade(): sin llaves de entorno la cascada sale vacía y escribe status:'error'", async () => {
    const { supabase, updates } = makeFakeSupabase();

    await runReportGeneration({
      supabase,
      userId: "user-6",
      kind: "natal",
      year: null,
      locale: "es",
      natalChart: NATAL_CHART,
      // providers omitido a propósito.
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]!.payload.status).toBe("error");
  });

  it("kind='solar_return' sin solarChart nunca revienta: cae a status:'error'", async () => {
    const { supabase, updates } = makeFakeSupabase();
    const provider = fakeProvider("hermes", async () => WELL_FORMED_SOLAR_JSON);

    await expect(
      runReportGeneration({
        supabase,
        userId: "user-7",
        kind: "solar_return",
        year: 2027,
        locale: "es",
        natalChart: NATAL_CHART,
        // solarChart omitido a propósito.
        providers: [provider],
      }),
    ).resolves.toBeUndefined();

    expect(updates).toHaveLength(1);
    expect(updates[0]!.payload.status).toBe("error");
  });
});
