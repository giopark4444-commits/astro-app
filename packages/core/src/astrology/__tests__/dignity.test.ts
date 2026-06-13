import { describe, it, expect } from "vitest";
import { dignityOf } from "../dignity";

describe("dignityOf", () => {
  it("Sol en Acuario -> exilio (regente de Leo, opuesto)", () => {
    expect(dignityOf("sun", "aquarius")).toBe("exile");
  });
  it("Sol en Leo -> domicilio", () => {
    expect(dignityOf("sun", "leo")).toBe("domicile");
  });
  it("Marte en Escorpio -> domicilio", () => {
    expect(dignityOf("mars", "scorpio")).toBe("domicile");
  });
  it("Júpiter en Capricornio -> caída (exaltación en Cáncer, opuesto)", () => {
    expect(dignityOf("jupiter", "capricorn")).toBe("fall");
  });
  it("Saturno en Escorpio -> sin dignidad (null)", () => {
    expect(dignityOf("saturn", "scorpio")).toBeNull();
  });
  it("cuerpo sin dignidades (quirón) -> null", () => {
    expect(dignityOf("chiron", "taurus")).toBeNull();
  });
});
