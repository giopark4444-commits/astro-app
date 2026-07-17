import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { tenGod, type Pillar } from "@aluna/core";
import es from "@/messages/es.json";
import { PillarColumn, GOD_KEY } from "../pillar-column";

const esPilares = es.pilares as Record<string, string>;

function renderColumn(props: Partial<Parameters<typeof PillarColumn>[0]> = {}) {
  const pillar: Pillar = props.pillar ?? { stem: 6, branch: 0 };
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PillarColumn
        posKey={props.posKey ?? "day"}
        pillar={pillar}
        isDay={props.isDay ?? true}
        dayMaster={props.dayMaster ?? pillar.stem}
        pro={props.pro ?? false}
        script={props.script ?? "hanzi"}
        index={props.index ?? 0}
      />
    </NextIntlClientProvider>,
  );
}

describe("PillarColumn", () => {
  it("renderiza el badge del Maestro del Día y los troncos ocultos SIEMPRE, incluso con pro=false", () => {
    renderColumn({ isDay: true, pro: false });
    expect(screen.getByText(esPilares.dayMasterHanzi!)).toBeInTheDocument();
    expect(screen.getByText(esPilares.hiddenStems!)).toBeInTheDocument();
  });

  it("con isDay=false calcula y muestra el Dios del tronco, incluso con pro=false", () => {
    const pillar: Pillar = { stem: 2, branch: 4 };
    const dayMaster = 6;
    renderColumn({ posKey: "month", pillar, isDay: false, dayMaster, pro: false, index: 1 });
    const god = tenGod(dayMaster, pillar.stem);
    expect(screen.getByText(esPilares[GOD_KEY[god]]!)).toBeInTheDocument();
  });

  it("marca data-pro en la raíz según el prop `pro`", () => {
    const { container: off } = renderColumn({ pro: false });
    expect(off.firstElementChild).not.toHaveAttribute("data-pro");
    const { container: on } = renderColumn({ pro: true });
    expect(on.firstElementChild).toHaveAttribute("data-pro", "true");
  });

  it("los hanzi grandes (tronco y rama) llevan la clase de ignición local (glow currentColor, no dorado)", () => {
    const pillar: Pillar = { stem: 6, branch: 0 };
    renderColumn({ pillar, script: "hanzi" });
    // .closest("span") en vez del elemento exacto: la capa de significados
    // (Meaning) puede envolver el glifo en un <button> propio, así que la
    // clase de ignición vive en el <span> ancestro, no siempre en el nodo
    // de texto directo.
    const stemChar = screen.getByText("庚").closest("span")!;
    const branchChar = screen.getByText("子").closest("span")!;
    expect(stemChar.className).toMatch(/charIgnite/);
    expect(branchChar.className).toMatch(/charIgnite/);
  });
});
