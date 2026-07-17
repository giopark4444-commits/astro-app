"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { answersToInsert, draftToIntent, type IntentDraft, type OnboardingAnswers } from "@/lib/onboarding";
import type { TablesInsert } from "@aluna/supabase";
import { parseIntent, type UserIntent } from "@aluna/core";

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de insert() como
// `never`. Casteamos solo el builder a un shim tipado; el valor sigue type-checked.
type ProfileInsert = { insert: (v: TablesInsert<"birth_profiles">) => Promise<{ error: { message: string } | null }> };

export async function createBirthProfile(answers: OnboardingAnswers, intentDraft?: IntentDraft) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = answersToInsert(answers, user.id);
  const builder = supabase.from("birth_profiles") as unknown as ProfileInsert;
  const { error } = await builder.insert(row);
  if (error) throw new Error(`No se pudo crear el perfil: ${error.message}`);

  if (intentDraft) {
    type SettingsIntent = { update: (v: { intent: UserIntent }) => { eq: (c: string, v: string) => PromiseLike<unknown> } };
    const sb = supabase.from("settings") as unknown as SettingsIntent;
    try {
      const intent = parseIntent(draftToIntent(intentDraft, new Date().toISOString()));
      if (intent) {
        await sb.update({ intent }).eq("user_id", user.id);
      }
    } catch {
      // best effort: la intención nunca bloquea crear el perfil
    }
  }

  redirect("/numeros");
}
