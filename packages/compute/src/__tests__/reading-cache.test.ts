// packages/compute/src/__tests__/reading-cache.test.ts
import { describe, it, expect } from "vitest";
import {
  inMemoryReadingCacheStore,
  supabaseReadingCacheStore,
  type ReadingCacheEntry,
} from "../reading-cache";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

const SAMPLE: ReadingCacheEntry = {
  key: "es:lifePath:11:profunda",
  kind: "numerology",
  locale: "es",
  model: "claude-opus-4-8",
  payload: { essence: "…", flow: "…", shadow: "…", practice: "…" },
};

describe("inMemoryReadingCacheStore", () => {
  it("set guarda y get devuelve el payload por su clave", async () => {
    const store = inMemoryReadingCacheStore();
    expect(await store.get(SAMPLE.key)).toBeNull();
    await store.set(SAMPLE);
    expect(await store.get(SAMPLE.key)).toEqual(SAMPLE.payload);
  });

  it("get de una clave inexistente devuelve null", async () => {
    const store = inMemoryReadingCacheStore();
    expect(await store.get("no-existe")).toBeNull();
  });

  it("set reemplaza el payload de una clave existente (idempotente sobre la clave)", async () => {
    const store = inMemoryReadingCacheStore();
    await store.set(SAMPLE);
    await store.set({ ...SAMPLE, payload: { essence: "otra" } });
    expect(await store.get(SAMPLE.key)).toEqual({ essence: "otra" });
  });
});

describe("supabaseReadingCacheStore (adaptador)", () => {
  it("expone get y set sobre un cliente dado (sin red)", () => {
    const db = createServiceSupabaseClient("https://x.supabase.co", "service-key");
    const store = supabaseReadingCacheStore(db);
    expect(typeof store.get).toBe("function");
    expect(typeof store.set).toBe("function");
  });
});
