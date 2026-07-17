// Task 9 (capa de significados, piel móvil): carta.tsx/pilares.tsx/
// horoscopo.tsx envuelven glifos y nombres con <Meaning k={...}>. RN no tiene
// infra de render (AGENTS.md — nada de jest-expo todavía), así que este test
// cubre lo que SÍ se puede probar sin montar componentes: que cada clave
// construida por los helpers usados en el wiring (compartidos con la web vía
// @aluna/core) resuelve a una entrada REAL del glosario, en los dos locales —
// si alguna pantalla usa mal un id interno (p.ej. "exile" sin pasar por
// dignityMeaningKey), esto lo detecta sin necesitar montar RN.
import { describe, it, expect } from "vitest";
import {
  glossaryEntry,
  planetMeaningKey,
  dignityMeaningKey,
  patternMeaningKey,
  PLANETS,
  ZODIAC_SIGNS,
  TEN_GODS,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type TenGod,
} from "@aluna/core";

const LOCALES = ["es", "en"] as const;

function expectResolves(key: string) {
  for (const locale of LOCALES) {
    expect(glossaryEntry(key, locale), `${key} (${locale})`).not.toBeNull();
  }
}

describe("claves del glosario usadas en el wiring móvil (carta/pilares/horóscopo)", () => {
  it("planetMeaningKey resuelve para todos los cuerpos, incl. north/south node", () => {
    for (const p of PLANETS) expectResolves(planetMeaningKey(p.key));
  });

  it("dignityMeaningKey resuelve las 5 dignidades, incl. exile→detriment", () => {
    for (const d of ["domicile", "exaltation", "detriment", "fall", "peregrine", "exile"]) {
      expectResolves(dignityMeaningKey(d));
    }
  });

  it("patternMeaningKey resuelve los 4 patrones (snake_case→sinespacios)", () => {
    for (const t of ["stellium", "grand_trine", "grand_cross", "t_square", "yod"]) {
      expectResolves(patternMeaningKey(t));
    }
  });

  it("sign.* resuelve los 12 signos (carta.tsx/horoscopo.tsx)", () => {
    for (const s of ZODIAC_SIGNS) expectResolves(`sign.${s.key}`);
  });

  it("aspect.* resuelve los aspectos aplicados en AspectRow/HitRow", () => {
    for (const a of ["conjunction", "opposition", "trine", "square", "sextile", "quincunx", "semisextile", "semisquare", "sesquisquare", "quintile"]) {
      expectResolves(`aspect.${a}`);
    }
  });

  it("term.retrograde/applying/separating/orb resuelven (posRow/aspRow)", () => {
    for (const k of ["term.retrograde", "term.applying", "term.separating", "term.orb"]) expectResolves(k);
  });

  it("element.*/modality.* resuelven (Balance de carta.tsx)", () => {
    for (const el of ["fire", "earth", "air", "water"]) expectResolves(`element.${el}`);
    for (const m of ["cardinal", "fixed", "mutable"]) expectResolves(`modality.${m}`);
  });

  it("bazi.stem.*/bazi.branch.* resuelven los 10 troncos y 12 ramas (pilares.tsx)", () => {
    for (const s of HEAVENLY_STEMS) expectResolves(`bazi.stem.${s.key}`);
    for (const b of EARTHLY_BRANCHES) expectResolves(`bazi.branch.${b.key}`);
  });

  it("bazi.god.* resuelve los 10 Dioses (godBadge/hiddenGod)", () => {
    for (const g of TEN_GODS) expectResolves(`bazi.god.${g.key as TenGod}`);
  });

  it("bazi.element.* resuelve los 5 elementos Wu Xing (balance de pilares.tsx)", () => {
    for (const el of ["wood", "fire", "earth", "metal", "water"]) expectResolves(`bazi.element.${el}`);
  });

  it("bazi.term.* resuelve los títulos de sección de la lámina Pro", () => {
    for (const k of [
      "daymaster", "nayin", "strength", "favorable", "luckpillars",
      "twelvestages", "interactions", "symbolicstars",
    ]) {
      expectResolves(`bazi.term.${k}`);
    }
  });
});
