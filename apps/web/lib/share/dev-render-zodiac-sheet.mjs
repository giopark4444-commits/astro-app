// apps/web/lib/share/dev-render-zodiac-sheet.mjs
// Script dev (no forma parte del build/deploy): hoja de contacto de los 12
// glifos zodiacales rehechos (FIX 1, Tabler Icons) para inspección visual
// rápida sin tener que abrir 12 archivos sueltos. Renderiza las 12 cards de
// horóscopo (una por signo, tema observatory, formato story, misma
// eyebrowDate para las 12), recorta con sharp la banda central superior de
// cada una (donde viven el glow+glifo+título — y=350..1100 de los 1920px de
// alto de una card story) y compone una grilla 4×3 en un solo JPEG.
//
// Ejecutar (mismo criterio que dev-render-samples.mjs — necesita el
// tsconfig.json de este directorio para que tsx transforme JSX):
//   cd apps/web/lib/share && npx tsx dev-render-zodiac-sheet.mjs [dir-salida]
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { ZODIAC_GLYPH_KEYS } from "./zodiac-glyphs";
import { renderShareCardImage } from "./render.ts";

const OUT_DIR =
  process.argv[2] ??
  "/private/tmp/claude-501/-Users-gio/e2bcdddb-4cc7-4da5-9ff1-0fafd21799ee/scratchpad/fase2-samples";

// Banda que contiene glow + glifo + título en una card story (1080×1920) —
// pedida explícitamente por Gio en la verificación del FIX 1.
const CROP = { top: 350, height: 1100 - 350 };
const CARD_WIDTH = 1080;

const COLS = 4;
const ROWS = 3;
const GUTTER = 4;
const LABEL_HEIGHT = 56;
const CELL_W = CARD_WIDTH;
const CELL_H = CROP.height + LABEL_HEIGHT;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generando hoja de contacto de ${ZODIAC_GLYPH_KEYS.length} signos en ${OUT_DIR}\n`);

  const crops = [];
  for (const sign of ZODIAC_GLYPH_KEYS) {
    const buf = await renderShareCardImage(
      { lens: "horoscopo", sign, format: "story", theme: "observatory", detail: true, locale: "es" },
      "21 DE JULIO",
    );
    const cropped = await sharp(buf).extract({ left: 0, top: CROP.top, width: CARD_WIDTH, height: CROP.height }).toBuffer();
    crops.push({ sign, buf: cropped });
    console.log(`  recorte ${sign} listo (${(cropped.length / 1024).toFixed(1)}KB)`);
  }

  // Etiqueta de texto (nombre del signo) bajo cada recorte, vía SVG-a-PNG
  // compuesto con sharp — no hace falta satori para 12 líneas de texto plano.
  const sheetW = COLS * CELL_W + (COLS - 1) * GUTTER;
  const sheetH = ROWS * CELL_H + (ROWS - 1) * GUTTER;
  const bg = sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: "#0a0d24" } });

  const composites = [];
  crops.forEach(({ sign, buf }, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CELL_W + GUTTER);
    const y = row * (CELL_H + GUTTER);
    composites.push({ input: buf, left: x, top: y });
    const labelSvg = Buffer.from(
      `<svg width="${CELL_W}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="100%" height="100%" fill="#0a0d24"/>` +
        `<text x="50%" y="70%" font-family="Georgia, serif" font-size="34" fill="#e7c986" ` +
        `text-anchor="middle" letter-spacing="4">${sign.toUpperCase()}</text>` +
        `</svg>`,
    );
    composites.push({ input: labelSvg, left: x, top: y + CROP.height });
  });

  const outPath = `${OUT_DIR}/zodiac-contact-sheet.jpg`;
  const sheetBuf = await bg.composite(composites).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  writeFileSync(outPath, sheetBuf);
  console.log(`\nOK: ${outPath} — ${(sheetBuf.length / 1024).toFixed(1)}KB (${sheetW}×${sheetH})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
