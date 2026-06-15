import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS, type Strings } from "./strings";
import { getRaw, setRaw } from "./storage";

export type Locale = "es" | "en";

const LOCALE_KEY = "aluna.locale.v1";
const DEFAULT_LOCALE: Locale = "es";

interface I18nContextValue {
  ready: boolean;
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Traduce una clave con notación de puntos ("settings.theme"). */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Acceso directo al diccionario del locale activo (para mapas tipados). */
  dict: Strings;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Resuelve "a.b.c" dentro de un objeto anidado; devuelve la clave si falta. */
function lookup(dict: Strings, key: string): string {
  const parts = key.split(".");
  let node: unknown = dict;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return key; // clave ausente: visible en desarrollo, nunca rompe
    }
  }
  return typeof node === "string" ? node : key;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let alive = true;
    getRaw(LOCALE_KEY).then((raw) => {
      if (!alive) return;
      if (raw === "es" || raw === "en") setLocaleState(raw);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void setRaw(LOCALE_KEY, next);
  }, []);

  const dict = STRINGS[locale];

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => interpolate(lookup(dict, key), vars),
    [dict],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ ready, locale, setLocale, t, dict }),
    [ready, locale, setLocale, t, dict],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT debe usarse dentro de <I18nProvider>");
  return ctx;
}
