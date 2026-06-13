import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "../client";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("supabase browser client", () => {
  it("expone .auth y .from sin tocar la red", () => {
    const db = createClient();
    expect(typeof db.auth.getUser).toBe("function");
    expect(typeof db.from).toBe("function");
  });
});
