// packages/compute/src/__tests__/get-or-compute.test.ts
import { describe, it, expect } from "vitest";
import { getOrComputeChart } from "../get-or-compute";
import type { ChartStore, StoredChartRow } from "../chart-store";
import type { ChartInput } from "@aluna/core";

// Carta real de Gio (referencia Astrodienst) → ejercita el motor nativo offline.
const GIO: ChartInput = {
  year: 1984, month: 2, day: 5, hour: 9, minute: 0,
  timeZone: "America/Guayaquil", latitude: -0.2167, longitude: -78.5,
};

function makeFakeStore() {
  const saved: StoredChartRow[] = [];
  const store: ChartStore = {
    async findByKey(birthProfileId, cacheKey) {
      const row = saved.find(
        (r) => r.birthProfileId === birthProfileId && r.cacheKey === cacheKey,
      );
      return row ? row.result : null;
    },
    async save(row) {
      saved.push(row);
    },
  };
  return { store, saved };
}

describe("getOrComputeChart", () => {
  it("primera vez: calcula, guarda y marca cached=false", async () => {
    const { store, saved } = makeFakeStore();
    const res = await getOrComputeChart({
      store, userId: "u1", birthProfileId: "p1", input: GIO,
    });
    expect(res.cached).toBe(false);
    expect(res.chart.bodies.find((b) => b.body === "sun")!.sign).toBe("aquarius");
    expect(saved).toHaveLength(1);
    expect(saved[0]!.cacheKey).toBe(res.cacheKey);
    expect(saved[0]!.userId).toBe("u1");
    expect(saved[0]!.houseSystem).toBe("placidus");
    expect(saved[0]!.zodiac).toBe("tropical");
  });

  it("segunda vez con misma entrada: lee de caché (cached=true) sin re-guardar", async () => {
    const { store, saved } = makeFakeStore();
    const first = await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    const second = await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    expect(second.cached).toBe(true);
    expect(saved).toHaveLength(1); // no se guardó de nuevo
    expect(second.chart).toEqual(first.chart);
  });

  it("cambiar el sistema de casas produce otra clave y recalcula", async () => {
    const { store, saved } = makeFakeStore();
    await getOrComputeChart({ store, userId: "u1", birthProfileId: "p1", input: GIO });
    const koch = await getOrComputeChart({
      store, userId: "u1", birthProfileId: "p1", input: { ...GIO, houseSystem: "koch" },
    });
    expect(koch.cached).toBe(false);
    expect(saved).toHaveLength(2);
  });
});
