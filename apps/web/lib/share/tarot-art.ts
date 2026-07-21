// apps/web/lib/share/tarot-art.ts
// Carga el arte RWS de una carta de tarot para incrustar en la tarjeta compartible
// como data URI (satori no puede pedir imágenes por red ni leer del filesystem por
// sí mismo: todo <img src> tiene que resolver a una URL http(s) o a un data URI ya
// materializado en memoria).
//
// Mapeo id→archivo: 1:1 y verificado — los 78 ids de TAROT_CARDS_ES (packages/core/
// src/tarot/content-es.ts) son EXACTAMENTE los 78 .webp de apps/web/public/tarot/
// rws/ (más back.webp, que no es una carta y no participa de este mapeo). Verificado
// por diff de conjuntos en el commit; sin faltantes.
//
// Invertida: se rota con sharp (rotate(180)) en vez de `transform:rotate(180deg)`
// en el JSX — satori soporta transform en contenedores simples, pero rotar el PNG
// ya decodificado es más robusto (no depende de que satori calcule bien el pivote
// de rotación de una imagen con radius+padding) y además sharp ya es una dependencia
// obligada de este módulo (conversión webp→png para satori, que no decodifica webp).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const RWS_DIR = join(process.cwd(), "public", "tarot", "rws");

const cache = new Map<string, Promise<string>>();

function cacheKey(cardId: string, reversed: boolean): string {
  return `${cardId}:${reversed ? "r" : "u"}`;
}

/** Devuelve el arte de `cardId` como data URI PNG (rotado 180° si `reversed`).
 *  Memoizado en un Map de módulo por (cardId, reversed) — el proceso de render
 *  reutiliza el mismo arte entre requests sin volver a tocar disco/sharp. */
export function loadTarotArt(cardId: string, reversed: boolean): Promise<string> {
  const key = cacheKey(cardId, reversed);
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    // Ruta vía process.cwd() (= apps/web bajo Next): el patrón
    // fileURLToPath(new URL(..., import.meta.url)) revienta bajo el runtime de Next
    // (ver fonts.ts). El tracing serverless se cubre con outputFileTracingIncludes.
    // cardId ya viene validado contra TAROT_CARD_IDS (validate.ts) antes de llegar
    // aquí, así que no hay riesgo de path traversal vía este template string.
    const webp = readFileSync(join(RWS_DIR, `${cardId}.webp`));
    let pipeline = sharp(webp);
    if (reversed) pipeline = pipeline.rotate(180);
    const png = await pipeline.png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  })();

  cache.set(key, promise);
  return promise;
}
