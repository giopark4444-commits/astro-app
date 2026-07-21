// apps/web/lib/share/fonts.ts
// Fuentes vendorizadas para el render de tarjetas compartibles (ImageResponse/satori).
// Copiadas como .ttf de los paquetes @expo-google-fonts que ya usa apps/mobile
// (ver fonts/ para el origen exacto de cada archivo — detallado en el commit).
//
// Rutas LITERALES por archivo (nada de rutas dinámicas): el file-tracing de Next
// analiza estáticamente las llamadas a fs para decidir qué incluir en el output
// serverless — una ruta construida en runtime (p.ej. concatenando un nombre de
// variable) no se traza y el .ttf queda fuera del deploy. Mismo principio que el
// caveat de sweph en next.config.ts (ahí es un addon nativo, aquí son fuentes,
// pero el mecanismo de trace es el mismo).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
      data: readFileSync(fileURLToPath(new URL("./fonts/CormorantGaramond_500Medium.ttf", import.meta.url))),
      weight: 500,
      style: "normal",
    },
    {
      name: "Cormorant Garamond",
      data: readFileSync(fileURLToPath(new URL("./fonts/CormorantGaramond_600SemiBold.ttf", import.meta.url))),
      weight: 600,
      style: "normal",
    },
    {
      name: "Cormorant Garamond",
      data: readFileSync(fileURLToPath(new URL("./fonts/CormorantGaramond_500Medium_Italic.ttf", import.meta.url))),
      weight: 500,
      style: "italic",
    },
    {
      name: "Cormorant Garamond",
      data: readFileSync(fileURLToPath(new URL("./fonts/CormorantGaramond_600SemiBold_Italic.ttf", import.meta.url))),
      weight: 600,
      style: "italic",
    },
    {
      name: "Quicksand",
      data: readFileSync(fileURLToPath(new URL("./fonts/Quicksand_400Regular.ttf", import.meta.url))),
      weight: 400,
      style: "normal",
    },
    {
      name: "Quicksand",
      data: readFileSync(fileURLToPath(new URL("./fonts/Quicksand_600SemiBold.ttf", import.meta.url))),
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
      data: readFileSync(fileURLToPath(new URL("./fonts/NotoSerifSC-hanzi-subset.ttf", import.meta.url))),
      weight: 500,
      style: "normal",
    },
  ];
  return cached;
}
