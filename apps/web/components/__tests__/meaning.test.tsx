import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../messages/es.json";
import { Meaning } from "../meaning";

function wrap(ui: React.ReactNode) {
  return render(<NextIntlClientProvider locale="es" messages={es}>{ui}</NextIntlClientProvider>);
}

describe("Meaning", () => {
  it("abre la hoja con el título y cuerpo del glosario al tocar", () => {
    wrap(<Meaning k="aspect.trine">Trígono</Meaning>);
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // título de la entrada semilla del glosario ES
    expect(screen.getAllByText(/Trígono/).length).toBeGreaterThan(1);
  });
  it("Escape cierra la hoja", () => {
    wrap(<Meaning k="aspect.trine">Trígono</Meaning>);
    fireEvent.click(screen.getByRole("button", { name: /Trígono/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("clave desconocida: children sin botón", () => {
    wrap(<Meaning k="no.existe">Texto</Meaning>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Texto")).toBeInTheDocument();
  });
});
