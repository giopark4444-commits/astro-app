import { describe, it, expect, afterEach, vi } from "vitest";
import { mulberry32 } from "@aluna/core";
import { gestureRng } from "../tarot-rng";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub de crypto que devuelve siempre la misma palabra de 32 bits. */
function stubCrypto(word: number) {
  vi.stubGlobal("crypto", {
    getRandomValues: (arr: Uint32Array) => {
      arr[0] = word;
      return arr;
    },
  });
}

describe("tarot-rng (gestureRng móvil)", () => {
  it("con crypto fijo es determinista: semilla = word XOR timestamp", () => {
    stubCrypto(0xdeadbeef);
    const ts = 1_752_700_000_123;
    const esperado = mulberry32((0xdeadbeef ^ (ts >>> 0)) >>> 0);
    const rng = gestureRng(ts);
    for (let i = 0; i < 5; i++) expect(rng()).toBe(esperado());
  });

  it("el timestamp del gesto participa: mismo crypto, distinto instante → secuencias distintas", () => {
    stubCrypto(7);
    const a = gestureRng(1000);
    stubCrypto(7);
    const b = gestureRng(2000);
    expect(a()).not.toBe(b());
  });

  it("sin crypto (Hermes viejo) cae a Math.random y sigue entregando un Rng válido en [0,1)", () => {
    vi.stubGlobal("crypto", undefined);
    const rng = gestureRng(Date.now());
    for (let i = 0; i < 10; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("el fallback también mezcla el timestamp (Math.random fijo, timestamps distintos → distinto)", () => {
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const a = gestureRng(1111);
    const b = gestureRng(9999);
    expect(a()).not.toBe(b());
    vi.restoreAllMocks();
  });
});
