"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCredentials } from "./validation";

export async function signIn(formData: FormData) {
  const parsed = parseCredentials({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.ok) redirect(`/login?error=${parsed.error}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) redirect(`/login?error=auth`);
  redirect("/hoy");
}

export async function signUp(formData: FormData) {
  const parsed = parseCredentials({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.ok) redirect(`/signup?error=${parsed.error}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.value);
  if (error) redirect(`/signup?error=auth`);
  if (!data.session) redirect(`/login?error=confirm`); // el proyecto exige confirmar por correo
  redirect("/hoy"); // el trigger handle_new_user ya creó profiles_user + settings
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
