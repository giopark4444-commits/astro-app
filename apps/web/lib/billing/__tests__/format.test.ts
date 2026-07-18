import { describe, it, expect } from "vitest";
import { formatCents } from "../format";

describe("formatCents", () => {
  it("999 centavos -> $9.99", () => {
    expect(formatCents(999)).toBe("$9.99");
  });

  it("0 centavos -> $0.00", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("100 centavos -> $1.00", () => {
    expect(formatCents(100)).toBe("$1.00");
  });

  it("5 centavos -> $0.05 (no trunca el cero inicial)", () => {
    expect(formatCents(5)).toBe("$0.05");
  });
});
