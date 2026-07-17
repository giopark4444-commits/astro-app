import { describe, it, expect } from "vitest";
import {
  resolveDailyState,
  localDateKeyFromDate,
  localDateKey,
  dailyRevealedKey,
  dailySavedKey,
} from "../tarot-daily";

const TZ = "America/Bogota";
const TODAY = localDateKey(TZ);

describe("resolveDailyState", () => {
  it("(a) diario con daily de HOY → revelada y guardada, sin importar el storage", () => {
    const nowIso = new Date().toISOString();
    const state = resolveDailyState({
      diario: [{ spread: "daily", created_at: nowIso }],
      storageFlags: { revealed: false, saved: false },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: true, saved: true, needsRetry: false });
  });

  it("(b) daily de ayer con storage vacío → ambos false", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const state = resolveDailyState({
      diario: [{ spread: "daily", created_at: yesterday.toISOString() }],
      storageFlags: { revealed: false, saved: false },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: false, saved: false, needsRetry: false });
  });

  it("(c) storage revelado sin saved (diario vacío) → revelada sin guardar, pide reintento", () => {
    const state = resolveDailyState({
      diario: [],
      storageFlags: { revealed: true, saved: false },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: true, saved: false, needsRetry: true });
  });

  it("diario vacío y storage vacío → nada revelado", () => {
    const state = resolveDailyState({
      diario: [],
      storageFlags: { revealed: false, saved: false },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: false, saved: false, needsRetry: false });
  });

  it("storage revelado Y saved → no pide reintento", () => {
    const state = resolveDailyState({
      diario: [],
      storageFlags: { revealed: true, saved: true },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: true, saved: true, needsRetry: false });
  });

  it("ignora lecturas de otros spreads al buscar el daily de hoy", () => {
    const nowIso = new Date().toISOString();
    const state = resolveDailyState({
      diario: [{ spread: "three", created_at: nowIso }],
      storageFlags: { revealed: false, saved: false },
      localDate: TODAY,
      tz: TZ,
    });
    expect(state).toEqual({ revealed: false, saved: false, needsRetry: false });
  });
});

describe("localDateKeyFromDate / localDateKey", () => {
  it("formatea YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2026, 0, 5, 12, 0, 0));
    expect(localDateKeyFromDate(d, "utc")).toBe("2026-01-05");
  });
});

describe("dailyRevealedKey / dailySavedKey", () => {
  it("namespacean por userId y fecha", () => {
    expect(dailyRevealedKey("u1", "2026-07-17")).toBe("aluna.tarotDailyRevealed.v1:u1:2026-07-17");
    expect(dailySavedKey("u1", "2026-07-17")).toBe("aluna.tarotDailySaved.v1:u1:2026-07-17");
  });
});
