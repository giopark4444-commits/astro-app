// packages/compute/src/chart-store.ts
import type { ChartResult } from "@aluna/core";
import type { AlunaSupabaseClient, Json } from "@aluna/supabase";

/** Fila de carta a persistir (forma de dominio; el adaptador la mapea a la tabla). */
export interface StoredChartRow {
  birthProfileId: string;
  userId: string;
  cacheKey: string;
  kind: string;
  houseSystem: string;
  zodiac: string;
  result: ChartResult;
}

/**
 * Puerto de persistencia de cartas. El orquestador depende de esta interfaz
 * (no del cliente Supabase) → se testea con una implementación en memoria, sin red.
 */
export interface ChartStore {
  /** Devuelve la carta cacheada para (perfil, clave) o null si no existe. */
  findByKey(birthProfileId: string, cacheKey: string): Promise<ChartResult | null>;
  /** Guarda una carta calculada (idempotente sobre el índice único). */
  save(row: StoredChartRow): Promise<void>;
}

/** Adaptador real contra la tabla `public.charts` usando un cliente service-role. */
export function supabaseChartStore(db: AlunaSupabaseClient): ChartStore {
  return {
    async findByKey(birthProfileId, cacheKey) {
      const { data, error } = await db
        .from("charts")
        .select("result")
        .eq("birth_profile_id", birthProfileId)
        .eq("cache_key", cacheKey)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.result as unknown as ChartResult) : null;
    },

    async save(row) {
      const { error } = await db.from("charts").upsert(
        {
          birth_profile_id: row.birthProfileId,
          user_id: row.userId,
          cache_key: row.cacheKey,
          kind: row.kind,
          house_system: row.houseSystem,
          zodiac: row.zodiac,
          result: row.result as unknown as Json,
        },
        { onConflict: "birth_profile_id,cache_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
  };
}
