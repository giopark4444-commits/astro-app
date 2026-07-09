// packages/core/src/bazi/__tests__/labels.test.ts
import { describe, it, expect } from "vitest";
import { STEM_LABELS, BRANCH_LABELS, TEN_GOD_KO } from "../labels";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, TEN_GODS } from "../bazi";

describe("etiquetas de dominio Ba Zi ↔ Saju", () => {
  it("10 troncos con hangul: 甲=갑, 癸=계; pinyin 甲=jiǎ", () => {
    expect(STEM_LABELS).toHaveLength(HEAVENLY_STEMS.length);
    expect(STEM_LABELS[0]).toEqual({ pinyin: "jiǎ", hangul: "갑", romanKo: "gap" });
    expect(STEM_LABELS[9]!.hangul).toBe("계");
  });
  it("12 ramas con hangul: 子=자, 亥=해; romanización 子=ja", () => {
    expect(BRANCH_LABELS).toHaveLength(EARTHLY_BRANCHES.length);
    expect(BRANCH_LABELS[0]).toEqual({ pinyin: "zǐ", hangul: "자", romanKo: "ja" });
    expect(BRANCH_LABELS[11]!.hangul).toBe("해");
  });
  it("los 10 Dioses tienen hangul (比肩=비견, 正印=정인)", () => {
    for (const g of TEN_GODS) expect(TEN_GOD_KO[g.key]).toBeTruthy();
    expect(TEN_GOD_KO.peer).toBe("비견");
    expect(TEN_GOD_KO.resource_direct).toBe("정인");
  });
});
