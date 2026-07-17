// Colores de dominio (zodiaco/tránsitos) — R3: única fuente de verdad, RN-safe.
// Espejados hoy en apps/web/app/(app)/carta/wheel-colors.ts (shim tras esta tarea) y
// apps/mobile/components/ChartWheel.tsx (import directo tras esta tarea). Byte-idénticos
// en ambas plataformas — cero drift documentado en el inventario R3.
import type { Element, AspectHarmony } from "./astrology";
import type { LifeArea } from "../astrology/life-areas";

/** Tinta sólida por elemento zodiacal (glifos/signos de la rueda). */
export const ELEMENT_INK: Record<Element, string> = {
  fire: "#e0795a",
  earth: "#7fb069",
  air: "#7aaae0",
  water: "#9b8fd6",
};

/** Relleno semi-transparente por elemento (sectores de la rueda) — pensado para
 *  tintar sobre cualquier tema. */
export const ELEMENT_FILL: Record<Element, string> = {
  fire: "rgba(224,121,90,0.12)",
  earth: "rgba(127,176,105,0.12)",
  air: "rgba(122,170,224,0.12)",
  water: "rgba(150,140,214,0.12)",
};

/** Trazo por armonía de aspecto (líneas de la rueda / clima de tránsitos). */
export const ASPECT_COLORS: Record<AspectHarmony, string> = {
  hard: "rgba(224,121,90,0.55)",
  soft: "rgba(122,170,224,0.5)",
  neutral: "rgba(231,201,134,0.4)",
};

/** Colores por área de vida (barras de energía Hoy/Horóscopo) — modo Colorido.
 *  Familia de la misma paleta de dominio: amor rosa cálido, dinero ámbar (oro
 *  Wu Xing tierra), trabajo azul aire, salud verde tierra zodiacal, ánimo
 *  violeta agua zodiacal, suerte el dorado de acento de Aluna. */
export const LIFE_AREA_COLORS: Record<LifeArea, string> = {
  love: "#e08398",
  money: "#d4a85f",
  work: "#7aaae0",
  health: "#7fb069",
  mood: "#9b8fd6",
  luck: "#e7c986",
};

/** Colores por número (numerología) — modo Colorido. Rueda clásica 1-9 armonizada
 *  a la paleta Aluna; los maestros 11/22/33 en la familia dorada (son "voltaje
 *  alto" del acento, no un matiz nuevo). */
export const NUMBER_COLORS: Record<number, string> = {
  1: "#e0795a",
  2: "#e0a284",
  3: "#e7c986",
  4: "#7fb069",
  5: "#6fc3b0",
  6: "#7aaae0",
  7: "#9b8fd6",
  8: "#c98da4",
  9: "#d8d4e8",
  11: "#f0d9a3",
  22: "#e7c986",
  33: "#dfb96a",
};

/** Reduce un número a su color: maestros directos, resto por reducción 1-9;
 *  fuera de rango cae al 9 (cierre sereno, nunca undefined). */
export function numberColor(n: number): string {
  const direct = NUMBER_COLORS[n];
  if (direct) return direct;
  let v = Math.abs(Math.trunc(n));
  while (v > 9) v = String(v).split("").reduce((s, d) => s + Number(d), 0);
  return NUMBER_COLORS[v] ?? "#d8d4e8"; /* = NUMBER_COLORS[9], literal para el narrowing */
}
