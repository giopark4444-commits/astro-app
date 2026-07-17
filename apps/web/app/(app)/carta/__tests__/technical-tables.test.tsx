import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../../messages/es.json";
import { PositionsTable } from "../positions-table";
import { AspectList } from "../aspect-list";

const SUN = { body: "sun", sign: "aquarius", degree: 15, minute: 57, second: 0, house: 11, dignity: "exile", retrograde: false, speed: 1.01, longitude: 315.95 } as never;
const TRINE = { a: "sun", b: "moon", aspect: "trine", orb: 1.2, applying: true, harmony: "soft" } as never;

const wrap = (ui: React.ReactElement) =>
  render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);

describe("PositionsTable", () => {
  it("selecciona body / sign / house desde las celdas", () => {
    const onSelect = vi.fn();
    wrap(<PositionsTable bodies={[SUN]} pro={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Sol/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "body", body: SUN });
    fireEvent.click(screen.getByRole("button", { name: /Acuario/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "sign", sign: "aquarius" });
    fireEvent.click(screen.getByRole("button", { name: /Casa 11/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "house", house: 11 });
  });

  it("dignidad solo con pro", () => {
    const { rerender } = wrap(<PositionsTable bodies={[SUN]} pro={false} onSelect={() => {}} />);
    expect(screen.queryByText(/Exilio/)).toBeNull();
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <PositionsTable bodies={[SUN]} pro={true} onSelect={() => {}} />
    </NextIntlClientProvider>);
    expect(screen.getByText(/Exilio/)).toBeTruthy();
  });
});

describe("AspectList", () => {
  it("fila entera selecciona el aspecto; orbe solo con pro", () => {
    const onSelect = vi.fn();
    const { rerender } = wrap(<AspectList aspects={[TRINE]} pro={false} onSelect={onSelect} />);
    expect(screen.queryByText(/1\.2°/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "aspect", aspect: TRINE });
    rerender(<NextIntlClientProvider locale="es" messages={es}>
      <AspectList aspects={[TRINE]} pro={true} onSelect={onSelect} />
    </NextIntlClientProvider>);
    expect(screen.getByText(/1\.2°/)).toBeTruthy();
  });
});
