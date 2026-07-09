/**
 * Sistema visual de Aluna, portado a RN desde la web (apps/web/lib/theme/tokens.css).
 * Tres temas — observatory (noche dorada), aurora (pastel) y cosmic (neón) —, cada
 * uno con modo claro y oscuro. La identidad (noche profunda + oro cálido) se mantiene
 * en el tema por defecto; los demás son variaciones, no marcas nuevas.
 *
 * Equivalencias con las CSS vars de la web:
 *   --bg → bg            (fondo de la pantalla)
 *   --surface → panelSoft (tarjetas translúcidas)
 *   --surface (más opaco) → panel (hojas, menús)
 *   --ink → text          --soft → textDim       (texto)
 *   --line → line/goldHair (bordes)
 *   --acc → acc/gold       (acento del tema)
 */

export const THEMES = ["observatory", "aurora", "cosmic"] as const;
export type ThemeName = (typeof THEMES)[number];

export type Mode = "light" | "dark";

/** Forma de la paleta resuelta para un (tema × modo). */
export interface ThemeTokens {
  /** Fondo sólido de la pantalla (RN no soporta gradientes sin librería). */
  bg: string;
  /** Fondo aún más profundo (barras de pestañas / pies fijos). */
  bgDeep: string;
  /** Tinte para el resplandor estrellado sobre el fondo. */
  sky: string;
  /** Superficie translúcida de tarjetas. */
  panelSoft: string;
  /** Superficie más opaca (hojas inferiores, menús, celdas internas). */
  panel: string;
  /** Texto principal. */
  text: string;
  /** Texto secundario. */
  textDim: string;
  /** Texto terciario / tenue. */
  textFaint: string;
  /** Acento del tema (oro en observatory; lavanda; magenta). */
  acc: string;
  /** Acento al 45% — bordes destacados, asas. */
  accSoft: string;
  /** Acento al ~20% — líneas finas (hairline dorado). */
  accHair: string;
  /** Acento al ~12% — rellenos muy suaves. */
  accFaint: string;
  /** Color del texto que va SOBRE el acento (CTA llena). */
  onAcc: string;
  /** Tinte de las estrellas del cielo. */
  star: string;
  /** Velo del backdrop de las hojas. */
  scrim: string;
  /** Aviso / deuda kármica. */
  warn: string;
  warnSoft: string;
  /** true en modos claros (para barra de estado y matices). */
  isLight: boolean;
  /** Tinte superior del fondo radial (el "amanecer" del gradiente). */
  bgGlow: string;
  /** Superficie glass de las tarjetas del rediseño (más presente que panelSoft). */
  glass: string;
}

/**
 * Construye la paleta de un tema × modo. Los hex provienen de la web; los
 * gradientes se aproximan a un color sólido representativo (RN core sin SVG).
 */
export function makeTokens(theme: ThemeName, mode: Mode): ThemeTokens {
  const isLight = mode === "light";
  switch (theme) {
    case "observatory":
      return isLight
        ? {
            bg: "#f4eefb",
            bgDeep: "#efe7f8",
            sky: "#f4eefb",
            panelSoft: "rgba(255,255,255,0.62)",
            panel: "rgba(255,255,255,0.86)",
            text: "#3d3650",
            textDim: "rgba(61,54,80,0.62)",
            textFaint: "rgba(61,54,80,0.4)",
            acc: "#b48a3f",
            accSoft: "rgba(180,138,63,0.42)",
            accHair: "rgba(142,124,195,0.26)",
            accFaint: "rgba(202,168,95,0.12)",
            onAcc: "#fffaf2",
            star: "#8e7cc3",
            scrim: "rgba(120,100,160,0.32)",
            warn: "#b5604f",
            warnSoft: "rgba(181,96,79,0.14)",
            isLight: true,
            bgGlow: "#fdf3ec",
            glass: "rgba(255,255,255,0.6)",
          }
        : {
            bg: "#0a0d24",
            bgDeep: "#070a1c",
            sky: "#121737",
            panelSoft: "rgba(150,150,190,0.07)",
            panel: "#0f1330",
            text: "#ece7f6",
            textDim: "rgba(233,228,245,0.6)",
            textFaint: "rgba(233,228,245,0.38)",
            acc: "#e7c986",
            accSoft: "rgba(231,201,134,0.45)",
            accHair: "rgba(231,201,134,0.2)",
            accFaint: "rgba(231,201,134,0.12)",
            onAcc: "#070a1c",
            star: "#ece7f6",
            scrim: "rgba(4,6,18,0.72)",
            warn: "#d98c8c",
            warnSoft: "rgba(217,140,140,0.16)",
            isLight: false,
            bgGlow: "#28316b",
            glass: "rgba(20,26,58,0.55)",
          };

    case "aurora":
      // En la web el DEFAULT de aurora es CLARO; aquí respetamos ambos modos.
      return isLight
        ? {
            bg: "#f6f2fb",
            bgDeep: "#efe9f7",
            sky: "#f6f2fb",
            panelSoft: "rgba(255,255,255,0.62)",
            panel: "rgba(255,255,255,0.88)",
            text: "#4a4458",
            textDim: "rgba(74,68,88,0.6)",
            textFaint: "rgba(74,68,88,0.4)",
            acc: "#7d6fae",
            accSoft: "rgba(125,111,174,0.4)",
            accHair: "rgba(155,143,192,0.26)",
            accFaint: "rgba(155,143,192,0.12)",
            onAcc: "#ffffff",
            star: "#9b8fc0",
            scrim: "rgba(120,100,160,0.3)",
            warn: "#b5604f",
            warnSoft: "rgba(181,96,79,0.14)",
            isLight: true,
            bgGlow: "#fdf3ec",
            glass: "rgba(255,255,255,0.6)",
          }
        : {
            bg: "#241d38",
            bgDeep: "#1c1730",
            sky: "#2a2140",
            panelSoft: "rgba(180,170,210,0.08)",
            panel: "#2a2140",
            text: "#ece7f6",
            textDim: "rgba(236,231,246,0.6)",
            textFaint: "rgba(236,231,246,0.38)",
            acc: "#c9b8f2",
            accSoft: "rgba(201,184,242,0.45)",
            accHair: "rgba(180,160,230,0.22)",
            accFaint: "rgba(201,184,242,0.12)",
            onAcc: "#1c1730",
            star: "#d6ccf2",
            scrim: "rgba(8,6,22,0.72)",
            warn: "#e0a0a0",
            warnSoft: "rgba(224,160,160,0.16)",
            isLight: false,
            bgGlow: "#332a4d",
            glass: "rgba(42,33,64,0.55)",
          };

    case "cosmic":
      return isLight
        ? {
            bg: "#f7eefc",
            bgDeep: "#f1e6f8",
            sky: "#f7eefc",
            panelSoft: "rgba(255,255,255,0.7)",
            panel: "rgba(255,255,255,0.9)",
            text: "#3a2342",
            textDim: "rgba(58,35,66,0.6)",
            textFaint: "rgba(58,35,66,0.4)",
            acc: "#a14ee0",
            accSoft: "rgba(161,78,224,0.4)",
            accHair: "rgba(154,107,255,0.24)",
            accFaint: "rgba(184,107,255,0.1)",
            onAcc: "#ffffff",
            star: "#b86bff",
            scrim: "rgba(60,20,70,0.34)",
            warn: "#c4564f",
            warnSoft: "rgba(196,86,79,0.14)",
            isLight: true,
            bgGlow: "#fbeaf6",
            glass: "rgba(255,255,255,0.7)",
          }
        : {
            bg: "#280a39",
            bgDeep: "#1c0529",
            sky: "#3d0b54",
            panelSoft: "rgba(255,255,255,0.07)",
            panel: "#330a47",
            text: "#f3eaff",
            textDim: "rgba(243,234,255,0.62)",
            textFaint: "rgba(243,234,255,0.4)",
            acc: "#ff8ae0",
            accSoft: "rgba(255,138,224,0.5)",
            accHair: "rgba(255,138,224,0.28)",
            accFaint: "rgba(255,138,224,0.12)",
            onAcc: "#1c0529",
            star: "#ffb3ee",
            scrim: "rgba(10,2,20,0.74)",
            warn: "#ff9d9d",
            warnSoft: "rgba(255,157,157,0.16)",
            isLight: false,
            bgGlow: "#3d0b54",
            glass: "rgba(40,10,57,0.55)",
          };
  }
}

/** Etiqueta legible del tema, por idioma (coincide con la web). */
export const THEME_LABELS: Record<"es" | "en", Record<ThemeName, string>> = {
  es: { observatory: "Observatorio", aurora: "Aurora", cosmic: "Cósmico" },
  en: { observatory: "Observatory", aurora: "Aurora", cosmic: "Cosmic" },
};

/** Fuentes de marca (cargadas en app/_layout.tsx vía expo-font). RN no
 * sintetiza pesos con fuentes custom en Android: cada peso es su familia. */
export const fonts = {
  serif: "CormorantGaramond_500Medium",
  serifSemi: "CormorantGaramond_600SemiBold",
  serifBold: "CormorantGaramond_700Bold",
  sans: "Quicksand_400Regular",
  sansMedium: "Quicksand_500Medium",
  sansSemi: "Quicksand_600SemiBold",
  sansBold: "Quicksand_700Bold",
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

/** Escala tipográfica del rediseño (SPEC de mockups aprobados). */
export const type = {
  xs2: 11, xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xl2: 24, xl3: 32,
  displaySm: 44, display: 60,
} as const;

/**
 * Paleta estática de respaldo (tema observatory oscuro), idéntica a la histórica.
 * Se conserva para que cualquier import directo siga compilando; las pantallas
 * usan el tema activo vía useTheme(). No añadir UI nueva apoyada aquí.
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
