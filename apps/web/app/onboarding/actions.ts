"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { answersToInsert, type OnboardingAnswers } from "@/lib/onboarding";
import type { TablesInsert } from "@aluna/supabase";

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de insert() como
// `never`. Casteamos solo el builder a un shim tipado; el valor sigue type-checked.
type ProfileInsert = { insert: (v: TablesInsert<"birth_profiles">) => Promise<{ error: { message: string } | null }> };

export async function createBirthProfile(answers: OnboardingAnswers) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = answersToInsert(answers, user.id);
  const builder = supabase.from("birth_profiles") as unknown as ProfileInsert;
  const { error } = await builder.insert(row);
  if (error) throw new Error(`No se pudo crear el perfil: ${error.message}`);
  redirect("/numeros");
}
