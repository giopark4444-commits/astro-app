import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ProfilesProvider, type BirthProfile } from "@/lib/profiles/profiles-provider";
import { CompatView } from "../compat-view";

// Mínimo (no había test previo de esta vista): cubre el gesto que añadimos —
// el score grande y las 4 barras de tema cuentan/llenan con useCountUp +
// bar-fill-in. Con prefers-reduced-motion forzado el hook devuelve el valor
// final de inmediato (mismo patrón que area-bars.test.tsx).
beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("prefers-reduced-motion"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      overall: 71,
      tone: "high",
      themes: [
        { key: "attraction", score: 80, tone: "high", drivers: [] },
        { key: "communication", score: 60, tone: "mixed", drivers: [] },
        { key: "harmony", score: 55, tone: "mixed", drivers: [] },
        { key: "growth", score: 40, tone: "low", drivers: [] },
      ],
      aspects: [],
    }),
  })) as unknown as typeof fetch;
});

const PROFILES: BirthProfile[] = [
  {
    id: "a", name: "Gio", birth_date: "1990-01-01", birth_time: "10:00", time_known: true,
    place_name: "Bogotá", latitude: 4.6, longitude: -74.1, time_zone: "America/Bogota", gender: "m",
  },
  {
    id: "b", name: "Ana", birth_date: "1992-05-05", birth_time: "11:00", time_known: true,
    place_name: "Bogotá", latitude: 4.6, longitude: -74.1, time_zone: "America/Bogota", gender: "f",
  },
];

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProfilesProvider profiles={PROFILES}>
        <CompatView />
      </ProfilesProvider>
    </NextIntlClientProvider>,
  );
}

describe("CompatView — score y barras se llenan con el valor final (reduced motion)", () => {
  it("el score grande y los scores de tema muestran su valor final; los fills llevan bar-fill-in", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: es.synastry.compare }));
    await waitFor(() => expect(screen.getByText("71")).toBeInTheDocument());
    expect(screen.getByText("80")).toBeInTheDocument();

    const fills = document.querySelectorAll(".bar-fill-in");
    expect(fills).toHaveLength(4);
    expect((fills[0] as HTMLElement).style.width).toBe("80%");
  });
});
