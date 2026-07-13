import { MODES, resolveMode as resolveModeBase, type Mode } from "./themes";

/** Nombres de cookie — deben coincidir con las columnas que persistSettings escribe. */
export const THEME_COOKIE = "theme";
export const MODE_COOKIE = "light_mode";

/**
 * Resuelve un valor crudo de cookie (posiblemente ausente/inválido) al modo efectivo.
 * Envuelve resolveMode de themes.ts: cualquier valor que no sea un Mode válido
 * (incluido undefined) se trata como "auto".
 */
export function resolveMode(mode: string | undefined, prefersDark: boolean): "light" | "dark" {
  const safe: Mode = (MODES as readonly string[]).includes(mode ?? "") ? (mode as Mode) : "auto";
  return resolveModeBase(safe, prefersDark);
}

/**
 * Script inline (IIFE) para <head>: lee las cookies de tema/modo y aplica
 * data-theme/data-mode en <html> ANTES del primer paint, evitando el flash
 * del tema por default. Defensivo — cualquier fallo cae a los defaults que
 * ya están hardcodeados en <html> (observatory/dark).
 */
export const FOUC_SCRIPT = `(function () {
  try {
    var cookies = document.cookie ? document.cookie.split("; ") : [];
    var map = {};
    for (var i = 0; i < cookies.length; i++) {
      var idx = cookies[i].indexOf("=");
      if (idx === -1) continue;
      map[cookies[i].slice(0, idx)] = decodeURIComponent(cookies[i].slice(idx + 1));
    }
    var theme = map["${THEME_COOKIE}"] || "observatory";
    var mode = map["${MODE_COOKIE}"];
    var prefersDark = false;
    try {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {}
    var resolvedMode = (mode === "light" || mode === "dark") ? mode : (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = resolvedMode;
  } catch (e) {}
})();`;
