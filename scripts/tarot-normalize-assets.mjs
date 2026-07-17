// scripts/tarot-normalize-assets.mjs
// Normaliza las 78 cartas RWS + el dorso a un lienzo UNIFORME de 372×620
// (ratio 0.60) con matte índigo #12142e horneado, usando `fit: contain` para
// que NUNCA se recorte arte (los escaneos de Wikimedia venían con ratios
// dispares 0.56–0.59 y bordes irregulares → con object-fit:cover se comían
// números y nombres). El matte índigo coincide con la superficie oscura de la
// app, así que cada carta se ve enmarcada, no con letterbox.
//
// Idempotente: reprocesar imágenes ya normalizadas las deja igual (mismo
// lienzo, mismo fit). Reejecutar tras añadir/reemplazar cartas RWS.
//
// Uso:  node scripts/tarot-normalize-assets.mjs
// Requiere `npx --yes sharp-cli` (se descarga on-the-fly; no se instala al repo).

import { execFileSync } from "node:child_process";
import { readdirSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RWS_DIR = fileURLToPath(new URL("../apps/web/public/tarot/rws", import.meta.url));
const CANVAS = { w: 372, h: 620 };
const MATTE = "#12142e"; // índigo del mazo / superficie oscura de la app

const webps = readdirSync(RWS_DIR).filter((f) => f.endsWith(".webp"));
if (webps.length === 0) throw new Error(`Sin .webp en ${RWS_DIR}`);

// sharp-cli escribe al dir de salida con el mismo nombre; procesamos a un tmp
// y luego copiamos de vuelta (evita leer/escribir el mismo archivo a la vez).
const out = mkdtempSync(join(tmpdir(), "tarot-norm-"));
try {
  execFileSync(
    "npx",
    ["--yes", "sharp-cli", "--input", "*.webp", "--output", out,
      "resize", String(CANVAS.w), String(CANVAS.h), "--fit", "contain", "--background", MATTE],
    { cwd: RWS_DIR, stdio: "inherit" },
  );
  let n = 0;
  for (const f of readdirSync(out).filter((x) => x.endsWith(".webp"))) {
    copyFileSync(join(out, f), join(RWS_DIR, f));
    n++;
  }
  console.log(`Normalizadas ${n}/${webps.length} cartas a ${CANVAS.w}×${CANVAS.h} (matte ${MATTE}).`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
