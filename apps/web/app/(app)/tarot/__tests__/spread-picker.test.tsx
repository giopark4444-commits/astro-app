// apps/web/app/(app)/tarot/__tests__/spread-picker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SpreadPicker } from "../spread-picker";

function renderPicker(props: Partial<Parameters<typeof SpreadPicker>[0]> = {}) {
  const onPick = props.onPick ?? vi.fn();
  return {
    onPick,
    ...render(
      <NextIntlClientProvider locale="es" messages={es}>
        {props.exclude ? <SpreadPicker onPick={onPick} exclude={props.exclude} /> : <SpreadPicker onPick={onPick} />}
      </NextIntlClientProvider>,
    ),
  };
}

describe("SpreadPicker", () => {
  it("muestra la sección Recomendadas con una tirada primaria (Cruz celta) + su descripción", () => {
    renderPicker();
    expect(screen.getByText(es.tarot.spreadsGroupPrimary)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.spreadCelticCross)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.spreadCelticCrossDesc)).toBeInTheDocument();
  });

  it("muestra la sección Más tiradas con una tirada secundaria (Herradura)", () => {
    renderPicker();
    expect(screen.getByText(es.tarot.spreadsGroupSecondary)).toBeInTheDocument();
    expect(screen.getByText(es.tarot.spreadHorseshoe)).toBeInTheDocument();
  });

  it("tocar una tirada llama a onPick con su id", () => {
    const onPick = vi.fn();
    renderPicker({ onPick });

    screen.getByText(es.tarot.spreadCelticCross).closest("button")!.click();
    expect(onPick).toHaveBeenCalledWith("celtic-cross");

    screen.getByText(es.tarot.spreadHorseshoe).closest("button")!.click();
    expect(onPick).toHaveBeenCalledWith("horseshoe");
  });

  it("exclude oculta la tirada indicada (de cualquiera de los dos grupos)", () => {
    renderPicker({ exclude: ["celtic-cross"] });
    expect(screen.queryByText(es.tarot.spreadCelticCross)).not.toBeInTheDocument();
    // el resto de las primarias sigue presente
    expect(screen.getByText(es.tarot.spreadRelationship)).toBeInTheDocument();
  });

  it("exclude también filtra tiradas secundarias", () => {
    renderPicker({ exclude: ["horseshoe"] });
    expect(screen.queryByText(es.tarot.spreadHorseshoe)).not.toBeInTheDocument();
    expect(screen.getByText(es.tarot.spreadSimpleCross)).toBeInTheDocument();
  });

  it("cada opción es un botón con nombre accesible", () => {
    renderPicker();
    const celtic = screen.getByRole("button", { name: new RegExp(es.tarot.spreadCelticCross) });
    expect(celtic).toBeInTheDocument();
    const horseshoe = screen.getByRole("button", { name: es.tarot.spreadHorseshoe });
    expect(horseshoe).toBeInTheDocument();
  });
});
