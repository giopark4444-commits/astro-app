// Intención del usuario (cuestionario de primera entrada) — versión móvil.
// El draft es el estado local del formulario mientras el usuario responde;
// draftToIntent lo convierte al UserIntent puro de @aluna/core (o null si se
// omitió todo, para no persistir ruido). Persistencia remota en
// settings.intent (Supabase, misma tabla que la web — Task 3) y espejo local
// vía el wrapper genérico de storage.ts (AsyncStorage con fallback a memoria).

import { parseIntent, type UserIntent, type IntentGoal, type RelationshipStatus } from "@aluna/core";
import type { LifeArea } from "@aluna/core";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import { getRaw, setRaw } from "./storage";

export interface IntentDraft {
  goals: IntentGoal[];
  goalNote: string;
  focus: LifeArea[];
  relationship: RelationshipStatus | null;
}

export const EMPTY_INTENT_DRAFT: IntentDraft = {
  goals: [],
  goalNote: "",
  focus: [],
  relationship: null,
};

/** Draft local → UserIntent puro. null si TODO quedó omitido (no persistir nada). */
export function draftToIntent(d: IntentDraft, now: string): UserIntent | null {
  const goalNote = d.goalNote.trim();
  if (d.goals.length === 0 && d.focus.length === 0 && !d.relationship && !goalNote) return null;
  return {
    goals: d.goals,
    focus: d.focus,
    goalNote: goalNote || undefined,
    relationship: d.relationship ?? undefined,
    useInAI: true,
    answeredAt: now,
  };
}

// `UserIntent` (interfaz con campos nombrados) no calza estructuralmente
// con el tipo recursivo `Json` generado por supabase-js, que exige un
// index signature; cast local mínimo acotado a la única columna que tocamos.
type SettingsBuilder = {
  update: (v: { intent: UserIntent }) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
  select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { intent: unknown } | null; error: unknown }> } };
};
function settingsBuilder(supabase: AlunaSupabaseClient): SettingsBuilder {
  return supabase.from("settings") as unknown as SettingsBuilder;
}

/** Guarda el intent en settings.intent. Lanza en error. */
export async function saveRemoteIntent(
  supabase: AlunaSupabaseClient,
  userId: string,
  intent: UserIntent,
): Promise<void> {
  const { error } = await settingsBuilder(supabase).update({ intent }).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Trae settings.intent y lo parsea tolerante. null si no hay fila o intent inválido. */
export async function fetchRemoteIntent(
  supabase: AlunaSupabaseClient,
  userId: string,
): Promise<UserIntent | null> {
  const { data } = await settingsBuilder(supabase).select("intent").eq("user_id", userId).maybeSingle();
  return data ? parseIntent(data.intent) : null;
}

export const INTENT_STORAGE_KEY = "aluna.intent.v1";

export async function loadLocalIntent(): Promise<UserIntent | null> {
  const raw = await getRaw(INTENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserIntent;
  } catch {
    return null;
  }
}

export async function storeLocalIntent(intent: UserIntent): Promise<void> {
  await setRaw(INTENT_STORAGE_KEY, JSON.stringify(intent));
}

// Pasos del cuestionario de intención en el onboarding móvil. "affirm" solo
// aparece si el usuario eligió al menos una meta — no tiene sentido afirmar
// un camino sobre metas vacías.
export type IntentStep = "goals" | "affirm" | "focus" | "relationship";

export function intentSteps(d: IntentDraft): IntentStep[] {
  const steps: IntentStep[] = ["goals"];
  if (d.goals.length > 0) steps.push("affirm");
  steps.push("focus", "relationship");
  return steps;
}
