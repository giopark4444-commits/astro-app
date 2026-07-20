// apps/web/lib/memory-commitments.ts
// Compromisos (Fase 2 T3): hilos abiertos que Aluna le recuerda a la persona
// en /hoy. Hoy la ÚNICA fuente estructurada es `manifestations` (tienen
// `target_date`); `memory_threads` (migración 0020) unifica esa fuente con
// futuras (journal, chat) y permite DESCARTAR — eso es lo que justifica la
// tabla en vez de leer manifestaciones directo.
//
// Mismas reglas de la casa que memories.ts/memory-entities.ts/chat-archive.ts:
// todo lo que toca la BD es best-effort (try/catch total) — un fallo aquí
// jamás rompe /hoy. PostgrestBuilder no tiene `.catch` (lección T9
// cuestionario) — siempre try/catch, nunca encadenado.

import type { AlunaSupabaseClient, Tables, TablesInsert } from "@aluna/supabase";

export type CommitmentKind = "commitment" | "manifestation" | "followup" | "other";
export type CommitmentStatus = "open" | "done" | "dismissed";

export interface Commitment {
  id: string;
  description: string;
  kind: CommitmentKind;
  status: CommitmentStatus;
  due_at: string | null;
  source_ref: string | null;
  created_at: string;
}

/** Ventana hacia atrás de la sincronización: cuánto se considera "recién
 *  cosechada" una manifestación cuyo target_date ya pasó. Las futuras (sin
 *  tope superior) siempre entran. */
export const MANIFESTATION_SYNC_LOOKBACK_DAYS = 14;

type ManifestationRow = Pick<Tables<"manifestations">, "id" | "intention" | "target_date">;
type ThreadSyncRow = Pick<Tables<"memory_threads">, "id" | "status" | "due_at" | "description" | "source_ref">;

/** "YYYY-MM-DD" de hoy+offsetDays en UTC (sin componente de hora) — sirve
 *  tanto para filtrar `target_date` (columna `date`) como `due_at` (columna
 *  timestamptz, que PostgREST coacciona a medianoche del día dado). */
function isoDateWithOffset(offsetDays: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Normaliza una columna `date` ("YYYY-MM-DD") a medianoche UTC en formato
 *  timestamptz para guardarla en `due_at`. A propósito NO se usa
 *  `new Date(targetDate)` a secas: en algunos runtimes eso se interpreta en
 *  la zona horaria LOCAL en vez de UTC (la misma familia de bug que la
 *  lección de Casa Blanca con columnas `date` del driver `pg`) — acá se
 *  concatena la hora UTC a mano para no depender de ninguna zona horaria. */
function dateToDueAtIso(targetDate: string): string {
  return `${targetDate.slice(0, 10)}T00:00:00.000Z`;
}

/** ¿Cambió el instante que representa `due_at`? Compara por valor (getTime),
 *  no por string: PostgREST puede devolver el mismo instante con formato
 *  distinto ("+00:00" vs "Z", con/sin milisegundos) y una comparación de
 *  strings dispararía un UPDATE de no-op en cada sincronización. */
function dueAtChanged(existingDueAt: string | null, nextDueAtIso: string): boolean {
  if (existingDueAt === null) return true;
  const existingTime = new Date(existingDueAt).getTime();
  const nextTime = new Date(nextDueAtIso).getTime();
  if (Number.isNaN(existingTime) || Number.isNaN(nextTime)) return existingDueAt !== nextDueAtIso;
  return existingTime !== nextTime;
}

/**
 * Materializa en `memory_threads` un compromiso por cada manifestación
 * próxima o recién cosechada (target_date >= hoy - 14 días) del usuario.
 * Determinista y barata: se puede llamar en cada carga de /hoy.
 *
 * ⚠️ NO usa `.upsert(..., { onConflict: 'user_id,source_ref' })`: el índice
 * único de la migración 0020 es PARCIAL (`where source_ref is not null`) y
 * supabase-js no genera la cláusula `WHERE` del `ON CONFLICT`, así que el
 * upsert fallaría contra Postgres. En su lugar: (a) un solo `select` de los
 * hilos existentes cuyo source_ref esté en este lote; (b) INSERT solo de los
 * que faltan; (c) UPDATE de due_at/description solo de los que ya existen Y
 * siguen `open` (por si la persona editó la manifestación).
 *
 * ⚠️ NUNCA resucita un hilo `dismissed`/`done`: si ya existe con ese
 * source_ref y no está `open`, se deja intacta — ni se reinserta ni se
 * actualiza. Solo las `open` participan del update; solo las ausentes se
 * insertan.
 *
 * Best-effort total: cualquier fallo (tabla sin migrar, red, RLS) es un
 * no-op silencioso — /hoy simplemente no muestra compromisos nuevos esta vez.
 */
export async function syncCommitmentsFromManifestations(supabase: AlunaSupabaseClient, userId: string): Promise<void> {
  try {
    const cutoff = isoDateWithOffset(-MANIFESTATION_SYNC_LOOKBACK_DAYS);
    const { data: manifestations, error: manifestationsError } = await supabase
      .from("manifestations")
      .select("id, intention, target_date")
      .eq("user_id", userId)
      .gte("target_date", cutoff);
    if (manifestationsError || !manifestations || manifestations.length === 0) return;

    const rows = manifestations as ManifestationRow[];
    const refs = rows.map((m) => `manifestation:${m.id}`);

    const { data: existingThreads, error: existingError } = await supabase
      .from("memory_threads")
      .select("id, status, due_at, description, source_ref")
      .eq("user_id", userId)
      .in("source_ref", refs);
    if (existingError) return;

    const existingByRef = new Map<string, ThreadSyncRow>();
    for (const t of (existingThreads ?? []) as ThreadSyncRow[]) {
      if (t.source_ref) existingByRef.set(t.source_ref, t);
    }

    const toInsert: TablesInsert<"memory_threads">[] = [];
    for (const m of rows) {
      const ref = `manifestation:${m.id}`;
      const dueAt = dateToDueAtIso(m.target_date);
      const description = m.intention.slice(0, 500); // re-slice defensivo (CHECK de la BD: 1..500)
      const existing = existingByRef.get(ref);

      if (!existing) {
        toInsert.push({
          user_id: userId,
          description,
          kind: "manifestation",
          status: "open",
          due_at: dueAt,
          source_ref: ref,
        });
        continue;
      }

      if (existing.status !== "open") continue; // dismissed/done: intacta, nunca se resucita

      if (dueAtChanged(existing.due_at, dueAt) || existing.description !== description) {
        await supabase
          .from("memory_threads")
          .update({ due_at: dueAt, description, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("user_id", userId);
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("memory_threads").insert(toInsert);
    }
  } catch {
    // best effort: la sincronización nunca rompe /hoy
  }
}

/**
 * Compromisos abiertos dentro de la ventana [hoy, hoy+withinDays] (o sin
 * fecha), orden due_at ascendente con los sin fecha al final. Pensado para
 * /hoy: solo lo urgente/próximo, sin volcar hilos abiertos lejanos. `[]` en
 * cualquier error (best-effort).
 */
export async function fetchOpenCommitments(
  supabase: AlunaSupabaseClient,
  userId: string,
  { withinDays }: { withinDays: number },
): Promise<Commitment[]> {
  try {
    const today = isoDateWithOffset(0);
    const end = isoDateWithOffset(withinDays);
    const { data, error } = await supabase
      .from("memory_threads")
      .select("id, description, kind, status, due_at, source_ref, created_at")
      .eq("user_id", userId)
      .eq("status", "open")
      .or(`due_at.is.null,and(due_at.gte.${today},due_at.lte.${end})`)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error || !data) return [];
    return data as Commitment[];
  } catch {
    return [];
  }
}

/** Cambia el status de un hilo, acotado a su dueño (doble filtro id+user_id,
 *  mismo patrón que las server actions de Fase 1). Best-effort: nunca lanza. */
async function setCommitmentStatus(
  supabase: AlunaSupabaseClient,
  userId: string,
  id: string,
  status: Extract<CommitmentStatus, "dismissed" | "done">,
): Promise<void> {
  try {
    await supabase
      .from("memory_threads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
  } catch {
    // best effort: descartar/completar nunca rompe la UI
  }
}

/** Descarta un compromiso (la persona dice "ya no" / "no me interesa"). */
export async function dismissCommitment(supabase: AlunaSupabaseClient, userId: string, id: string): Promise<void> {
  await setCommitmentStatus(supabase, userId, id, "dismissed");
}

/** Marca un compromiso como cumplido. */
export async function completeCommitment(supabase: AlunaSupabaseClient, userId: string, id: string): Promise<void> {
  await setCommitmentStatus(supabase, userId, id, "done");
}
