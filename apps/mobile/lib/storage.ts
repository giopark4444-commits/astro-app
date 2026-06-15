// Persistencia local. Usa AsyncStorage (bundled en SDK 56); si por cualquier
// razón no estuviera disponible, cae a memoria para no romper la app.

import type { Profile } from "./profile";

const PROFILE_KEY = "aluna.activeProfile.v1";

type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let store: Store;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  store = require("@react-native-async-storage/async-storage").default as Store;
} catch {
  const mem = new Map<string, string>();
  store = {
    async getItem(k) {
      return mem.has(k) ? mem.get(k)! : null;
    },
    async setItem(k, v) {
      mem.set(k, v);
    },
    async removeItem(k) {
      mem.delete(k);
    },
  };
}

/** Lee una clave cruda (string) — best-effort, null ante cualquier fallo. */
export async function getRaw(key: string): Promise<string | null> {
  try {
    return await store.getItem(key);
  } catch {
    return null;
  }
}

/** Escribe una clave cruda (string) — best-effort, silencioso ante fallo. */
export async function setRaw(key: string, value: string): Promise<void> {
  try {
    await store.setItem(key, value);
  } catch {
    /* noop: en el peor caso la preferencia vive solo en este arranque */
  }
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await getRaw(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setRaw(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearProfile(): Promise<void> {
  try {
    await store.removeItem(PROFILE_KEY);
  } catch {
    /* noop */
  }
}
