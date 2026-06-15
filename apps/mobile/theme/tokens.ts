import { Platform } from "react-native";

/**
 * Sistema visual de Aluna, portado a RN. Mismos valores que la web:
 * noche profunda, oro cálido, blanco-lavanda. Mantener esta paleta:
 * es la identidad de la marca, no se inventa una nueva aquí.
 */
export const colors = {
  night: "#0a0d24",
  nightDeep: "#070a1c",
  panel: "#0f1330",
  panelSoft: "rgba(150,150,190,0.07)",
  gold: "#e7c986",
  goldSoft: "rgba(231,201,134,0.45)",
  goldHair: "rgba(231,201,134,0.2)",
  goldFaint: "rgba(231,201,134,0.12)",
  text: "#ece7f6",
  textDim: "rgba(233,228,245,0.6)",
  textFaint: "rgba(233,228,245,0.38)",
  warn: "#d98c8c",
  warnSoft: "rgba(217,140,140,0.16)",
} as const;

/** Serif elegante para nombres y números display; sans del sistema para UI. */
export const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "System" })!,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;
