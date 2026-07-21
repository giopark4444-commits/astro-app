/** @jsxImportSource react */
// apps/web/lib/share/zodiac-glyphs.tsx
// Glifos zodiacales de línea para las tarjetas compartibles (satori no tiene los
// glifos Unicode ♈-♓: ninguna de las fuentes vendorizadas en ./fonts los incluye,
// y satori no hace fallback a fuentes del sistema como sí hace un navegador — ver
// verificación en el commit: cmap de CormorantGaramond_500Medium.ttf y
// Quicksand_400Regular.ttf no tiene ningún code point en el rango 2648-2653).
//
// Glifos zodiacales derivados de Tabler Icons (MIT) — https://tabler.io/icons
// (set "zodiac-<sign>", outline, viewBox 24×24). Se descargó cada SVG oficial
// (unpkg @tabler/icons/icons/outline/zodiac-<sign>.svg) y se extrajeron sus
// <path> de dibujo, descartando el primer path invisible que trae cada ícono
// Tabler (`stroke="none" d="M0 0h24v24H0z" fill="none"` — un hitbox de fondo,
// no forma parte del glifo). El stroke-width se afinó de 2 (default Tabler) a
// 1.3 para casar con el lenguaje hairline del resto del set de línea de Aluna
// (mismo criterio que el enso / SepStar de card-template.tsx).
//
// Cada glifo es un ARRAY de elementos SVG (nunca `<>...</>`): satori no resuelve
// React.Fragment como hijo de <svg> — falla en runtime con "Cannot convert a
// Symbol value to a string" (el type de Fragment es un Symbol) apenas el glifo
// tiene más de un sub-trazo. Un array de elementos con `key` sí funciona porque
// React ya lo aplana a hijos sueltos antes de que satori los vea.
import type { ReactElement } from "react";

const ZODIAC_PATHS: Record<string, ReactElement[]> = {
  aries: [
    <path key="a" d="M12 5a5 5 0 1 0 -4 8" />,
    <path key="b" d="M16 13a5 5 0 1 0 -4 -8" />,
    <path key="c" d="M12 21l0 -16" />,
  ],
  taurus: [
    <path key="a" d="M6 3a6 6 0 0 0 12 0" />,
    <path key="b" d="M6 15a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" />,
  ],
  gemini: [
    <path key="a" d="M3 3a21 21 0 0 0 18 0" />,
    <path key="b" d="M3 21a21 21 0 0 1 18 0" />,
    <path key="c" d="M7 4.5l0 15" />,
    <path key="d" d="M17 4.5l0 15" />,
  ],
  cancer: [
    <path key="a" d="M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />,
    <path key="b" d="M15 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />,
    <path key="c" d="M3 12a10 6.5 0 0 1 14 -6.5" />,
    <path key="d" d="M21 12a10 6.5 0 0 1 -14 6.5" />,
  ],
  leo: [
    <path key="a" d="M13 17a4 4 0 1 0 8 0" />,
    <path key="b" d="M3 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />,
    <path key="c" d="M7 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />,
    <path key="d" d="M7 7c0 3 2 5 2 9" />,
    <path key="e" d="M15 7c0 4 -2 6 -2 10" />,
  ],
  virgo: [
    <path key="a" d="M3 4a2 2 0 0 1 2 2v9" />,
    <path key="b" d="M5 6a2 2 0 0 1 4 0v9" />,
    <path key="c" d="M9 6a2 2 0 0 1 4 0v10a7 5 0 0 0 7 5" />,
    <path key="d" d="M12 21a7 5 0 0 0 7 -5v-2a3 3 0 0 0 -6 0" />,
  ],
  libra: [
    <path key="a" d="M5 20l14 0" />,
    <path key="b" d="M5 17h5v-.3a7 7 0 1 1 4 0v.3h5" />,
  ],
  scorpio: [
    <path key="a" d="M3 4a2 2 0 0 1 2 2v9" />,
    <path key="b" d="M5 6a2 2 0 0 1 4 0v9" />,
    <path key="c" d="M9 6a2 2 0 0 1 4 0v10a3 3 0 0 0 3 3h5l-3 -3m0 6l3 -3" />,
  ],
  sagittarius: [
    <path key="a" d="M4 20l16 -16" />,
    <path key="b" d="M13 4h7v7" />,
    <path key="c" d="M6.5 12.5l5 5" />,
  ],
  capricorn: [
    <path key="a" d="M4 4a3 3 0 0 1 3 3v9" />,
    <path key="b" d="M7 7a3 3 0 0 1 6 0v11a3 3 0 0 1 -3 3" />,
    <path key="c" d="M13 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />,
  ],
  aquarius: [
    <path key="a" d="M3 10l3 -3l3 3l3 -3l3 3l3 -3l3 3" />,
    <path key="b" d="M3 17l3 -3l3 3l3 -3l3 3l3 -3l3 3" />,
  ],
  pisces: [
    <path key="a" d="M5 3a21 21 0 0 1 0 18" />,
    <path key="b" d="M19 3a21 21 0 0 0 0 18" />,
    <path key="c" d="M5 12l14 0" />,
  ],
};

export type ZodiacGlyphKey = keyof typeof ZODIAC_PATHS;

/** Las 12 claves válidas, mismo orden/keys que ZODIAC_SIGNS de @aluna/core. */
export const ZODIAC_GLYPH_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

/** Glifo zodiacal de línea, tamaño y color explícitos (nada de `currentColor`:
 *  más robusto en satori que depender de herencia de `color`). `sign` que no
 *  matchea ninguna clave no pinta nada (el caller ya valida contra ZODIAC_SIGNS
 *  antes de llegar aquí — ver validate.ts). */
export function ZodiacGlyph({ sign, size, color }: { sign: string; size: number; color: string }) {
  const paths = ZODIAC_PATHS[sign];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </svg>
  );
}
