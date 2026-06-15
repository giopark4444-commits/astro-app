// Persistencia local del perfil. Usa AsyncStorage (bundled en SDK 56); si por
// cualquier razón no estuviera disponible, cae a memoria para no romper la app.

import type { Profile } from "./profile";

const KEY = "aluna.activeProfile.v1";

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

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await store.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await store.setItem(KEY, JSON.stringify(profile));
  } catch {
    // best-effort: en el peor caso el perfil vive solo en este arranque
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await store.removeItem(KEY);
  } catch {
    /* noop */
  }
}
