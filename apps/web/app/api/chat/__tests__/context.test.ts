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
  BASE_LENSES,
  type ChatContextProfile,
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
  it("default a las 3 base si viene vacío o ausente", () => {
    expect(resolveLenses([])).toEqual(BASE_LENSES);
    expect(resolveLenses(undefined)).toEqual(BASE_LENSES);
    expect(resolveLenses("nope")).toEqual(BASE_LENSES);
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

  it("['tarot'] sin carta → SIN bloque tarot", () => {
    const ctx = buildFocusedContext({ profile: PROFILE, chart, numerology, lenses: ["tarot"], locale: "es" });
    expect(ctx).not.toContain("Tarot —");
    // Solo queda el encabezado, sin bloques.
    expect(ctx).toBe("DATOS DE Gio (género: masculine):");
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
    expect(focusLine(["tarot"], undefined, "es")).toBe("Aconseja apoyándote ÚNICAMENTE en: . No introduzcas las demás.");
    expect(focusLine(["tarot"], { id: "fool", reversed: false }, "es")).toContain("Tarot");
  });

  it("EN traduce las disciplinas", () => {
    const line = focusLine(["astros", "pilares"], undefined, "en");
    expect(line).toBe("Advise drawing ONLY on: Astrology and Four Pillars (Ba Zi). Do not bring in the others.");
  });
});
