import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import type { NatalReport, SolarReport } from "@/lib/reports/types";
import {
  NatalContent,
  SolarContent,
  natalTocEntries,
  solarTocEntries,
  buildTocGroups,
  type ViewState,
} from "../informe-view";

const fixtureNatal: NatalReport = {
  intro: "Intro de prueba",
  sections: [
    { key: "essence", title: "Esencia", body: "cuerpo esencia" },
    { key: "emotional", title: "Emocional", body: "cuerpo emocional" },
    { key: "path", title: "Camino", body: "cuerpo camino" },
    { key: "challenges", title: "Desafíos", body: "cuerpo desafíos" },
  ],
  outro: "Outro de prueba",
};

const fixtureSolar: SolarReport = {
  year: 2026,
  essay: "Ensayo de prueba",
  themes: [
    { title: "Tema uno", why: "porque uno", invitation: "invita uno" },
    { title: "Tema dos", why: "porque dos", invitation: "invita dos" },
  ],
  mantra: "Mantra de prueba",
};

function renderWithIntl(node: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("NatalContent", () => {
  it("pone un id ancla en cada .section (intro, cada sección, outro)", () => {
    const { container } = renderWithIntl(<NatalContent content={fixtureNatal} />);
    expect(container.querySelector("#report-natal-intro")).not.toBeNull();
    expect(container.querySelector("#report-natal-essence")).not.toBeNull();
    expect(container.querySelector("#report-natal-emotional")).not.toBeNull();
    expect(container.querySelector("#report-natal-path")).not.toBeNull();
    expect(container.querySelector("#report-natal-challenges")).not.toBeNull();
    expect(container.querySelector("#report-natal-outro")).not.toBeNull();
  });
});

describe("SolarContent", () => {
  it("pone un id ancla en cada .section (ensayo, cada tema, mantra)", () => {
    const { container } = renderWithIntl(<SolarContent content={fixtureSolar} />);
    expect(container.querySelector("#report-solar-essay")).not.toBeNull();
    expect(container.querySelector("#report-solar-theme-0")).not.toBeNull();
    expect(container.querySelector("#report-solar-theme-1")).not.toBeNull();
    expect(container.querySelector("#report-solar-mantra")).not.toBeNull();
  });
});

describe("natalTocEntries", () => {
  it("arma las entradas en orden intro → secciones → outro", () => {
    const entries = natalTocEntries(fixtureNatal, { intro: "Introducción", outro: "Cierre" });
    expect(entries).toEqual([
      { id: "report-natal-intro", label: "Introducción" },
      { id: "report-natal-essence", label: "Esencia" },
      { id: "report-natal-emotional", label: "Emocional" },
      { id: "report-natal-path", label: "Camino" },
      { id: "report-natal-challenges", label: "Desafíos" },
      { id: "report-natal-outro", label: "Cierre" },
    ]);
  });
});

describe("solarTocEntries", () => {
  it("arma las entradas en orden ensayo → temas → mantra", () => {
    const entries = solarTocEntries(fixtureSolar, { essay: "Ensayo del año", mantra: "Mantra" });
    expect(entries).toEqual([
      { id: "report-solar-essay", label: "Ensayo del año" },
      { id: "report-solar-theme-0", label: "Tema uno" },
      { id: "report-solar-theme-1", label: "Tema dos" },
      { id: "report-solar-mantra", label: "Mantra" },
    ]);
  });
});

describe("buildTocGroups", () => {
  const labels = {
    natalHeading: "Carta natal",
    solarHeading: "Revolución Solar 2026",
    introLabel: "Introducción",
    outroLabel: "Cierre",
    essayLabel: "Ensayo del año",
    mantraLabel: "Mantra",
  };

  it("devuelve [] cuando ningún informe está ready", () => {
    const groups = buildTocGroups({
      natal: { s: "none" } as ViewState,
      solar: { s: "loading" } as ViewState,
      ...labels,
    });
    expect(groups).toEqual([]);
  });

  it("devuelve solo el grupo natal cuando solo natal está ready", () => {
    const groups = buildTocGroups({
      natal: { s: "ready", content: fixtureNatal, modelUsed: null } as ViewState,
      solar: { s: "dormant" } as ViewState,
      ...labels,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.heading).toBe("Carta natal");
    expect(groups[0]!.entries).toHaveLength(6);
  });

  it("devuelve ambos grupos, natal primero, cuando los dos están ready", () => {
    const groups = buildTocGroups({
      natal: { s: "ready", content: fixtureNatal, modelUsed: null } as ViewState,
      solar: { s: "ready", content: fixtureSolar, modelUsed: "claude" } as ViewState,
      ...labels,
    });
    expect(groups.map((g) => g.heading)).toEqual(["Carta natal", "Revolución Solar 2026"]);
  });
});
