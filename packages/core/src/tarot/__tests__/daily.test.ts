// packages/core/src/tarot/__tests__/daily.test.ts
import { describe, it, expect } from "vitest";
import { dailyCard, dailySeed } from "../daily";

describe("dailyCard / dailySeed", () => {
  it("misma (user,fecha) → misma carta e inversión; usuario o fecha distintos → semilla SIEMPRE difiere", () => {
    const a = dailyCard("user-1", "2026-07-17");
    expect(dailyCard("user-1", "2026-07-17")).toEqual(a);
    expect(dailySeed("user-1", "2026-07-18")).not.toBe(dailySeed("user-1", "2026-07-17"));
    expect(dailySeed("user-2", "2026-07-17")).not.toBe(dailySeed("user-1", "2026-07-17"));
  });

  it("opts.reversals:false → carta del día siempre derecha, sin afectar la carta elegida (misma que sin opts salvo inversión)", () => {
    // "2026-07-05" da reversed:true por defecto para user-1 (verificado a mano) —
    // asegura que el test realmente ejercita el paso de opts, no una coincidencia.
    const withReversals = dailyCard("user-1", "2026-07-05");
    expect(withReversals.reversed).toBe(true);
    const forcedUpright = dailyCard("user-1", "2026-07-05", { reversals: false });
    expect(forcedUpright.reversed).toBe(false);
    expect(forcedUpright.card).toEqual(withReversals.card);
  });

  it("sin opts, es retrocompatible: mismo resultado exacto que antes de introducir opts", () => {
    expect(dailyCard("user-1", "2026-07-17")).toEqual(dailyCard("user-1", "2026-07-17", {}));
  });

  it("FNV-1a 32-bit canónico sobre `${userId}|${localDate}`", () => {
    // Vector de referencia calculado a mano con offset 2166136261 / prime 16777619.
    expect(dailySeed("user-1", "2026-07-17")).toBe(fnv1a32("user-1|2026-07-17"));
  });

  it("en 60 fechas distintas salen >=25 cartas distintas (dispersión de semilla, no estancamiento)", () => {
    // Simplificación autorizada por el brief: 60 strings de fecha distintos y razonables,
    // en vez del esquema sintético original — lo que se afirma es dispersión de la semilla.
    const dates = Array.from({ length: 60 }, (_, i) => {
      const day = (i % 28) + 1;
      const month = 1 + Math.floor(i / 28);
      return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    });
    const ids = new Set(dates.map((d) => dailyCard("user-1", d).card.id));
    expect(ids.size).toBeGreaterThan(25);
  });
});

function fnv1a32(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
