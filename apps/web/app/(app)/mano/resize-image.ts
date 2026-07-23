// Reescala una foto de palma ANTES de subirla (spec lectura-mano): máx 1600px
// el lado largo, JPEG calidad 0.85, devuelto como base64 SIN el prefijo
// data-URL (el server lo espera puro — ver app/api/palm-analysis/route.ts).
// Vive en su propio módulo para que mano-view.tsx pueda mockearlo en tests
// (jsdom no implementa un <canvas> 2D real: intentar decodificar/dibujar una
// imagen de verdad en la suite no tiene sentido — se cubre con un mock, igual
// que el resto del repo mockea fetch).

export interface PalmImage {
  data: string;
  mime: string;
}

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("file_read_error"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_decode_error"));
    img.src = src;
  });
}

/** Pela el prefijo "data:<mime>;base64," de una data-URL. Si no matchea (no
 *  debería pasar con toDataURL/readAsDataURL), cae al mime de respaldo. */
function stripDataUrlPrefix(dataUrl: string, fallbackMime: string): PalmImage {
  const match = dataUrl.match(/^data:([a-z0-9/+.-]+);base64,(.*)$/i);
  return match ? { data: match[2]!, mime: match[1]! } : { data: dataUrl, mime: fallbackMime };
}

/** Reescala `file` a máx 1600px de lado largo y lo reencodea a JPEG q0.85.
 *  Sin contexto 2D disponible (navegador raro), manda la foto original tal
 *  cual — mejor una foto grande que ninguna. */
export async function resizePalmPhoto(file: File): Promise<PalmImage> {
  const original = await readAsDataURL(file);
  const img = await loadImage(original);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return stripDataUrlPrefix(original, file.type || "image/jpeg");

  ctx.drawImage(img, 0, 0, width, height);
  const resized = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return stripDataUrlPrefix(resized, "image/jpeg");
}
