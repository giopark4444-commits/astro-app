import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { InterpretationPanel, type HoySelection, type RevealedTarotCard } from "../interpretation-panel";

// Pedido de Gio (2026-07-24): "cuando volteo una carta en interpretacion
// quiero una respuesta de que significa esa carta... no me pongas una
// respuesta de mierda" (la copy curada genérica de hoy.interp.tarot.body).
// La sección {kind:"tarotFan"} debe mostrar la lectura REAL de cada carta
// (TAROT_CARDS_ES: nombre + keywords + esencia + upright/reversed.path),
// acumulando hacia abajo, y SOLO el hint corto (no la copy genérica) cuando
// todavía no se ha tocado ninguna carta.

const FOOL = TAROT_CARDS_ES.fool!;
const MAGICIAN = TAROT_CARDS_ES.magician!;

function renderPanel(selection: HoySelection | null) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <InterpretationPanel selection={selection} profileId="profile-1" />
    </NextIntlClientProvider>,
  );
}

describe("InterpretationPanel — tarotFan (lectura real de cada carta revelada)", () => {
  it("sin cartas reveladas: muestra el hint corto de siempre, NUNCA la copy curada genérica que Gio rechazó", () => {
    renderPanel({ kind: "tarotFan", cards: [] });

    expect(screen.getByText(es.hoy.tarotFanHint)).toBeInTheDocument();
    expect(screen.queryByText(es.hoy.interp.tarot.body)).not.toBeInTheDocument();
    // El título curado SÍ se conserva (es el encabezado del bloque).
    expect(screen.getByText(es.hoy.interp.tarot.title)).toBeInTheDocument();
  });

  it("una carta revelada: muestra su nombre, keywords, esencia y el path (upright, no invertida)", () => {
    const cards: RevealedTarotCard[] = [{ cardId: "fool", reversed: false, position: 0 }];
    renderPanel({ kind: "tarotFan", cards });

    expect(screen.getByText(FOOL.name)).toBeInTheDocument();
    expect(screen.getByText(FOOL.essence)).toBeInTheDocument();
    expect(screen.getByText(FOOL.upright.path)).toBeInTheDocument();
    expect(screen.queryByText(FOOL.reversed.path)).not.toBeInTheDocument();
    for (const kw of FOOL.keywords) {
      expect(screen.getByText(kw)).toBeInTheDocument();
    }
    expect(screen.queryByText(new RegExp(es.tarot.dailyReversed))).not.toBeInTheDocument();
  });

  it("carta invertida: muestra el path INVERTIDO (no el upright) y la etiqueta 'Invertida'", () => {
    const cards: RevealedTarotCard[] = [{ cardId: "fool", reversed: true, position: 0 }];
    renderPanel({ kind: "tarotFan", cards });

    expect(screen.getByText(FOOL.reversed.path)).toBeInTheDocument();
    expect(screen.queryByText(FOOL.upright.path)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(es.tarot.dailyReversed))).toBeInTheDocument();
  });

  it("dos cartas reveladas: AMBAS lecturas completas se muestran, complementándose (nunca se reemplaza la anterior)", () => {
    const cards: RevealedTarotCard[] = [
      { cardId: "fool", reversed: false, position: 5 },
      { cardId: "magician", reversed: false, position: 1 },
    ];
    renderPanel({ kind: "tarotFan", cards });

    expect(screen.getByText(FOOL.name)).toBeInTheDocument();
    expect(screen.getByText(FOOL.essence)).toBeInTheDocument();
    expect(screen.getByText(MAGICIAN.name)).toBeInTheDocument();
    expect(screen.getByText(MAGICIAN.essence)).toBeInTheDocument();
  });

  it("la carta MÁS RECIENTE queda ABAJO en el DOM (se complementa hacia abajo, pedido literal de Gio)", () => {
    const cards: RevealedTarotCard[] = [
      { cardId: "fool", reversed: false, position: 5 },
      { cardId: "magician", reversed: false, position: 1 },
    ];
    renderPanel({ kind: "tarotFan", cards });

    const foolName = screen.getByText(FOOL.name);
    const magicianName = screen.getByText(MAGICIAN.name);
    expect(foolName.compareDocumentPosition(magicianName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("el CTA a Aluna sigue disponible con la pregunta curada de tarot", () => {
    renderPanel({ kind: "tarotFan", cards: [{ cardId: "fool", reversed: false, position: 0 }] });
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.areaReadingCta) });
    expect(link).toHaveAttribute("href", `/preguntar?q=${encodeURIComponent(es.hoy.interp.tarot.q)}`);
  });
});
