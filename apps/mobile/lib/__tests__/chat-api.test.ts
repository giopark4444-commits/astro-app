import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchChatReply, ChatApiError } from "../chat-api";

vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));

const originalFetch = global.fetch;

describe("fetchChatReply", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("manda POST con Bearer, profileId, locale y los mensajes", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain; charset=utf-8" },
      text: async () => "Tu Sol en Acuario explica...",
    });
    const result = await fetchChatReply({
      accessToken: "t1",
      profileId: "p1",
      locale: "es",
      messages: [{ role: "user", content: "hola" }],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer t1" }),
        body: JSON.stringify({ profileId: "p1", locale: "es", messages: [{ role: "user", content: "hola" }] }),
      }),
    );
    expect(result).toEqual({ available: true, text: "Tu Sol en Acuario explica..." });
  });

  it("available:false cuando el content-type es JSON (dormant)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ available: false }),
    });
    const result = await fetchChatReply({ accessToken: "t1", profileId: "p1", locale: "es", messages: [] });
    expect(result).toEqual({ available: false });
  });

  it("lanza ChatApiError si la respuesta no es ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchChatReply({ accessToken: "t1", profileId: "p1", locale: "es", messages: [] })).rejects.toThrow(ChatApiError);
  });
});
