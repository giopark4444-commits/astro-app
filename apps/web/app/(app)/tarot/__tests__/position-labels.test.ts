// apps/web/app/(app)/tarot/__tests__/position-labels.test.ts
import { describe, it, expect } from "vitest";
import { positionLabelKey } from "../position-labels";

describe("positionLabelKey", () => {
  it("camelCase simple: 'heart' → 'positionHeart'", () => {
    expect(positionLabelKey("heart")).toBe("positionHeart");
  });

  it("con guion: 'hopes-fears' → 'positionHopesFears'", () => {
    expect(positionLabelKey("hopes-fears")).toBe("positionHopesFears");
  });

  it("con dígito: 'month-1' → 'positionMonth1'", () => {
    expect(positionLabelKey("month-1")).toBe("positionMonth1");
  });

  it("con dos palabras: 'your-feelings' → 'positionYourFeelings'", () => {
    expect(positionLabelKey("your-feelings")).toBe("positionYourFeelings");
  });
});
