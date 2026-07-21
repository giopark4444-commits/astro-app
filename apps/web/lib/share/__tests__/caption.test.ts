// apps/web/lib/share/__tests__/caption.test.ts
import { describe, expect, it } from "vitest";
import { buildCaption } from "../caption";
import type { ResolvedInsight, ShareLens } from "../types";

function insight(quote: string): ResolvedInsight {
  return { eyebrow: "X", quote, glyph: { kind: "number", value: "7" }, chips: [] };
}

const APP_URL = "https://aluna.app";

describe("buildCaption — formato exacto", () => {
  it("español: comillas angulares + em dash + cta + url con utm", () => {
    const result = buildCaption(
      insight("Tu camino es la exploración."),
      "numeros",
      "es",
      APP_URL,
      "Descubre tu numerología en Aluna",
    );
    expect(result).toBe(
      "«Tu camino es la exploración.» — Descubre tu numerología en Aluna https://aluna.app?utm_source=share&utm_medium=card&utm_campaign=numeros",
    );
  });

  it("inglés: comillas rectas dobles (no angulares)", () => {
    const result = buildCaption(
      insight("Your path is exploration."),
      "numeros",
      "en",
      APP_URL,
      "Discover your numerology on Aluna",
    );
    expect(result).toBe(
      "“Your path is exploration.” — Discover your numerology on Aluna https://aluna.app?utm_source=share&utm_medium=card&utm_campaign=numeros",
    );
  });
});

describe("buildCaption — recorte de la quote larga", () => {
  it("quote corta: no la toca", () => {
    const result = buildCaption(insight("Corta."), "carta", "es", APP_URL, "cta");
    expect(result).toContain("«Corta.»");
  });

  it("quote > 140 chars: recorta en el límite de palabra más cercano + …", () => {
    const longQuote = "palabra ".repeat(20).trim(); // 159 chars, sin cortar palabras
    const result = buildCaption(insight(longQuote), "tarot", "es", APP_URL, "cta");
    const quoted = result.match(/«(.*)»/)?.[1] ?? "";

    expect(quoted.length).toBeLessThanOrEqual(141); // 140 + "…"
    expect(quoted.endsWith("…")).toBe(true);
    // nunca deja un espacio pegado al "…" (recortó en el límite de palabra)
    expect(quoted.endsWith(" …")).toBe(false);
    // ninguna palabra quedó partida a la mitad
    expect(quoted.slice(0, -1).endsWith("palabra")).toBe(true);
  });

  it("quote exactamente en el límite (140 chars): no la recorta", () => {
    const exact = "a".repeat(140);
    const result = buildCaption(insight(exact), "pilares", "es", APP_URL, "cta");
    expect(result).toContain(`«${exact}»`);
  });
});

describe("buildCaption — utm_campaign por lente", () => {
  const lenses: ShareLens[] = ["numeros", "carta", "pilares", "tarot", "horoscopo"];

  it.each(lenses)("lens=%s → utm_campaign coincide y utm_source/medium son fijos", (lens) => {
    const result = buildCaption(insight("q"), lens, "es", APP_URL, "cta");
    expect(result).toContain(`utm_campaign=${lens}`);
    expect(result).toContain("utm_source=share&utm_medium=card");
  });
});
