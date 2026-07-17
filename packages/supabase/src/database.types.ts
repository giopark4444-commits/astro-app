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
      manifestations: {
        Row: {
          created_at: string;
          horizon: string;
          id: string;
          intention: string;
          target_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          horizon: string;
          id?: string;
          intention: string;
          target_date: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          horizon?: string;
          id?: string;
          intention?: string;
          target_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      journal_notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          user_id?: string;
        };
        Relationships: [];
      };
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
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0004_reading_cache.sql
      // (regenerar desde la BD viva cuando se aplique la migración).
      reading_cache: {
        Row: {
          cache_key: string;
          created_at: string;
          kind: string;
          locale: string;
          model: string | null;
          payload: Json;
        };
        Insert: {
          cache_key: string;
          created_at?: string;
          kind: string;
          locale: string;
          model?: string | null;
          payload: Json;
        };
        Update: {
          cache_key?: string;
          created_at?: string;
          kind?: string;
          locale?: string;
          model?: string | null;
          payload?: Json;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          card_style: string;
          detail_level: string;
          house_system: string;
          intent: Json | null;
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
          intent?: Json | null;
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
          intent?: Json | null;
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
      // Añadida a mano junto con supabase/migrations/0005_subscriptions.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          dodo_customer_id: string;
          dodo_subscription_id: string;
          plan: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          dodo_customer_id: string;
          dodo_subscription_id: string;
          plan: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          dodo_customer_id?: string;
          dodo_subscription_id?: string;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0012_tarot_readings.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      tarot_readings: {
        Row: {
          cards: Json;
          created_at: string;
          deck: string;
          id: string;
          notes: string | null;
          profile_id: string | null;
          question: string | null;
          spread: string;
          user_id: string;
        };
        Insert: {
          cards: Json;
          created_at?: string;
          deck?: string;
          id?: string;
          notes?: string | null;
          profile_id?: string | null;
          question?: string | null;
          spread: string;
          user_id: string;
        };
        Update: {
          cards?: Json;
          created_at?: string;
          deck?: string;
          id?: string;
          notes?: string | null;
          profile_id?: string | null;
          question?: string | null;
          spread?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0015_tarot_custom_deck.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      tarot_deck: {
        Row: {
          active: boolean;
          back_config: Json | null;
          back_kind: string;
          card_ids: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          back_config?: Json | null;
          back_kind?: string;
          card_ids?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          back_config?: Json | null;
          back_kind?: string;
          card_ids?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0006_user_reports.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      user_reports: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          kind: string;
          locale: string;
          model_used: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          year: number | null;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id?: string;
          kind: string;
          locale: string;
          model_used?: string | null;
          status: string;
          updated_at?: string;
          user_id: string;
          year?: number | null;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          kind?: string;
          locale?: string;
          model_used?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0015_admin_roles.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      roles: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0015_admin_roles.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      app_config: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0016_referidos.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      referral_codes: {
        Row: {
          active: boolean;
          code: string;
          commission_pct: number;
          created_at: string;
          discount_pct: number;
          owner_user_id: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          commission_pct?: number;
          created_at?: string;
          discount_pct?: number;
          owner_user_id: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          commission_pct?: number;
          created_at?: string;
          discount_pct?: number;
          owner_user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0016_referidos.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      referred_users: {
        Row: {
          code: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      // Añadida a mano junto con supabase/migrations/0016_referidos.sql
      // (regenerar desde la BD viva si se instala el CLI de Supabase).
      referral_earnings: {
        Row: {
          amount_cents: number;
          code: string;
          commission_cents: number;
          created_at: string;
          currency: string;
          id: number;
          paid_at: string | null;
          payment_ref: string;
          referred_user_id: string;
          status: string;
        };
        Insert: {
          amount_cents: number;
          code: string;
          commission_cents: number;
          created_at?: string;
          currency?: string;
          id?: number;
          paid_at?: string | null;
          payment_ref: string;
          referred_user_id: string;
          status?: string;
        };
        Update: {
          amount_cents?: number;
          code?: string;
          commission_cents?: number;
          created_at?: string;
          currency?: string;
          id?: number;
          paid_at?: string | null;
          payment_ref?: string;
          referred_user_id?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    // Añadida a mano junto con supabase/migrations/0005_subscriptions.sql: la
    // función security definer que el webhook de Dodo usa para resolver el
    // user_id de Aluna a partir del email que manda el evento.
    Functions: {
      user_id_by_email: {
        Args: { lookup_email: string };
        Returns: string;
      };
      // Añadida a mano junto con supabase/migrations/0007_claim_report_generation.sql:
      // claim atómico (row lock) que decide 'claimed' | 'ready' | 'generating'
      // para evitar la carrera doble-tap de handleReportRequest.
      claim_report_generation: {
        Args: {
          p_user_id: string;
          p_kind: string;
          p_year: number | null;
          p_locale: string;
          p_stale_seconds: number;
          p_respect_ready: boolean;
        };
        Returns: string;
      };
      // Añadidas a mano junto con supabase/migrations/0015_admin_roles.sql:
      // panel de superusuario/colaboradores (regenerar cuando se aplique).
      is_superadmin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_roles: {
        Args: Record<string, never>;
        Returns: { email: string; role: string; user_id: string }[];
      };
      admin_grant_role: {
        Args: { target_email: string; target_role: string };
        Returns: undefined;
      };
      admin_revoke_role: {
        Args: { target_email: string };
        Returns: undefined;
      };
      // Añadidas a mano junto con supabase/migrations/0016_referidos.sql:
      // sistema de referidos con comisión (regenerar cuando se aplique).
      redeem_referral_code: {
        Args: { p_code: string };
        Returns: undefined;
      };
      admin_set_referral_code: {
        Args: { target_email: string; p_code: string; p_discount_pct: number; p_commission_pct: number };
        Returns: undefined;
      };
      admin_deactivate_referral_code: {
        Args: { p_code: string };
        Returns: undefined;
      };
      admin_mark_earnings_paid: {
        Args: { p_code: string; p_expected_pending_cents: number };
        Returns: undefined;
      };
      admin_referral_summary: {
        Args: Record<string, never>;
        Returns: {
          code: string;
          owner_email: string;
          discount_pct: number;
          commission_pct: number;
          active: boolean;
          referred_count: number;
          pending_cents: number;
          paid_cents: number;
          clawback_cents: number;
        }[];
      };
      my_referral_summary: {
        Args: Record<string, never>;
        Returns: {
          code: string;
          discount_pct: number;
          commission_pct: number;
          referred_count: number;
          pending_cents: number;
          paid_cents: number;
          clawback_cents: number;
        }[];
      };
      my_referral_code_for_checkout: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
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
