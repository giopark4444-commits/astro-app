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
    const { rerender } = wrap(
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
    // romanización junto al glifo (pinyin del pilar del día: 甲=jiǎ, 子=zǐ)
    expect(screen.getByText(/jiǎ zǐ/)).toBeTruthy();
    // con script="hangul" se usa .romanKo en vez de pinyin (갑=gap, 자=ja)
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresInterpretation
          selected={{ kind: "reading" }}
          pro={true}
          set={SET}
          profileId="p1"
          profileName="Gio"
          script="hangul"
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/갑자/)).toBeTruthy();
    expect(screen.getByText(/gap ja/)).toBeTruthy();
  });

  it("pillar: glosario de tronco y rama; ocultos solo con pro", () => {
    const sel = { kind: "pillar", which: "day", pillar: { stem: 0, branch: 0 } } as never;
    const { rerender } = wrap(
      <PilaresInterpretation selected={sel} pro={false} set={SET} profileId="p1" profileName="Gio" script="hanzi" />,
    );
    // bazi.stem.jia (甲, madera yang) y bazi.branch.zi (子, rata) — cuerpos del glosario
    expect(document.body.textContent).toMatch(/甲/);
    expect(screen.queryByText(/Troncos ocultos/i)).toBeNull(); // sin pro no hay técnico
    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PilaresInterpretation selected={sel} pro={true} set={SET} profileId="p1" profileName="Gio" script="hanzi" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/Troncos ocultos/i)).toBeTruthy(); // pro añade ocultos
    expect(screen.getByText(/Las 12 etapas/i)).toBeTruthy(); // pro añade la etapa
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

  it("resuelve el título de 'element' vía glosario, respetando el locale (4º parámetro)", () => {
    const L = baziLabels("es");
    const t = (k: string) => k;
    expect(pilarSelectionTitle({ kind: "element", element: "wood", count: 3 }, t as never, L, "es")).toBe("Madera");
    expect(pilarSelectionTitle({ kind: "element", element: "wood", count: 3 }, t as never, L, "en")).toBe("Wood");
  });

  it("resuelve el título de 'term' vía glosario", () => {
    const L = baziLabels("es");
    const t = (k: string) => k;
    expect(pilarSelectionTitle({ kind: "term", key: "bazi.term.daymaster" }, t as never, L, "es")).toBe(
      "Maestro del Día",
    );
  });
});
