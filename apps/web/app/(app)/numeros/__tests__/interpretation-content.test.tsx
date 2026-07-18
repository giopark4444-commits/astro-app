// apps/web/app/(app)/numeros/__tests__/interpretation-content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReductionTrace } from "@aluna/core";
import es from "@/messages/es.json";
import { NumerosInterpretation } from "../interpretation-content";
import type { NumSelection } from "../selection";

// value 11 tiene entrada real en NUMBER_MEANINGS_ES (número maestro).
const TRACE_WITH_MEANING: ReductionTrace = { steps: [1, 9, 8, 4, 11], value: 11, isMaster: true };
// value 0 es imposible en la numerología real (1-9/11/22/33): garantiza que
// NUMBER_MEANINGS_ES no tenga entrada, sin depender de qué valores existan hoy.
const TRACE_NO_MEANING: ReductionTrace = { steps: [0], value: 0, isMaster: false };

const SEL_WITH_MEANING: NumSelection = {
  kind: "number",
  labelKey: "lifePath",
  glossKey: "glossLifePath",
  trace: TRACE_WITH_MEANING,
};
const SEL_NO_MEANING: NumSelection = {
  kind: "number",
  labelKey: "lifePath",
  glossKey: "glossLifePath",
  trace: TRACE_NO_MEANING,
};

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("NumerosInterpretation", () => {
  it("cabecera SIEMPRE: número grande + 'tu cálculo' con la reducción", () => {
    const { container } = wrap(
      <NumerosInterpretation selected={SEL_WITH_MEANING} pro={false} profileName="Gio" />,
    );
    const n = container.querySelector('[class*="sheetN"]');
    expect(n).not.toBeNull();
    expect(n!.textContent).toBe("11");
    const calc = container.querySelector('[class*="calcMini"]');
    expect(calc).not.toBeNull();
    expect(calc!.textContent).toContain(es.numerology.yourCalc);
    expect(calc!.textContent).toContain("1 → 9 → 8 → 4 → 11");
  });

  it("meaning + sin pro: essence presente, hint cableado, SIN el selector de niveles (tab Esencia)", () => {
    wrap(<NumerosInterpretation selected={SEL_WITH_MEANING} pro={false} profileName="Gio" />);
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
    const meaningEssence =
      "Eres un número maestro: tu alma vino a ser canal. A iluminar, a inspirar y a recordarle a otros lo que no pueden ver solos. El 2 elevado a su máxima sensibilidad.";
    expect(screen.getByText(meaningEssence)).toBeTruthy();
    expect(screen.getByText(es.numerology.interpHint)).toBeTruthy();
  });

  it("meaning + pro: NumberReading completo (selector de niveles con tab 'Esencia')", () => {
    wrap(<NumerosInterpretation selected={SEL_WITH_MEANING} pro={true} profileName="Gio" />);
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
    // Flow/Shadow/Practice del nivel Esencia (siempre visible, sin red).
    expect(screen.getByText(es.numerology.reading.flowH)).toBeTruthy();
    expect(screen.getByText(es.numerology.reading.shadowH)).toBeTruthy();
    expect(screen.getByText(es.numerology.reading.practiceH)).toBeTruthy();
  });

  it("sin meaning para el value (fallback EXACTO del sheet actual): arquetipo + gloss + 'prosa pronto'", () => {
    wrap(<NumerosInterpretation selected={SEL_NO_MEANING} pro={false} profileName="Gio" />);
    expect(screen.getByText(es.numerology.archetype)).toBeTruthy();
    expect(screen.getByText(es.numerology.glossLifePath)).toBeTruthy();
    expect(screen.getByText(es.numerology.proseSoon)).toBeTruthy();
    // sin meaning, tampoco hay selector de niveles ni essence propia.
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
  });
});
