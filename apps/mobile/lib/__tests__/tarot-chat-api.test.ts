import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import { sendTarotChat, TarotChatApiError } from "../tarot-chat-api";

const originalFetch = global.fetch;

describe("sendTarotChat", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("manda POST con Bearer y el body exacto (turno-0: messages vacío, sin question/profileId)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain; charset=utf-8" },
      text: async () => "¿Ese cierre del pasado ya lo notas en algo concreto?",
    });

    const result = await sendTarotChat({
      accessToken: "t1",
      locale: "es",
      spreadId: "three",
      cards: [{ cardId: "fool", reversed: false, position: "past" }],
      messages: [],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/tarot/reading-chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer t1",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          locale: "es",
          spreadId: "three",
          cards: [{ cardId: "fool", reversed: false, position: "past" }],
          messages: [],
        }),
      }),
    );
    expect(result).toEqual({ available: true, text: "¿Ese cierre del pasado ya lo notas en algo concreto?" });
  });

  it("question y profileId viajan solo cuando están presentes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain" },
      text: async () => "...",
    });

    await sendTarotChat({
      accessToken: "t1",
      locale: "en",
      spreadId: "free",
      cards: [{ cardId: "sun", reversed: true, position: "free-1", jumper: true }],
      question: "What should I focus on?",
      profileId: "p1",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          locale: "en",
          spreadId: "free",
          cards: [{ cardId: "sun", reversed: true, position: "free-1", jumper: true }],
          question: "What should I focus on?",
          profileId: "p1",
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
    );
  });

  it("available:false cuando el content-type es JSON (dormant)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ available: false }),
    });
    const result = await sendTarotChat({
      accessToken: "t1",
      locale: "es",
      spreadId: "three",
      cards: [],
      messages: [],
    });
    expect(result).toEqual({ available: false });
  });

  it("lanza TarotChatApiError si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    await expect(
      sendTarotChat({ accessToken: "t1", locale: "es", spreadId: "three", cards: [], messages: [] }),
    ).rejects.toThrow(TarotChatApiError);
  });
});
