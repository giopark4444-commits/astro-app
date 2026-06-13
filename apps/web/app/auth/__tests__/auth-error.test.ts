import { describe, it, expect } from "vitest";
import { authMessageKey } from "../auth-error";

describe("authMessageKey", () => {
  it("mapea los códigos conocidos a su clave de traducción", () => {
    expect(authMessageKey("email")).toBe("errEmail");
    expect(authMessageKey("password")).toBe("errPassword");
    expect(authMessageKey("auth")).toBe("errAuth");
    expect(authMessageKey("confirm")).toBe("confirmEmail");
  });
  it("devuelve null para ausente o desconocido", () => {
    expect(authMessageKey(undefined)).toBeNull();
    expect(authMessageKey(null)).toBeNull();
    expect(authMessageKey("xyz")).toBeNull();
  });
});
