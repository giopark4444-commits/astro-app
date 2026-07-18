import type { NavKey } from "./nav-order";

// Mismos glifos que components/top-nav.tsx — un solo mapa compartido por el
// editor de /admin y la vista de solo-lectura de /colab (NO duplicar la
// elección de ícono por ventana en cada consumidor).
export type NavIconName = "sun" | "wheel" | "aries" | "grid3" | "pillars" | "cards";

export const NAV_ICON: Record<NavKey, NavIconName> = {
  hoy: "sun",
  carta: "wheel",
  horoscopo: "aries",
  numeros: "grid3",
  pilares: "pillars",
  tarot: "cards",
};
