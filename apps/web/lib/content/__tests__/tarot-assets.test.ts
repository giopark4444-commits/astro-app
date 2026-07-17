import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TAROT_DECK } from "@aluna/core";

const ASSETS_DIR = path.join(process.cwd(), "public", "tarot", "rws");

describe("tarot RWS assets", () => {
  for (const card of TAROT_DECK) {
    it(`existe apps/web/public/tarot/rws/${card.id}.webp (>5KB)`, () => {
      const file = path.join(ASSETS_DIR, `${card.id}.webp`);
      expect(fs.existsSync(file), `falta ${file}`).toBe(true);
      const { size } = fs.statSync(file);
      expect(size, `${card.id}.webp pesa ${size} bytes`).toBeGreaterThan(5 * 1024);
    });
  }
});
