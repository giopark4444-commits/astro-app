import { describe, it, expect } from "vitest";
import { parseRecoveryLink } from "../recovery-link";

describe("parseRecoveryLink", () => {
  it("extrae los tokens del fragmento (flujo implícito real de Supabase)", () => {
    const url =
      "aluna://reset-password#access_token=abc123&refresh_token=def456&expires_in=3600&token_type=bearer&type=recovery";
    expect(parseRecoveryLink(url)).toEqual({
      status: "tokens",
      accessToken: "abc123",
      refreshToken: "def456",
    });
  });

  it("detecta un enlace vencido/inválido por el error en el fragmento", () => {
    const url =
      "aluna://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    expect(parseRecoveryLink(url)).toEqual({
      status: "error",
      description: "Email link is invalid or has expired",
    });
  });

  it("también revisa la query string si no hay fragmento", () => {
    const url = "aluna://reset-password?access_token=abc&refresh_token=def&type=recovery";
    expect(parseRecoveryLink(url)).toEqual({
      status: "tokens",
      accessToken: "abc",
      refreshToken: "def",
    });
  });

  it("sin tokens ni error: 'none' (navegación directa sin enlace de recovery)", () => {
    expect(parseRecoveryLink("aluna://reset-password")).toEqual({ status: "none" });
  });

  it("fragmento vacío: 'none'", () => {
    expect(parseRecoveryLink("aluna://reset-password#")).toEqual({ status: "none" });
  });

  it("null/undefined: 'none'", () => {
    expect(parseRecoveryLink(null)).toEqual({ status: "none" });
    expect(parseRecoveryLink(undefined)).toEqual({ status: "none" });
  });

  it("tokens parciales (falta refresh_token): 'none'", () => {
    const url = "aluna://reset-password#access_token=abc123&type=recovery";
    expect(parseRecoveryLink(url)).toEqual({ status: "none" });
  });
});
