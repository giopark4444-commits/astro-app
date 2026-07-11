// apps/web/lib/reports/__tests__/reports.test.ts
// Motor puro de informes: grounding, prompts y parse. Todo sin red — se
// prueban formas y contenido de texto, nunca se llama a un proveedor real.

import { describe, it, expect } from "vitest";
import type { BodyPosition, ChartResult } from "@aluna/core";
import { astroLabels } from "../../content/astrology-labels";
import { gatherNatalGrounding } from "../grounding";
import { buildNatalReportPrompt, buildSolarReportPrompt } from "../prompts";
import { parseNatalReport, parseSolarReport, ReportParseError } from "../parse";
import { NATAL_SECTION_KEYS } from "../types";

// ---------------------------------------------------------------------------
// Fixtures: una ChartResult mínima pero con la forma real (packages/core).
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
      body({ body: "mercury", longitude: 130, sign: "leo", house: 5 }),
      body({ body: "venus", longitude: 160, sign: "virgo", house: 6 }),
      body({ body: "mars", longitude: 15, sign: "aries", house: 1, dignity: "domicile" }),
      body({ body: "jupiter", longitude: 250, sign: "sagittarius", house: 9, dignity: "domicile" }),
      body({ body: "saturn", longitude: 280, sign: "capricorn", house: 10, dignity: "domicile" }),
    ],
    houses: {
      system: "placidus",
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: 0, // 0° Aries
      midheaven: 270, // 0° Capricornio
    },
    aspects: [
      { a: "sun", b: "moon", aspect: "square", angle: 90, orb: 1.2, applying: true, harmony: "hard" },
      { a: "venus", b: "mars", aspect: "trine", angle: 120, orb: 3.5, applying: false, harmony: "soft" },
      { a: "sun", b: "jupiter", aspect: "sextile", angle: 60, orb: 5.9, applying: true, harmony: "soft" },
    ],
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
  bodies: [
    body({ body: "sun", longitude: 125, sign: "leo", house: 3 }),
    body({ body: "moon", longitude: 200, sign: "libra", house: 5 }),
  ],
  houses: {
    system: "placidus",
    cusps: [40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340, 10],
    ascendant: 40, // 10° Tauro
    midheaven: 310, // 10° Acuario
  },
  aspects: [{ a: "sun", b: "saturn", aspect: "opposition", angle: 180, orb: 0.8, applying: true, harmony: "hard" }],
});

// ---------------------------------------------------------------------------
// gatherNatalGrounding
// ---------------------------------------------------------------------------

describe("gatherNatalGrounding", () => {
  it("reusa composeBodyReading: el texto del Sol reproduce el corpus, no lo inventa", () => {
    const L = astroLabels("es");
    const text = gatherNatalGrounding(NATAL_CHART, L, "es");
    // El corpus real (astrology-readings-es.ts) describe el Sol así; si el
    // grounding lo reusa, esta cláusula debe aparecer literal.
    expect(text).toContain("Tu Sol es tu identidad esencial");
    // Y compone el tono de signo + arena de casa (Leo, casa 5) del mismo corpus.
    expect(text).toMatch(/con calidez, generosidad/);
  });

  it("incluye el Ascendente derivado de houses.ascendant, no de bodies[]", () => {
    const L = astroLabels("es");
    const text = gatherNatalGrounding(NATAL_CHART, L, "es");
    // ascendant = 0 → Aries
    expect(text).toContain("Ascendente en Aries");
  });

  it("en inglés usa las etiquetas y el corpus en inglés", () => {
    const L = astroLabels("en");
    const text = gatherNatalGrounding(NATAL_CHART, L, "en");
    expect(text).toContain("Ascendant in Aries");
    expect(text).toContain("Your Sun is your essential identity");
    expect(text).not.toContain("Tu Sol"); // no mezcla idiomas
  });

  it("cita los aspectos más ajustados (menor orbe primero)", () => {
    const L = astroLabels("es");
    const text = gatherNatalGrounding(NATAL_CHART, L, "es");
    const idxSunMoon = text.indexOf("Sol Cuadratura Luna");
    const idxSunJup = text.indexOf("Sol Sextil Júpiter");
    expect(idxSunMoon).toBeGreaterThan(-1);
    expect(idxSunJup).toBeGreaterThan(-1);
    expect(idxSunMoon).toBeLessThan(idxSunJup); // orbe 1.2 antes que orbe 5.9
  });

  it("no revienta si faltan cuerpos personales (carta parcial)", () => {
    const L = astroLabels("es");
    const partial = makeChart({
      bodies: [body({ body: "sun", longitude: 125, sign: "leo", house: 5 })],
      aspects: [],
      patterns: [],
    });
    expect(() => gatherNatalGrounding(partial, L, "es")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildNatalReportPrompt
// ---------------------------------------------------------------------------

describe("buildNatalReportPrompt", () => {
  it("arma system+prompt+maxTokens con las 4 claves temáticas (es)", () => {
    const L = astroLabels("es");
    const grounding = gatherNatalGrounding(NATAL_CHART, L, "es");
    const spec = buildNatalReportPrompt(NATAL_CHART, grounding, L, "es");

    expect(spec.system).toContain("Eres Aluna");
    expect(spec.system.toLowerCase()).toContain("evolutiva");
    expect(spec.prompt).toContain(grounding); // el material fuente va embebido
    expect(spec.prompt).toContain('"intro"');
    expect(spec.prompt).toContain('"sections"');
    expect(spec.prompt).toContain('"outro"');
    for (const key of NATAL_SECTION_KEYS) expect(spec.prompt).toContain(`"${key}"`);
    expect(spec.maxTokens).toBe(6000);
  });

  it("arma system+prompt en inglés cuando locale=en", () => {
    const L = astroLabels("en");
    const grounding = gatherNatalGrounding(NATAL_CHART, L, "en");
    const spec = buildNatalReportPrompt(NATAL_CHART, grounding, L, "en");

    expect(spec.system).toContain("You are Aluna");
    expect(spec.prompt).toContain("Respond ONLY with the valid JSON object");
    expect(spec.prompt).not.toContain("Responde ÚNICAMENTE");
  });

  it("pide explícitamente un array de longitud 4 para sections", () => {
    const L = astroLabels("es");
    const grounding = gatherNatalGrounding(NATAL_CHART, L, "es");
    const spec = buildNatalReportPrompt(NATAL_CHART, grounding, L, "es");
    expect(spec.prompt).toMatch(/EXACTAMENTE 4/);
  });
});

// ---------------------------------------------------------------------------
// buildSolarReportPrompt
// ---------------------------------------------------------------------------

describe("buildSolarReportPrompt", () => {
  it("arma system+prompt+maxTokens con essay/themes/mantra y el año (es)", () => {
    const L = astroLabels("es");
    const spec = buildSolarReportPrompt(SOLAR_CHART, NATAL_CHART, L, "es", 2027);

    expect(spec.system).toContain("Eres Aluna");
    expect(spec.prompt).toContain('"essay"');
    expect(spec.prompt).toContain('"themes"');
    expect(spec.prompt).toContain('"mantra"');
    expect(spec.prompt).toMatch(/EXACTAMENTE 10/);
    expect(spec.prompt).toContain("2027");
    expect(spec.maxTokens).toBe(4500);
  });

  it("se ancla tanto en la carta natal como en la solar (ambas presentes en el prompt)", () => {
    const L = astroLabels("es");
    const spec = buildSolarReportPrompt(SOLAR_CHART, NATAL_CHART, L, "es", 2027);
    // Ancla natal: el Sol natal (casa 5, Leo) viene del corpus vía gatherNatalGrounding.
    expect(spec.prompt).toContain("Tu Sol es tu identidad esencial");
    // Carta solar: Ascendente solar = 10° Tauro.
    expect(spec.prompt).toContain("Ascendente solar: Tauro");
  });

  it("arma el prompt en inglés cuando locale=en", () => {
    const L = astroLabels("en");
    const spec = buildSolarReportPrompt(SOLAR_CHART, NATAL_CHART, L, "en", 2027);
    expect(spec.system).toContain("You are Aluna");
    expect(spec.prompt).toContain("Solar Ascendant: Taurus");
    expect(spec.prompt).not.toContain("Ascendente solar");
  });
});

// ---------------------------------------------------------------------------
// parseNatalReport / parseSolarReport
// ---------------------------------------------------------------------------

const WELL_FORMED_NATAL = {
  intro: "Bienvenida a tu mapa.",
  sections: [
    { key: "essence", title: "Quién eres", body: "Cuerpo de la sección 1." },
    { key: "emotional", title: "Tu mundo emocional", body: "Cuerpo de la sección 2." },
    { key: "path", title: "Tu camino", body: "Cuerpo de la sección 3." },
    { key: "challenges", title: "Tus retos", body: "Cuerpo de la sección 4." },
  ],
  outro: "Cierre integrador.",
};

const WELL_FORMED_SOLAR = {
  essay: "Ensayo del año.",
  themes: Array.from({ length: 10 }, (_, i) => ({
    title: `Tema ${i + 1}`,
    why: `Por qué ${i + 1}`,
    invitation: `Invitación ${i + 1}`,
  })),
  mantra: "Confío en el proceso.",
};

describe("parseNatalReport", () => {
  it("acepta JSON bien formado", () => {
    const report = parseNatalReport(JSON.stringify(WELL_FORMED_NATAL));
    expect(report.intro).toBe(WELL_FORMED_NATAL.intro);
    expect(report.sections).toHaveLength(4);
    expect(report.sections[0]).toEqual(WELL_FORMED_NATAL.sections[0]);
    expect(report.outro).toBe(WELL_FORMED_NATAL.outro);
  });

  it("extrae el JSON aunque venga envuelto en fences de markdown y texto alrededor", () => {
    const wrapped = `Aquí tienes tu informe:\n\`\`\`json\n${JSON.stringify(WELL_FORMED_NATAL)}\n\`\`\`\nEspero que te sirva.`;
    const report = parseNatalReport(wrapped);
    expect(report.sections).toHaveLength(4);
  });

  it("extrae el objeto correcto aunque la prosa DESPUÉS del JSON traiga una llave suelta", () => {
    // Regresión: la heurística vieja (primer "{" a último "}") mordía esta
    // prosa final y el slice quedaba con basura detrás del objeto real.
    const trailing = `${JSON.stringify(WELL_FORMED_NATAL)}\n\nP.D.: la fórmula es {x, y} y por ahí queda una suelta } sin pareja.`;
    const report = parseNatalReport(trailing);
    expect(report.intro).toBe(WELL_FORMED_NATAL.intro);
    expect(report.sections).toHaveLength(4);
    expect(report.outro).toBe(WELL_FORMED_NATAL.outro);
  });

  it("no se confunde con llaves dentro de un string interno del JSON", () => {
    // "abre y cierra {así}" trae un par balanceado, y encima una "}" suelta
    // sin pareja: sin conciencia de strings, el conteo de profundidad
    // cerraría el objeto de más antes de tiempo.
    const withBraces = {
      ...WELL_FORMED_NATAL,
      intro: "Bienvenida: abre y cierra {así}, y una suelta } al final.",
    };
    const report = parseNatalReport(JSON.stringify(withBraces));
    expect(report.intro).toBe(withBraces.intro);
    expect(report.sections).toHaveLength(4);
  });

  it("lanza ReportParseError ante JSON malformado", () => {
    expect(() => parseNatalReport("esto no es json {")).toThrow(ReportParseError);
  });

  it("lanza ReportParseError si no hay ningún objeto JSON en el texto", () => {
    expect(() => parseNatalReport("esto no tiene ninguna llave, nada de nada")).toThrow(ReportParseError);
  });

  it("lanza ReportParseError si sections no tiene longitud 4", () => {
    const bad = { ...WELL_FORMED_NATAL, sections: WELL_FORMED_NATAL.sections.slice(0, 3) };
    expect(() => parseNatalReport(JSON.stringify(bad))).toThrow(ReportParseError);
  });

  it("lanza ReportParseError si falta un campo requerido o viene vacío", () => {
    const bad = { ...WELL_FORMED_NATAL, intro: "" };
    expect(() => parseNatalReport(JSON.stringify(bad))).toThrow(ReportParseError);

    const badSection = {
      ...WELL_FORMED_NATAL,
      sections: [
        { key: "essence", title: "", body: "algo" },
        ...WELL_FORMED_NATAL.sections.slice(1),
      ],
    };
    expect(() => parseNatalReport(JSON.stringify(badSection))).toThrow(ReportParseError);
  });
});

describe("parseSolarReport", () => {
  it("acepta JSON bien formado y adjunta el year recibido", () => {
    const report = parseSolarReport(JSON.stringify(WELL_FORMED_SOLAR), 2027);
    expect(report.year).toBe(2027);
    expect(report.essay).toBe(WELL_FORMED_SOLAR.essay);
    expect(report.themes).toHaveLength(10);
    expect(report.mantra).toBe(WELL_FORMED_SOLAR.mantra);
  });

  it("extrae el JSON envuelto en fences de markdown", () => {
    const wrapped = "```json\n" + JSON.stringify(WELL_FORMED_SOLAR) + "\n```";
    const report = parseSolarReport(wrapped, 2027);
    expect(report.themes).toHaveLength(10);
  });

  it("extrae el objeto correcto aunque la prosa después del JSON traiga una llave suelta", () => {
    const trailing = `${JSON.stringify(WELL_FORMED_SOLAR)}\n\nOjalá te sirva. Nota al margen: { esto no es json }`;
    const report = parseSolarReport(trailing, 2027);
    expect(report.themes).toHaveLength(10);
    expect(report.mantra).toBe(WELL_FORMED_SOLAR.mantra);
  });

  it("no se confunde con llaves dentro de un string interno (mantra) del JSON", () => {
    const withBraces = {
      ...WELL_FORMED_SOLAR,
      mantra: "abre y cierra {así}, incluso con una suelta } al final",
    };
    const report = parseSolarReport(JSON.stringify(withBraces), 2027);
    expect(report.mantra).toBe(withBraces.mantra);
    expect(report.themes).toHaveLength(10);
  });

  it("lanza ReportParseError si themes no tiene longitud 10", () => {
    const bad = { ...WELL_FORMED_SOLAR, themes: WELL_FORMED_SOLAR.themes.slice(0, 9) };
    expect(() => parseSolarReport(JSON.stringify(bad), 2027)).toThrow(ReportParseError);
  });

  it("lanza ReportParseError ante malformado (array donde se espera objeto)", () => {
    expect(() => parseSolarReport(JSON.stringify(["no", "es", "un", "objeto"]), 2027)).toThrow(ReportParseError);
  });

  it("lanza ReportParseError si un tema viene incompleto", () => {
    const bad = {
      ...WELL_FORMED_SOLAR,
      themes: [{ title: "Solo título" }, ...WELL_FORMED_SOLAR.themes.slice(1)],
    };
    expect(() => parseSolarReport(JSON.stringify(bad), 2027)).toThrow(ReportParseError);
  });
});
