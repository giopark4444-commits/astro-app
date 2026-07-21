// apps/web/lib/share/fonts.ts
// Fuentes vendorizadas para el render de tarjetas compartibles (ImageResponse/satori).
// Copiadas como .ttf de los paquetes @expo-google-fonts que ya usa apps/mobile
// (ver fonts/ para el origen exacto de cada archivo — detallado en el commit).
//
// Ruta base vía process.cwd() (= apps/web bajo `next dev`/`next start`): el
// patrón `fileURLToPath(new URL("./x", import.meta.url))` funciona en Node/vitest
// pero REVIENTA bajo el runtime de Next ("Received an instance of URL" — el URL
// que produce webpack no es el que fileURLToPath espera). El tracing para el
// output serverless se garantiza aparte, con outputFileTracingIncludes en
// next.config.ts para /api/share-card (igual que sweph).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "lib", "share", "fonts");
const readFont = (file: string): Buffer => readFileSync(join(FONTS_DIR, file));

export type ShareFontWeight = 400 | 500 | 600;
export type ShareFontStyle = "normal" | "italic";

export interface ShareFont {
  name: string;
  data: Buffer;
  weight: ShareFontWeight;
  style: ShareFontStyle;
}

let cached: ShareFont[] | null = null;

/** Devuelve las 7 fuentes en formato satori/ImageResponse. Memoizado en singleton
 *  de módulo: los .ttf se leen del disco una sola vez por proceso. */
export function loadShareFonts(): ShareFont[] {
  if (cached) return cached;
  cached = [
    {
      name: "Cormorant Garamond",
      data: readFont("CormorantGaramond_500Medium.ttf"),
      weight: 500,
      style: "normal",
    },
    {
      name: "Cormorant Garamond",
      data: readFont("CormorantGaramond_600SemiBold.ttf"),
      weight: 600,
      style: "normal",
    },
    {
      name: "Cormorant Garamond",
      data: readFont("CormorantGaramond_500Medium_Italic.ttf"),
      weight: 500,
      style: "italic",
    },
    {
      name: "Cormorant Garamond",
      data: readFont("CormorantGaramond_600SemiBold_Italic.ttf"),
      weight: 600,
      style: "italic",
    },
    {
      name: "Quicksand",
      data: readFont("Quicksand_400Regular.ttf"),
      weight: 400,
      style: "normal",
    },
    {
      name: "Quicksand",
      data: readFont("Quicksand_600SemiBold.ttf"),
      weight: 600,
      style: "normal",
    },
    {
      // Subset de Noto Serif SC (OFL) con SOLO los 10 troncos celestes usados por
      // el glifo hanzi de la lente "pilares" (甲乙丙丁戊己庚辛壬癸) — generado con
      // la API de subsetting de Google Fonts (css2?family=Noto+Serif+SC&text=...),
      // que devuelve un .ttf ya recortado a esos code points (3.6KB, no los ~10MB
      // del CJK completo). Cormorant Garamond no trae glifos CJK y satori no cae a
      // fuentes del sistema como un navegador — por eso este subset es la única
      // familia que puede pintar el hanzi (ver zodiac-glyphs.tsx para el mismo
      // razonamiento aplicado a los glifos zodiacales).
      name: "Noto Serif SC",
      data: readFont("NotoSerifSC-hanzi-subset.ttf"),
      weight: 500,
      style: "normal",
    },
  ];
  return cached;
}
