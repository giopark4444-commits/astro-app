import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ProLamina } from "../pro-lamina";
import type { BaZiData } from "../types";

const data: BaZiData = {
  year: { stem: 0, branch: 0 },
  month: { stem: 2, branch: 4 },
  day: { stem: 6, branch: 8 },
  hour: { stem: 8, branch: 10 },
  solarYear: 1990,
  timeKnown: true,
  gender: "feminine",
  birthYear: 1990,
  daysToPrevJie: 10,
  daysToNextJie: 20,
};

function renderLamina(pro: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProLamina data={data} script="hanzi" pro={pro} tab="nayin" onSelect={vi.fn()} />
    </NextIntlClientProvider>,
  );
}

describe("ProLamina", () => {
  it("renderiza las 7 secciones SIEMPRE, incluso con pro=false", () => {
    renderLamina(false);
    expect(screen.getByText(es.pilares.nayinTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.strengthTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.favorTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.luckTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.stagesTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.interactionsTitle)).toBeInTheDocument();
    expect(screen.getByText(es.pilares.starsTitle)).toBeInTheDocument();
  });

  it("marca data-pro en la raíz según el prop `pro`", () => {
    const { container: off } = renderLamina(false);
    expect(off.firstElementChild).not.toHaveAttribute("data-pro");
    const { container: on } = renderLamina(true);
    expect(on.firstElementChild).toHaveAttribute("data-pro", "true");
  });
});
