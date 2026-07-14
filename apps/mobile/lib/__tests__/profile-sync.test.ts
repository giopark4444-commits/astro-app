import { describe, it, expect, vi } from "vitest";
import { rowToProfile, profileToInsert, fetchAllProfiles } from "../profile-sync";
import type { Profile } from "../profile";
import type { Tables, AlunaSupabaseClient } from "@aluna/supabase";

const row: Tables<"birth_profiles"> = {
  id: "row-1",
  user_id: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  name: "Prueba Solar",
  birth_date: "1990-02-04",
  birth_time: "14:00",
  time_known: true,
  place_name: "Guayaquil, Ecuador",
  latitude: -2.17,
  longitude: -79.92,
  time_zone: "America/Guayaquil",
  gender: "feminine",
};

const profile: Profile = {
  id: null,
  name: "Prueba Solar",
  birthDate: "1990-02-04",
  birthTime: "14:00",
  timeKnown: true,
  place: { name: "Guayaquil, Ecuador", latitude: -2.17, longitude: -79.92, timeZone: "America/Guayaquil" },
  gender: "feminine",
};

describe("rowToProfile", () => {
  it("mapea una fila completa de birth_profiles", () => {
    expect(rowToProfile(row)).toEqual({
      id: "row-1",
      name: "Prueba Solar",
      birthDate: "1990-02-04",
      birthTime: "14:00",
      timeKnown: true,
      place: { name: "Guayaquil, Ecuador", latitude: -2.17, longitude: -79.92, timeZone: "America/Guayaquil" },
      gender: "feminine",
    });
  });

  it("hora desconocida (time_known=false) → birthTime vacío aunque la fila tenga un valor viejo", () => {
    const r = { ...row, time_known: false, birth_time: "14:00" };
    expect(rowToProfile(r).birthTime).toBe("");
    expect(rowToProfile(r).timeKnown).toBe(false);
  });

  it("birth_time null → birthTime vacío", () => {
    const r = { ...row, birth_time: null };
    expect(rowToProfile(r).birthTime).toBe("");
  });

  it("gender fuera del enum conocido → null (no revienta)", () => {
    const r = { ...row, gender: "unknown" };
    expect(rowToProfile(r).gender).toBeNull();
  });
});

describe("profileToInsert", () => {
  it("mapea un Profile completo a fila insertable", () => {
    expect(profileToInsert(profile, "user-1")).toEqual({
      user_id: "user-1",
      name: "Prueba Solar",
      birth_date: "1990-02-04",
      birth_time: "14:00",
      time_known: true,
      place_name: "Guayaquil, Ecuador",
      latitude: -2.17,
      longitude: -79.92,
      time_zone: "America/Guayaquil",
      gender: "feminine",
    });
  });

  it("hora desconocida → birth_time null", () => {
    const p: Profile = { ...profile, timeKnown: false, birthTime: "" };
    expect(profileToInsert(p, "user-1").birth_time).toBeNull();
  });

  it("recorta espacios del nombre", () => {
    const p: Profile = { ...profile, name: "  Prueba Solar  " };
    expect(profileToInsert(p, "user-1").name).toBe("Prueba Solar");
  });

  it("lanza si falta el lugar", () => {
    const p: Profile = { ...profile, place: null };
    expect(() => profileToInsert(p, "user-1")).toThrow();
  });

  it("lanza si falta el género", () => {
    const p: Profile = { ...profile, gender: null };
    expect(() => profileToInsert(p, "user-1")).toThrow();
  });

  it("es simétrico con rowToProfile (round-trip conserva los datos del onboarding)", () => {
    const insert = profileToInsert(profile, "user-1");
    const roundTrip = rowToProfile({ ...row, ...insert });
    expect(roundTrip.name).toBe(profile.name);
    expect(roundTrip.birthDate).toBe(profile.birthDate);
    expect(roundTrip.birthTime).toBe(profile.birthTime);
    expect(roundTrip.gender).toBe(profile.gender);
  });
});

describe("fetchAllProfiles", () => {
  it("mapea todas las filas del usuario a Profile, ordenadas por created_at", async () => {
    const rowB = { ...row, id: "row-2", name: "Segunda Persona", created_at: "2026-02-01T00:00:00Z" };
    const orderMock = vi.fn().mockResolvedValue({ data: [row, rowB] });
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const supabase = { from: vi.fn(() => ({ select: selectMock })) } as unknown as AlunaSupabaseClient;

    const result = await fetchAllProfiles(supabase, "user-1");

    expect(supabase.from).toHaveBeenCalledWith("birth_profiles");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual([{ ...profile, id: "row-1" }, { ...profile, id: "row-2", name: "Segunda Persona" }]);
  });

  it("lista vacía si el usuario no tiene perfiles", async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: null });
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const supabase = { from: vi.fn(() => ({ select: selectMock })) } as unknown as AlunaSupabaseClient;

    expect(await fetchAllProfiles(supabase, "user-1")).toEqual([]);
  });
});
