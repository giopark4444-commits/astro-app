#!/usr/bin/env node
/**
 * tarot-fetch-rws.mjs
 *
 * One-off script: downloads the 78 Rider-Waite-Smith (1909) tarot card scans
 * from Wikimedia Commons and produces apps/web/public/tarot/rws/{card.id}.webp
 * (~600px tall, converted via `sharp-cli`, nothing installed to the repo).
 *
 * FUENTE (dominio público):
 *   Category: "Rider-Waite tarot deck (Roses & Lilies)" on Wikimedia Commons
 *     https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies)
 *   Files follow the pattern "RWS1909 - <suit|number+name>.jpeg", e.g.:
 *     https://commons.wikimedia.org/wiki/File:RWS1909_-_00_Fool.jpeg
 *   Author: Pamela Colman Smith (1878-1951), illustrator of the deck, first
 *   published 1909 by William Rider & Son (deck designed under A.E. Waite).
 *   Public domain: published before 1931 in the US, and author died in 1951
 *   (life+70 has expired in the UK/EU as of 2021 and other life+70 jurisdictions).
 *   Per-file license/PD tags are on each Commons file page.
 *
 * Usage: node scripts/tarot-fetch-rws.mjs
 * Requires network access. Downloads sequentially with a short pause between
 * requests (be a good citizen of Wikimedia's infrastructure) and sends an
 * identified User-Agent, as required by the Wikimedia User-Agent policy
 * (https://meta.wikimedia.org/wiki/User-Agent_policy).
 */

import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "apps", "web", "public", "tarot", "rws");
const TMP_DIR = path.join(REPO_ROOT, "apps", "web", "public", "tarot", "rws", ".tmp-src");

const USER_AGENT =
  "AlunaTarotAssetFetcher/1.0 (https://github.com/; one-off script, contact: gio.park.4444@gmail.com)";

const PAUSE_MS = 350;
const TARGET_HEIGHT = 600;

/** Nombre exacto del archivo en Wikimedia Commons (sin "File:", con espacios). */
function commonsUrl(filename) {
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`;
}

/** Arcanos mayores: número de 2 dígitos + nombre tal como aparece en Commons. */
const MAJORS = [
  ["00", "Fool", "fool"],
  ["01", "Magician", "magician"],
  ["02", "High Priestess", "high-priestess"],
  ["03", "Empress", "empress"],
  ["04", "Emperor", "emperor"],
  ["05", "Hierophant", "hierophant"],
  ["06", "Lovers", "lovers"],
  ["07", "Chariot", "chariot"],
  ["08", "Strength", "strength"],
  ["09", "Hermit", "hermit"],
  ["10", "Wheel of Fortune", "wheel-of-fortune"],
  ["11", "Justice", "justice"],
  ["12", "Hanged Man", "hanged-man"],
  ["13", "Death", "death"],
  ["14", "Temperance", "temperance"],
  ["15", "Devil", "devil"],
  ["16", "Tower", "tower"],
  ["17", "Star", "star"],
  ["18", "Moon", "moon"],
  ["19", "Sun", "sun"],
  ["20", "Judgement", "judgement"],
  ["21", "World", "world"],
];

/** Palos: nombre Commons (capitalizado) -> id del mazo (deck.ts). */
const SUITS = [
  ["Wands", "wands"],
  ["Cups", "cups"],
  ["Swords", "swords"],
  ["Pentacles", "pentacles"],
];

/** Rango de la corte en la numeración Commons 11-14 -> sufijo del id. */
const COURTS = [
  ["11", "page"],
  ["12", "knight"],
  ["13", "queen"],
  ["14", "king"],
];

/** Mapa explícito nombre-de-archivo-Commons -> card.id de TAROT_DECK. */
function buildAssetMap() {
  /** @type {{ commonsFile: string, cardId: string }[]} */
  const map = [];

  for (const [num, name, cardId] of MAJORS) {
    map.push({ commonsFile: `RWS1909 - ${num} ${name}.jpeg`, cardId });
  }

  for (const [commonsSuit, suitId] of SUITS) {
    for (let n = 1; n <= 10; n += 1) {
      const nn = String(n).padStart(2, "0");
      map.push({
        commonsFile: `RWS1909 - ${commonsSuit} ${nn}.jpeg`,
        cardId: `${suitId}-${nn}`,
      });
    }
    for (const [nn, rank] of COURTS) {
      map.push({
        commonsFile: `RWS1909 - ${commonsSuit} ${nn}.jpeg`,
        cardId: `${suitId}-${rank}`,
      });
    }
  }

  return map;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadOne({ commonsFile, cardId }) {
  const url = commonsUrl(commonsFile);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`descarga falló para ${commonsFile} (${cardId}): HTTP ${res.status} ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error(`descarga sospechosamente pequeña para ${commonsFile}: ${buf.length} bytes`);
  }
  const srcPath = path.join(TMP_DIR, `${cardId}.src`);
  await writeFile(srcPath, buf);
  return srcPath;
}

async function convertToWebp(srcPath, cardId) {
  const outPath = path.join(OUT_DIR, `${cardId}.webp`);
  // Ancho holgado (2000) para que el alto (600) sea la restricción real dado
  // que los escaneos RWS son retrato ~0.57 ratio; --fit inside preserva aspecto.
  await execFileAsync("npx", [
    "--yes",
    "sharp-cli",
    "-i",
    srcPath,
    "-o",
    outPath,
    "resize",
    "2000",
    String(TARGET_HEIGHT),
    "--fit",
    "inside",
    "--withoutEnlargement",
  ]);
  return outPath;
}

async function main() {
  const assetMap = buildAssetMap();
  console.log(`Descargando ${assetMap.length} cartas RWS 1909 desde Wikimedia Commons...`);

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });

  let ok = 0;
  const failures = [];

  for (const entry of assetMap) {
    try {
      const srcPath = await downloadOne(entry);
      const outPath = await convertToWebp(srcPath, entry.cardId);
      const { size } = await stat(outPath);
      console.log(`  ${entry.cardId.padEnd(20)} <- ${entry.commonsFile} (${(size / 1024).toFixed(0)} KB)`);
      ok += 1;
    } catch (err) {
      console.error(`  FALLÓ ${entry.cardId}: ${err.message}`);
      failures.push(entry.cardId);
    }
    await sleep(PAUSE_MS);
  }

  await rm(TMP_DIR, { recursive: true, force: true });

  console.log(`\nCompletado: ${ok}/${assetMap.length} assets.`);
  if (failures.length > 0) {
    console.error(`Fallaron: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
