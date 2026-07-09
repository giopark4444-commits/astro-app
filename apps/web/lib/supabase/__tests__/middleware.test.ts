import { describe, it, expect } from "vitest";
import { isPublicPath } from "../middleware";

describe("isPublicPath", () => {
  it("permite las rutas públicas de auth sin sesión", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
  });
  it("protege el resto, incluida la raíz y /api/auth", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/hoy")).toBe(false);
    expect(isPublicPath("/ajustes")).toBe(false);
    expect(isPublicPath("/api/auth")).toBe(false);
  });
  it("permite el webhook de Dodo sin sesión (se autentica con su propia firma HMAC)", () => {
    expect(isPublicPath("/api/webhooks/dodo")).toBe(true);
  });
  it("no vuelve público todo /api/webhooks por accidente — solo la ruta exacta de Dodo", () => {
    expect(isPublicPath("/api/webhooks")).toBe(false);
    expect(isPublicPath("/api/webhooks/otro-proveedor-futuro")).toBe(false);
  });
});
