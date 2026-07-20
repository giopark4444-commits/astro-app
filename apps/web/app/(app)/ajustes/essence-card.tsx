// Card "Tu esencia" (Fase 2 T5): el retrato vivo que Aluna forma de la
// persona (lib/memory-essence.ts, migración 0020) — verlo, regenerarlo,
// editarlo o limpiarlo. Server component: fetchEssenceDetail ya es
// RLS-scoped (memory_essence solo tiene policies "own"); regenerar/editar/
// limpiar son server actions que se pasan tal cual al client component
// EssenceView (necesita estado local para el toggle vista/edición y el
// estado de "regenerando"), mismo criterio de split que MemoriesCard/
// EntitiesCard + MemoryRow/EntityRow en este mismo directorio.
//
// A diferencia de la tarjeta proactiva de /hoy (T4, que SÍ se gatea por
// memoryEnabled porque sincroniza desde manifestations en cada carga), esta
// tarjeta NO se gatea: MemoriesCard/EntitiesCard tampoco lo hacen — el mismo
// criterio de transparencia aplica aquí (un retrato ya formado sigue siendo
// tuyo para ver/editar/limpiar aunque hayas apagado la memoria; el estado
// vacío ya cubre el caso de "todavía no hay nada").
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEssenceDetail } from "@/lib/memory-essence";
import { regenerateEssenceAction, editEssence, clearEssence } from "../actions";
import { EssenceView } from "./essence-view";
import styles from "./ajustes.module.css";
import type { AlunaSupabaseClient } from "@aluna/supabase";

export async function EssenceCard({ userId }: { userId: string }) {
  const t = await getTranslations("settings");
  // Mismo cast que memories-card.tsx/entities-card.tsx (ver esa nota):
  // exactOptionalPropertyTypes hace que el Database inferido de
  // createClient() no calce estructuralmente con AlunaSupabaseClient (bug
  // upstream de postgrest-js/supabase-js).
  const supabase = (await createClient()) as unknown as AlunaSupabaseClient;
  const essence = await fetchEssenceDetail(supabase, userId);

  return (
    <section className={`card ${styles.essenceCard}`}>
      <h2 className={styles.eyebrow}>{t("essence.title")}</h2>
      <p className={styles.memoriesHint}>{t("essence.description")}</p>
      <EssenceView essence={essence} onRegenerate={regenerateEssenceAction} onEdit={editEssence} onClear={clearEssence} />
    </section>
  );
}
