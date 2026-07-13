import { describe, it, expect } from "vitest";
import { validateAvatarFile, avatarPath } from "../avatar";

describe("validateAvatarFile", () => {
  it("acepta png/jpeg/webp bajo 5MB", () => {
    expect(validateAvatarFile({ type: "image/png", size: 1_000_000 })).toEqual({ ok: true });
    expect(validateAvatarFile({ type: "image/jpeg", size: 4_999_999 })).toEqual({ ok: true });
    expect(validateAvatarFile({ type: "image/webp", size: 10 })).toEqual({ ok: true });
  });
  it("rechaza tipos no imagen", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 10 })).toEqual({ ok: false, error: "type" });
    expect(validateAvatarFile({ type: "image/gif", size: 10 })).toEqual({ ok: false, error: "type" });
  });
  it("rechaza > 5MB", () => {
    expect(validateAvatarFile({ type: "image/png", size: 5_000_001 })).toEqual({ ok: false, error: "size" });
  });
});

describe("avatarPath", () => {
  it("es la carpeta del usuario (para que la RLS de storage la acepte)", () => {
    expect(avatarPath("abc-123")).toBe("abc-123/avatar");
  });
});
