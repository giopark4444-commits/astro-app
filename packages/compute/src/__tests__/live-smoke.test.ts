// packages/compute/src/__tests__/live-smoke.test.ts
// Gated: solo corre si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY están en el entorno.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @aluna/compute test
import { describe, it, expect } from "vitest";
import { createServiceSupabaseClient } from "@aluna/supabase/server";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!url || !key)("supabase live smoke (gated)", () => {
  it("el cliente service-role puede consultar charts sin error", async () => {
    const db = createServiceSupabaseClient(url!, key!);
    const { error } = await db.from("charts").select("id").limit(1);
    expect(error).toBeNull();
  });
});
