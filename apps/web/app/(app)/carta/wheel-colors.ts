// Colores de la rueda derivados de los elementos/armonías. Semi-transparentes
// para tintar sobre cualquier tema.

export const ELEMENT_FILL: Record<string, string> = {
  fire: "rgba(224,121,90,0.12)",
  earth: "rgba(127,176,105,0.12)",
  air: "rgba(122,170,224,0.12)",
  water: "rgba(150,140,214,0.12)",
};

export const ELEMENT_INK: Record<string, string> = {
  fire: "#e0795a",
  earth: "#7fb069",
  air: "#7aaae0",
  water: "#9b8fd6",
};

export const HARMONY_STROKE: Record<string, string> = {
  hard: "rgba(224,121,90,0.55)",
  soft: "rgba(122,170,224,0.5)",
  neutral: "rgba(231,201,134,0.4)",
};
