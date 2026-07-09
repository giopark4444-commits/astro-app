import { describe, it, expect } from "vitest";
import { baziLabels } from "../bazi-labels";
import { NAYIN, TWELVE_STAGES, STARS } from "@aluna/core";

describe("baziLabels", () => {
  it("cubre los 30 Na Yin en ES y EN", () => {
    for (const loc of ["es", "en"]) {
      const L = baziLabels(loc);
      for (const n of NAYIN) expect(L.nayin[n.key], `${loc}:${n.key}`).toBeTruthy();
    }
  });
  it("cubre las 12 etapas, las 7 estrellas y los 8 tipos de interacción", () => {
    const L = baziLabels("es");
    for (const s of TWELVE_STAGES) expect(L.stages[s.key]).toBeTruthy();
    for (const s of STARS) expect(L.stars[s.key]).toBeTruthy();
    for (const k of ["stem_combo","six_combo","trine","half_trine","clash","punishment","self_punishment","harm"] as const)
      expect(L.interactions[k]).toBeTruthy();
  });
  it("estados estacionales, veredictos y drivers presentes", () => {
    const L = baziLabels("en");
    for (const k of ["wang","xiang","xiu","qiu","si"] as const) expect(L.seasonStates[k]).toBeTruthy();
    for (const k of ["strong","weak","balanced"] as const) expect(L.verdicts[k]).toBeTruthy();
    for (const k of ["season","root_principal","root_residual","visible_support"]) expect(L.drivers[k]).toBeTruthy();
  });
});
