import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "./profile";
import { clearProfile, loadProfile, saveProfile } from "./storage";

interface ProfileContextValue {
  /** null = aún cargando; cuando carga, es Profile o undefined (sin perfil). */
  ready: boolean;
  profile: Profile | null;
  setProfile: (p: Profile) => Promise<void>;
  reset: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => {
      if (!alive) return;
      setProfileState(p);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setProfile = useCallback(async (p: Profile) => {
    setProfileState(p);
    await saveProfile(p);
  }, []);

  const reset = useCallback(async () => {
    setProfileState(null);
    await clearProfile();
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ ready, profile, setProfile, reset }),
    [ready, profile, setProfile, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile debe usarse dentro de <ProfileProvider>");
  return ctx;
}
