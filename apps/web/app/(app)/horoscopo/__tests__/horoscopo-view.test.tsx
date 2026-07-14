import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HoroscopoView } from "../horoscopo-view";

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: null }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const PAYLOAD = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] }],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => PAYLOAD })) as unknown as typeof fetch;
});

function renderView() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <HoroscopoView />
    </NextIntlClientProvider>,
  );
}

describe("HoroscopoView", () => {
  it("pinta los 12 chips de signos y carga el payload (Luna Llena visible)", async () => {
    renderView();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(2); // tabs de tradición
    // "Luna Llena" aparece dos veces a propósito (el evento en "El cielo del
    // periodo" Y la prosa compuesta la nombra también) → *AllBy* en vez de getBy.
    await waitFor(() => expect(screen.getAllByText(/Luna Llena/).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("radio", { name: /.+/ })).toHaveLength(12); // chips de signo
  });
  it("sin perfil, arranca en Aries (primer signo) y pide al backend", async () => {
    renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string);
    expect(body.sign).toBe("aries");
    expect(body.period).toBe("today");
  });
});
