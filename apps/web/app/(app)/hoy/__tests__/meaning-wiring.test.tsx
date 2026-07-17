// Task 7 (capa de significados): la tarjeta de clima de Hoy debe ser
// "tocable" — igual que /carta y /pilares, los glifos de planeta y el nombre
// del aspecto abren el glosario vía <Meaning>. Este test cubre el caso mínimo:
// en la tarjeta de clima, "Trígono" es un botón que abre el BottomSheet
// (role="dialog") con la entrada del glosario.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Aspect } from "@aluna/core";
import es from "@/messages/es.json";
import { HubView } from "../hub-view";

const FIXTURE_PROFILE = { id: "profile-1", name: "Gio", birth_date: "1990-01-01" };

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: FIXTURE_PROFILE }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const TRANSIT_ASPECT: Aspect = {
  a: "sun", b: "moon", aspect: "trine", angle: 120, orb: 1.2, applying: true, harmony: "soft",
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("HubView — capa de significados (clima)", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ transitAspects: [TRANSIT_ASPECT] }),
    })) as unknown as typeof fetch;
  });

  it('"Trígono" en la tarjeta de clima es un botón que abre el glosario (dialog)', async () => {
    render(<HubView />, { wrapper: Providers });

    const trigger = await screen.findByRole("button", { name: "Trígono" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it('"Aplicativo" en la tarjeta de clima abre el glosario (dialog)', async () => {
    render(<HubView />, { wrapper: Providers });

    const trigger = await screen.findByRole("button", { name: "Aplicativo" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
