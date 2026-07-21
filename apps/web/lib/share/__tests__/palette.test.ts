// apps/web/lib/share/__tests__/palette.test.ts
// Paridad de los 3 temas espejo (observatory/aurora/cosmic) contra el bloque
// RAÍZ (sin [data-mode=...]) de apps/web/lib/theme/tokens.css. Los 3 temas
// exclusivos del share (selva/alba/eclipse) no tienen paridad — solo se valida
// que sus valores tengan formato correcto (hex/rgba/gradiente).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHARE_PALETTES, SHARE_THEMES, SHARE_FORMATS, SHARE_FORMAT_DIMENSIONS } from "../palette";

// process.cwd() en vitest = apps/web (mismo patrón que tarot-assets.test.ts) —
// new URL(rel, import.meta.url) se resuelve mal bajo el entorno jsdom del
// proyecto (jsdom parchea el URL global y descarta el scheme file:// del base).
const tokensCss = readFileSync(path.join(process.cwd(), "lib", "theme", "tokens.css"), "utf8");

/** Extrae el bloque de declaraciones del selector RAÍZ `[data-theme="x"] { ... }`,
 *  excluyendo variantes con `[data-mode=...]` encadenado (el regex exige que el
 *  cierre `]` del atributo theme vaya seguido de espacio+`{`, lo que las variantes
 *  con data-mode no cumplen porque tienen `[data-mode=...]` justo después). */
function extractRootBlock(css: string, theme: string): string {
  const re = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`, "m");
  const m = css.match(re);
  if (!m) throw new Error(`No se encontró el bloque raíz de [data-theme="${theme}"] en tokens.css`);
  return m[1]!;
}

function extractVar(block: string, name: string): string | null {
  const re = new RegExp(`--${name}:\\s*([^;]+);`);
  const m = block.match(re);
  return m ? m[1]!.trim() : null;
}

/** Convierte "231, 201, 134" o "rgba(231,201,134,.2)" en [231,201,134,.2] para
 *  comparar aunque cambie el formato numérico (0.2 vs .2) o el espaciado. */
function parseNumberList(value: string): number[] {
  return value
    .replace(/^[a-z]+\(/i, "")
    .replace(/\)$/, "")
    .split(",")
    .map((s) => parseFloat(s.trim()));
}

const MIRROR_THEMES = ["observatory", "aurora", "cosmic"] as const;
const EXCLUSIVE_THEMES = ["selva", "alba", "eclipse"] as const;

const HEX_RE = /^#[0-9a-f]{3,8}$/i;
const RGBA_RE = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)$/i;
const GRADIENT_RE = /^(linear|radial)-gradient\(/i;
const RGB_TRIPLE_RE = /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/;

describe("SHARE_THEMES / SHARE_FORMATS", () => {
  it("tiene los 6 temas en el orden esperado", () => {
    expect(SHARE_THEMES).toEqual(["observatory", "aurora", "cosmic", "selva", "alba", "eclipse"]);
  });

  it("tiene los 3 formatos con sus dimensiones", () => {
    expect(SHARE_FORMATS).toEqual(["story", "feed", "square"]);
    expect(SHARE_FORMAT_DIMENSIONS).toEqual({
      story: { w: 1080, h: 1920 },
      feed: { w: 1080, h: 1440 },
      square: { w: 1080, h: 1080 },
    });
  });
});

describe.each(MIRROR_THEMES)("paridad SHARE_PALETTES.%s vs tokens.css", (theme) => {
  const block = extractRootBlock(tokensCss, theme);
  const palette = SHARE_PALETTES[theme];

  it("--ink coincide", () => {
    const tokenInk = extractVar(block, "ink");
    expect(tokenInk).not.toBeNull();
    expect(tokenInk!.toLowerCase()).toBe(palette.ink.toLowerCase());
  });

  it("--line coincide", () => {
    const tokenLine = extractVar(block, "line");
    expect(tokenLine).not.toBeNull();
    expect(parseNumberList(tokenLine!)).toEqual(parseNumberList(palette.line));
  });

  it("--acc coincide", () => {
    const tokenAcc = extractVar(block, "acc");
    expect(tokenAcc).not.toBeNull();
    expect(tokenAcc!.toLowerCase()).toBe(palette.acc.toLowerCase());
  });

  it("--acc-rgb coincide", () => {
    const tokenAccRgb = extractVar(block, "acc-rgb");
    expect(tokenAccRgb).not.toBeNull();
    expect(parseNumberList(tokenAccRgb!)).toEqual(parseNumberList(palette.accRgb));
  });
});

describe("paridad SHARE_PALETTES.aurora.accText vs tokens.css", () => {
  it("--acc-text del bloque raíz de aurora coincide", () => {
    const block = extractRootBlock(tokensCss, "aurora");
    const tokenAccText = extractVar(block, "acc-text");
    expect(tokenAccText).not.toBeNull();
    expect(tokenAccText!.toLowerCase()).toBe(SHARE_PALETTES.aurora.accText.toLowerCase());
  });
});

describe.each(EXCLUSIVE_THEMES)("SHARE_PALETTES.%s (exclusivo del share, sin paridad)", (theme) => {
  const palette = SHARE_PALETTES[theme];

  it("bg es un gradiente bien formado", () => {
    expect(palette.bg).toMatch(GRADIENT_RE);
  });

  it("ink / acc / accText son hex bien formados", () => {
    expect(palette.ink).toMatch(HEX_RE);
    expect(palette.acc).toMatch(HEX_RE);
    expect(palette.accText).toMatch(HEX_RE);
  });

  it("soft / line son rgba() bien formados", () => {
    expect(palette.soft).toMatch(RGBA_RE);
    expect(palette.line).toMatch(RGBA_RE);
  });

  it("accRgb es un triplete numérico bien formado", () => {
    expect(palette.accRgb).toMatch(RGB_TRIPLE_RE);
  });

  it("stars es un número entre 0 y 1", () => {
    expect(palette.stars).toBeGreaterThanOrEqual(0);
    expect(palette.stars).toBeLessThanOrEqual(1);
  });
});
