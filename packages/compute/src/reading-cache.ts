// packages/compute/src/reading-cache.ts
import type { AlunaSupabaseClient, Json } from "@aluna/supabase";

/**
 * Una entrada del caché de lecturas IA. Las lecturas son CONTENIDO UNIVERSAL (no
 * dependen del individuo, solo del número/posición/longitud/idioma o de la composición
 * de la carta), así que el caché es global y se comparte entre todos los usuarios.
 */
export interface ReadingCacheEntry {
  /** Clave determinista de la lectura (p.ej. "es:lifePath:11:profunda"). */
  key: string;
  /** Tipo de lectura, para inspección/limpieza: "numerology" | "chart". */
  kind: string;
  locale: string;
  /** Proveedor/modelo que la generó (informativo / para invalidar si cambia). */
  model?: string;
  /** La lectura serializada ({essence, flow, shadow, practice}, etc.). */
  payload: Json;
}

/**
 * Puerto de caché de lecturas IA. El consumidor depende de esta interfaz (no del cliente
 * Supabase) → se testea con una implementación en memoria, sin red. Espeja el patrón de
 * ChartStore, pero la clave es global (no por perfil): la misma lectura sirve a todos.
 */
export interface ReadingCacheStore {
  /** Devuelve el payload cacheado para la clave, o null si no existe. */
  get(key: string): Promise<Json | null>;
  /** Guarda (o reemplaza) una lectura. Idempotente sobre la clave. */
  set(entry: ReadingCacheEntry): Promise<void>;
}

/**
 * Caché en memoria. Sirve para los tests y como fallback cuando no hay Supabase
 * configurado (mejor un caché de proceso que ninguno). No sobrevive a reinicios.
 */
export function inMemoryReadingCacheStore(): ReadingCacheStore {
  const map = new Map<string, Json>();
  return {
    async get(key) {
      return map.has(key) ? (map.get(key) as Json) : null;
    },
    async set(entry) {
      map.set(entry.key, entry.payload);
    },
  };
}

/** Adaptador real contra `public.reading_cache` usando un cliente service-role. */
export function supabaseReadingCacheStore(db: AlunaSupabaseClient): ReadingCacheStore {
  return {
    async get(key) {
      const { data, error } = await db
        .from("reading_cache")
        .select("payload")
        .eq("cache_key", key)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.payload as Json) : null;
    },

    async set(entry) {
      // upsert sin ignoreDuplicates: si se regenera (p.ej. con otro modelo) reemplaza;
      // dos sets idénticos concurrentes sobreescriben lo mismo (carrera benigna).
      const { error } = await db.from("reading_cache").upsert(
        {
          cache_key: entry.key,
          kind: entry.kind,
          locale: entry.locale,
          model: entry.model ?? null,
          payload: entry.payload,
        },
        { onConflict: "cache_key" },
      );
      if (error) throw error;
    },
  };
}
