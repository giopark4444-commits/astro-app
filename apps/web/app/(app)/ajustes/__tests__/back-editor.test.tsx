import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { BackEditor } from "../back-editor";

// Editor de reverso (Tarot T4 Task 5): el preview usa buildBackSvg
// (@aluna/core) — mismos tests cubren que el markup/preview refleje el
// config al cambiar símbolo/color, y que quede deshabilitado en estado
// latente (available=false).

function renderEditor(available = true) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <BackEditor available={available} backKind="none" backUrl={null} onSaved={vi.fn()} />
    </NextIntlClientProvider>,
  );
}

describe("BackEditor", () => {
  it("el preview cambia al elegir otro símbolo", () => {
    renderEditor();
    const preview = screen.getByAltText(es.settings.deckBackEditorTitle) as HTMLImageElement;
    const initialSrc = preview.src;

    fireEvent.click(screen.getByRole("button", { name: es.settings.deckBackSymbolMoon }));

    expect(preview.src).not.toBe(initialSrc);
    // La luna se dibuja con círculos (disco + mordisco), no con <path> —
    // ver fix del creciente que se renderizaba vacío en back-svg.ts.
    expect(decodeURIComponent(preview.src)).toContain("<circle");
  });

  it("el preview cambia al elegir otro color de borde", () => {
    renderEditor();
    const preview = screen.getByAltText(es.settings.deckBackEditorTitle) as HTMLImageElement;
    const initialSrc = preview.src;

    fireEvent.click(screen.getByRole("button", { name: "#e7c986" }));

    expect(preview.src).not.toBe(initialSrc);
    expect(decodeURIComponent(preview.src)).toContain("#e7c986");
  });

  it("el preview cambia al elegir otro color de fondo", () => {
    renderEditor();
    const preview = screen.getByAltText(es.settings.deckBackEditorTitle) as HTMLImageElement;
    const initialSrc = preview.src;

    fireEvent.click(screen.getByRole("button", { name: "#1a2150" }));

    expect(preview.src).not.toBe(initialSrc);
    expect(decodeURIComponent(preview.src)).toContain("#1a2150");
  });

  it("estado latente (available=false): deshabilita Guardar pero deja VIVOS los controles de diseño", () => {
    renderEditor(false);

    // Guardar toca el bucket → deshabilitado sin Storage.
    expect(screen.getByRole("button", { name: /Guardar reverso/i })).toBeDisabled();
    // Los controles de diseño siguen vivos: el preview es puro cliente, así que
    // se puede diseñar y ver el reverso desde ya (solo no se puede guardar aún).
    expect(screen.getByRole("button", { name: "#c9a227" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: es.settings.deckBackSymbolStar })).not.toBeDisabled();

    // Y el preview reacciona al elegir símbolo aun en latente.
    const preview = screen.getByAltText(es.settings.deckBackEditorTitle) as HTMLImageElement;
    const before = preview.src;
    fireEvent.click(screen.getByRole("button", { name: es.settings.deckBackSymbolMoon }));
    expect(preview.src).not.toBe(before);
  });
});
