import { describe, it, expect } from "vitest";
import { parseBearerToken } from "../bearer";

describe("parseBearerToken", () => {
  it("extrae el token de un header Bearer bien formado", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("es insensible a mayúsculas en 'Bearer'", () => {
    expect(parseBearerToken("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("recorta espacios extra", () => {
    expect(parseBearerToken("Bearer   abc.def.ghi  ")).toBe("abc.def.ghi");
  });

  it("null si no hay header", () => {
    expect(parseBearerToken(null)).toBeNull();
  });

  it("null si el header no es Bearer", () => {
    expect(parseBearerToken("Basic abc123")).toBeNull();
  });

  it("null si Bearer no trae token", () => {
    expect(parseBearerToken("Bearer")).toBeNull();
  });
});
