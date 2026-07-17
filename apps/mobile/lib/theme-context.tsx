import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import {
  THEMES,
  type Mode,
  type ThemeName,
  type ThemeTokens,
  makeTokens,
} from "../theme/tokens";
import { getRaw, setRaw } from "./storage";
import { DEFAULT_PALETTE_MODE, isPaletteMode, type PaletteMode } from "./palette-mode";

export type { PaletteMode };

/**
 * Preferencia de modo del usuario: "auto" sigue el esquema del sistema; "light"
 * y "dark" lo fijan. (Igual que la web, donde el modo por defecto es auto.)
 */
export type ModePref = Mode | "auto";

const THEME_KEY = "aluna.theme.v1";
const MODE_KEY = "aluna.mode.v1";
const PALETTE_KEY = "aluna.palette.v1";

const DEFAULT_THEME: ThemeName = "observatory";
const DEFAULT_MODE: ModePref = "dark";

interface ThemeContextValue {
  ready: boolean;
  theme: ThemeName;
  /** Preferencia elegida (puede ser "auto"). */
  modePref: ModePref;
  /** Modo efectivo ya resuelto (light/dark) para pintar. */
  mode: Mode;
  /** Paleta resuelta del (tema × modo) activo. */
  t: ThemeTokens;
  /** Modo Colorido: "gold" (default, monocromo dorado) o "colorful" (tiñe
   *  datos con su color de dominio — áreas de vida, números, Wu Xing, elemento). */
  paletteMode: PaletteMode;
  setTheme: (theme: ThemeName) => void;
  setModePref: (mode: ModePref) => void;
  setPaletteMode: (mode: PaletteMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(v: string | null): v is ThemeName {
  return v !== null && (THEMES as readonly string[]).includes(v);
}
function isModePref(v: string | null): v is ModePref {
  return v === "light" || v === "dark" || v === "auto";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [modePref, setModePrefState] = useState<ModePref>(DEFAULT_MODE);
  const [paletteMode, setPaletteModeState] = useState<PaletteMode>(DEFAULT_PALETTE_MODE);

  useEffect(() => {
    let alive = true;
    Promise.all([getRaw(THEME_KEY), getRaw(MODE_KEY), getRaw(PALETTE_KEY)]).then(
      ([rawTheme, rawMode, rawPalette]) => {
        if (!alive) return;
        if (isTheme(rawTheme)) setThemeState(rawTheme);
        if (isModePref(rawMode)) setModePrefState(rawMode);
        if (isPaletteMode(rawPalette)) setPaletteModeState(rawPalette);
        setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    void setRaw(THEME_KEY, next);
  }, []);

  const setModePref = useCallback((next: ModePref) => {
    setModePrefState(next);
    void setRaw(MODE_KEY, next);
  }, []);

  const setPaletteMode = useCallback((next: PaletteMode) => {
    setPaletteModeState(next);
    void setRaw(PALETTE_KEY, next);
  }, []);

  const mode: Mode = modePref === "auto" ? (system === "light" ? "light" : "dark") : modePref;
  const t = useMemo(() => makeTokens(theme, mode), [theme, mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ ready, theme, modePref, mode, t, paletteMode, setTheme, setModePref, setPaletteMode }),
    [ready, theme, modePref, mode, t, paletteMode, setTheme, setModePref, setPaletteMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
