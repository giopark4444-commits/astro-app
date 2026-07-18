// apps/web/app/(app)/pilares/__tests__/interpretation-content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { PilaresInterpretation, pilarSelectionTitle } from "../interpretation-content";
import { baziLabels } from "@/lib/content/bazi-labels";

// Set determinista: 2000-01-07 = día 甲子 (referencia documentada del repo).
const SET = {
  year: { stem: 5, branch: 3 }, // 己卯
  month: { stem: 2, branch: 0 }, // 丙子
  day: { stem: 0, branch: 0 }, // 甲子
  hour: { stem: 9, branch: 11 }, // 癸亥
} as never;

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("PilaresInterpretation", () => {
  it("reading sin pro: solo la esencia compuesta (sin tiers)", () => {
    wrap(
      <PilaresInterpretation
        selected={{ kind: "reading" }}
        pro={false}
        set={SET}
        profileId="p1"
        profileName="Gio"
        script="hanzi"
      />,
    );
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
    expect(screen.queryByText("Tus pilares, en datos")).toBeNull();
    // la esencia compuesta menciona al Maestro del Día (voz del tronco 甲)
    expect(document.body.textContent!.length).toBeGreaterThan(80);
  });

  it("reading con pro: BaziReadingView (tiers) + pilares en datos", () => {
    wrap(
      <PilaresInterpretation
        selected={{ kind: "reading" }}
        pro={true}
        set={SET}
        profileId="p1"
        profileName="Gio"
        script="hanzi"
      />,
    );
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
    expect(screen.getByText("Tus pilares, en datos")).toBeTruthy();
    expect(screen.getByText(/甲子/)).toBeTruthy(); // glifo del pilar del día
  });

  it("pillar: glosario de tronco y rama; ocultos solo con pro", () => {
    const sel = { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } } as never;
    const { rerender } = wrap(
      <PilaresInterpretation selected={sel} pro={false} set={SET} profileId="p1" profileName="Gio" script="hanzi" />,
    );
    // bazi.stem.jia (甲, madera yang) y bazi.branch.zi (子, rata) — cuerpos del glosario
    expect(document.body.textContent).toMatch(/甲/);
    const before = document.body.textContent!;
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresInterpretation selected={sel} pro={true} set={SET} profileId="p1" profileName="Gio" script="hanzi" />
      </NextIntlClientProvider>,
    );
    expect(document.body.textContent!.length).toBeGreaterThan(before.length); // pro añade ocultos/nayin/etapa
  });

  it("element / decade / term rinden su contenido", () => {
    const { rerender } = wrap(
      <PilaresInterpretation
        selected={{ kind: "element", element: "wood", count: 3 }}
        pro={false}
        set={SET}
        profileId="p1"
        profileName="Gio"
        script="hanzi"
      />,
    );
    expect(screen.getByText(/3/)).toBeTruthy();
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresInterpretation
          selected={{ kind: "decade", glyph: "甲子", god: "peer", nayinLabel: "X", startYear: 1998, startAge: 8 }}
          pro={false}
          set={SET}
          profileId="p1"
          profileName="Gio"
          script="hanzi"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/de los 8 a los 17 años/)).toBeTruthy();
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresInterpretation
          selected={{ kind: "term", key: "bazi.term.daymaster" }}
          pro={false}
          set={SET}
          profileId="p1"
          profileName="Gio"
          script="hanzi"
        />
      </NextIntlClientProvider>,
    );
    expect(document.body.textContent!.length).toBeGreaterThan(60); // cuerpo del glosario
  });
});

describe("pilarSelectionTitle", () => {
  it("compone títulos por kind", () => {
    const L = baziLabels("es");
    const t = (k: string) =>
      (({ "pilares.interpTitle": "Interpretación", "pilares.day": "Día" }) as Record<string, string>)[k] ?? k;
    expect(pilarSelectionTitle({ kind: "reading" }, t as never, L, "es")).toBe("Interpretación");
    expect(
      pilarSelectionTitle(
        { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } as never },
        t as never,
        L,
        "es",
      ),
    ).toContain("Día");
  });
});
