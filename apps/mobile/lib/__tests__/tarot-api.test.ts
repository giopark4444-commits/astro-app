import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// ../tarot-api importa (estático) apiUrl() de ../config, que a su vez importa
// expo-constants → react-native. Mismo mock que eastern-api.test.ts para no
// cargar esa cadena fuera de Metro.
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import { saveTarotReading, fetchTarotDiary, TarotApiError } from "../tarot-api";

const originalFetch = global.fetch;

describe("saveTarotReading", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama POST /api/tarot/readings con Bearer y el body exacto", async () => {
    const row = {
      id: "r1", user_id: "u1", profile_id: null, spread: "daily", question: null,
      cards: [{ cardId: "fool", reversed: false, position: "day" }], deck: "rws",
      notes: null, created_at: "2026-07-18T00:00:00Z",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ reading: row }),
    });

    const result = await saveTarotReading("token-abc", {
      spread: "daily",
      cards: [{ cardId: "fool", reversed: false, position: "day" }],
      deck: "rws",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/tarot/readings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer token-abc",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          spread: "daily",
          cards: [{ cardId: "fool", reversed: false, position: "day" }],
          deck: "rws",
        }),
      }),
    );
    expect(result).toEqual(row);
  });

  it("question omitida no viaja en el body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ reading: {} }),
    });

    await saveTarotReading("t", {
      spread: "three",
      cards: [
        { cardId: "fool", reversed: false, position: "past" },
        { cardId: "sun", reversed: true, position: "present" },
        { cardId: "moon", reversed: false, position: "future" },
      ],
      deck: "rws",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          spread: "three",
          cards: [
            { cardId: "fool", reversed: false, position: "past" },
            { cardId: "sun", reversed: true, position: "present" },
            { cardId: "moon", reversed: false, position: "future" },
          ],
          deck: "rws",
        }),
      }),
    );
  });

  it("question presente sí viaja en el body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ reading: {} }),
    });

    await saveTarotReading("t", {
      spread: "daily",
      question: "¿Qué me espera hoy?",
      cards: [{ cardId: "fool", reversed: false, position: "day" }],
      deck: "rws",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          spread: "daily",
          question: "¿Qué me espera hoy?",
          cards: [{ cardId: "fool", reversed: false, position: "day" }],
          deck: "rws",
        }),
      }),
    );
  });

  it("403 free_limit lanza TarotApiError distinguible por .code (no solo .status)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "free_limit" }),
    });

    const err = await saveTarotReading("t", {
      spread: "three",
      cards: [{ cardId: "fool", reversed: false, position: "past" }],
      deck: "rws",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(TarotApiError);
    expect((err as InstanceType<typeof TarotApiError>).status).toBe(403);
    expect((err as InstanceType<typeof TarotApiError>).code).toBe("free_limit");
  });

  it("otros errores no-ok también lanzan TarotApiError con su status y .code undefined si el body no trae error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const err = await saveTarotReading("t", { spread: "daily", cards: [], deck: "rws" }).catch((e) => e);
    expect(err).toMatchObject({ status: 401, code: undefined });
  });

  it("403 con body JSON malformado: .code queda undefined en vez de romper", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    });
    const err = await saveTarotReading("t", {
      spread: "three",
      cards: [{ cardId: "fool", reversed: false, position: "past" }],
      deck: "rws",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(TarotApiError);
    expect((err as InstanceType<typeof TarotApiError>).status).toBe(403);
    expect((err as InstanceType<typeof TarotApiError>).code).toBeUndefined();
  });
});

describe("fetchTarotDiary", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("llama GET /api/tarot/readings con Bearer y parsea readings+total", async () => {
    const readings = [
      { id: "r1", user_id: "u1", profile_id: null, spread: "daily", question: null, cards: [], deck: "rws", notes: null, created_at: "2026-07-18T00:00:00Z" },
    ];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ readings, total: 3 }),
    });

    const result = await fetchTarotDiary("token-xyz");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/tarot/readings",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ authorization: "Bearer token-xyz" }),
      }),
    );
    expect(result).toEqual({ readings, total: 3 });
  });

  it("lanza TarotApiError con el status si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(fetchTarotDiary("t")).rejects.toThrow(TarotApiError);
  });

  it("propaga el error si la respuesta ok trae JSON malformado", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    });
    await expect(fetchTarotDiary("t")).rejects.toThrow();
  });
});
