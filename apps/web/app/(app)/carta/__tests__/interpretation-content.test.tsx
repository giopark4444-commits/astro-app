import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { InterpretationContent, selectionTitle } from "../interpretation-content";
import { astroLabels } from "@/lib/content/astrology-labels";

const SUN = { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: null, retrograde: false, speed: 1.01, longitude: 315.95 } as never;
const TRINE = { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never;

function mount(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>,
  );
}

describe("InterpretationContent", () => {
  it("core: muestra el núcleo tejido", () => {
    mount(<InterpretationContent selected={{ kind: "core" }} pro={false}
      coreSegs={[{ t: "Tu esencia " }, { b: "brilla" }]} profileName="Gio" />);
    expect(screen.getByText(/brilla/)).toBeTruthy();
  });

  it("core sin coreSegs: invita a tocar", () => {
    mount(<InterpretationContent selected={{ kind: "core" }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/Toca cualquier planeta/)).toBeTruthy();
  });

  it("body sin pro: essence sí, tiers no", () => {
    mount(<InterpretationContent selected={{ kind: "body", body: SUN }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/terreno de/)).toBeTruthy();       // essence compuesta
    expect(screen.queryByRole("tab", { name: /Profunda/i })).toBeNull(); // sin selector de tier
  });

  it("body con pro: BodyReadingView completo (tiers visibles)", () => {
    mount(<InterpretationContent selected={{ kind: "body", body: SUN }} pro={true} coreSegs={null} profileName="Gio" />);
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
  });

  it("aspect: glosario del trígono; orbe solo con pro", () => {
    const { rerender } = mount(<InterpretationContent selected={{ kind: "aspect", aspect: TRINE }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/Trígono/)).toBeTruthy();
    expect(screen.queryByText(/1\.2°/)).toBeNull();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "aspect", aspect: TRINE }} pro={true} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/1\.2°/)).toBeTruthy();
  });

  it("house / sign / pattern / ascendant: cuerpo de glosario", () => {
    const { rerender } = mount(<InterpretationContent selected={{ kind: "house", house: 7 }} pro={false} coreSegs={null} profileName="Gio" />);
    expect(screen.getByText(/espejo/)).toBeTruthy(); // house.7: "Es tu espejo"
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "sign", sign: "aquarius" }} pro={false} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    // exacto (no /Acuario/): el cuerpo del glosario también dice "Donde Acuario habita…"
    expect(screen.getByText("Acuario")).toBeTruthy();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <InterpretationContent selected={{ kind: "ascendant", sign: "pisces", degree: 26, minute: 6 }} pro={false} coreSegs={null} profileName="Gio" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/umbral/)).toBeTruthy(); // point.ascendant: "es umbral"
  });
});

describe("selectionTitle", () => {
  it("compone títulos por kind", () => {
    const L = astroLabels("es");
    const t = (k: string) => ({ interpTitle: "Interpretación", house: "Casa", ascendant: "Ascendente" })[k] ?? k;
    expect(selectionTitle({ kind: "core" }, L, t as never)).toBe("Interpretación");
    expect(selectionTitle({ kind: "body", body: SUN }, L, t as never)).toContain("Sol");
    expect(selectionTitle({ kind: "house", house: 7 }, L, t as never)).toContain("7");
  });
});
