#!/usr/bin/env node
/**
 * tarot-make-back.mjs
 *
 * One-off script: genera el dorso del mazo (apps/web/public/tarot/rws/back.webp)
 * para las cartas mostradas boca abajo. Diseño sobrio y geométrico (nada de
 * clipart): fondo índigo profundo, borde dorado fino, un enso (círculo
 * incompleto, trazo zen) con una estrella de 8 puntas radiando desde el
 * centro, también en trazo dorado fino.
 *
 * Genera un SVG programático en memoria y lo convierte a webp de 600px de
 * alto vía `sharp-cli` (mismo patrón que scripts/tarot-fetch-rws.mjs),
 * sin instalar nada en el repo.
 *
 * Usage: node scripts/tarot-make-back.mjs
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "apps", "web", "public", "tarot", "rws");
const TMP_DIR = path.join(OUT_DIR, ".tmp-back-src");

const TARGET_HEIGHT = 600;
const WIDTH = 350;
const HEIGHT = 600;

const INDIGO = "#1a1a2e";
const INDIGO_DEEP = "#12121f";
const GOLD = "#c9a227";

/** Punto en el borde de un círculo de radio `r` centrado en (cx,cy), a `deg` grados (0 = arriba). */
function pointOnCircle(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Estrella de 8 puntas: líneas rectas desde el centro hasta el radio exterior, cada 45°. */
function starLines(cx, cy, rOuter, rInner) {
  const lines = [];
  for (let i = 0; i < 8; i++) {
    const deg = i * 45;
    const [x1, y1] = pointOnCircle(cx, cy, rInner, deg);
    const [x2, y2] = pointOnCircle(cx, cy, rOuter, deg);
    lines.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" />`
    );
  }
  return lines.join("\n      ");
}

/** Enso: arco casi completo (deja un pequeño hueco), trazo zen imperfecto. */
function ensoPath(cx, cy, r) {
  const startDeg = 15;
  const endDeg = 345;
  const [x1, y1] = pointOnCircle(cx, cy, r, startDeg);
  const [x2, y2] = pointOnCircle(cx, cy, r, endDeg);
  const largeArc = 1;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function buildSvg() {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const margin = 18;
  const ensoR = 120;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${INDIGO}" />
      <stop offset="100%" stop-color="${INDIGO_DEEP}" />
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="url(#bg)" />

  <rect x="${margin}" y="${margin}" width="${WIDTH - margin * 2}" height="${HEIGHT - margin * 2}" rx="10"
        fill="none" stroke="${GOLD}" stroke-width="2" />
  <rect x="${margin + 8}" y="${margin + 8}" width="${WIDTH - (margin + 8) * 2}" height="${HEIGHT - (margin + 8) * 2}" rx="6"
        fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.55" />

  <g>
    ${starLines(cx, cy, ensoR - 6, 22)}
  </g>

  <path d="${ensoPath(cx, cy, ensoR)}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round" />

  <circle cx="${cx}" cy="${cy}" r="4" fill="${GOLD}" />
</svg>
`;
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const svg = buildSvg();
  const srcPath = path.join(TMP_DIR, "back.svg");
  await writeFile(srcPath, svg, "utf8");

  const outPath = path.join(OUT_DIR, "back.webp");
  await execFileAsync("npx", [
    "--yes",
    "sharp-cli",
    "-i",
    srcPath,
    "-o",
    outPath,
    "resize",
    String(WIDTH),
    String(TARGET_HEIGHT),
  ]);

  await rm(TMP_DIR, { recursive: true, force: true });

  console.log(`Dorso generado: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
