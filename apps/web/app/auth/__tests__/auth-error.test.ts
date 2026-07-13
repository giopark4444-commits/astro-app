import { describe, it, expect } from "vitest";
import { authMessageKey } from "../auth-error";

describe("authMessageKey", () => {
  it("mapea los códigos conocidos a su clave de traducción", () => {
    expect(authMessageKey("email")).toBe("errEmail");
    expect(authMessageKey("password")).toBe("errPassword");
    expect(authMessageKey("auth")).toBe("errAuth");
    expect(authMessageKey("confirm")).toBe("confirmEmail");
  });
  it("mapea los códigos de reset de contraseña a su clave de traducción", () => {
    expect(authMessageKey("reset_sent")).toBe("resetLinkSent");
    expect(authMessageKey("reset_invalid")).toBe("errResetLink");
    expect(authMessageKey("reset_ok")).toBe("resetSuccess");
  });
  it("devuelve null para ausente o desconocido", () => {
    expect(authMessageKey(undefined)).toBeNull();
    expect(authMessageKey(null)).toBeNull();
    expect(authMessageKey("xyz")).toBeNull();
  });
});
