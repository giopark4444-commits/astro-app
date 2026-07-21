// apps/web/lib/share/render.ts
// Pipeline completo: ShareCardParams (ya validados) → JPEG. Único punto que hace
// I/O de verdad en el módulo — todo lo demás (resolve-insight, card-template,
// palette) es puro. next/og para satori (renderiza el JSX a PNG) + sharp para
// recodificar a JPEG (mismo criterio que app/opengraph-image.tsx: PNG es el único
// formato que produce ImageResponse, pero JPEG con mozjpeg pesa bastante menos
// para una imagen fotográfica/con gradientes como esta).
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { buildCardTree } from "./card-template";
import { loadShareFonts } from "./fonts";
import { SHARE_FORMAT_DIMENSIONS } from "./palette";
import { resolveInsight } from "./resolve-insight";
import { loadTarotArt } from "./tarot-art";
import type { ShareCardParams } from "./types";

export interface RenderShareCardOptions {
  /** Fecha ya formateada por el caller (route de la API) — este módulo nunca
   *  instancia Date, para que el render siga siendo testeable de forma
   *  determinista sin mockear el reloj. */
  eyebrowDate?: string;
  /** Nombre de la persona YA resuelto+saneado server-side (route.ts, desde el
   *  perfil autenticado) — este módulo sigue sin tocar DB ni recibir texto
   *  libre del cliente; solo pinta el string que le pasan. */
  personName?: string;
}

/** Renderiza una tarjeta compartible ya validada a un Buffer JPEG. */
export async function renderShareCardImage(
  params: ShareCardParams,
  options: RenderShareCardOptions = {},
): Promise<Buffer> {
  const { eyebrowDate, personName } = options;
  const insight = resolveInsight(params);
  const { w, h } = SHARE_FORMAT_DIMENSIONS[params.format];

  const tarotArtDataUri = params.lens === "tarot" ? await loadTarotArt(params.cardId, params.reversed) : undefined;

  const tree = buildCardTree(insight, {
    format: params.format,
    theme: params.theme,
    detail: params.detail,
    locale: params.locale,
    // Spread condicional, no `eyebrowDate: undefined` (exactOptionalPropertyTypes
    // distingue "la clave no está" de "está con valor undefined" — mismo criterio
    // que resolve-insight.ts para accentChipIndex).
    ...(eyebrowDate !== undefined ? { eyebrowDate } : {}),
    ...(tarotArtDataUri !== undefined ? { tarotArtDataUri } : {}),
    ...(personName !== undefined ? { personName } : {}),
  });

  const response = new ImageResponse(tree, {
    width: w,
    height: h,
    fonts: loadShareFonts(),
  });

  const png = Buffer.from(await response.arrayBuffer());
  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
