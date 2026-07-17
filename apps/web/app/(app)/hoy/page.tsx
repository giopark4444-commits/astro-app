import { parseIntent, type LifeArea } from "@aluna/core";
import { createClient } from "@/lib/supabase/server";
import { HubView } from "./hub-view";

// exactOptionalPropertyTypes hace que postgrest-js infiera el select() de
// "settings" como `never` (mismo problema documentado en onboarding/actions.ts).
// Casteamos solo el builder a un shim tipado; el dato sigue validado por parseIntent.
type SettingsIntentSelect = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: { intent: unknown } | null }>;
    };
  };
};

export default async function HoyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let focus: LifeArea[] = [];
  if (user) {
    const builder = supabase.from("settings") as unknown as SettingsIntentSelect;
    const { data: row } = await builder.select("intent").eq("user_id", user.id).maybeSingle();
    focus = parseIntent(row?.intent)?.focus ?? [];
  }

  return <HubView focus={focus} />;
}
