import { describe, it, expect } from "vitest";
import { parseCredentials, parseEmail } from "../validation";

describe("parseCredentials", () => {
  it("acepta email y password válidos", () => {
    const r = parseCredentials({ email: "a@b.com", password: "secret12" });
    expect(r.ok).toBe(true);
  });
  it("rechaza email inválido", () => {
    const r = parseCredentials({ email: "nope", password: "secret12" });
    expect(r.ok).toBe(false);
  });
  it("rechaza password corto", () => {
    const r = parseCredentials({ email: "a@b.com", password: "123" });
    expect(r.ok).toBe(false);
  });
  it("coacciona entradas ausentes y rechaza", () => {
    expect(parseCredentials({}).ok).toBe(false);
    expect(parseCredentials({ email: undefined, password: null }).ok).toBe(false);
  });
  it("expone el código de error correcto", () => {
    const e = parseCredentials({ email: "nope", password: "secret12" });
    expect(e.ok === false && e.error).toBe("email");
    const p = parseCredentials({ email: "a@b.com", password: "123" });
    expect(p.ok === false && p.error).toBe("password");
  });
});

describe("parseEmail", () => {
  function formDataWith(email?: string) {
    const fd = new FormData();
    if (email !== undefined) fd.set("email", email);
    return fd;
  }

  it("acepta un email válido", () => {
    const r = parseEmail(formDataWith("a@b.com"));
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toBe("a@b.com");
  });
  it("recorta espacios alrededor del email", () => {
    const r = parseEmail(formDataWith("  a@b.com  "));
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toBe("a@b.com");
  });
  it("rechaza email inválido", () => {
    const r = parseEmail(formDataWith("nope"));
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toBe("email");
  });
  it("rechaza email ausente", () => {
    const r = parseEmail(formDataWith());
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toBe("email");
  });
});
