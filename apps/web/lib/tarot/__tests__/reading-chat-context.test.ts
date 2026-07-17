import { describe, it, expect } from "vitest";
import { TAROT_CARDS_ES, TAROT_CARDS_EN } from "@aluna/core";
import { buildTarotContext, type TarotChatCardInput } from "../reading-chat-context";

const THREE_CARDS_UPRIGHT: TarotChatCardInput[] = [
  { cardId: "fool", reversed: false, position: "past" },
  { cardId: "magician", reversed: true, position: "present" },
  { cardId: "empress", reversed: false, position: "future" },
];

describe("buildTarotContext", () => {
  it("ES: contiene las 3 cartas con sus textos canónicos (essence/ámbito/bridge) del locale", () => {
    const ctx = buildTarotContext("es", "three", THREE_CARDS_UPRIGHT);
    for (const id of ["fool", "magician", "empress"] as const) {
      const card = TAROT_CARDS_ES[id]!;
      expect(ctx).toContain(card.name);
      expect(ctx).toContain(card.essence);
      expect(ctx).toContain(card.bridge);
    }
    // orientación correcta por carta: fool derecha usa upright.path, magician invertida usa reversed.path
    expect(ctx).toContain(TAROT_CARDS_ES.fool!.upright.path);
    expect(ctx).toContain(TAROT_CARDS_ES.magician!.reversed.path);
    expect(ctx).toContain(TAROT_CARDS_ES.empress!.upright.path);
  });

  it("EN: usa el dict inglés (nombres y textos), no el español", () => {
    const ctx = buildTarotContext("en", "three", THREE_CARDS_UPRIGHT);
    expect(ctx).toContain(TAROT_CARDS_EN.fool!.name);
    expect(ctx).toContain(TAROT_CARDS_EN.fool!.essence);
    expect(ctx).not.toContain(TAROT_CARDS_ES.fool!.essence);
  });

  it("marca el jumper como distinto de las cartas de la tirada", () => {
    const cards: TarotChatCardInput[] = [
      ...THREE_CARDS_UPRIGHT,
      { cardId: "tower", reversed: false, position: "jumper-1", jumper: true },
    ];
    const ctx = buildTarotContext("es", "three", cards);
    expect(ctx).toContain("SALTARON DEL MAZO");
    expect(ctx).toContain(TAROT_CARDS_ES.tower!.name);
    // el canon del jumper también está presente (sigue siendo canon anclado)
    expect(ctx).toContain(TAROT_CARDS_ES.tower!.essence);
  });

  it("incluye la pregunta cuando viene", () => {
    const ctx = buildTarotContext("es", "three", THREE_CARDS_UPRIGHT, "¿Debo cambiar de trabajo?");
    expect(ctx).toContain("¿Debo cambiar de trabajo?");
  });

  it("sin pregunta, no aparece el encabezado de pregunta", () => {
    const ctx = buildTarotContext("es", "three", THREE_CARDS_UPRIGHT);
    expect(ctx).not.toContain("PREGUNTA DE LA PERSONA");
  });

  it("sin natal si no hay perfil (natalSummary ausente)", () => {
    const ctx = buildTarotContext("es", "three", THREE_CARDS_UPRIGHT, "pregunta");
    expect(ctx).not.toContain("CIELO NATAL");
  });

  it("con natalSummary, incluye el resumen del cielo natal", () => {
    const ctx = buildTarotContext(
      "es",
      "three",
      THREE_CARDS_UPRIGHT,
      undefined,
      "Ascendente Leo; Sol Acuario casa 11.",
    );
    expect(ctx).toContain("CIELO NATAL");
    expect(ctx).toContain("Ascendente Leo; Sol Acuario casa 11.");
  });

  it("tirada libre: posiciones free-N sin rol se presentan por orden (Primera carta…)", () => {
    const cards: TarotChatCardInput[] = [
      { cardId: "fool", reversed: false, position: "free-1" },
      { cardId: "magician", reversed: false, position: "free-2" },
    ];
    const ctx = buildTarotContext("es", "free", cards);
    expect(ctx).toContain("primera carta");
    expect(ctx).toContain("segunda carta");
  });

  it("EN: tirada libre usa ordinales en inglés", () => {
    const cards: TarotChatCardInput[] = [{ cardId: "fool", reversed: false, position: "free-1" }];
    const ctx = buildTarotContext("en", "free", cards);
    expect(ctx).toContain("first card");
  });
});
