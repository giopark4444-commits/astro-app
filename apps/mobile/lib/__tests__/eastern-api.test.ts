import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// ../eastern-api importa (estático) apiUrl() de ../config, que a su vez
// importa expo-constants → react-native. Mismo mock que scores-api.test.ts
// para no cargar esa cadena fuera de Metro.
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import {
  fetchEasternHoroscope, EasternHoroscopeApiError,
  EASTERN_ANIMALS, isEasternAnimal, eastAnimalBranch,
} from "../eastern-api";

const originalFetch = global.fetch;

describe("EASTERN_ANIMALS / isEasternAnimal / eastAnimalBranch", () => {
  it("tiene los 12 animales en orden de rama (子…亥)", () => {
    expect(EASTERN_ANIMALS).toEqual([
      "rat", "ox", "tiger", "rabbit", "dragon", "snake",
      "horse", "goat", "monkey", "rooster", "dog", "pig",
    ]);
  });

  it("isEasternAnimal distingue animales válidos de strings sueltos", () => {
    expect(isEasternAnimal("dragon")).toBe(true);
    expect(isEasternAnimal("unicorn")).toBe(false);
  });

  it("eastAnimalBranch devuelve el índice de rama correcto por animal", () => {
    expect(eastAnimalBranch("rat")).toBe(0);
    expect(eastAnimalBranch("pig")).toBe(11);
    expect(eastAnimalBranch("dragon")).toBe(4);
  });
});

describe("fetchEasternHoroscope", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama POST /api/horoscope/eastern con Bearer y el body correcto", async () => {
    const payload = { animal: "dragon", period: "today", tz: "utc" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const result = await fetchEasternHoroscope({
      accessToken: "token-abc", animal: "dragon", period: "today", tz: "utc", profileId: "p1",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/horoscope/eastern",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer token-abc" }),
        body: JSON.stringify({ period: "today", tz: "utc", animal: "dragon", profileId: "p1" }),
      }),
    );
    expect(result).toEqual(payload);
  });

  it("omite animal/profileId del body cuando no vienen (1ª carga: el backend resuelve el animal)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ animal: "rat", period: "today", tz: "utc" }),
    });

    await fetchEasternHoroscope({ accessToken: "t", period: "today", tz: "utc" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ period: "today", tz: "utc" }) }),
    );
  });

  it("lanza EasternHoroscopeApiError con el status si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    await expect(
      fetchEasternHoroscope({ accessToken: "t", period: "today", tz: "utc" }),
    ).rejects.toThrow(EasternHoroscopeApiError);
  });

  it("propaga el error si la respuesta ok trae JSON malformado", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    });
    await expect(
      fetchEasternHoroscope({ accessToken: "t", period: "today", tz: "utc" }),
    ).rejects.toThrow();
  });
});
