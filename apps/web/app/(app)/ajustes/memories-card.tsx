// Card "Aluna te conoce" (Task 3 del plan de memoria; Fase 1C sumó editar):
// lista los recuerdos que Aluna destiló de las conversaciones (chat + tarot)
// y deja editarlos/borrarlos uno a uno. Server component: fetchMemories ya es
// RLS-scoped (fetchMemories filtra por user_id y además la política de
// user_memories acota a la fila propia); edit/delete son server actions que
// se pasan tal cual al client component MemoryRow (necesita estado local para
// el toggle vista/edición).
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMemories } from "@/lib/memories";
import { deleteMemory, editMemory } from "../actions";
import { MemoryRow } from "./memory-row";
import styles from "./ajustes.module.css";
import type { AlunaSupabaseClient } from "@aluna/supabase";

export async function MemoriesCard({ userId }: { userId: string }) {
  const t = await getTranslations("settings");
  // Mismo cast que lib/supabase/route-auth.ts: exactOptionalPropertyTypes
  // hace que el Database inferido de createClient() no calce estructuralmente
  // con AlunaSupabaseClient (bug upstream de postgrest-js/supabase-js).
  const supabase = (await createClient()) as unknown as AlunaSupabaseClient;
  const memories = await fetchMemories(supabase, userId);

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("memoriesTitle")}</h2>
      <p className={styles.memoriesHint}>{t("memoriesHint")}</p>

      {memories.length === 0 ? (
        <p className={styles.memoriesEmpty}>{t("memoriesEmpty")}</p>
      ) : (
        <ul className={styles.memoriesList}>
          {memories.map((m) => (
            <MemoryRow key={m.id} memory={m} onEdit={editMemory} onDelete={deleteMemory} />
          ))}
        </ul>
      )}
    </section>
  );
}
