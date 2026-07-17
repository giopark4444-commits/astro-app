import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HubView } from "../hub-view";

// Review final (fix Important): bajo 1080px el TopNav no se renderiza, así
// que los tiles de "lentes" del hub son la ÚNICA entrada a cada mundo en
// móvil-web. Este test cubre que /tarot esté entre ellos (antes faltaba).
const { mockActive } = vi.hoisted(() => ({
  mockActive: {
    current: { id: "profile-1", name: "Gio", birth_date: "1990-01-01" } as {
      id: string;
      name: string;
      birth_date: string;
    } | null,
  },
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("HubView — lentes (tiles de navegación móvil)", () => {
  beforeEach(() => {
    mockActive.current = { id: "profile-1", name: "Gio", birth_date: "1990-01-01" };
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ transitAspects: [] }) })) as unknown as typeof fetch;
  });

  it("incluye un tile a /tarot con el mismo patrón que horóscopo", () => {
    render(<HubView />, { wrapper: Providers });
    const link = screen.getByRole("link", { name: new RegExp(es.nav.tarot) });
    expect(link).toHaveAttribute("href", "/tarot");
    expect(screen.getByText(es.hoy.lensSub.tarot)).toBeInTheDocument();
  });
});
