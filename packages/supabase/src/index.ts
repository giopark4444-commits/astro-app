// packages/supabase/src/index.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";

/** Cliente Supabase tipado con el esquema de Aluna (alias reusable). */
export type AlunaSupabaseClient = SupabaseClient<Database>;

export { createBrowserSupabaseClient } from "./client";
// Nota: createServiceSupabaseClient se importa desde "@aluna/supabase/server" (solo-servidor).
