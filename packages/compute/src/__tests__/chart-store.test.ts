// packages/compute/src/__tests__/chart-store.test.ts
import { describe, it, expect } from "vitest";
import { supabaseChartStore } from "../chart-store";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

describe("supabaseChartStore (adaptador)", () => {
  it("expone findByKey y save sobre un cliente dado (sin red)", () => {
    const db = createServiceSupabaseClient("https://x.supabase.co", "service-key");
    const store = supabaseChartStore(db);
    expect(typeof store.findByKey).toBe("function");
    expect(typeof store.save).toBe("function");
  });
});
