import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { HubView } from "../hub-view";

// mockActive: un perfil activo simulado para que HubView renderice todo el
// contenido dependiente de perfil (mismo patrón que horoscopo-view.test.tsx).
const { mockActive, push } = vi.hoisted(() => ({
  mockActive: {
    current: {
      id: "profile-1",
      name: "Gio",
      birth_date: "1990-01-01",
    } as { id: string; name: string; birth_date: string } | null,
  },
  push: vi.fn(),
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("HubView — Pregúntale a Aluna (mockup 06 §3.3)", () => {
  beforeEach(() => {
    push.mockClear();
    mockActive.current = { id: "profile-1", name: "Gio", birth_date: "1990-01-01" };
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ transitAspects: [] }) })) as unknown as typeof fetch;
  });

  it("enviar la pregunta navega a /preguntar?q=", () => {
    render(<HubView />, { wrapper: Providers });

    const input = screen.getByPlaceholderText(es.hoy.askPlaceholder);
    fireEvent.change(input, { target: { value: "hola cielo" } });
    fireEvent.click(screen.getByRole("button", { name: es.hoy.askButton }));

    expect(push).toHaveBeenCalledWith("/preguntar?q=hola%20cielo");
  });

  it("no navega si el input está vacío", () => {
    render(<HubView />, { wrapper: Providers });

    fireEvent.click(screen.getByRole("button", { name: es.hoy.askButton }));

    expect(push).not.toHaveBeenCalled();
  });

  it("los chips de sugerencia navegan con su propio texto", () => {
    render(<HubView />, { wrapper: Providers });

    fireEvent.click(screen.getByRole("button", { name: es.hoy.askSug1 }));

    expect(push).toHaveBeenCalledWith(`/preguntar?q=${encodeURIComponent(es.hoy.askSug1)}`);
  });
});
