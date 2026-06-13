"use client";
import { createContext, useContext, useState } from "react";

export interface BirthProfile {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  time_known: boolean;
  place_name: string;
  latitude: number;
  longitude: number;
  time_zone: string;
  gender: string;
}

type Ctx = { profiles: BirthProfile[]; active: BirthProfile | null; setActive: (id: string) => void };
const ProfilesCtx = createContext<Ctx | null>(null);

export function useProfiles(): Ctx {
  const ctx = useContext(ProfilesCtx);
  if (!ctx) throw new Error("useProfiles debe usarse dentro de <ProfilesProvider>");
  return ctx;
}

export function ProfilesProvider({ profiles, children }: { profiles: BirthProfile[]; children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(profiles[0]?.id ?? null);
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
  return <ProfilesCtx.Provider value={{ profiles, active, setActive: setActiveId }}>{children}</ProfilesCtx.Provider>;
}
