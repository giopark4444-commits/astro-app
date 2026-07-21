// apps/web/lib/share/__tests__/render.test.ts
// @vitest-environment node
//
// Smoke REAL: sin mocks, ImageResponse/satori/sharp corren de verdad y el test
// verifica el JPEG resultante (dimensiones exactas, formato, tamaño). Entorno
// Node forzado arriba (línea 2): jsdom (el entorno por defecto del proyecto)
// parchea el `URL` global de forma que rompe `new URL(rel, import.meta.url)` —
// exactamente el patrón que usan fonts.ts y tarot-art.ts para leer sus archivos
// (mismo problema que ya documenta palette.test.ts con process.cwd()). Ese
// override de entorno necesitó además un guard de una línea en el
// vitest.setup.ts compartido (`typeof window !== "undefined"`), que asumía
// `window` global sin comprobarlo — sin el guard ningún test de este archivo
// puede levantar el entorno.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { SHARE_FORMATS, SHARE_FORMAT_DIMENSIONS, SHARE_THEMES, type ShareFormat, type ShareTheme } from "../palette";
import { renderShareCardImage } from "../render";
import type { ShareCardParams } from "../types";

const MAX_BYTES = 500_000;

async function expectValidCard(params: ShareCardParams, eyebrowDate?: string) {
  const buf = await renderShareCardImage(params, eyebrowDate);
  const meta = await sharp(buf).metadata();
  const dims = SHARE_FORMAT_DIMENSIONS[params.format];
  expect(meta.width).toBe(dims.w);
  expect(meta.height).toBe(dims.h);
  expect(meta.format).toBe("jpeg");
  expect(buf.length).toBeGreaterThan(0);
  expect(buf.length).toBeLessThan(MAX_BYTES);
  return buf;
}

function numeros(format: ShareFormat, theme: ShareTheme, number: number, labelKey = "lifePath"): ShareCardParams {
  return { lens: "numeros", number, labelKey, format, theme, detail: true, locale: "es" };
}

describe("renderShareCardImage — un formato × una lente representativa", () => {
  it.each(SHARE_FORMATS)("formato %s: numeros (camino de vida 7, observatory) produce un JPEG válido", async (format) => {
    await expectValidCard(numeros(format, "observatory", 7));
  });
});

describe("renderShareCardImage — un tema por cada uno de los 6", () => {
  it.each(SHARE_THEMES)("tema %s: numeros (camino de vida 7, story) produce un JPEG válido", async (theme) => {
    await expectValidCard(numeros("story", theme, 7));
  });
});

describe("renderShareCardImage — casos de estrés", () => {
  it("numeros 1 (esencia más larga) — story, observatory", async () => {
    await expectValidCard(numeros("story", "observatory", 1));
  });

  it("numeros 11 (número maestro, con chip) — story, cosmic", async () => {
    await expectValidCard(numeros("story", "cosmic", 11, "expression"));
  });

  it("tarot invertida (La Luna) — story, cosmic", async () => {
    const params: ShareCardParams = {
      lens: "tarot",
      cardId: "moon",
      reversed: true,
      format: "story",
      theme: "cosmic",
      detail: true,
      locale: "es",
    };
    await expectValidCard(params);
  });

  it("pilares (hanzi, jia) — story, observatory", async () => {
    const params: ShareCardParams = {
      lens: "pilares",
      dayStem: "jia",
      format: "story",
      theme: "observatory",
      detail: true,
      locale: "es",
    };
    await expectValidCard(params);
  });

  it("horóscopo con eyebrowDate — story, eclipse", async () => {
    const params: ShareCardParams = {
      lens: "horoscopo",
      sign: "aries",
      format: "story",
      theme: "eclipse",
      detail: true,
      locale: "es",
    };
    await expectValidCard(params, "21 DE JULIO");
  });
});

describe("renderShareCardImage — carta (rueda natal: HERO en story, FONDO en feed/square)", () => {
  function carta(format: ShareFormat, body: "sun" | "moon" | "asc", sign: string): ShareCardParams {
    return { lens: "carta", body, sign, format, theme: "observatory", detail: true, locale: "es" };
  }

  it.each([
    ["sun", "leo"],
    ["moon", "cancer"],
    ["asc", "scorpio"],
  ] as const)("body %s en %s — story (rueda HERO en la glowzone)", async (body, sign) => {
    await expectValidCard(carta("story", body, sign));
  });

  it.each([
    ["sun", "leo"],
    ["moon", "cancer"],
    ["asc", "scorpio"],
  ] as const)("body %s en %s — square (rueda de FONDO full-bleed + glifo del planeta)", async (body, sign) => {
    await expectValidCard(carta("square", body, sign));
  });
});

describe("renderShareCardImage — variante horizontal (tarot + square)", () => {
  it("tarot derecha (El Loco) — square, cosmic: layout horizontal, sigue siendo un JPEG válido", async () => {
    const params: ShareCardParams = {
      lens: "tarot",
      cardId: "fool",
      reversed: false,
      format: "square",
      theme: "cosmic",
      detail: true,
      locale: "es",
    };
    await expectValidCard(params);
  });
});

describe("renderShareCardImage — detail:false oculta los chips (no revienta sin ellos)", () => {
  it("numeros 11 (maestro) con detail:false sigue produciendo un JPEG válido", async () => {
    await expectValidCard({ ...numeros("story", "cosmic", 11, "expression"), detail: false });
  });
});
