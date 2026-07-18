import { describe, expect, it } from "vitest";
import { buildTimelineChatContext, type TimelineChatFacts } from "../chat-context";
import { timelineLabel } from "@/lib/content/timeline-labels";
import type { TimelineEvent } from "../types";

// Fixture: nacida 1974-01-15 (enero → nota Lichun), horizonte 2024 (50 años).
const BIRTH_YEAR = 1974;
const HORIZON_YEAR = 2024;

function makeYears(): TimelineChatFacts["years"] {
  const out: TimelineChatFacts["years"] = [];
  for (let y = BIRTH_YEAR; y <= HORIZON_YEAR; y++) {
    out.push({ year: y, personalYear: ((y - BIRTH_YEAR) % 9) + 1 });
  }
  return out;
}

function makeMonthly(): TimelineChatFacts["monthly"] {
  const out: TimelineChatFacts["monthly"] = [];
  for (const year of [2026, 2027]) {
    for (let month = 1; month <= 12; month++) {
      out.push({ year, month, personalMonth: ((month + year) % 9) + 1 });
    }
  }
  return out;
}

const SATURN_RETURN: TimelineEvent = {
  id: "astro:saturn-return:2003:1",
  year: 2003,
  system: "astro",
  kind: "saturn-return",
  weight: 3,
  ordinal: 1,
};

const BIRTH_EVENT: TimelineEvent = {
  id: `life:birth:${BIRTH_YEAR}`,
  year: BIRTH_YEAR,
  system: "life",
  kind: "birth",
  weight: 3,
};

function baseFacts(overrides: Partial<TimelineChatFacts> = {}): TimelineChatFacts {
  return {
    events: [BIRTH_EVENT, SATURN_RETURN],
    birthYear: BIRTH_YEAR,
    horizonYear: HORIZON_YEAR,
    birth: { year: BIRTH_YEAR, month: 1, day: 15 },
    years: makeYears(),
    monthly: makeMonthly(),
    ...overrides,
  };
}

describe("buildTimelineChatContext", () => {
  it("incluye una línea por año en la tabla año a año", () => {
    const facts = baseFacts();
    const out = buildTimelineChatContext("es", facts);
    for (const { year } of facts.years) {
      expect(out).toContain(`${year} ·`);
    }
    // conteo: tantas líneas con "año personal" como años en el rango.
    const count = out.split("\n").filter((l) => l.includes("año personal")).length;
    expect(count).toBe(facts.years.length);
  });

  it("las líneas de hitos usan exactamente los títulos de timelineLabel", () => {
    const facts = baseFacts();
    const out = buildTimelineChatContext("es", facts);
    const label = timelineLabel("es", SATURN_RETURN);
    expect(out).toContain(label.title);
    const birthLabel = timelineLabel("es", BIRTH_EVENT);
    expect(out).toContain(birthLabel.title);
  });

  it("la ventana mensual lista 24 meses", () => {
    const facts = baseFacts();
    const out = buildTimelineChatContext("es", facts);
    const count = out.split("\n").filter((l) => l.includes("mes personal")).length;
    expect(count).toBe(24);
  });

  it("solo nace nota de Lichun si el nacimiento es de enero o febrero", () => {
    const jan = buildTimelineChatContext("es", baseFacts({ birth: { year: BIRTH_YEAR, month: 1, day: 15 } }));
    expect(jan.toLowerCase()).toContain("lichun");

    const feb = buildTimelineChatContext("es", baseFacts({ birth: { year: BIRTH_YEAR, month: 2, day: 3 } }));
    expect(feb.toLowerCase()).toContain("lichun");

    const june = buildTimelineChatContext("es", baseFacts({ birth: { year: BIRTH_YEAR, month: 6, day: 20 } }));
    expect(june.toLowerCase()).not.toContain("lichun");
  });

  it("longitud total razonable para un fixture de 50 años", () => {
    const facts = baseFacts();
    const out = buildTimelineChatContext("es", facts);
    expect(out.length).toBeLessThan(8000);
  });

  it("incluye ventana actual: retorno solar y pilares vigentes cuando se pasan", () => {
    const facts = baseFacts({
      solarReturnIso: "2026-01-15T10:00:00.000Z",
      currentLuckLabel: "大運 丙午 (edad 33)",
      currentAnnualLabel: "pilar anual 丁酉",
    });
    const out = buildTimelineChatContext("es", facts);
    expect(out).toContain("2026-01-15T10:00:00.000Z");
    expect(out).toContain("大運 丙午 (edad 33)");
    expect(out).toContain("pilar anual 丁酉");
  });

  it("funciona en inglés con encabezados propios", () => {
    const facts = baseFacts();
    const out = buildTimelineChatContext("en", facts);
    expect(out).toMatch(/personal year/);
    expect(out).toMatch(/personal month/);
  });
});
