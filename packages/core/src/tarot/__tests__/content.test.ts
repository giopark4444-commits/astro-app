import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "../deck";
import { TAROT_CARDS_ES, READING_POSITION_LABELS_ES, composeReadingProse } from "../content-es";
import { TAROT_CARDS_EN, READING_POSITION_LABELS_EN } from "../content-en";
import { TAROT_SPREADS } from "../spreads";

describe("contenido tarot", () => {
  it("cada carta cubierta existe en ES y EN con todos los campos no vacíos", () => {
    for (const card of TAROT_DECK) {
      for (const dict of [TAROT_CARDS_ES, TAROT_CARDS_EN]) {
        const c = dict[card.id];
        expect(c, card.id).toBeDefined();
        expect(c!.keywords.length).toBeGreaterThanOrEqual(3);
        for (const s of [c!.name, c!.essence, c!.bridge,
          c!.upright.love, c!.upright.work, c!.upright.path,
          c!.reversed.love, c!.reversed.work, c!.reversed.path]) {
          expect(s.trim().length, card.id).toBeGreaterThan(0);
        }
      }
    }
  });
  it("EN no es copia de ES (voz propia, no placeholder)", () => {
    for (const card of TAROT_DECK) {
      expect(TAROT_CARDS_EN[card.id]!.essence).not.toBe(TAROT_CARDS_ES[card.id]!.essence);
    }
  });
  it("cada position.key de las 9 tiradas tiene entrada en READING_POSITION_LABELS_ES y _EN", () => {
    for (const spread of TAROT_SPREADS) {
      for (const position of spread.positions) {
        expect(READING_POSITION_LABELS_ES[position.key], `${spread.id}/${position.key} (ES)`).toBeDefined();
        expect(READING_POSITION_LABELS_EN[position.key], `${spread.id}/${position.key} (EN)`).toBeDefined();
      }
    }
  });
});

describe("composeReadingProse (v2: prosa de sesión real)", () => {
  const threeCards = [
    { cardId: "fool", reversed: false, position: "past" },
    { cardId: "magician", reversed: false, position: "present" },
    { cardId: "empress", reversed: false, position: "future" },
  ];

  it("three: menciona los 3 nombres localizados (ES)", () => {
    const paras = composeReadingProse("es", "three", threeCards);
    const joined = paras.join(" ");
    expect(joined).toContain(TAROT_CARDS_ES.fool!.name);
    expect(joined).toContain(TAROT_CARDS_ES.magician!.name);
    expect(joined).toContain(TAROT_CARDS_ES.empress!.name);
  });

  it("three: menciona los 3 nombres localizados (EN)", () => {
    const paras = composeReadingProse("en", "three", threeCards);
    const joined = paras.join(" ");
    expect(joined).toContain(TAROT_CARDS_EN.fool!.name);
    expect(joined).toContain(TAROT_CARDS_EN.magician!.name);
    expect(joined).toContain(TAROT_CARDS_EN.empress!.name);
  });

  it("con question, la apertura la integra", () => {
    const question = "¿Debo cambiar de trabajo?";
    const paras = composeReadingProse("es", "three", threeCards, question);
    expect(paras[0]).toContain(question);
  });

  it("con 2/3 cartas invertidas, el cierre trae la señal de revisar antes de avanzar", () => {
    const mostlyReversed = [
      { cardId: "fool", reversed: true, position: "past" },
      { cardId: "magician", reversed: true, position: "present" },
      { cardId: "empress", reversed: false, position: "future" },
    ];
    const paras = composeReadingProse("es", "three", mostlyReversed);
    const closing = paras[paras.length - 1]!;
    expect(closing).toMatch(/revisar/i);
  });

  it("por carta: cada carta aporta al menos 2 párrafos propios (escena + ámbito, con puente) — three sin opts = 12 párrafos", () => {
    const paras = composeReadingProse("es", "three", threeCards);
    // [apertura, clima, (escena,ámbito,puente)x3, cierre] = 2 + 9 + 1
    expect(paras.length).toBe(12);
  });

  it("los párrafos de escena de una tirada three no comparten arranque (ES y EN)", () => {
    for (const locale of ["es", "en"] as const) {
      const paras = composeReadingProse(locale, "three", threeCards);
      // índices de escena: 2 (apertura+clima), luego cada carta ocupa 3 slots
      const sceneStarts = [paras[2]!.slice(0, 12), paras[5]!.slice(0, 12), paras[8]!.slice(0, 12)];
      expect(new Set(sceneStarts).size, `${locale}: ${sceneStarts.join(" | ")}`).toBe(3);
    }
  });

  it("daily produce al menos 2 párrafos y NO trae clima (una sola carta no tiene mayoría que leer)", () => {
    const paras = composeReadingProse("es", "daily", [{ cardId: "sun", reversed: false, position: "day" }]);
    expect(paras.length).toBeGreaterThanOrEqual(2);
    expect(paras.some((p) => /domina|mayoría/i.test(p))).toBe(false);
  });

  it("clima: 3 bastos concentrados en una tirada de 3 cartas → 'domina el fuego' (ES)", () => {
    const allWands = [
      { cardId: "wands-01", reversed: false, position: "past" },
      { cardId: "wands-05", reversed: false, position: "present" },
      { cardId: "wands-king", reversed: false, position: "future" },
    ];
    const paras = composeReadingProse("es", "three", allWands);
    expect(paras.join(" ")).toMatch(/domina el fuego/i);
  });

  it("clima: 3 copas concentradas → menciona 'water' en EN con estructura propia (2 oraciones, no espejo de ES)", () => {
    const allCups = [
      { cardId: "cups-01", reversed: false, position: "past" },
      { cardId: "cups-05", reversed: false, position: "present" },
      { cardId: "cups-king", reversed: false, position: "future" },
    ];
    const parasEs = composeReadingProse("es", "three", allCups);
    const parasEn = composeReadingProse("en", "three", allCups);
    const climateEs = parasEs[1]!;
    const climateEn = parasEn[1]!;
    expect(climateEn).toMatch(/water/i);
    // ES compone el clima en 1 sola oración (todo antes del único punto final);
    // EN lo compone en 2 oraciones — arquitecturas distintas, no traducción espejo.
    expect((climateEs.match(/\./g) ?? []).length).toBe(1);
    expect((climateEn.match(/\./g) ?? []).length).toBe(2);
  });

  it("sin mayoría de menores del mismo palo (mezcla), el clima no menciona un elemento dominante", () => {
    const mixed = [
      { cardId: "wands-01", reversed: false, position: "past" },
      { cardId: "cups-01", reversed: false, position: "present" },
      { cardId: "swords-01", reversed: false, position: "future" },
    ];
    const paras = composeReadingProse("es", "three", mixed);
    expect(paras[1]).not.toMatch(/domina el/i);
  });

  it("jumpers: solo aparecen si vienen en opts — con jumper, sección propia con el nombre del jumper", () => {
    const withJumper = composeReadingProse("es", "three", threeCards, undefined, {
      jumpers: [{ cardId: "tower", reversed: false }],
    });
    const joined = withJumper.join(" ");
    expect(joined).toContain(TAROT_CARDS_ES.tower!.name);
    expect(joined).toMatch(/saltaron/i);
  });

  it("jumpers: sin opts (retrocompat), no aparece ninguna sección de jumpers", () => {
    const noOpts = composeReadingProse("es", "three", threeCards);
    expect(noOpts.join(" ")).not.toMatch(/saltaron/i);
    const emptyJumpers = composeReadingProse("es", "three", threeCards, undefined, { jumpers: [] });
    expect(emptyJumpers.join(" ")).not.toMatch(/saltaron/i);
  });

  it("jumpers en EN: sección propia con estructura distinta a ES (spot: frase distinta, no traducción)", () => {
    const withJumper = composeReadingProse("en", "three", threeCards, undefined, {
      jumpers: [{ cardId: "tower", reversed: true }],
    });
    const joined = withJumper.join(" ");
    expect(joined).toContain(TAROT_CARDS_EN.tower!.name);
    expect(joined).toMatch(/jumped/i);
  });

  it("tirada libre (positions free-N): usa ordinales, no roles ni la clave cruda", () => {
    const free = [
      { cardId: "fool", reversed: false, position: "free-1" },
      { cardId: "magician", reversed: false, position: "free-2" },
    ];
    const parasEs = composeReadingProse("es", "free", free);
    const parasEn = composeReadingProse("en", "free", free);
    expect(parasEs.join(" ")).toMatch(/primera carta/i);
    expect(parasEs.join(" ")).not.toMatch(/free-1/);
    expect(parasEn.join(" ")).toMatch(/first card/i);
    expect(parasEn.join(" ")).not.toMatch(/free-1/);
  });

  it("todas mayores (2+): el cierre lo señala", () => {
    const allMajors = [
      { cardId: "fool", reversed: false, position: "past" },
      { cardId: "magician", reversed: false, position: "present" },
    ];
    const paras = composeReadingProse("es", "three", allMajors);
    expect(paras[paras.length - 1]).toMatch(/arcanos mayores/i);
  });

  it("EN no es calco estructural de ES: al menos una plantilla de escena EN invierte el orden (essence antes que la atribución de carta+posición)", () => {
    // ES siempre antepone posición+nombre a la escena (essence al final). La
    // 3ª plantilla EN hace lo opuesto: essence primero, "That's the scene…"
    // como cierre — una estructura de oración que ES no usa en ningún índice.
    const paras = composeReadingProse("en", "three", threeCards);
    expect(paras.join(" ")).toMatch(/That's the scene/);
  });
});
