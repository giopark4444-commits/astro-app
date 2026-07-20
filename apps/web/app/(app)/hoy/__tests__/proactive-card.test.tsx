import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import type { Commitment } from "@/lib/memory-commitments";
import { HubView } from "../hub-view";

// Mismo patrón de mocks que ask-cta.test.tsx/lenses.test.tsx (useProfiles +
// next/navigation). Además se mockea la server action que HubView llama al
// descartar un compromiso — invocarla de verdad requeriría next/headers
// (cookies()) fuera de un request real.
const { mockActive, dismissCommitmentAction } = vi.hoisted(() => ({
  mockActive: {
    current: { id: "profile-1", name: "Gio", birth_date: "1990-01-01" } as {
      id: string;
      name: string;
      birth_date: string;
    } | null,
  },
  dismissCommitmentAction: vi.fn(async () => {}),
}));

vi.mock("@/lib/profiles/profiles-provider", () => ({ useProfiles: () => ({ active: mockActive.current }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// "../../actions" (NO "../actions"): este test vive un nivel más adentro
// (__tests__/) que hub-view.tsx — el specifier de vi.mock se resuelve
// relativo al archivo que lo declara, así que tiene que apuntar al mismo
// app/(app)/actions.ts que hub-view.tsx importa como "../actions".
vi.mock("../../actions", () => ({ dismissCommitmentAction }));

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={es}>
      {children}
    </NextIntlClientProvider>
  );
}

const HARVEST_DUE_AT = "2026-07-25T00:00:00.000Z";
// Mismo cálculo que commitmentText en hub-view.tsx (medianoche LOCAL, no la
// UTC de due_at) — así el test no depende de la zona horaria de quien corre
// vitest ni de asumir un formato de fecha específico.
const EXPECTED_DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" }).format(
  new Date(`${HARVEST_DUE_AT.slice(0, 10)}T00:00:00`),
);

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c1",
    description: "Un año de estabilidad financiera",
    kind: "manifestation",
    status: "open",
    due_at: HARVEST_DUE_AT,
    source_ref: "manifestation:m1",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("HubView — tarjeta proactiva «Aluna te recuerda» (Fase 2 T4)", () => {
  beforeEach(() => {
    mockActive.current = { id: "profile-1", name: "Gio", birth_date: "1990-01-01" };
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ transitAspects: [] }) })) as unknown as typeof fetch;
    dismissCommitmentAction.mockClear();
  });

  it("no renderiza la tarjeta si no hay compromisos", () => {
    render(<HubView commitments={[]} />, { wrapper: Providers });
    expect(screen.queryByText(new RegExp(es.hoy.proactive.title))).not.toBeInTheDocument();
  });

  it("muestra la cosecha de una manifestación con la fecha formateada", () => {
    render(<HubView commitments={[commitment()]} />, { wrapper: Providers });

    // el título va precedido del glifo "✦ " en el mismo nodo de texto — se
    // busca por regex en vez de igualdad exacta (mismo criterio que
    // lenses.test.tsx con el nombre del link).
    expect(screen.getByText(new RegExp(es.hoy.proactive.title))).toBeInTheDocument();
    const expected = es.hoy.proactive.manifestationHarvest
      .replace("{intention}", "Un año de estabilidad financiera")
      .replace("{date}", EXPECTED_DATE);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("sin due_at usa el texto genérico", () => {
    render(<HubView commitments={[commitment({ due_at: null })]} />, { wrapper: Providers });
    const expected = es.hoy.proactive.genericReminder.replace("{description}", "Un año de estabilidad financiera");
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("el enlace «hablar de esto» navega a /preguntar con la pregunta prellenada", () => {
    render(<HubView commitments={[commitment()]} />, { wrapper: Providers });
    const question = es.hoy.proactive.talkAboutQuestion.replace("{intention}", "Un año de estabilidad financiera");
    const link = screen.getByRole("link", { name: new RegExp(es.hoy.proactive.talkAbout) });
    expect(link).toHaveAttribute("href", `/preguntar?q=${encodeURIComponent(question)}`);
  });

  it("descartar quita el compromiso al instante (optimista) y llama a la server action", () => {
    render(<HubView commitments={[commitment()]} />, { wrapper: Providers });

    fireEvent.click(screen.getByRole("button", { name: es.hoy.proactive.dismiss }));

    expect(dismissCommitmentAction).toHaveBeenCalledWith("c1");
    // la tarjeta entera desaparece: era el único compromiso
    expect(screen.queryByText(new RegExp(es.hoy.proactive.title))).not.toBeInTheDocument();
  });

  it("descartar uno de varios deja los demás visibles", () => {
    const other = commitment({ id: "c2", description: "Otra intención", due_at: null });
    render(<HubView commitments={[commitment(), other]} />, { wrapper: Providers });

    fireEvent.click(screen.getAllByRole("button", { name: es.hoy.proactive.dismiss })[0]!);

    expect(dismissCommitmentAction).toHaveBeenCalledWith("c1");
    expect(screen.getByText(new RegExp(es.hoy.proactive.title))).toBeInTheDocument();
    expect(screen.getByText(/Otra intención/)).toBeInTheDocument();
  });
});
