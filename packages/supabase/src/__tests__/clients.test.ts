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

  it("el cliente público acepta options (ej. auth.storage del móvil) y sigue funcionando", () => {
    const storage = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
    const db = createBrowserSupabaseClient("https://x.supabase.co", "anon-key", {
      auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    expect(typeof db.from).toBe("function");
    expect(typeof db.auth.getSession).toBe("function");
  });
});
