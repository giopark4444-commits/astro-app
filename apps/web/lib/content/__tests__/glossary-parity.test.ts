import { describe, it, expect } from "vitest";
import { GLOSSARY_ES } from "../glossary-es";
import { GLOSSARY_EN } from "../glossary-en";

describe("glosario ES↔EN", () => {
  it("mismas claves en ambos idiomas", () => {
    expect(Object.keys(GLOSSARY_EN).sort()).toEqual(Object.keys(GLOSSARY_ES).sort());
  });
  it("ninguna entrada vacía", () => {
    for (const g of [GLOSSARY_ES, GLOSSARY_EN])
      for (const [k, e] of Object.entries(g)) {
        expect(e.title.length, k).toBeGreaterThan(2);
        expect(e.body.length, k).toBeGreaterThan(40);
      }
  });
});
