// Cliente Supabase del móvil: sesión persistida en AsyncStorage (por defecto
// supabase-js la guarda solo en memoria, se perdería al cerrar la app).
// URL/anon key vienen de app.json → expo.extra (públicas, seguro exponerlas;
// RLS protege los datos, no la llave). El server Next (Route Handlers) que
// corre el motor sweph se resuelve con apiUrl() de ./config, no acá.

import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBrowserSupabaseClient, type AlunaSupabaseClient } from "@aluna/supabase";

interface Extra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const SUPABASE_URL = extra.supabaseUrl ?? "";
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? "";

let client: AlunaSupabaseClient | null = null;

/** Cliente singleton — createClient() abre su propio realtime/socket, evitar duplicarlo. */
export function getSupabase(): AlunaSupabaseClient {
  if (!client) {
    client = createBrowserSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
