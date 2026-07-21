// apps/web/lib/share/palette.ts
// Paleta de temas para las tarjetas compartibles. 3 temas (observatory/aurora/
// cosmic) espejan --ink/--line/--acc/--acc-rgb de apps/web/lib/theme/tokens.css
// (paridad verificada por __tests__/palette.test.ts); 3 temas nuevos (selva/alba/
// eclipse) son exclusivos del share, sin equivalente en la app.
// Puro: sin I/O, sin React — solo datos.

export const SHARE_THEMES = ["observatory", "aurora", "cosmic", "selva", "alba", "eclipse"] as const;
export type ShareTheme = (typeof SHARE_THEMES)[number];

export interface SharePalette {
  bg: string;
  ink: string;
  soft: string;
  line: string;
  acc: string;
  accRgb: string;
  accText: string;
  stars: number;
}

export const SHARE_PALETTES: Record<ShareTheme, SharePalette> = {
  observatory: {
    bg: "radial-gradient(125% 85% at 50% -8%, #28316b 0%, #121737 46%, #0a0d24 100%)",
    ink: "#ece7f6",
    soft: "rgba(233,228,245,.6)",
    line: "rgba(231,201,134,.2)",
    acc: "#e7c986",
    accRgb: "231,201,134",
    accText: "#e7c986",
    stars: 0.5,
  },
  aurora: {
    bg: "linear-gradient(170deg, #f6f2fb 0%, #fdf3ec 100%)",
    ink: "#4a4458",
    soft: "rgba(74,68,88,.6)",
    line: "rgba(155,143,192,.25)",
    acc: "#9b8fc0",
    accRgb: "155,143,192",
    accText: "#736a8e",
    stars: 0,
  },
  cosmic: {
    bg: "linear-gradient(165deg, #1c0529 0%, #3d0b54 70%, #6d1a6b 100%)",
    ink: "#f3eaff",
    soft: "rgba(243,234,255,.62)",
    line: "rgba(255,138,224,.28)",
    acc: "#ff8ae0",
    accRgb: "255,138,224",
    accText: "#ff8ae0",
    stars: 0.4,
  },
  selva: {
    bg: "linear-gradient(165deg, #07231d 0%, #0d3b31 55%, #155345 100%)",
    ink: "#eaf6f0",
    soft: "rgba(234,246,240,.6)",
    line: "rgba(146,216,184,.25)",
    acc: "#92d8b8",
    accRgb: "146,216,184",
    accText: "#92d8b8",
    stars: 0.3,
  },
  alba: {
    bg: "linear-gradient(170deg, #fdf6ec 0%, #fae5d8 100%)",
    ink: "#4a3833",
    soft: "rgba(74,56,51,.62)",
    line: "rgba(203,124,82,.28)",
    acc: "#d0854f",
    accRgb: "208,133,79",
    accText: "#a05a33",
    stars: 0,
  },
  eclipse: {
    bg: "radial-gradient(120% 90% at 50% -10%, #232330 0%, #141419 52%, #08080c 100%)",
    ink: "#ededf4",
    soft: "rgba(237,237,244,.6)",
    line: "rgba(202,204,222,.22)",
    acc: "#caccde",
    accRgb: "202,204,222",
    accText: "#caccde",
    stars: 0.55,
  },
};

export const SHARE_FORMATS = ["story", "feed", "square"] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];

export interface ShareFormatDims {
  w: number;
  h: number;
}

/** feed = 3:4, el formato "vertical" nuevo de Instagram (reemplaza el 4:5 clásico). */
export const SHARE_FORMAT_DIMENSIONS: Record<ShareFormat, ShareFormatDims> = {
  story: { w: 1080, h: 1920 },
  feed: { w: 1080, h: 1440 },
  square: { w: 1080, h: 1080 },
};
