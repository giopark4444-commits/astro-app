import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

interface AuthResult {
  error: string | null;
}

interface SignUpResult extends AuthResult {
  /** true si el proyecto exige confirmar el correo antes de abrir sesión. */
  needsConfirmation: boolean;
}

interface AuthContextValue {
  /** false mientras se resuelve la sesión guardada en AsyncStorage. */
  ready: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next);
    });

    // Pausa el auto-refresh del token en background; supabase-js no lo hace
    // solo en React Native (sí en web, vía visibilitychange).
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    return { error: error ? error.message : null, needsConfirmation: !error && !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, session, signIn, signUp, signOut }),
    [ready, session, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
