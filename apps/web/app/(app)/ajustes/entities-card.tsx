// Card de entidades (Fase 1C — panel de control de memoria): espejo de
// memories-card.tsx pero para las entidades DURADERAS (personas, mascotas,
// lugares...) de lib/memory-entities.ts. Server component: fetchEntities ya
// es RLS-scoped (filtra por user_id y la política de memory_entities acota a
// la fila propia); edit/delete/pin son server actions que se pasan tal cual
// al client component EntityRow.
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEntities, ENTITY_KINDS, type EntityKind } from "@/lib/memory-entities";
import { editEntity, deleteEntity, pinEntity } from "../actions";
import { EntityRow } from "./entity-row";
import styles from "./ajustes.module.css";
import type { AlunaSupabaseClient } from "@aluna/supabase";

// Clave de traducción del encabezado de cada grupo — mismo registro que
// KIND_HEADERS en lib/memory-entities.ts (ahí es para el prompt, aquí es la
// etiqueta visible en /ajustes).
const KIND_LABEL_KEY: Record<EntityKind, string> = {
  person: "entityKindPerson",
  pet: "entityKindPet",
  place: "entityKindPlace",
  date: "entityKindDate",
  project: "entityKindProject",
  organization: "entityKindOrganization",
  object: "entityKindObject",
  other: "entityKindOther",
};

export async function EntitiesCard({ userId }: { userId: string }) {
  const t = await getTranslations("settings");
  // Mismo cast que memories-card.tsx (ver esa nota): exactOptionalPropertyTypes
  // hace que el Database inferido de createClient() no calce estructuralmente
  // con AlunaSupabaseClient (bug upstream de postgrest-js/supabase-js).
  const supabase = (await createClient()) as unknown as AlunaSupabaseClient;
  const entities = await fetchEntities(supabase, userId);

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("entitiesTitle")}</h2>
      <p className={styles.memoriesHint}>{t("entitiesHint")}</p>

      {entities.length === 0 ? (
        <p className={styles.memoriesEmpty}>{t("entitiesEmpty")}</p>
      ) : (
        ENTITY_KINDS.map((kind) => {
          const group = entities.filter((e) => e.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className={styles.entityGroup}>
              <h3 className={styles.entityGroupTitle}>{t(KIND_LABEL_KEY[kind])}</h3>
              <ul className={styles.memoriesList}>
                {group.map((e) => (
                  <EntityRow key={e.id} entity={e} onEdit={editEntity} onDelete={deleteEntity} onPin={pinEntity} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
