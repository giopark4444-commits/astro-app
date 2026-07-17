import { describe, it, expect, vi, afterEach } from "vitest";
import { gestureRng } from "../rng";

function mockCrypto(fixedUint32: number) {
  const spy = vi
    .spyOn(globalThis.crypto, "getRandomValues")
    .mockImplementation(((arr: Uint32Array) => {
      arr[0] = fixedUint32;
      return arr;
    }) as typeof globalThis.crypto.getRandomValues);
  return spy;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("gestureRng", () => {
  it("devuelve una función generadora de números 0<=x<1", () => {
    const rng = gestureRng(1_700_000_000_000);
    expect(typeof rng).toBe("function");
    const x = rng();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });

  it("mismo timestamp, crypto real (no mockeado) → secuencias DISTINTAS (crypto participa en la semilla)", () => {
    const t = 1_700_000_000_000;
    const seqA = [gestureRng(t)(), gestureRng(t)()];
    const seqB = [gestureRng(t)(), gestureRng(t)()];
    // Con crypto real, dos "gestos" al mismo timestamp casi seguro difieren.
    expect(seqA).not.toEqual(seqB);
  });

  it("crypto mockeado a un valor fijo + mismo timestamp → misma secuencia (determinismo del mezclado)", () => {
    mockCrypto(0xdeadbeef);
    const t = 1_700_000_000_000;
    const rngA = gestureRng(t);
    const seqA = [rngA(), rngA(), rngA()];

    mockCrypto(0xdeadbeef);
    const rngB = gestureRng(t);
    const seqB = [rngB(), rngB(), rngB()];

    expect(seqA).toEqual(seqB);
  });

  it("crypto mockeado igual, timestamps distintos → semillas (y secuencias) distintas", () => {
    mockCrypto(0xdeadbeef);
    const rngA = gestureRng(1_700_000_000_000);
    const a = rngA();

    mockCrypto(0xdeadbeef);
    const rngB = gestureRng(1_700_000_000_001);
    const b = rngB();

    expect(a).not.toBe(b);
  });
});
