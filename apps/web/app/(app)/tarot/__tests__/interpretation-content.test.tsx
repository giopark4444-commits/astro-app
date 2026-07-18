// apps/web/app/(app)/tarot/__tests__/interpretation-content.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { cardById, type DrawnCard } from "@aluna/core";
import { TAROT_CARDS_ES, composeReadingProse } from "@/lib/content/tarot-es";
import { TarotInterpretation, tarotSelectionTitle } from "../interpretation-content";
import type { TarotSelection, SavedReadingLite } from "../selection";

const wrap = (ui: React.ReactElement, locale: "es" | "en" = "es") =>
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es}>
      {ui}
    </NextIntlClientProvider>,
  );

const FOOL: DrawnCard = { card: cardById("fool")!, reversed: false };
const FOOL_REVERSED: DrawnCard = { card: cardById("fool")!, reversed: true };
const FOOL_CONTENT = TAROT_CARDS_ES.fool!;

describe("TarotInterpretation", () => {
  describe("kind: daily", () => {
    it("sin revelar: solo el hint cableado, sin contenido de la carta", () => {
      wrap(
        <TarotInterpretation
          selected={{ kind: "daily" }}
          revealed={false}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={() => {}}
        />,
      );
      expect(screen.getByText(es.tarot.interpHint)).toBeTruthy();
      expect(screen.queryByText(FOOL_CONTENT.name)).toBeNull();
      expect(screen.queryByText(FOOL_CONTENT.essence)).toBeNull();
    });

    it("revelada: nombre+keywords+prosa (con la essence tejida adentro, sin duplicar)", () => {
      const { container } = wrap(
        <TarotInterpretation
          selected={{ kind: "daily" }}
          revealed={true}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={() => {}}
        />,
      );
      expect(screen.getByText(FOOL_CONTENT.name)).toBeTruthy();
      expect(screen.getByText(FOOL_CONTENT.keywords[0]!)).toBeTruthy();
      // La essence llega UNA sola vez, dentro de la prosa ("…planta la escena: <essence>")
      // — el párrafo suelto se retiró por duplicado (gate visual post-merge).
      const apariciones = container.textContent!.split(FOOL_CONTENT.essence).length - 1;
      expect(apariciones).toBe(1);
      expect(screen.queryByText(es.tarot.dailyReversed)).toBeNull();

      const prose = composeReadingProse("es", "daily", [{ cardId: "fool", reversed: false, position: "day" }]);
      expect(prose.length).toBeGreaterThan(0);
      for (const p of prose) {
        expect(screen.getByText(p)).toBeTruthy();
      }
    });

    it("revelada + invertida: muestra el tag de invertida", () => {
      wrap(
        <TarotInterpretation
          selected={{ kind: "daily" }}
          revealed={true}
          dailyCard={FOOL_REVERSED}
          profileName="Gio"
          onSelect={() => {}}
        />,
      );
      expect(screen.getByText(es.tarot.dailyReversed)).toBeTruthy();
    });
  });

  describe("kind: saved", () => {
    const reading: SavedReadingLite = {
      id: "r1",
      spread: "three",
      question: "¿Qué necesito ver?",
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "wands-03", reversed: true, position: "present" },
        { cardId: "cups-queen", reversed: false, position: "jumper-1", jumper: true },
      ],
      created_at: "2026-07-01T00:00:00.000Z",
    };
    const selected: TarotSelection = { kind: "saved", reading };

    it("pregunta + fila de cartas (tags reversed/jumper) + prosa con separación principal/jumpers EXACTA", () => {
      const onSelect = vi.fn();
      wrap(
        <TarotInterpretation
          selected={selected}
          revealed={true}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={onSelect}
        />,
      );
      expect(screen.getByText(reading.question!)).toBeTruthy();
      expect(screen.getByText(TAROT_CARDS_ES.fool!.name)).toBeTruthy();
      expect(screen.getByText(TAROT_CARDS_ES["wands-03"]!.name)).toBeTruthy();
      expect(screen.getByText(TAROT_CARDS_ES["cups-queen"]!.name)).toBeTruthy();
      // reversed: solo wands-03 (la única invertida) lleva el tag
      expect(screen.getAllByText(/Invertida/).length).toBe(1);
      // jumper: solo cups-queen lleva el tag de jumper
      expect(screen.getByText(new RegExp(es.tarot.manualJumpersReadingLabel))).toBeTruthy();

      const mainCards = reading.cards.filter((c) => !c.jumper);
      const jumperCards = reading.cards.filter((c) => c.jumper);
      const expectedProse = composeReadingProse("es", reading.spread, mainCards, reading.question ?? undefined, {
        jumpers: jumperCards.map(({ cardId, reversed }) => ({ cardId, reversed })),
      });
      expect(expectedProse.length).toBeGreaterThan(0);
      for (const p of expectedProse) {
        expect(screen.getByText(p)).toBeTruthy();
      }

      // click en una carta -> onSelect({kind:"card", id, reversed, from: selected})
      const button = screen.getByText(TAROT_CARDS_ES["wands-03"]!.name).closest("button")!;
      button.click();
      expect(onSelect).toHaveBeenCalledWith({ kind: "card", id: "wands-03", reversed: true, from: selected });
    });

    it("sin pregunta: no renderiza la línea de pregunta", () => {
      const readingNoQ: SavedReadingLite = { ...reading, question: null };
      wrap(
        <TarotInterpretation
          selected={{ kind: "saved", reading: readingNoQ }}
          revealed={true}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={() => {}}
        />,
      );
      expect(screen.queryByText(es.tarot.diaryQuestionLabel, { exact: false })).toBeNull();
    });
  });

  describe("kind: card", () => {
    it("derecha, sin from: nombre+keywords+essence+camino upright; sin botón volver", () => {
      wrap(
        <TarotInterpretation
          selected={{ kind: "card", id: "fool", reversed: false }}
          revealed={true}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={() => {}}
        />,
      );
      expect(screen.getByText(FOOL_CONTENT.name)).toBeTruthy();
      expect(screen.getByText(FOOL_CONTENT.keywords[0]!)).toBeTruthy();
      expect(screen.getByText(FOOL_CONTENT.essence)).toBeTruthy();
      expect(screen.getByText(FOOL_CONTENT.upright.path)).toBeTruthy();
      expect(screen.queryByText(FOOL_CONTENT.reversed.path)).toBeNull();
      expect(screen.queryByRole("button", { name: es.tarot.backToReading })).toBeNull();
    });

    it("invertida + from: camino reversed + tag; el botón volver llama onSelect(from) tal cual", () => {
      const onSelect = vi.fn();
      const from: TarotSelection = { kind: "daily" };
      wrap(
        <TarotInterpretation
          selected={{ kind: "card", id: "fool", reversed: true, from }}
          revealed={true}
          dailyCard={FOOL}
          profileName="Gio"
          onSelect={onSelect}
        />,
      );
      expect(screen.getByText(FOOL_CONTENT.reversed.path)).toBeTruthy();
      expect(screen.queryByText(FOOL_CONTENT.upright.path)).toBeNull();
      expect(screen.getByText(es.tarot.dailyReversed)).toBeTruthy();

      const back = screen.getByRole("button", { name: es.tarot.backToReading });
      back.click();
      expect(onSelect).toHaveBeenCalledWith(from);
    });

    it("onSelect no-op: no rompe el render (contrato: requerido en la firma, debe tolerar un no-op)", () => {
      expect(() =>
        wrap(
          <TarotInterpretation
            selected={{ kind: "card", id: "fool", reversed: false, from: { kind: "daily" } }}
            revealed={true}
            dailyCard={FOOL}
            profileName="Gio"
            onSelect={() => {}}
          />,
        ),
      ).not.toThrow();
      screen.getByRole("button", { name: es.tarot.backToReading }).click();
    });
  });
});

describe("tarotSelectionTitle", () => {
  it("daily: usa la clave dailyTitle (genérica, sin depender de revealed)", () => {
    const t = (k: string) => k;
    expect(tarotSelectionTitle({ kind: "daily" }, t, "es")).toBe("dailyTitle");
  });

  it("saved: resuelve por spread, con fallback a diarySpreadDaily", () => {
    const t = (k: string) => k;
    const base: SavedReadingLite = { id: "r1", spread: "three", question: null, cards: [], created_at: "" };
    expect(tarotSelectionTitle({ kind: "saved", reading: base }, t, "es")).toBe("diarySpreadThree");
    expect(
      tarotSelectionTitle({ kind: "saved", reading: { ...base, spread: "unknown" } }, t, "es"),
    ).toBe("diarySpreadDaily");
  });

  it("card: nombre real de la carta, respetando el locale", () => {
    const t = (k: string) => k;
    expect(tarotSelectionTitle({ kind: "card", id: "fool", reversed: false }, t, "es")).toBe("El Loco");
    expect(tarotSelectionTitle({ kind: "card", id: "fool", reversed: false }, t, "en")).toBe("The Fool");
  });
});
