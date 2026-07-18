// apps/web/app/(app)/horoscopo/__tests__/interpretation-content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import type { WesternPayload } from "@/lib/horoscope/western";
import type { EasternPayload } from "@/lib/horoscope/eastern";
import { HoroscopoInterpretation, horoscopoSelectionTitle } from "../interpretation-content";

// Fixture occidental — mismo payload mínimo que horoscopo-view.test.tsx (rama
// occidental): suficiente para que composeWesternProse produzca prosa no vacía
// (signo con ADN en HOROSCOPE_SIGNS_ES + un driver favorable + una lunación).
const WESTERN: WesternPayload = {
  sign: "aquarius", period: "today", tz: "utc",
  range: { fromIso: "2026-07-13T00:00:00Z", toIso: "2026-07-13T23:59:59Z" },
  houses: [{ body: "sun", sign: "cancer", house: 6, retrograde: false }],
  signAspects: [{ body: "saturn", sign: "aries", aspect: "sextile", harmony: "soft" }],
  events: [{ kind: "lunation", atIso: "2026-07-13T10:00:00Z", phase: "full", sign: "capricorn", longitude: 291, eclipse: null }],
  areas: [{ area: "work", score: 62, tone: "high", drivers: [{ body: "jupiter", house: 10, favorable: true }] }],
};

// Fixture oriental — mismo payload mínimo que eastern-view.test.tsx (vista año,
// caballo 丙午): suficiente para que composeEasternProse produzca prosa no vacía.
const EASTERN: EasternPayload = {
  animal: "horse",
  period: "year",
  tz: "utc",
  range: { fromIso: "2026-02-03T20:02:00Z", toIso: "2027-02-04T02:00:00Z" },
  solarYear: 2026,
  pillars: {
    year: { stem: 2, branch: 6, stemHanzi: "丙", branchHanzi: "午", animal: "horse" },
    month: null,
    day: null,
  },
  jieDates: [{ atIso: "2026-08-07T10:00:00Z", solarLongitude: 135 }],
  interactions: [
    { pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false },
  ],
  clash: null,
  harmonies: [],
  taiSui: [{ kind: "zhi" }, { kind: "zixing" }],
  monthChange: { atIso: "2026-08-07T10:00:00Z" },
  wuXing: { periodElement: "fire", animalElement: "fire", relation: "same" },
  toneBalance: "tense",
  areas: [
    { area: "work", score: 58, tone: "mixed", drivers: [] },
    { area: "money", score: 58, tone: "mixed", drivers: [] },
    { area: "love", score: 58, tone: "mixed", drivers: [] },
    { area: "health", score: 52, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -6 }] },
    { area: "luck", score: 54, tone: "mixed", drivers: [{ pillar: "year", type: "self_punishment", withBranch: 6, withAnimal: "horse", favorable: false, delta: -4 }] },
  ],
};

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("HoroscopoInterpretation", () => {
  it("reading occidental sin pro: prosa compuesta (sin tiers) + el hint cableado", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{ kind: "reading" }}
        pro={false}
        trad="occidental"
        western={WESTERN}
        eastern={null}
        profileName="Gio"
      />,
    );
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
    // la prosa compuesta menciona el ADN del signo (Acuario) — no vacía
    expect(document.body.textContent!.length).toBeGreaterThan(80);
    expect(screen.getByText(es.horoscopo.interpHint)).toBeTruthy();
  });

  it("reading occidental con pro: HoroscopeReading (tiers) con las props del callsite occidental actual", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{ kind: "reading" }}
        pro={true}
        trad="occidental"
        western={WESTERN}
        eastern={null}
        profileName="Gio"
      />,
    );
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Profunda/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Completa/i })).toBeTruthy();
    // sin Pro había hint cableado; con Pro el propio HoroscopeReading lo reemplaza
    expect(screen.queryByText(es.horoscopo.interpHint)).toBeNull();
  });

  it("reading oriental con pro: HoroscopeReading (tiers) con composeEasternProse como esencia", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{ kind: "reading" }}
        pro={true}
        trad="oriental"
        western={null}
        eastern={EASTERN}
        profileName="Gio"
      />,
    );
    expect(screen.getByRole("tab", { name: /Esencia/i })).toBeTruthy();
    expect(document.body.textContent!.length).toBeGreaterThan(80);
  });

  it("reading oriental sin pro: prosa + hint, sin tiers", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{ kind: "reading" }}
        pro={false}
        trad="oriental"
        western={null}
        eastern={EASTERN}
        profileName="Gio"
      />,
    );
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
    expect(screen.getByText(es.horoscopo.interpHint)).toBeTruthy();
  });

  it("payload null (branch activa aún cargando) → interpHint sola", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{ kind: "reading" }}
        pro={true}
        trad="occidental"
        western={null}
        eastern={null}
        profileName="Gio"
      />,
    );
    expect(screen.getByText(es.horoscopo.interpHint)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Esencia/i })).toBeNull();
  });

  it("area con 2 drivers (uno con glosario, uno sin): cabecera + glifo/label + body del glosario solo donde resuelve", () => {
    wrap(
      <HoroscopoInterpretation
        selected={{
          kind: "area",
          area: "work",
          level: "high",
          drivers: [
            { label: "Júpiter — casa 10", glossKey: "planet.sun", glyph: "☉" },
            { label: "Sin glosario", glossKey: null, glyph: "•" },
          ],
        }}
        pro={false}
        trad="occidental"
        western={WESTERN}
        eastern={null}
        profileName="Gio"
      />,
    );
    expect(screen.getByText("Trabajo")).toBeTruthy(); // hoy.areaWork
    expect(screen.getByText("fluida")).toBeTruthy(); // hoy.toneHigh
    expect(screen.getByText(/Júpiter — casa 10/)).toBeTruthy();
    expect(screen.getByText(/Sin glosario/)).toBeTruthy();
    // el body del glosario de "planet.sun" aparece completo (glossKey resuelto)...
    expect(screen.getByText(/El centro de tu carta/)).toBeTruthy();
    // ...pero solo una vez (el driver sin glossKey no produce un segundo body)
    expect(screen.getAllByText(/El centro de tu carta/).length).toBe(1);
  });

  it("term: patrón pilares exacto (title+glyph+body de glossaryEntry); null si no existe", () => {
    const { rerender, container } = wrap(
      <HoroscopoInterpretation
        selected={{ kind: "term", key: "sign.aries" }}
        pro={false}
        trad="occidental"
        western={WESTERN}
        eastern={null}
        profileName="Gio"
      />,
    );
    expect(screen.getByText("Aries")).toBeTruthy();
    expect(screen.getByText("♈")).toBeTruthy();
    expect(document.body.textContent).toMatch(/chispa que enciende/);

    rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <HoroscopoInterpretation
          selected={{ kind: "term", key: "no.existe" }}
          pro={false}
          trad="occidental"
          western={WESTERN}
          eastern={null}
          profileName="Gio"
        />
      </NextIntlClientProvider>,
    );
    expect(container.textContent).toBe("");
  });
});

describe("horoscopoSelectionTitle", () => {
  const t = (k: string) =>
    (({ "horoscopo.interpTitle": "Interpretación" }) as Record<string, string>)[k] ?? k;

  it("reading → horoscopo.interpTitle", () => {
    expect(horoscopoSelectionTitle({ kind: "reading" }, t, "es")).toBe("Interpretación");
  });

  it("area → resuelve el label vía AREA_KEY (namespace hoy)", () => {
    const tHoy = (k: string) => (k === "hoy.areaWork" ? "Trabajo" : k);
    expect(
      horoscopoSelectionTitle({ kind: "area", area: "work", level: "high", drivers: [] }, tHoy, "es"),
    ).toBe("Trabajo");
  });

  it("term → resuelve el título vía glosario, respetando el locale", () => {
    expect(horoscopoSelectionTitle({ kind: "term", key: "sign.aries" }, t, "es")).toBe("Aries");
    expect(horoscopoSelectionTitle({ kind: "term", key: "sign.aries" }, t, "en")).toBe("Aries");
  });
});
