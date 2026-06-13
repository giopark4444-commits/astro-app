"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { resolveMode, type Theme, type Mode } from "./themes";

type PersistPatch = { theme?: Theme; light_mode?: Mode };
type Ctx = {
  theme: Theme; mode: Mode;
  setTheme: (t: Theme) => void; setMode: (m: Mode) => void;
};
const ThemeCtx = createContext<Ctx | null>(null);

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({
  initialTheme, initialMode, persist, children,
}: {
  initialTheme: Theme; initialMode: Mode;
  /** Persiste el cambio (fire-and-forget; en producción es una server action async). */
  persist: (patch: PersistPatch) => void;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [mode, setModeState] = useState<Mode>(initialMode);

  // El tema se refleja tal cual en <html>.
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // El modo se aplica RESUELTO: 'auto' sigue al sistema (y reacciona a cambios).
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.mode = resolveMode(mode, mql.matches); };
    apply();
    if (mode === "auto") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [mode]);

  const setTheme = useCallback((t: Theme) => { setThemeState(t); persist({ theme: t }); }, [persist]);
  const setMode = useCallback((m: Mode) => { setModeState(m); persist({ light_mode: m }); }, [persist]);

  return <ThemeCtx.Provider value={{ theme, mode, setTheme, setMode }}>{children}</ThemeCtx.Provider>;
}
