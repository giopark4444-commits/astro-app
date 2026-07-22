import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { DeckPicker } from "../deck-picker";

const KEY = "aluna.tarotDeck";

function renderPicker(messages: typeof es = es, locale = "es") {
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DeckPicker />
    </NextIntlClientProvider>,
  );
}

describe("DeckPicker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the ready preset decks (visconti oculto hasta tener assets)", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: new RegExp(es.settings.deckPresetRwsName) })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(es.settings.deckPresetAlunaNocheName) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(es.settings.deckPresetMarseilleName) }),
    ).toBeInTheDocument();
    // Visconti no se muestra todavía (sin assets) — ver READY_DECKS en deck-picker.tsx.
    expect(
      screen.queryByRole("button", { name: new RegExp(es.settings.deckPresetViscontiName) }),
    ).toBeNull();
  });

  it("renders in English when given the en message bundle", () => {
    renderPicker(en, "en");
    expect(screen.getByRole("button", { name: new RegExp(en.settings.deckPresetRwsName) })).toBeInTheDocument();
  });

  it("marks rws as selected by default (nothing in localStorage)", () => {
    renderPicker();
    const rwsBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetRwsName) });
    expect(rwsBtn).toHaveAttribute("aria-pressed", "true");
    const marseilleBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetMarseilleName) });
    expect(marseilleBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("picks up an already-persisted deck as selected", () => {
    window.localStorage.setItem(KEY, "marseille");
    renderPicker();
    const viscontiBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetMarseilleName) });
    expect(viscontiBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a deck selects it, persists it, and deselects the previous one", () => {
    renderPicker();

    const rwsBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetRwsName) });
    const alunaNocheBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetAlunaNocheName) });
    expect(rwsBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(alunaNocheBtn);

    expect(alunaNocheBtn).toHaveAttribute("aria-pressed", "true");
    expect(rwsBtn).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(KEY)).toBe("aluna-noche");
  });

  it("each card thumbnail points at /tarot/{deck}/star.webp", () => {
    renderPicker();
    const marseilleBtn = screen.getByRole("button", { name: new RegExp(es.settings.deckPresetMarseilleName) });
    const img = marseilleBtn.querySelector("img");
    expect(img).toHaveAttribute("src", "/tarot/marseille/star.webp");
  });
});
