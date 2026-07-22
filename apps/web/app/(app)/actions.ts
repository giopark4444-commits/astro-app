"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";
import { THEME_COOKIE, MODE_COOKIE } from "@/lib/theme/fouc-script";
import { parseIntent, type UserIntent } from "@aluna/core";
import type { AlunaSupabaseClient, TablesUpdate } from "@aluna/supabase";
import { dismissCommitment } from "@/lib/memory-commitments";
import { resolveReadingProvider } from "@/lib/reading/provider";
import { regenerateEssence } from "@/lib/memory-essence";
import { fetchIntentAndMemorySettings } from "@/lib/settings";
import { normalizeForSave, rawQuickQuestionsPages } from "@/lib/quick-questions";

type SettingsPatch = Pick<TablesUpdate<"settings">, "theme" | "light_mode">;

// exactOptionalPropertyTypes=true causes supabase-js to infer update()'s argument
// type as `never` (upstream bug: postgrest-js optional-props + exactOptionalPropertyTypes).
// We cast only the builder to a typed shim so the values passed remain fully checked.
type SettingsBuilder = { update: (v: TablesUpdate<"settings">) => { eq: (col: string, val: string) => Promise<unknown> } };
function settingsBuilder(supabase: Awaited<ReturnType<typeof createClient>>): SettingsBuilder {
  return supabase.from("settings") as unknown as SettingsBuilder;
}

// Mismo cast local que el resto del archivo (ver nota arriba): `intent` es
// UserIntent (interfaz con campos nombrados), no calza con el `Json`
// recursivo de supabase-js sin este shim acotado.
type IntentBuilder = {
  select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { intent: unknown } | null }> } };
  update: (v: { intent: UserIntent }) => { eq: (col: string, val: string) => Promise<unknown> };
};
function intentBuilder(supabase: Awaited<ReturnType<typeof createClient>>): IntentBuilder {
  return supabase.from("settings") as unknown as IntentBuilder;
}

// Mismo shim acotado que settingsBuilder/intentBuilder (ver nota arriba):
// quick_questions es jsonb con forma { enabled: boolean; pages: string[][] }.
// select además de update: setQuickQuestionsEnabled lee las páginas guardadas
// para preservarlas al cambiar solo el flag (read-modify-write server-side).
type QuickQuestionsBuilder = {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      maybeSingle: () => Promise<{ data: { quick_questions: unknown } | null }>;
    };
  };
  update: (v: { quick_questions: { enabled: boolean; pages: string[][] } }) => {
    eq: (col: string, val: string) => Promise<unknown>;
  };
};
function quickQuestionsBuilder(supabase: Awaited<ReturnType<typeof createClient>>): QuickQuestionsBuilder {
  return supabase.from("settings") as unknown as QuickQuestionsBuilder;
}

/**
 * Persiste tema/modo (lo llama el ThemeProvider). Fire-and-forget.
 * Además fija las cookies de tema/modo (igual que setLanguage con el locale)
 * para que el script anti-FOUC del <head> pueda aplicar el tema correcto
 * antes del primer paint en la próxima carga.
 */
export async function persistSettings(patch: SettingsPatch) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await settingsBuilder(supabase).update(patch).eq("user_id", user.id);

  const store = await cookies();
  if (patch.theme) store.set(THEME_COOKIE, patch.theme);
  if (patch.light_mode) store.set(MODE_COOKIE, patch.light_mode);
}

/** Cambia el idioma: persiste en settings + fija la cookie de locale. */
export async function setLanguage(locale: string) {
  const safe = resolveLocale(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await settingsBuilder(supabase).update({ language: safe }).eq("user_id", user.id);
  const store = await cookies();
  store.set(LOCALE_COOKIE, safe);
}

/**
 * Toggle de "Aluna te conoce" (Task 13): enciende/apaga el uso de la
 * intención en los prompts de IA (chat + informes). Lee `settings.intent`
 * primero — si `parseIntent` da null (nunca respondió el cuestionario, o el
 * JSON no trae ninguna señal útil), NO hace nada: no hay nada que prender.
 */
export async function setIntentUseInAI(on: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await intentBuilder(supabase).select("intent").eq("user_id", user.id).maybeSingle();
  const intent = parseIntent(data?.intent) as UserIntent | null;
  if (!intent) return;

  await intentBuilder(supabase).update({ intent: { ...intent, useInAI: on } }).eq("user_id", user.id);
}

/**
 * Borra un recuerdo propio ("Aluna te conoce", Task 3). RLS de user_memories
 * (0018) ya acota el delete a la fila del usuario, pero el `.eq("user_id", …)`
 * se mantiene explícito (mismo criterio defensivo que el resto del archivo).
 * Best-effort: un fallo acá nunca debe romper /ajustes.
 */
export async function deleteMemory(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_memories").delete().eq("id", id).eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al borrar un recuerdo
  }
}

// Mismo shim que settingsBuilder/intentBuilder (ver nota arriba del archivo):
// exactOptionalPropertyTypes infiere el arg de update() como `never` cuando se
// llama sobre el cliente de createClient() sin castear a AlunaSupabaseClient.
type UserMemoriesBuilder = {
  update: (v: TablesUpdate<"user_memories">) => {
    eq: (col: string, val: string) => { eq: (col2: string, val2: string) => Promise<unknown> };
  };
};
function userMemoriesBuilder(supabase: Awaited<ReturnType<typeof createClient>>): UserMemoriesBuilder {
  return supabase.from("user_memories") as unknown as UserMemoriesBuilder;
}

/**
 * Edita el contenido de un recuerdo propio (Fase 1C: panel de control de
 * memoria). La policy "own memories update" (0019) ya acota el update a la
 * fila del usuario; el `.eq("user_id", …)` se mantiene explícito por el mismo
 * criterio defensivo del resto del archivo. Mismo recorte que storeMemories
 * (lib/memories.ts): el CHECK de la BD es char_length(content) <= 280.
 * Best-effort: un fallo acá nunca debe romper /ajustes.
 */
export async function editMemory(id: string, content: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const clean = content.trim().slice(0, 280);
    if (!clean) return;
    await userMemoriesBuilder(supabase).update({ content: clean }).eq("id", id).eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al editar un recuerdo
  }
}

/**
 * Casilla dedicada de memoria (Fase 1C): prende/apaga la memoria de largo
 * plazo (entidades + archivo del hilo), distinta de intent.useInAI (que
 * gobierna el uso de la intención del cuestionario en los prompts). A
 * diferencia de setIntentUseInAI no hay nada que leer antes: es un update
 * directo. Fire-and-forget, igual que persistSettings/setLanguage arriba (sin
 * revalidatePath: no hay UI derivada de este valor que la propia página
 * necesite re-renderizar de inmediato).
 */
export async function setMemoryEnabled(on: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await settingsBuilder(supabase).update({ memory_enabled: on }).eq("user_id", user.id);
  } catch {
    // best effort: no bloquear /ajustes por un fallo al prender/apagar la memoria
  }
}

// Mismo shim que UserMemoriesBuilder arriba, para memory_entities.
type MemoryEntitiesBuilder = {
  update: (v: TablesUpdate<"memory_entities">) => {
    eq: (col: string, val: string) => { eq: (col2: string, val2: string) => Promise<unknown> };
  };
};
function memoryEntitiesBuilder(supabase: Awaited<ReturnType<typeof createClient>>): MemoryEntitiesBuilder {
  return supabase.from("memory_entities") as unknown as MemoryEntitiesBuilder;
}

/**
 * Edita nombre + resumen de una entidad propia (Fase 1C, tarjeta de
 * entidades). Respeta los mismos CHECK que la migración 0019: name 1-120,
 * summary <=2000 (mismo recorte defensivo que parseDistilledEntities/
 * upsertEntities en lib/memory-entities.ts). Si el nombre queda vacío tras el
 * trim, no hace nada (el CHECK `between 1 and 120` lo rechazaría igual).
 * Best-effort.
 */
export async function editEntity(id: string, name: string, summary: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const cleanName = name.trim().slice(0, 120);
    if (!cleanName) return;
    const cleanSummary = summary.trim().slice(0, 2000);
    await memoryEntitiesBuilder(supabase)
      .update({ name: cleanName, summary: cleanSummary })
      .eq("id", id)
      .eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al editar una entidad
  }
}

/** Borra una entidad propia (Fase 1C). Mismo patrón que deleteMemory. */
export async function deleteEntity(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("memory_entities").delete().eq("id", id).eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al borrar una entidad
  }
}

/** Fija/desfija una entidad propia (Fase 1C): las entidades `pinned` nunca se
 *  podan (ver comentario de la migración 0019). Best-effort. */
export async function pinEntity(id: string, pinned: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await memoryEntitiesBuilder(supabase).update({ pinned }).eq("id", id).eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al fijar una entidad
  }
}

/**
 * Descarta un compromiso (Fase 2 T4, tarjeta "Aluna te recuerda" de /hoy): la
 * persona dice "ya no" / "no me interesa". dismissCommitment (lib/
 * memory-commitments.ts) ya es best-effort por dentro (nunca lanza); el
 * try/catch de acá cubre además createClient()/getUser(), mismo criterio
 * defensivo que deleteMemory/deleteEntity arriba. HubView ya aplica el
 * patrón optimista en el cliente (quita el item al instante) — esta acción
 * solo persiste; revalidatePath asegura que la próxima carga de /hoy no
 * vuelva a traer el compromiso descartado.
 */
export async function dismissCommitmentAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await dismissCommitment(supabase as unknown as AlunaSupabaseClient, user.id, id);
    revalidatePath("/hoy");
  } catch {
    // best effort: no bloquear /hoy por un fallo al descartar un compromiso
  }
}

/**
 * "Regenerar ahora" (Fase 2 T5, tarjeta "Tu esencia" de Ajustes): a
 * diferencia del disparo automático de runDistillation (cadencia de
 * ESSENCE_MIN_AGE_SECONDS ≈ 1/día, ver memory-pipeline.ts), esta acción pasa
 * minAgeSeconds=0 a regenerateEssence para saltarse esa cadencia y reclamar
 * de inmediato — el lock de 'generating' que ya trae claim_essence_regeneration
 * sigue protegiendo contra dos clics simultáneos. Sin proveedor de IA
 * disponible (sin llave), NO llama a regenerateEssence — devuelve
 * {ok:false, reason:'no_provider'} para que la tarjeta lo muestre con un
 * mensaje amable en vez de fallar en silencio; resolveReadingProvider() jamás
 * lanza sin llave (ver lib/reading/provider.ts).
 *
 * Hallazgo del review Fable: a diferencia del disparo automático de
 * runDistillation (que sí gatea por memory_enabled), este clic manual NO
 * miraba la casilla — con la memoria apagada, "Regenerar ahora" igual
 * disparaba el modelo y reescribía el retrato, contradiciendo la casilla.
 * Ahora se lee memory_enabled ANTES de resolver el proveedor (mismo criterio
 * de "no gastar CPU/llamar al proveedor si no hace falta" que el resto de
 * esta acción) — si está apagada, devuelve {ok:false, reason:'memory_off'}
 * sin tocar el proveedor ni el modelo.
 *
 * El locale se resuelve igual que en las páginas server (getLocale de
 * next-intl/server, ver ajustes/page.tsx) — resolveLocale() lo acota al tipo
 * Locale por si la cookie trae un valor no soportado.
 */
export async function regenerateEssenceAction(): Promise<{ ok: boolean; reason?: "no_provider" | "memory_off" }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const { memoryEnabled } = await fetchIntentAndMemorySettings(supabase as unknown as AlunaSupabaseClient, user.id);
    if (!memoryEnabled) return { ok: false, reason: "memory_off" };

    const resolved = resolveReadingProvider();
    if (!resolved.available) return { ok: false, reason: "no_provider" };

    const locale = resolveLocale(await getLocale());
    await regenerateEssence(resolved.provider, supabase as unknown as AlunaSupabaseClient, user.id, locale, 0);
    revalidatePath("/ajustes");
    return { ok: true };
  } catch {
    // best effort: un fallo acá nunca debe romper /ajustes
    return { ok: false };
  }
}

// Mismo shim que UserMemoriesBuilder/MemoryEntitiesBuilder arriba, para
// memory_essence (Fase 2 T5).
type MemoryEssenceBuilder = {
  update: (v: TablesUpdate<"memory_essence">) => {
    eq: (col: string, val: string) => Promise<unknown>;
  };
};
function memoryEssenceBuilder(supabase: Awaited<ReturnType<typeof createClient>>): MemoryEssenceBuilder {
  return supabase.from("memory_essence") as unknown as MemoryEssenceBuilder;
}

/**
 * Edita el retrato a mano (Fase 2 T5, tarjeta "Tu esencia"): mismo recorte
 * que regenerateEssence al guardar (CHECK char_length(portrait) <= 4000,
 * migración 0020). Best-effort: un fallo acá nunca debe romper /ajustes.
 */
export async function editEssence(portrait: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const clean = portrait.trim().slice(0, 4000);
    await memoryEssenceBuilder(supabase).update({ portrait: clean }).eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al editar la esencia
  }
}

/**
 * Limpia el retrato (Fase 2 T5, botón "Limpiar" con confirm ligero en la
 * tarjeta). Vacía portrait + el metadato de cuándo/con qué se formó (en vez
 * de borrar la fila): claim_essence_regeneration hace
 * `insert ... on conflict do nothing` sobre esa fila, así que conservarla
 * (con status/lock intactos) es más simple que recrearla en el próximo claim.
 * Best-effort.
 */
export async function clearEssence() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await memoryEssenceBuilder(supabase)
      .update({ portrait: "", generated_at: null, model_used: null })
      .eq("user_id", user.id);
    revalidatePath("/ajustes");
  } catch {
    // best effort: no bloquear /ajustes por un fallo al limpiar la esencia
  }
}

/**
 * Guarda los accesos rápidos del chat: el flag de visibilidad (`enabled`) + las
 * páginas. Normaliza SIEMPRE las páginas en el server (base con defaults, extra
 * vacías descartadas, recorte de largo) antes de persistir, así el jsonb nunca
 * queda malformado. `enabled` por defecto true. Fire-and-forget.
 */
export async function saveQuickQuestions(pages: string[][], enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const locale = await getLocale();
  const normalized = normalizeForSave(pages, locale);
  await quickQuestionsBuilder(supabase)
    .update({ quick_questions: { enabled, pages: normalized.pages } })
    .eq("user_id", user.id);
}

/**
 * Cambia SOLO el flag de visibilidad de los accesos rápidos, sin tocar las
 * páginas. Read-modify-write server-side (mismo patrón que setIntentUseInAI):
 * lee las páginas guardadas y las reescribe verbatim con el nuevo `enabled`.
 * Así togglear NUNCA puede reescribir `pages` desde un estado placeholder del
 * cliente (p.ej. si el GET falló y el cliente mostraba defaults) — el toggle es
 * un clic casual y no debe poder borrar preguntas. Fire-and-forget.
 */
export async function setQuickQuestionsEnabled(enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await quickQuestionsBuilder(supabase)
    .select("quick_questions")
    .eq("user_id", user.id)
    .maybeSingle();
  const pages = rawQuickQuestionsPages(data?.quick_questions ?? null);
  await quickQuestionsBuilder(supabase)
    .update({ quick_questions: { enabled, pages } })
    .eq("user_id", user.id);
}
