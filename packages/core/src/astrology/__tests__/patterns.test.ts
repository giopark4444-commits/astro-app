import { describe, it, expect } from "vitest";
import { detectPatterns } from "../patterns";

describe("detectPatterns", () => {
  it("detecta un stellium (3+ cuerpos en el mismo signo)", () => {
    const bodies = [
      { key: "mars", longitude: 222 }, // Escorpio
      { key: "saturn", longitude: 226 }, // Escorpio
      { key: "pluto", longitude: 212 }, // Escorpio
      { key: "sun", longitude: 315 }, // Acuario (fuera)
    ];
    const p = detectPatterns(bodies);
    const stellium = p.find((x) => x.type === "stellium");
    expect(stellium).toBeDefined();
    expect(stellium!.bodies.sort()).toEqual(["mars", "pluto", "saturn"]);
  });

  it("detecta un gran trígono (3 cuerpos ~120° entre sí)", () => {
    const bodies = [
      { key: "a", longitude: 10 },
      { key: "b", longitude: 130 },
      { key: "c", longitude: 250 },
    ];
    const p = detectPatterns(bodies);
    expect(p.some((x) => x.type === "grand_trine")).toBe(true);
  });

  it("detecta una T-cuadrada (oposición + 2 cuadraturas)", () => {
    const bodies = [
      { key: "a", longitude: 0 },
      { key: "b", longitude: 180 }, // oposición a
      { key: "c", longitude: 90 }, // cuadratura a a y b
    ];
    const p = detectPatterns(bodies);
    expect(p.some((x) => x.type === "t_square")).toBe(true);
  });
});
