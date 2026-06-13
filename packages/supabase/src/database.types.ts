// Aluna · tipos del esquema Supabase (GENERADO — no editar a mano).
// Hogar: packages/supabase/src/database.types.ts (consumido por @aluna/supabase).
// Regenerar tras cambios de esquema:
//   supabase gen types typescript --project-id xcilrdpcanielalpfvld > packages/supabase/src/database.types.ts
// Es solo-tipos (sin runtime) → seguro de importar en cualquier lado.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      birth_profiles: {
        Row: {
          birth_date: string;
          birth_time: string | null;
          created_at: string;
          gender: string;
          id: string;
          latitude: number;
          longitude: number;
          name: string;
          place_name: string;
          time_known: boolean;
          time_zone: string;
          user_id: string;
        };
        Insert: {
          birth_date: string;
          birth_time?: string | null;
          created_at?: string;
          gender: string;
          id?: string;
          latitude: number;
          longitude: number;
          name: string;
          place_name: string;
          time_known?: boolean;
          time_zone: string;
          user_id: string;
        };
        Update: {
          birth_date?: string;
          birth_time?: string | null;
          created_at?: string;
          gender?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          name?: string;
          place_name?: string;
          time_known?: boolean;
          time_zone?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      charts: {
        Row: {
          birth_profile_id: string;
          cache_key: string;
          computed_at: string;
          house_system: string;
          id: string;
          kind: string;
          result: Json;
          user_id: string;
          zodiac: string;
        };
        Insert: {
          birth_profile_id: string;
          cache_key: string;
          computed_at?: string;
          house_system: string;
          id?: string;
          kind?: string;
          result: Json;
          user_id: string;
          zodiac: string;
        };
        Update: {
          birth_profile_id?: string;
          cache_key?: string;
          computed_at?: string;
          house_system?: string;
          id?: string;
          kind?: string;
          result?: Json;
          user_id?: string;
          zodiac?: string;
        };
        Relationships: [];
      };
      profiles_user: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          card_style: string;
          detail_level: string;
          house_system: string;
          language: string;
          light_mode: string;
          reading_style: string;
          theme: string;
          updated_at: string;
          user_id: string;
          zodiac: string;
        };
        Insert: {
          card_style?: string;
          detail_level?: string;
          house_system?: string;
          language?: string;
          light_mode?: string;
          reading_style?: string;
          theme?: string;
          updated_at?: string;
          user_id: string;
          zodiac?: string;
        };
        Update: {
          card_style?: string;
          detail_level?: string;
          house_system?: string;
          language?: string;
          light_mode?: string;
          reading_style?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
          zodiac?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
