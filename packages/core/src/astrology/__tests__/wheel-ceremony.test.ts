// packages/core/src/astrology/__tests__/wheel-ceremony.test.ts
import { describe, it, expect } from "vitest";
import { WHEEL_CEREMONY, WHEEL_CEREMONY_ASPECTS, ceremonyTotalMs } from "../wheel-ceremony";

describe("wheel-ceremony (coreografía como datos puros, RN-safe)", () => {
  it("las fases están en orden ascendente de delay", () => {
    for (let i = 1; i < WHEEL_CEREMONY.length; i++) {
      expect(WHEEL_CEREMONY[i].delayMs).toBeGreaterThan(WHEEL_CEREMONY[i - 1].delayMs);
    }
  });

  it("hay exactamente 3 fases en el orden structure, signs, bodies", () => {
    expect(WHEEL_CEREMONY.map((p) => p.key)).toEqual(["structure", "signs", "bodies"]);
  });

  it('"signs" se solapa con "structure" (arranca antes de que termine structure)', () => {
    expect(WHEEL_CEREMONY[1].delayMs).toBeLessThan(
      WHEEL_CEREMONY[0].delayMs + WHEEL_CEREMONY[0].durationMs,
    );
  });

  it("los aspectos arrancan sincronizados con la fase bodies, sin escalonar", () => {
    const bodies = WHEEL_CEREMONY.find((p) => p.key === "bodies")!;
    expect(WHEEL_CEREMONY_ASPECTS.delayMs).toBe(bodies.delayMs);
  });

  it("ceremonyTotalMs(10, 8) devuelve el valor exacto calculado", () => {
    // bodies: delay 1040 + (10-1)*30 stagger + 440 duration = 1040 + 270 + 440 = 1750
    // aspects: 1040 + 480 = 1520
    // max(1750, 1520) = 1750
    expect(ceremonyTotalMs(10, 8)).toBe(1750);
  });

  it("ceremonyTotalMs(1, 0) no es negativo y usa el máximo entre bodies y aspectos", () => {
    // bodies: delay 1040 + 0*30 + 440 = 1480
    // aspects: 1040 + 480 = 1520
    // max(1480, 1520) = 1520
    const total = ceremonyTotalMs(1, 0);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBe(1520);
  });

  it("ceremonyTotalMs(0, 0) no es negativo (sin cuerpos)", () => {
    // Math.max(0, bodyCount - 1) evita stagger negativo cuando bodyCount es 0
    expect(ceremonyTotalMs(0, 0)).toBeGreaterThanOrEqual(0);
  });
});
