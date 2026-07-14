// Traduce entre el Profile local (AsyncStorage) y la fila de Supabase
// birth_profiles — la MISMA tabla que llena el onboarding de la web (vía
// answersToInsert en apps/web/lib/onboarding.ts). El id de esa fila es lo que
// /api/chart necesita como profileId; por eso Carta requiere haber sincronizado.
//
// Puro (sin red ni RN) para poder testear la traducción sin mockear Supabase.

import type { Tables, TablesInsert } from "@aluna/supabase";
import type { AlunaSupabaseClient } from "@aluna/supabase";
import type { Profile } from "./profile";

type BirthProfileRow = Tables<"birth_profiles">;

/** Fila de Supabase → Profile local. `place_name` ya viene unido (sin admin1/country por separado). */
export function rowToProfile(row: BirthProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    birthTime: row.time_known && row.birth_time ? row.birth_time : "",
    timeKnown: row.time_known,
    place: { name: row.place_name, latitude: row.latitude, longitude: row.longitude, timeZone: row.time_zone },
    gender: row.gender === "feminine" || row.gender === "masculine" || row.gender === "neutral" ? row.gender : null,
  };
}

/** Profile local completo → fila insertable de birth_profiles. Lanza si falta place/gender. */
export function profileToInsert(p: Profile, userId: string): TablesInsert<"birth_profiles"> {
  if (!p.place || !p.gender) throw new Error("Perfil incompleto");
  return {
    user_id: userId,
    name: p.name.trim(),
    birth_date: p.birthDate,
    birth_time: p.timeKnown && p.birthTime ? p.birthTime : null,
    time_known: p.timeKnown,
    place_name: p.place.name,
    latitude: p.place.latitude,
    longitude: p.place.longitude,
    time_zone: p.place.timeZone,
    gender: p.gender,
  };
}

/** Trae el primer birth_profiles del usuario (RLS ya limita a los suyos), o null si no tiene ninguno. */
export async function fetchRemoteProfile(
  supabase: AlunaSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("birth_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

/** Inserta el perfil recién tejido en onboarding y devuelve el Profile con su id ya asignado. */
export async function insertRemoteProfile(
  supabase: AlunaSupabaseClient,
  profile: Profile,
  userId: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("birth_profiles")
    .insert(profileToInsert(profile, userId))
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el perfil");
  return rowToProfile(data);
}

/** Todos los birth_profiles del usuario (RLS ya limita a los suyos), más viejo primero
 *  — el índice 0 es el perfil "activo" por convención de creación. Para el picker de
 *  Compatibilidad (elegir entre TÚ + las demás personas guardadas). */
export async function fetchAllProfiles(
  supabase: AlunaSupabaseClient,
  userId: string,
): Promise<Profile[]> {
  const { data } = await supabase
    .from("birth_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToProfile);
}
