import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import { ZodiacGauge } from "../zodiac-gauge";

function renderGauge(date: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ZodiacGauge date={date} locale="es" />
    </NextIntlClientProvider>,
  );
}

describe("ZodiacGauge", () => {
  it("fecha fuera de cúspide muestra el nombre del signo (ES) sin el hint", () => {
    renderGauge("1990-02-05");

    expect(screen.getByText("Acuario")).toBeInTheDocument();
    expect(screen.queryByText(es.onboarding.cuspHint)).not.toBeInTheDocument();
  });

  it("fecha en cúspide muestra el hint de cúspide", () => {
    renderGauge("1990-03-20");

    expect(screen.getByText(es.onboarding.cuspHint)).toBeInTheDocument();
  });

  it("fecha vacía no muestra nombre de signo", () => {
    renderGauge("");

    expect(screen.queryByText("Acuario")).not.toBeInTheDocument();
    expect(screen.queryByText(es.onboarding.cuspHint)).not.toBeInTheDocument();
  });
});
