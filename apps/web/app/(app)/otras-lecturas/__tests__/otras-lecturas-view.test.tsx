import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";

let lente: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => lente }),
  usePathname: () => "/otras-lecturas",
}));
// Las vistas reales son pesadas (fetch, providers): se mockean para probar solo
// el ruteo de pestañas de OtrasLecturasView.
vi.mock("../../numeros/numerology-view", () => ({ NumerologyView: () => <div>NUMEROS_MOCK</div> }));
vi.mock("../../pilares/pilares-view", () => ({ PilaresView: () => <div>PILARES_MOCK</div> }));

import { OtrasLecturasView } from "../otras-lecturas-view";

function renderView(l: string | null) {
  lente = l;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <OtrasLecturasView />
    </NextIntlClientProvider>,
  );
}

describe("OtrasLecturasView", () => {
  it("renderiza las tres pestañas (Números, Pilares, Mano)", () => {
    renderView(null);
    expect(screen.getByRole("tab", { name: es.otrasLecturas.numerosTitle })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: es.otrasLecturas.pilaresTitle })).toBeInTheDocument();
    expect(screen.getByText(es.otrasLecturas.manoTitle)).toBeInTheDocument();
  });

  it("sin lente: abre Números y su pestaña queda activa (→/otras-lecturas)", () => {
    renderView(null);
    expect(screen.getByText("NUMEROS_MOCK")).toBeInTheDocument();
    expect(screen.queryByText("PILARES_MOCK")).toBeNull();
    const numerosTab = screen.getByRole("tab", { name: es.otrasLecturas.numerosTitle });
    expect(numerosTab.getAttribute("aria-selected")).toBe("true");
    expect(numerosTab.getAttribute("href")).toBe("/otras-lecturas");
  });

  it("lente=pilares: muestra Pilares con su pestaña activa (→/otras-lecturas?lente=pilares)", () => {
    renderView("pilares");
    expect(screen.getByText("PILARES_MOCK")).toBeInTheDocument();
    expect(screen.queryByText("NUMEROS_MOCK")).toBeNull();
    const pilaresTab = screen.getByRole("tab", { name: es.otrasLecturas.pilaresTitle });
    expect(pilaresTab.getAttribute("aria-selected")).toBe("true");
    expect(pilaresTab.getAttribute("href")).toBe("/otras-lecturas?lente=pilares");
  });

  it("lente basura (?lente=foo) cae en Números", () => {
    renderView("foo");
    expect(screen.getByText("NUMEROS_MOCK")).toBeInTheDocument();
    expect(screen.queryByText("PILARES_MOCK")).toBeNull();
    expect(screen.getByRole("tab", { name: es.otrasLecturas.numerosTitle }).getAttribute("aria-selected")).toBe("true");
  });

  it("la pestaña Mano está marcada como deshabilitada/pronto y no navega", () => {
    renderView(null);
    const manoTab = screen.getByText(es.otrasLecturas.manoTitle).closest('[role="tab"]');
    expect(manoTab).not.toBeNull();
    expect(manoTab!.getAttribute("aria-disabled")).toBe("true");
    expect(manoTab!.tagName).not.toBe("A");
    expect(screen.getByText(es.otrasLecturas.soon)).toBeInTheDocument();
  });
});
