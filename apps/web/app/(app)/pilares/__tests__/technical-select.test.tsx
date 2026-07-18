import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { PillarColumn } from "../pillar-column";
import { ProLamina } from "../pro-lamina";
import type { BaZiData } from "../types";

const DAY = { stem: 0, branch: 0 } as never; // 甲子

const wrap = (ui: React.ReactElement) =>
  render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);

describe("PillarColumn seleccionable", () => {
  it("label del pilar → kind pillar; tronco → term; chip de dios conserva su piel", () => {
    const onSelect = vi.fn();
    wrap(<PillarColumn posKey="day" pillar={DAY} isDay dayMaster={0} pro={true}
      script="hanzi" index={2} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "pillar", which: "day", pillar: DAY });
    fireEvent.click(screen.getByRole("button", { name: /甲/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "term", key: "bazi.stem.jia" });
    // el chip 日主 (Día-Maestro) selecciona su término
    fireEvent.click(screen.getAllByRole("button", { name: /日主|Maestro/ })[0]!);
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "term", key: "bazi.term.daymaster" });
  });
});

// Mismo fixture que __tests__/pro-lamina.test.tsx (BaZiData mínimo con los 4 pilares).
const LAMINA_DATA: BaZiData = {
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

describe("ProLamina seleccionable", () => {
  it("título de sección → term; década dispara decade Y conserva el acordeón existente", () => {
    const onSelect = vi.fn();
    const { container } = wrap(
      <ProLamina data={LAMINA_DATA} script="hanzi" pro={true} tab="nayin" onSelect={onSelect} />,
    );

    // Título de sección (cardH) → term de esa clave.
    fireEvent.click(screen.getByRole("button", { name: es.pilares.nayinTitle }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "term", key: "bazi.term.nayin" });

    // Década (.luckCol): el acordeón (setOpen) EXISTENTE se conserva Y ADEMÁS
    // dispara onSelect({ kind: "decade", ... }) en el mismo click.
    const luckBtn = container.querySelector('button[class*="luckCol"]') as HTMLButtonElement;
    expect(luckBtn).toBeTruthy();
    fireEvent.click(luckBtn);
    expect(luckBtn.className).toMatch(/luckOpen/); // acordeón: sigue abriendo la tabla anual
    const lastCall = onSelect.mock.calls.at(-1)![0];
    expect(lastCall.kind).toBe("decade");
    expect(typeof lastCall.glyph).toBe("string");
    expect(typeof lastCall.god).toBe("string");
    expect(typeof lastCall.nayinLabel).toBe("string");
    expect(typeof lastCall.startYear).toBe("number");
    expect(typeof lastCall.startAge).toBe("number");
  });
});
