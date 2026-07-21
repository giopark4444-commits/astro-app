// apps/web/lib/share/__tests__/card-template.test.ts
// Verifica el wiring de `personName` (placa del nombre, placement A) en el
// árbol JSX puro de satori — sin satori/ImageResponse de por medio (eso ya
// tiene su propio smoke real en render.test.ts). Se camina el árbol de
// elementos de React recolectando todo el texto pintado y se comprueba que el
// nombre (uppercase) aparece cuando se pasa `personName`, y NO aparece si no.
import { describe, expect, it } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { buildCardTree, type BuildCardTreeOptions } from "../card-template";
import { resolveInsight } from "../resolve-insight";
import type { ShareCardParams } from "../types";

function collectText(node: ReactNode, acc: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return acc;
  if (typeof node === "string" || typeof node === "number") {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, acc);
    return acc;
  }
  if (typeof node === "object" && "props" in (node as ReactElement)) {
    const props = (node as ReactElement).props as { children?: ReactNode };
    collectText(props?.children, acc);
  }
  return acc;
}

function renderedText(params: ShareCardParams, options: Omit<BuildCardTreeOptions, keyof ShareCardParams>): string {
  const insight = resolveInsight(params);
  const tree = buildCardTree(insight, {
    format: params.format,
    theme: params.theme,
    detail: params.detail,
    locale: params.locale,
    ...options,
  });
  return collectText(tree).join(" | ");
}

const NUMEROS_STORY: ShareCardParams = {
  lens: "numeros",
  number: 7,
  labelKey: "lifePath",
  format: "story",
  theme: "observatory",
  detail: true,
  locale: "es",
  showName: false,
};

const TAROT_SQUARE: ShareCardParams = {
  lens: "tarot",
  cardId: "fool",
  reversed: false,
  format: "square",
  theme: "cosmic",
  detail: true,
  locale: "es",
  showName: false,
};

const CARTA_FEED: ShareCardParams = {
  lens: "carta",
  body: "sun",
  sign: "leo",
  format: "feed",
  theme: "observatory",
  detail: true,
  locale: "es",
  showName: false,
};

describe("buildCardTree — nameplate (personName, placement A)", () => {
  it("sin personName: el árbol NO pinta ningún nombre", () => {
    const text = renderedText(NUMEROS_STORY, {});
    expect(text).not.toContain("GIOVANNI");
  });

  it("con personName: el árbol pinta el nombre EN MAYÚSCULAS", () => {
    const text = renderedText(NUMEROS_STORY, { personName: "Giovanni" });
    expect(text).toContain("GIOVANNI");
  });

  it("personName vacío se trata como ausente (el caller ya filtra, pero el template no debe reventar)", () => {
    const text = renderedText(NUMEROS_STORY, { personName: "" });
    expect(text).not.toContain("undefined");
  });

  it("tarot + square (layout horizontal especial): con personName también pinta la placa", () => {
    const withName = renderedText(TAROT_SQUARE, { personName: "Giovanni" });
    expect(withName).toContain("GIOVANNI");
    const withoutName = renderedText(TAROT_SQUARE, {});
    expect(withoutName).not.toContain("GIOVANNI");
  });

  it("carta + feed (fondo constelación): con personName también pinta la placa", () => {
    const withName = renderedText(CARTA_FEED, { personName: "Giovanni" });
    expect(withName).toContain("GIOVANNI");
    const withoutName = renderedText(CARTA_FEED, {});
    expect(withoutName).not.toContain("GIOVANNI");
  });

  it("carta + story (rueda HERO): con personName también pinta la placa", () => {
    const heroParams: ShareCardParams = { ...CARTA_FEED, format: "story" };
    const withName = renderedText(heroParams, { personName: "Giovanni" });
    expect(withName).toContain("GIOVANNI");
  });
});
