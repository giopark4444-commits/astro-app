// Colores de la rueda derivados de los elementos/armonías — shim: la fuente de verdad
// vive en @aluna/core (packages/core/src/constants/colors.ts), compartida con el móvil.
// Re-exporta con los NOMBRES HISTÓRICOS (HARMONY_STROKE en vez de ASPECT_COLORS) para que
// chart-wheel.tsx no cambie ni un import.
export { ELEMENT_FILL, ELEMENT_INK, ASPECT_COLORS as HARMONY_STROKE } from "@aluna/core";
