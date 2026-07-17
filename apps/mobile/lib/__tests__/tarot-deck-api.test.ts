import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("../config", () => ({ apiUrl: () => "https://example.test" }));
import {
  getDeckManifest,
  setDeckActive,
  uploadDeckCard,
  deleteDeckCard,
  uploadDeckBack,
  TarotDeckApiError,
} from "../tarot-deck-api";

const originalFetch = global.fetch;

describe("tarot-deck-api", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getDeckManifest", () => {
    it("manda GET con Bearer y devuelve el manifiesto", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null }),
      });

      const result = await getDeckManifest("t1");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ authorization: "Bearer t1" }),
        }),
      );
      expect(result).toEqual({ available: true, active: false, cardIds: [], backKind: "none", backUrl: null });
    });

    it("un 503 latente se parsea igual (no lanza)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ available: false }),
      });

      const result = await getDeckManifest("t1");
      expect(result).toEqual({ available: false });
    });

    it("lanza TarotDeckApiError en 401", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauthorized" }),
      });
      await expect(getDeckManifest("bad")).rejects.toThrow(TarotDeckApiError);
    });
  });

  describe("setDeckActive", () => {
    it("manda PUT con Bearer y el body exacto", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

      await setDeckActive("t1", true);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({ authorization: "Bearer t1", "content-type": "application/json" }),
          body: JSON.stringify({ active: true }),
        }),
      );
    });

    it("lanza TarotDeckApiError si la respuesta no es ok", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "unavailable" }),
      });
      await expect(setDeckActive("t1", true)).rejects.toThrow(TarotDeckApiError);
    });
  });

  describe("uploadDeckCard", () => {
    it("manda multipart con cardId + file y Bearer", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/fool.webp" }),
      });

      const result = await uploadDeckCard("t1", "fool", { uri: "file:///x.jpg", name: "x.jpg", type: "image/jpeg" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck/card",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ authorization: "Bearer t1" }),
          body: expect.any(FormData),
        }),
      );
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const form = (call[1] as { body: FormData }).body;
      expect(form.get("cardId")).toBe("fool");
      expect(result).toEqual({ url: "https://cdn.test/fool.webp" });
    });

    it("lanza TarotDeckApiError si la respuesta no es ok", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "bad_type" }),
      });
      await expect(
        uploadDeckCard("t1", "fool", { uri: "file:///x.jpg", name: "x.jpg", type: "image/jpeg" }),
      ).rejects.toThrow(TarotDeckApiError);
    });
  });

  describe("deleteDeckCard", () => {
    it("manda DELETE con cardId en query y Bearer", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

      await deleteDeckCard("t1", "fool");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck/card?cardId=fool",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({ authorization: "Bearer t1" }),
        }),
      );
    });

    it("lanza TarotDeckApiError si la respuesta no es ok", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "storage" }),
      });
      await expect(deleteDeckCard("t1", "fool")).rejects.toThrow(TarotDeckApiError);
    });
  });

  describe("uploadDeckBack", () => {
    it("modo config: manda JSON con {config} y Bearer", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/back.webp" }),
      });

      const result = await uploadDeckBack("t1", { config: { bg: "#12142e", border: "#c9a227", symbol: "enso" } });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck/back",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ authorization: "Bearer t1", "content-type": "application/json" }),
          body: JSON.stringify({ config: { bg: "#12142e", border: "#c9a227", symbol: "enso" } }),
        }),
      );
      expect(result).toEqual({ url: "https://cdn.test/back.webp" });
    });

    it("modo file: manda multipart y Bearer", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/back.webp" }),
      });

      await uploadDeckBack("t1", { file: { uri: "file:///back.jpg", name: "back.jpg", type: "image/jpeg" } });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.test/api/tarot/deck/back",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ authorization: "Bearer t1" }),
          body: expect.any(FormData),
        }),
      );
    });

    it("lanza TarotDeckApiError si la respuesta no es ok", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "bad_config" }),
      });
      await expect(uploadDeckBack("t1", { config: { bg: "#000", border: "#fff", symbol: "star" } })).rejects.toThrow(
        TarotDeckApiError,
      );
    });
  });
});
