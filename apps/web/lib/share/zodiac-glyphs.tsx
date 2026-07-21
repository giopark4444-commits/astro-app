/** @jsxImportSource react */
// apps/web/lib/share/zodiac-glyphs.tsx
// Glifos zodiacales de línea para las tarjetas compartibles (satori no tiene los
// glifos Unicode ♈-♓: ninguna de las fuentes vendorizadas en ./fonts los incluye,
// y satori no hace fallback a fuentes del sistema como sí hace un navegador — ver
// verificación en el commit: cmap de CormorantGaramond_500Medium.ttf y
// Quicksand_400Regular.ttf no tiene ningún code point en el rango 2648-2653).
//
// La app NO tiene un set de 12 glifos-path reusable: la rueda de horóscopo
// (horoscopo/selector-wheel.tsx) pinta los signos como TEXTO Unicode + selector de
// variación (glyph + TEXT_VS), no como paths SVG; components/icon.tsx solo trae UN
// glifo zodiacal ("aries", los cuernos de carnero, usado como ícono genérico de nav
// para toda la sección horóscopo). Se reutiliza ese path para Aries (consistencia de
// marca) y se crean los 11 restantes en el mismo lenguaje visual: línea fina
// (stroke, sin relleno), viewBox 0 0 24 24, mismos stroke-linecap/linejoin
// redondeados que el enso — igual que pide la iconografía de línea de Aluna.
//
// Cada glifo es un ARRAY de elementos SVG (nunca `<>...</>`): satori no resuelve
// React.Fragment como hijo de <svg> — falla en runtime con "Cannot convert a
// Symbol value to a string" (el type de Fragment es un Symbol) apenas el glifo
// tiene más de un sub-trazo. Un array de elementos con `key` sí funciona porque
// React ya lo aplana a hijos sueltos antes de que satori los vea.
import type { ReactElement } from "react";

const ZODIAC_PATHS: Record<string, ReactElement[]> = {
  // Cuernos de carnero — path idéntico al "aries" de components/icon.tsx.
  aries: [<path key="a" d="M4 19.5C4 9.5 6 5.5 8.6 5.5c2.1 0 3.4 2.4 3.4 6 0-3.6 1.3-6 3.4-6C18 5.5 20 9.5 20 19.5" />],
  // Cabeza de toro: círculo (testuz) + dos cuernos curvos.
  taurus: [
    <circle key="a" cx="12" cy="15.3" r="5" />,
    <path key="b" d="M7 4.5c-2.2 2-2.2 5.6 0 7.8M17 4.5c2.2 2 2.2 5.6 0 7.8" />,
  ],
  // Gemelos: dos columnas con travesaños arriba y abajo.
  gemini: [<path key="a" d="M6 5h12M6 19h12M9 5v14M15 5v14" />],
  // Cangrejo: dos espirales enfrentadas (69 clásico del glifo).
  cancer: [
    <circle key="a" cx="8" cy="8.3" r="2.3" />,
    <path key="b" d="M8 10.6c0 3.5 3 5.6 6 5.6" />,
    <circle key="c" cx="16" cy="15.7" r="2.3" />,
    <path key="d" d="M16 13.4c0-3.5-3-5.6-6-5.6" />,
  ],
  // León: círculo (cuerpo) + cola que se enrosca en un rizo.
  leo: [
    <circle key="a" cx="8.6" cy="8" r="3.2" />,
    <path key="b" d="M8.6 11.2c0 5.3 3.4 7.8 6.6 7.3a3 3 0 1 0-2.8-4.2" />,
  ],
  // Virgo: tres trazos verticales (m) que terminan en un rizo cruzado.
  virgo: [
    <path key="a" d="M5 6v13" />,
    <path key="b" d="M5 8c0-1.8 3-1.8 3 0v11" />,
    <path key="c" d="M8 8c0-1.8 3-1.8 3 0v7" />,
    <path key="d" d="M11 8c0-1.8 3-1.8 3 5v3.3a2.6 2.6 0 1 0 2.6-2.6" />,
  ],
  // Libra: viga + platillo (arco) + base — la balanza.
  libra: [<path key="a" d="M5 8h14" />, <path key="b" d="M5 15A7 3.4 0 0 1 19 15" />, <path key="c" d="M5 19h14" />],
  // Escorpio: igual que Virgo, pero la cola termina en aguijón (flecha).
  scorpio: [
    <path key="a" d="M5 6v13" />,
    <path key="b" d="M5 8c0-1.8 3-1.8 3 0v11" />,
    <path key="c" d="M8 8c0-1.8 3-1.8 3 0v7" />,
    <path key="d" d="M11 8c0-1.8 3-1.8 3 5v6" />,
    <path key="e" d="M14 19l4-4" />,
    <path key="f" d="M18 15v3.6" />,
    <path key="g" d="M18 15h-3.6" />,
  ],
  // Sagitario: flecha diagonal con astil cruzado (plumas del arquero).
  sagittarius: [<path key="a" d="M6 18 18 6" />, <path key="b" d="M11 6h7v7" />, <path key="c" d="M9.5 12.5l-2 2" />],
  // Capricornio: cuerno en V que se enrosca en cola de pez.
  capricorn: [<path key="a" d="M5 7l4 11 4-11" />, <path key="b" d="M13 18c0-3 2-5 4-5a2.4 2.4 0 1 1-2 3.8" />],
  // Acuario: dos ondas apiladas — el agua que se vierte.
  aquarius: [
    <path key="a" d="M4 9l3.5-2.5L11 9l3.5-2.5L18 9l2-1.5" />,
    <path key="b" d="M4 16l3.5-2.5L11 16l3.5-2.5L18 16l2-1.5" />,
  ],
  // Piscis: dos arcos (peces) enfrentados, unidos por una línea.
  pisces: [
    <path key="a" d="M8 4c-3 3-3 13 0 16" />,
    <path key="b" d="M16 4c3 3 3 13 0 16" />,
    <path key="c" d="M5 12h14" />,
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </svg>
  );
}
