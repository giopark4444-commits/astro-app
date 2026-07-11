// Colores de dominio (zodiaco/tránsitos) — R3: única fuente de verdad, RN-safe.
// Espejados hoy en apps/web/app/(app)/carta/wheel-colors.ts (shim tras esta tarea) y
// apps/mobile/components/ChartWheel.tsx (import directo tras esta tarea). Byte-idénticos
// en ambas plataformas — cero drift documentado en el inventario R3.
import type { Element, AspectHarmony } from "./astrology";

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
