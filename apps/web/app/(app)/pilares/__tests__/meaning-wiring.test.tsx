// Task 6 (capa de significados): Pilares (BaZi) debe ser "tocable" — troncos,
// ramas, dioses y conceptos abren el glosario vía <Meaning>. Este test cubre
// el caso mínimo del brief: en el pilar de año, el carácter 甲 (tronco Jiǎ,
// madera yang) es un botón que abre el BottomSheet (role="dialog") con la
// entrada del glosario ("Jiǎ" / "Madera").
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PilaresView } from "../pilares-view";
import type { BaZiData } from "../types";

const FIXTURE_PROFILE = {
  id: "p1",
  name: "Fixture",
  birth_date: "1990-01-01",
  birth_time: "12:00",
  time_known: true,
  place_name: "Bogotá",
  latitude: 4.7,
  longitude: -74.1,
  time_zone: "America/Bogota",
  gender: "x",
};

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: FIXTURE_PROFILE }) }));

const DATA: BaZiData = {
  year: { stem: 0, branch: 0 }, // 甲子 — Jiǎ (madera yang) / Zǐ
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

beforeEach(() => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => DATA,
  })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PilaresView />
    </NextIntlClientProvider>,
  );
}

describe("PilaresView — capa de significados (troncos)", () => {
  it('el carácter 甲 (tronco del pilar de año) es un botón que abre el glosario (dialog)', async () => {
    renderView();
    const trigger = await screen.findByRole("button", { name: "甲" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Jiǎ/);
    expect(dialog).toHaveTextContent(/[Mm]adera/);
  });
});
