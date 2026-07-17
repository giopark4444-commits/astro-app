import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SettingsControls } from "../settings-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ theme: "observatory", setTheme: vi.fn(), mode: "dark", setMode: vi.fn() }),
}));
vi.mock("../actions", () => ({
  setLanguage: vi.fn(),
}));
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

function renderControls() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SettingsControls currentLocale="es" email="gio@example.com" hasIntent intentUseInAI={false} />
    </NextIntlClientProvider>,
  );
}

describe("SettingsControls", () => {
  it("muestra las tarjetas de swatch (móvil) y las filas compactas (desktop) a la vez, ocultas por CSS espejo", () => {
    renderControls();
    // ambos bloques existen en el DOM (el toggle es puramente CSS por breakpoint)
    expect(screen.getAllByRole("group", { name: "Tema" })).toHaveLength(2);
  });

  it("el pie de cuenta (desktop) muestra el correo y un botón para cerrar sesión", () => {
    renderControls();
    expect(screen.getByText("gio@example.com")).toBeInTheDocument();
    const signOutBtn = screen.getByRole("button", { name: "Salir" });
    expect(signOutBtn).toBeInTheDocument();
    expect(signOutBtn.closest("form")).toHaveAttribute("action");
  });

  it("las filas compactas de tema incluyen el circulito de glifo por swatch", () => {
    renderControls();
    const groups = screen.getAllByRole("group", { name: "Tema" });
    // el segundo grupo (filas compactas) trae los <i> de glifo con data-theme-dot
    const compactGroup = groups[1]!;
    expect(within(compactGroup).getAllByRole("button")).toHaveLength(3);
  });
});
