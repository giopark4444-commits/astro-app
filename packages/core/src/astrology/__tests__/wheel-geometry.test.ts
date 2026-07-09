// packages/core/src/astrology/__tests__/wheel-geometry.test.ts
import { describe, it, expect } from "vitest";
import { WHEEL, pointAt, annularSector, spreadBodies } from "../wheel-geometry";
import type { BodyPosition } from "../types";

const bp = (body: string, longitude: number): BodyPosition => ({
  body, longitude, sign: "aries", signDegree: 0, degree: 0, minute: 0, second: 0,
  speed: 1, retrograde: false, house: 1, dignity: null,
});

describe("wheel-geometry (extraída de la rueda web, validada al arcominuto)", () => {
  it("constantes de radios de la rueda", () => {
    expect(WHEEL).toMatchObject({ CX: 180, CY: 180, R_SIGN_OUT: 166, R_ASPECT: 94 });
  });
  it("pointAt: el Ascendente cae a la IZQUIERDA (9 en punto)", () => {
    const [x, y] = pointAt(100, 50, 50); // lon === asc
    expect(x).toBeCloseTo(WHEEL.CX - 100, 6);
    expect(y).toBeCloseTo(WHEEL.CY, 6);
  });
  it("pointAt: antihorario — asc+90° apunta hacia ABAJO en pantalla (IC)", () => {
    const [x, y] = pointAt(100, 140, 50);
    expect(x).toBeCloseTo(WHEEL.CX, 6);
    expect(y).toBeCloseTo(WHEEL.CY + 100, 6);
  });
  it("annularSector produce un path SVG cerrado con 2 arcos", () => {
    const d = annularSector(166, 136, 0, 30, 0);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.match(/A /g)).toHaveLength(2);
    expect(d.endsWith("Z")).toBe(true);
  });
  it("spreadBodies separa glifos más cercanos que el gap", () => {
    const out = spreadBodies([bp("sun", 10), bp("moon", 12)], 7);
    expect(out.get("sun")).toBe(10);
    expect(out.get("moon")).toBe(17);
  });
  it("spreadBodies no toca cuerpos ya separados", () => {
    const out = spreadBodies([bp("sun", 10), bp("moon", 40)], 7);
    expect(out.get("moon")).toBe(40);
  });
});
