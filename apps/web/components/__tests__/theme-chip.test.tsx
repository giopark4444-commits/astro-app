import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { ThemeChip } from "../theme-chip";

vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ theme: "observatory", setTheme: vi.fn(), mode: "dark", setMode: vi.fn() }),
}));

describe("ThemeChip", () => {
  it("muestra el tema actual y enlaza a /perfil", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <ThemeChip />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/perfil");
    expect(link).toHaveTextContent("Observatorio");
  });
});
