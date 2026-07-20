import { parseIntent, type LifeArea } from "@aluna/core";
import { createClient } from "@/lib/supabase/server";
import { fetchIntentAndMemorySettings } from "@/lib/settings";
import { syncCommitmentsFromManifestations, fetchOpenCommitments, type Commitment } from "@/lib/memory-commitments";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { HubView } from "./hub-view";

// Ventana de "próximo" para la tarjeta proactiva de /hoy (Fase 2 T4): solo lo
// urgente/cercano, no todo el historial abierto (eso queda para Ajustes).
const COMMITMENTS_WINDOW_DAYS = 21;

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
  let commitments: Commitment[] = [];
  if (user) {
    const builder = supabase.from("settings") as unknown as SettingsIntentSelect;
    const { data: row } = await builder.select("intent").eq("user_id", user.id).maybeSingle();
    focus = parseIntent(row?.intent)?.focus ?? [];

    // Tarjeta proactiva "Aluna te recuerda" (Fase 2 T4): gated por
    // memory_enabled — misma casilla que apaga el resto de la memoria desde
    // Ajustes. Sincroniza (barato, determinista) y luego lee lo abierto.
    const { memoryEnabled } = await fetchIntentAndMemorySettings(supabase as unknown as AlunaSupabaseClient, user.id);
    if (memoryEnabled) {
      await syncCommitmentsFromManifestations(supabase as unknown as AlunaSupabaseClient, user.id);
      commitments = await fetchOpenCommitments(supabase as unknown as AlunaSupabaseClient, user.id, {
        withinDays: COMMITMENTS_WINDOW_DAYS,
      });
    }
  }

  return <HubView focus={focus} commitments={commitments} />;
}
