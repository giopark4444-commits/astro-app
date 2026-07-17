"use server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";
import { THEME_COOKIE, MODE_COOKIE } from "@/lib/theme/fouc-script";
import { parseIntent, type UserIntent } from "@aluna/core";
import type { TablesUpdate } from "@aluna/supabase";

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
