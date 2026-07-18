import { describe, it, expect } from "vitest";
import { glossaryEntry } from "@aluna/core";
import { timelineLabel } from "../timeline-labels";
import type { TimelineEvent, TimelineKind } from "../../timeline/types";

// Fixtures mínimos por kind, con las variantes de meta que los productores
// reales (events.ts / returns.ts) emiten de verdad.
const FIXTURES: Record<TimelineKind, TimelineEvent> = {
  birth: { id: "life:birth:1990", year: 1990, system: "life", kind: "birth", weight: 3 },
  "saturn-return": {
    id: "astro:saturn-return:2019:1", year: 2019, dateIso: "2019-03-01T00:00:00.000Z",
    system: "astro", kind: "saturn-return", weight: 3, ordinal: 1,
  },
  "jupiter-return": {
    id: "astro:jupiter-return:2014:2", year: 2014, system: "astro",
    kind: "jupiter-return", weight: 1, ordinal: 2,
  },
  "uranus-opposition": {
    id: "astro:uranus-opposition:2032:1", year: 2032, system: "astro",
    kind: "uranus-opposition", weight: 3, ordinal: 1, approx: true,
  },
  "uranus-return": {
    id: "astro:uranus-return:2074:1", year: 2074, system: "astro",
    kind: "uranus-return", weight: 2, ordinal: 1,
  },
  "personal-year-1": {
    id: "numerology:personal-year-1:2025", year: 2025, system: "numerology",
    kind: "personal-year-1", weight: 2,
  },
  "pinnacle-change": {
    id: "numerology:pinnacle-change:2020:2", year: 2020, system: "numerology",
    kind: "pinnacle-change", weight: 2, ordinal: 2, meta: { pinnacleValue: 7 },
  },
  "luck-pillar-change": {
    id: "bazi:luck-pillar-change:2018:3", year: 2018, system: "bazi",
    kind: "luck-pillar-change", weight: 2, ordinal: 3,
    meta: { tenGod: "eating", nayin: "sea_gold", startAge: 28, lichunAmbiguous: true },
  },
  "annual-clash": {
    id: "bazi:annual-clash:2029", year: 2029, system: "bazi", kind: "annual-clash", weight: 1,
  },
  confluence: {
    id: "life:confluence:2027", year: 2027, system: "life", kind: "confluence",
    weight: 2, meta: { signals: "jupiter-return+personal-year-1" },
  },
};

const ALL_KINDS = Object.keys(FIXTURES) as TimelineKind[];
const LOCALES = ["es", "en"] as const;

describe("timelineLabel — exhaustividad", () => {
  for (const locale of LOCALES) {
    for (const kind of ALL_KINDS) {
      it(`${locale}: ${kind} tiene título y blurb no vacíos`, () => {
        const { title, blurb } = timelineLabel(locale, FIXTURES[kind]);
        expect(title.trim().length).toBeGreaterThan(2);
        expect(blurb.trim().length).toBeGreaterThan(20);
      });
    }
  }

  it("blurbs distintos por kind (no placeholder repetido)", () => {
    for (const locale of LOCALES) {
      const blurbs = ALL_KINDS.map((k) => timelineLabel(locale, FIXTURES[k]).blurb);
      expect(new Set(blurbs).size).toBe(ALL_KINDS.length);
    }
  });
});

describe("timelineLabel — meaningKey resuelve contra el glosario real", () => {
  for (const locale of LOCALES) {
    for (const kind of ALL_KINDS) {
      it(`${locale}: ${kind} meaningKey (si existe) no está mudo`, () => {
        const { meaningKey } = timelineLabel(locale, FIXTURES[kind]);
        if (meaningKey !== undefined) {
          expect(glossaryEntry(meaningKey, locale), `${kind} → ${meaningKey}`).not.toBeNull();
        }
      });
    }
  }

  it("los kinds pedagógicos SÍ enlazan al glosario", () => {
    const withKey: TimelineKind[] = [
      "saturn-return", "jupiter-return", "uranus-opposition", "uranus-return",
      "personal-year-1", "pinnacle-change", "luck-pillar-change", "annual-clash", "confluence",
    ];
    for (const kind of withKey) {
      expect(timelineLabel("es", FIXTURES[kind]).meaningKey, kind).toBeTruthy();
    }
  });

  it("annual-clash reutiliza la entrada existente de 冲", () => {
    expect(timelineLabel("es", FIXTURES["annual-clash"]).meaningKey).toBe("bazi.interaction.clash");
  });
});

describe("timelineLabel — casos exactos de los kinds con formato", () => {
  it("saturn-return interpola el ordinal (ES 1º / EN 1st)", () => {
    expect(timelineLabel("es", FIXTURES["saturn-return"]).title).toBe("Retorno de Saturno (1º)");
    expect(timelineLabel("en", FIXTURES["saturn-return"]).title).toBe("Saturn Return (1st)");
    const second = { ...FIXTURES["saturn-return"], ordinal: 2 };
    expect(timelineLabel("es", second).title).toBe("Retorno de Saturno (2º)");
    expect(timelineLabel("en", second).title).toBe("Saturn Return (2nd)");
  });

  it("approx=true antepone ≈ al título", () => {
    const t = timelineLabel("es", FIXTURES["uranus-opposition"]).title;
    expect(t.startsWith("≈ ")).toBe(true);
    const exact = { ...FIXTURES["uranus-opposition"], approx: false };
    expect(timelineLabel("es", exact).title.includes("≈")).toBe(false);
  });

  it("pinnacle-change interpola meta.pinnacleValue", () => {
    expect(timelineLabel("es", FIXTURES["pinnacle-change"]).title).toBe("Cambia tu pináculo (al 7)");
    expect(timelineLabel("en", FIXTURES["pinnacle-change"]).title).toBe("Your pinnacle changes (to 7)");
    // Sin meta: título sigue siendo válido, sin "undefined".
    const { meta: _omit, ...bare } = FIXTURES["pinnacle-change"];
    const t = timelineLabel("es", bare).title;
    expect(t.trim().length).toBeGreaterThan(2);
    expect(t.includes("undefined")).toBe(false);
  });

  it("luck-pillar-change añade el dios del pilar (mismos nombres que la UI de pilares)", () => {
    // meta.tenGod = "eating" → ES "Genio" / EN "Output" (messages pilares.godEating)
    expect(timelineLabel("es", FIXTURES["luck-pillar-change"]).title).toBe(
      "Nuevo pilar de suerte (大運) — Genio",
    );
    expect(timelineLabel("en", FIXTURES["luck-pillar-change"]).title).toBe(
      "New luck pillar (大運) — Output",
    );
    const bare = { ...FIXTURES["luck-pillar-change"], meta: { startAge: 8 } };
    expect(timelineLabel("es", bare).title).toBe("Nuevo pilar de suerte (大運)");
  });

  it("confluence traduce las señales a lenguaje humano", () => {
    const es = timelineLabel("es", FIXTURES.confluence).title;
    expect(es).toBe("Año de confluencia — retorno de Júpiter + año personal 1");
    const en = timelineLabel("en", FIXTURES.confluence).title;
    expect(en).toBe("Confluence year — Jupiter return + personal year 1");
    // Señales desconocidas no revientan ni imprimen "undefined".
    const weird = { ...FIXTURES.confluence, meta: { signals: "luck-pillar-change" } };
    expect(timelineLabel("es", weird).title.includes("undefined")).toBe(false);
  });

  it("locale desconocido cae a ES", () => {
    expect(timelineLabel("fr", FIXTURES.birth).title).toBe(timelineLabel("es", FIXTURES.birth).title);
  });
});

describe("glosario — las claves nuevas del camino existen en ambos idiomas", () => {
  const NEW_KEYS = [
    "timeline.saturnreturn", "timeline.jupiterreturn", "timeline.uranusopposition",
    "timeline.uranusreturn", "timeline.cycle9", "timeline.pinnacle",
    "timeline.luckpillar", "timeline.confluence",
  ];
  for (const key of NEW_KEYS) {
    it(key, () => {
      expect(glossaryEntry(key, "es")).not.toBeNull();
      expect(glossaryEntry(key, "en")).not.toBeNull();
    });
  }
});
