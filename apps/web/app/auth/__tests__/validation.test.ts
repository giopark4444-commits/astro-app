import { describe, it, expect } from "vitest";
import { parseCredentials } from "../validation";

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
