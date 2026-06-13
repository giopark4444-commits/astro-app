// packages/supabase/src/__tests__/clients.test.ts
import { describe, it, expect } from "vitest";
import { createBrowserSupabaseClient } from "../client";
import { createServiceSupabaseClient } from "../server";

describe("fábricas de cliente Supabase", () => {
  it("el cliente público expone .from() sin tocar la red", () => {
    const db = createBrowserSupabaseClient("https://x.supabase.co", "anon-key");
    expect(typeof db.from).toBe("function");
  });

  it("el cliente service-role expone .from() sin tocar la red", () => {
    const db = createServiceSupabaseClient("https://x.supabase.co", "service-key");
    expect(typeof db.from).toBe("function");
  });
});
