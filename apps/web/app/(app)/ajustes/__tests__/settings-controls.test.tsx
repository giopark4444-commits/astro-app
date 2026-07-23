import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import { SettingsControls } from "../settings-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/theme/theme-provider", () => ({
  useTheme: () => ({ theme: "observatory", setTheme: vi.fn(), mode: "dark", setMode: vi.fn() }),
}));
// OJO: la ruta real (desde este archivo, dos niveles arriba de ajustes/) es
// "../../actions" (app/(app)/actions.ts) — "../actions" (un solo nivel)
// apuntaría a un archivo inexistente y el mock nunca calzaría con el import
// real de settings-controls.tsx (bug latente pre-existente, inofensivo
// mientras ningún test disparaba de verdad los botones; lo expone el nuevo
// test de guardado de memoria de abajo, que si lo necesita).
vi.mock("../../actions", () => ({
  setLanguage: vi.fn(),
  setIntentUseInAI: vi.fn(),
  setMemoryEnabled: vi.fn(),
}));

function renderControls(section: "memory" | "general" = "general") {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <SettingsControls section={section} currentLocale="es" hasIntent intentUseInAI={false} memoryEnabled />
    </NextIntlClientProvider>,
  );
}

describe("SettingsControls — section=\"general\" (Preferencias)", () => {
  it("muestra las tarjetas de swatch (móvil) y las filas compactas (desktop) a la vez, ocultas por CSS espejo", () => {
    renderControls("general");
    // ambos bloques existen en el DOM (el toggle es puramente CSS por breakpoint)
    expect(screen.getAllByRole("group", { name: "Tema" })).toHaveLength(2);
  });

  it("ya no trae pie de cuenta — Cuenta y Cerrar sesión viven en su propia sección de /ajustes", () => {
    renderControls("general");
    expect(screen.queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
  });

  it("las filas compactas de tema incluyen el circulito de glifo por swatch", () => {
    renderControls("general");
    const groups = screen.getAllByRole("group", { name: "Tema" });
    // el segundo grupo (filas compactas) trae los <i> de glifo con data-theme-dot
    const compactGroup = groups[1]!;
    expect(within(compactGroup).getAllByRole("button")).toHaveLength(6);
  });

  it("Task 6c: NO incluye el toggle de memoria — ese vive en section=\"memory\", dentro del grupo Memoria", () => {
    renderControls("general");
    expect(screen.queryByRole("group", { name: es.settings.memoryToggle })).not.toBeInTheDocument();
    expect(screen.queryByText(es.settings.memoryToggleHint)).not.toBeInTheDocument();
  });

  it("sigue trayendo idioma/intención/tema/modo-claro y la sección de Voz", () => {
    renderControls("general");
    expect(screen.getAllByRole("group", { name: "Idioma" })).toHaveLength(2);
    expect(screen.getAllByRole("group", { name: es.settings.intentAI })).toHaveLength(2);
    expect(screen.getByText(es.settings.voiceTitle)).toBeInTheDocument();
  });
});

describe("SettingsControls — section=\"memory\" (dentro del grupo Memoria)", () => {
  it("Task 6c: SOLO el toggle de memoria (móvil + fila compacta), nada de tema/idioma/intención/Voz", () => {
    renderControls("memory");
    expect(screen.getAllByRole("group", { name: es.settings.memoryToggle })).toHaveLength(2);
    expect(screen.queryByRole("group", { name: "Tema" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Idioma" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: es.settings.intentAI })).not.toBeInTheDocument();
    expect(screen.queryByText(es.settings.voiceTitle)).not.toBeInTheDocument();
  });

  it("el toggle de memoria sigue guardando con setMemoryEnabled (misma lógica de siempre)", async () => {
    const { setMemoryEnabled } = await import("../../actions");
    renderControls("memory");
    const groups = screen.getAllByRole("group", { name: es.settings.memoryToggle });
    // primer grupo = móvil; el botón "Apagada" enciende/apaga el estado optimista.
    const offBtn = within(groups[0]!).getByRole("button", { name: es.settings.memoryOff });
    fireEvent.click(offBtn);
    expect(vi.mocked(setMemoryEnabled)).toHaveBeenCalledWith(false);
  });
});
