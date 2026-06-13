import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../theme-provider";

function Probe() {
  const { theme, setTheme, mode, setMode } = useTheme();
  return (
    <div>
      <span data-testid="t">{theme}</span>
      <span data-testid="m">{mode}</span>
      <button onClick={() => setTheme("cosmic")}>t</button>
      <button onClick={() => setMode("light")}>m</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.mode;
  });

  it("aplica data-theme/data-mode en <html> y los actualiza, persistiendo", async () => {
    const persist = vi.fn();
    render(
      <ThemeProvider initialTheme="observatory" initialMode="dark" persist={persist}>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe("observatory");
    expect(document.documentElement.dataset.mode).toBe("dark");
    expect(screen.getByTestId("t").textContent).toBe("observatory");

    await act(async () => { screen.getByText("t").click(); });
    expect(document.documentElement.dataset.theme).toBe("cosmic");
    expect(persist).toHaveBeenCalledWith({ theme: "cosmic" });

    await act(async () => { screen.getByText("m").click(); });
    expect(document.documentElement.dataset.mode).toBe("light");
    expect(persist).toHaveBeenCalledWith({ light_mode: "light" });
  });

  it("modo 'auto' se resuelve a claro/oscuro (nunca deja 'auto' en el DOM)", () => {
    // matchMedia mock por defecto: matches=false -> prefiere claro
    render(
      <ThemeProvider initialTheme="observatory" initialMode="auto" persist={vi.fn()}>
        <Probe />
      </ThemeProvider>,
    );
    expect(["light", "dark"]).toContain(document.documentElement.dataset.mode);
    expect(document.documentElement.dataset.mode).toBe("light");
    // el estado guardado sigue siendo "auto" aunque el DOM muestre el resuelto
    expect(screen.getByTestId("m").textContent).toBe("auto");
  });

  it("modo 'auto' reacciona a cambios del sistema (claro -> oscuro)", () => {
    let listener: ((e: { matches: boolean }) => void) | null = null;
    const mql = {
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => { listener = cb; }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

    render(
      <ThemeProvider initialTheme="observatory" initialMode="auto" persist={vi.fn()}>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.mode).toBe("light");

    // El sistema cambia a oscuro: el provider reaplica el modo resuelto.
    act(() => {
      mql.matches = true;
      listener!({ matches: true });
    });
    expect(document.documentElement.dataset.mode).toBe("dark");
  });
});
