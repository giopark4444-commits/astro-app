// apps/web/app/api/share-card/__tests__/route.test.ts
// Mockea SOLO authenticateRoute y renderShareCardImage — el render real ya
// tiene su propio smoke en lib/share/__tests__/render.test.ts, y parseShareParams
// corre de verdad aquí (así el 400 por cada familia de input inválido queda
// probado contra la whitelist real, no contra un doble).
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const renderShareCardImageMock = vi.fn();
vi.mock("@/lib/share/render", () => ({
  renderShareCardImage: (...args: unknown[]) => renderShareCardImageMock(...args),
}));

import { GET } from "../route";

const USER_ID = "user-abc-123";
const FAKE_JPEG = Buffer.from("fake-jpeg-bytes");

function fakeRequest(url: string): NextRequest {
  return { nextUrl: new URL(url, "http://localhost") } as unknown as NextRequest;
}

const BASE_COMMON = "theme=observatory&format=story&detail=1&locale=es";
const VALID_QS = {
  numeros: `lens=numeros&number=1&labelKey=lifePath&${BASE_COMMON}`,
  carta: `lens=carta&body=sun&sign=leo&${BASE_COMMON}`,
  pilares: `lens=pilares&dayStem=jia&${BASE_COMMON}`,
  tarot: `lens=tarot&cardId=fool&reversed=0&${BASE_COMMON}`,
  horoscopo: `lens=horoscopo&sign=leo&${BASE_COMMON}`,
};

describe("GET /api/share-card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    renderShareCardImageMock.mockResolvedValue(FAKE_JPEG);
  });

  it("sin sesión → 401, ni siquiera intenta renderizar", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.numeros}`));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unauthorized");
    expect(renderShareCardImageMock).not.toHaveBeenCalled();
  });

  it("sin sesión con params también inválidos → 401 (auth va primero)", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await GET(fakeRequest("http://localhost/api/share-card?lens=bogus"));
    expect(res.status).toBe(401);
    expect(renderShareCardImageMock).not.toHaveBeenCalled();
  });

  describe("400 por cada familia de input inválido (whitelist real de parseShareParams)", () => {
    const cases: Array<[string, string, string]> = [
      ["lens", `lens=bogus&${BASE_COMMON}`, "bad_lens"],
      ["number", `lens=numeros&number=99&labelKey=lifePath&${BASE_COMMON}`, "bad_number"],
      ["labelKey", `lens=numeros&number=1&labelKey=bogus&${BASE_COMMON}`, "bad_label_key"],
      ["sign (carta)", `lens=carta&body=sun&sign=bogus&${BASE_COMMON}`, "bad_sign"],
      ["cardId", `lens=tarot&cardId=bogus&reversed=0&${BASE_COMMON}`, "bad_card_id"],
      ["theme", VALID_QS.numeros.replace("theme=observatory", "theme=bogus"), "bad_theme"],
      ["format", VALID_QS.numeros.replace("format=story", "format=bogus"), "bad_format"],
      ["locale", VALID_QS.numeros.replace("locale=es", "locale=bogus"), "bad_locale"],
    ];

    it.each(cases)("%s inválido → 400 %s", async (_name, qs, expectedError) => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${qs}`));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe(expectedError);
      expect(renderShareCardImageMock).not.toHaveBeenCalled();
    });
  });

  describe("date (solo horóscopo)", () => {
    it("date con formato inválido → 400 bad_date", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.horoscopo}&date=21-07-2026`));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("bad_date");
      expect(renderShareCardImageMock).not.toHaveBeenCalled();
    });

    it("date con formato correcto pero fecha de calendario inexistente (30 de febrero) → 400 bad_date", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.horoscopo}&date=2026-02-30`));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("bad_date");
    });

    it("date válida (es): eyebrowDate formateado 'D DE MES' en mayúsculas", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.horoscopo}&date=2026-07-21`));
      expect(res.status).toBe(200);
      expect(renderShareCardImageMock).toHaveBeenCalledTimes(1);
      const [, eyebrowDate] = renderShareCardImageMock.mock.calls[0] as [unknown, string];
      expect(eyebrowDate).toBe("21 DE JULIO");
    });

    it("date válida (en): eyebrowDate formateado 'MONTH D' en mayúsculas", async () => {
      const qs = VALID_QS.horoscopo.replace("locale=es", "locale=en") + "&date=2026-07-21";
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${qs}`));
      expect(res.status).toBe(200);
      const [, eyebrowDate] = renderShareCardImageMock.mock.calls[0] as [unknown, string];
      expect(eyebrowDate).toBe("JULY 21");
    });

    it("horóscopo sin date → usa la fecha actual del server sin romper", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.horoscopo}`));
      expect(res.status).toBe(200);
      const [, eyebrowDate] = renderShareCardImageMock.mock.calls[0] as [unknown, string | undefined];
      expect(typeof eyebrowDate).toBe("string");
      expect((eyebrowDate as string).length).toBeGreaterThan(0);
    });

    it("lentes que no son horóscopo ignoran date (no lo validan, no lo pasan)", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.numeros}&date=bogus`));
      expect(res.status).toBe(200);
      const [, eyebrowDate] = renderShareCardImageMock.mock.calls[0] as [unknown, string | undefined];
      expect(eyebrowDate).toBeUndefined();
    });
  });

  describe("200: headers correctos + params parseados pasados a renderShareCardImage", () => {
    it("numeros: Content-Type image/jpeg, Cache-Control private, body = JPEG del render", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.numeros}`));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
      expect(res.headers.get("cache-control")).toBe("private, max-age=3600");

      const bodyBuf = Buffer.from(await res.arrayBuffer());
      expect(bodyBuf.equals(FAKE_JPEG)).toBe(true);

      expect(renderShareCardImageMock).toHaveBeenCalledWith(
        {
          lens: "numeros",
          number: 1,
          labelKey: "lifePath",
          theme: "observatory",
          format: "story",
          detail: true,
          locale: "es",
        },
        undefined,
      );
    });

    it("tarot: params parseados (incluye reversed:boolean) llegan intactos al render", async () => {
      const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.tarot}`));
      expect(res.status).toBe(200);
      expect(renderShareCardImageMock).toHaveBeenCalledWith(
        {
          lens: "tarot",
          cardId: "fool",
          reversed: false,
          theme: "observatory",
          format: "story",
          detail: true,
          locale: "es",
        },
        undefined,
      );
    });
  });

  it("fallo inesperado de renderShareCardImage → 500 render_failed, sin filtrar detalles", async () => {
    renderShareCardImageMock.mockRejectedValue(new Error("boom: detalle interno sensible"));
    const res = await GET(fakeRequest(`http://localhost/api/share-card?${VALID_QS.numeros}`));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("render_failed");
    expect(JSON.stringify(body)).not.toContain("detalle interno sensible");
  });
});
