import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ShareButton } from "../share-button";

// El modal real hace fetch de /api/share-card vía <img src>; jsdom no hace
// red de verdad, así que estos tests solo verifican que el botón abre el
// diálogo (el contenido del modal lo cubre share-modal.test.tsx).
function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={vi.fn()}>
        <ShareButton params={{ lens: "numeros", number: 7, labelKey: "lifePath" }} />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

describe("ShareButton", () => {
  it("renderiza el botón icon-only 'Compartir', modal cerrado", () => {
    renderButton();
    expect(screen.getByRole("button", { name: es.share.share })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre el modal de compartir al hacer click", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: es.share.share }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label", es.share.title);
  });
});
