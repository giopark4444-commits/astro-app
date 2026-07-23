import { describe, it, expect } from "vitest";
import { computeChart } from "@aluna/ephemeris";
import { computeNumerology } from "@aluna/core";
import { profileToChartInput } from "@/lib/chart";
import { profileToNumerologyInput } from "@/lib/numerology";
import {
  buildFocusedContext,
  focusLine,
  buildTarotBlock,
  resolveLenses,
  parseTarotCard,
  effectiveLenses,
  BASE_LENSES,
  type ChatContextProfile,
  type Lens,
  type TarotCardRef,
} from "@/lib/chat-context";

// Perfil fijo (Ba Zi resuelve con computeBaziNatal → efemérides reales para la
// longitud solar). 1990-02-04 es cerca del Lichun a propósito: ejercita el límite
// del año solar. chart/numerología se computan de verdad (deterministas).
const PROFILE: ChatContextProfile = {
  name: "Gio",
  gender: "masculine",
  birth_date: "1990-02-04",
  birth_time: "10:30",
  time_known: true,
  latitude: 4.61,
  longitude: -74.08,
  time_zone: "America/Bogota",
};

const chart = computeChart(profileToChartInput(PROFILE));
const numerology = computeNumerology(profileToNumerologyInput(PROFILE));

describe("resolveLenses", () => {
  it("Task 3 (pedido de Gio): SIN fallback — vacío, ausente o solo basura resuelve a [] (conversación general)", () => {
    expect(resolveLenses([])).toEqual([]);
    expect(resolveLenses(undefined)).toEqual([]);
    expect(resolveLenses("nope")).toEqual([]);
    expect(resolveLenses(["basura"])).toEqual([]);
  });

  it("filtra valores inválidos y dedup en orden canónico", () => {
    expect(resolveLenses(["tarot", "numeros", "basura", "numeros"])).toEqual(["numeros", "tarot"]);
    expect(resolveLenses(["pilares", "astros"])).toEqual(["astros", "pilares"]);
  });
});

describe("buildFocusedContext — por lente", () => {
  it("['numeros'] → numerología presente, carta AUSENTE", () => {
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: ["numeros"], locale: "es" });
    expect(ctx).toContain("DATOS DE Gio");
    expect(ctx).toContain("Numerología —");
    expect(ctx).not.toContain("Carta natal —");
    expect(ctx).not.toContain("Cuatro Pilares");
    expect(ctx).not.toContain("Tarot —");
  });

  it("['astros','pilares'] → carta + Ba Zi, SIN numerología", () => {
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: ["astros", "pilares"], locale: "es" });
    expect(ctx).toContain("Carta natal — Ascendente");
    expect(ctx).toContain("Cuatro Pilares (Ba Zi) —");
    expect(ctx).toContain("Maestro del Día:");
    expect(ctx).not.toContain("Numerología —");
  });

  it("['tarot'] con carta → bloque tarot con nombre de la carta", () => {
    const ctx = buildFocusedContext({
      profile: PROFILE,
      chart,
      numerology,
      lenses: ["tarot"],
      tarotCard: { id: "fool", reversed: false },
      locale: "es",
    });
    expect(ctx).toContain("Tarot — Carta: El Loco (al derecho)");
    expect(ctx).toContain("Palabras clave:");
    expect(ctx).not.toContain("Carta natal —");
    expect(ctx).not.toContain("Numerología —");
  });

  it("['tarot'] sin carta → Task 3: SIN fallback, contexto sin ningún bloque (solo el header)", () => {
    // El cliente NO debería mandar esto, pero si llega lenses:["tarot"] sin
    // tarotCard, la lista efectiva (tarot filtrado por falta de carta) queda
    // vacía — Task 3 retiró el fallback a BASE_LENSES: ya no se inyectan
    // disciplinas que la persona no pidió, el contexto queda solo con el header.
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: ["tarot"], locale: "es" });
    expect(ctx).toBe("DATOS DE Gio (género: masculine):");
    expect(ctx).not.toContain("Tarot —");
    expect(ctx).not.toContain("Carta natal —");
    expect(ctx).not.toContain("Numerología —");
    expect(ctx).not.toContain("Cuatro Pilares (Ba Zi) —");
  });

  it("default 3 base → carta + numerología + Ba Zi, sin tarot", () => {
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: BASE_LENSES, locale: "es" });
    expect(ctx).toContain("Carta natal —");
    expect(ctx).toContain("Numerología —");
    expect(ctx).toContain("Cuatro Pilares (Ba Zi) —");
    expect(ctx).not.toContain("Tarot —");
  });

  it("byte-equivalente: astros+numeros = header + bloque astros + bloque numeros", () => {
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: ["astros", "numeros"], locale: "es" });
    const lines = ctx.split("\n");
    expect(lines[0]).toBe("DATOS DE Gio (género: masculine):");
    expect(lines[1]!.startsWith("Carta natal — Ascendente ")).toBe(true);
    expect(lines[2]!.startsWith("Numerología — Camino de Vida ")).toBe(true);
    expect(lines).toHaveLength(3);
  });
});

describe("buildTarotBlock", () => {
  it("invertida usa el significado reversed", () => {
    const up = buildTarotBlock({ id: "fool", reversed: false }, "es");
    const rev = buildTarotBlock({ id: "fool", reversed: true }, "es");
    expect(up).toContain("(al derecho)");
    expect(rev).toContain("(invertida)");
    expect(up).not.toEqual(rev);
  });

  it("EN usa nombre y orientación en inglés", () => {
    const en = buildTarotBlock({ id: "fool", reversed: true }, "en");
    expect(en).toContain("Tarot — Card: The Fool (reversed)");
    expect(en).toContain("Keywords:");
  });

  it("id sin contenido → cadena vacía", () => {
    expect(buildTarotBlock({ id: "no-such-card", reversed: false }, "es")).toBe("");
  });
});

describe("parseTarotCard", () => {
  it("valida id contra el mazo", () => {
    expect(parseTarotCard({ id: "fool", reversed: true })).toEqual({ id: "fool", reversed: true });
    expect(parseTarotCard({ id: "fool" })).toEqual({ id: "fool", reversed: false });
  });

  it("rechaza id inexistente o body inválido", () => {
    expect(parseTarotCard({ id: "nope" })).toBeUndefined();
    expect(parseTarotCard(null)).toBeUndefined();
    expect(parseTarotCard("fool")).toBeUndefined();
  });
});

describe("focusLine", () => {
  it("['numeros'] menciona solo Numerología", () => {
    const line = focusLine(["numeros"], undefined, "es");
    expect(line).toBe("Aconseja apoyándote ÚNICAMENTE en: Numerología. No introduzcas las demás.");
  });

  it("lista en orden canónico con 'y' antes del último", () => {
    const line = focusLine(["astros", "numeros", "pilares"], undefined, "es");
    expect(line).toContain("Astrología, Numerología y Cuatro Pilares (Ba Zi)");
  });

  it("tarot entra en la lista solo si hay carta", () => {
    expect(focusLine(["tarot"], { id: "fool", reversed: false }, "es")).toContain("Tarot");
  });

  it("['tarot'] sin carta → Task 3: sin fallback, focusLine devuelve '' (nada que restringir)", () => {
    const line = focusLine(["tarot"], undefined, "es");
    expect(line).toBe("");
  });

  it("Task 3: lenses efectivamente vacío (sin selección, o tarot sin carta) → '' en vez de una lista rota (': .')", () => {
    expect(focusLine([], undefined, "es")).toBe("");
    expect(focusLine(["tarot"], undefined, "es")).toBe("");
    expect(focusLine(["tarot"], undefined, "en")).toBe("");
  });

  it("EN traduce las disciplinas", () => {
    const line = focusLine(["astros", "pilares"], undefined, "en");
    expect(line).toBe("Advise drawing ONLY on: Astrology and Four Pillars (Ba Zi). Do not bring in the others.");
  });
});

describe("effectiveLenses", () => {
  it("Task 3 (pedido de Gio): filtra tarot sin carta y NO cae a BASE_LENSES si queda vacío — [] es un resultado válido", () => {
    expect(effectiveLenses(["tarot"], undefined)).toEqual([]);
    expect(effectiveLenses([], undefined)).toEqual([]);
  });

  it("mantiene tarot cuando hay carta", () => {
    expect(effectiveLenses(["tarot"], { id: "fool", reversed: false })).toEqual(["tarot"]);
  });

  it("no filtra nada si ya hay lentes base activas junto a tarot sin carta", () => {
    expect(effectiveLenses(["astros", "tarot"], undefined)).toEqual(["astros"]);
  });

  it("buildFocusedContext y focusLine coinciden en las disciplinas para el mismo input (incl. los casos que quedan efectivamente vacíos)", () => {
    const cases: Array<{ lenses: Lens[]; tarotCard?: TarotCardRef }> = [
      { lenses: ["tarot"] }, // Task 3: efectivamente vacío (tarot sin carta, sin fallback) — el for interno de abajo no itera nada para este caso
      { lenses: [] },
      { lenses: ["astros", "numeros"] },
      { lenses: ["tarot"], tarotCard: { id: "fool", reversed: false } },
    ];
    const MARKER: Record<Exclude<Lens, "tarot">, string> = {
      astros: "Carta natal —",
      numeros: "Numerología —",
      pilares: "Cuatro Pilares (Ba Zi) —",
    };
    const NAME: Record<Exclude<Lens, "tarot">, string> = {
      astros: "Astrología",
      numeros: "Numerología",
      pilares: "Cuatro Pilares (Ba Zi)",
    };
    for (const { lenses, tarotCard } of cases) {
      const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses, tarotCard, locale: "es" });
      const line = focusLine(lenses, tarotCard, "es");
      for (const lens of effectiveLenses(lenses, tarotCard)) {
        if (lens === "tarot") continue; // el bloque tarot exige `content`, no solo el id; ya cubierto en otros tests
        expect(ctx).toContain(MARKER[lens]);
        expect(line).toContain(NAME[lens]);
      }
    }
  });

  it("es idempotente: pasarle su propia salida (mismo tarotCard) no la cambia", () => {
    const cases: Array<{ lenses: Lens[]; tarotCard?: TarotCardRef }> = [
      { lenses: ["tarot"] },
      { lenses: [] },
      { lenses: ["astros", "numeros"] },
      { lenses: ["astros", "tarot"] },
      { lenses: BASE_LENSES },
      { lenses: ["tarot"], tarotCard: { id: "fool", reversed: false } },
    ];
    for (const { lenses, tarotCard } of cases) {
      const once = effectiveLenses(lenses, tarotCard);
      const twice = effectiveLenses(once, tarotCard);
      expect(twice).toEqual(once);
    }
  });

  it("re-review (Important, actualizado en Task 3): la lista efectiva decide QUÉ SE COMPUTA, no `lenses` crudo — invariante que sigue en pie aunque el fallback que la motivó ya no exista", () => {
    // Historia: antes de Task 3, lenses:["tarot"] sin tarotCard hacía que
    // effectiveLenses cayera a BASE_LENSES — disciplinas AUSENTES de `lenses`
    // crudo. Si el gate de chart/numerology decidía con `lenses` crudo (bug),
    // esos bloques quedaban afuera del contexto pese a que focusLine (ya
    // construida sobre effectiveLenses) le prometía al modelo anclarse en
    // ellos. Task 3 retira el fallback: effectiveLenses ya NUNCA agrega
    // disciplinas fuera de las pedidas (solo puede quitar tarot sin carta), así
    // que ese divergir puntual ya no puede reproducirse — pero el gate SIGUE
    // debiendo decidir con la lista efectiva, no con la cruda, por si el día de
    // mañana efectiveLenses vuelve a tener un caso de "agregar" (regla general,
    // no solo del caso histórico).
    const lenses: Lens[] = ["tarot"];
    const tarotCard = undefined;
    const active = effectiveLenses(lenses, tarotCard);
    expect(active).toEqual([]); // Task 3: ya NO cae a BASE_LENSES

    // Con la lista efectiva vacía, ni la instrucción ni el contexto prometen
    // disciplinas que la persona no pidió — ambos gates (crudo o efectivo)
    // coinciden en no traer nada, porque ninguno de los dos incluye "astros"/
    // "numeros" en este caso (effectiveLenses ya no puede inyectarlos).
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: active, tarotCard, locale: "es" });
    const line = focusLine(lenses, tarotCard, "es");
    expect(line).toBe("");
    expect(ctx).toBe("DATOS DE Gio (género: masculine):");
    expect(ctx).not.toContain("Carta natal —");
    expect(ctx).not.toContain("Numerología —");
  });
});
