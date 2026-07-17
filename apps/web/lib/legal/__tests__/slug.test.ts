import { describe, it, expect } from "vitest";
import { getLegalDoc, isLegalSlug, LEGAL_SLUGS } from "../slug";
import { TERMS_ES, PRIVACY_ES, DISCLAIMER_ES } from "@aluna/core";
import { TERMS_EN, PRIVACY_EN, DISCLAIMER_EN } from "@aluna/core";

describe("isLegalSlug", () => {
  it("acepta los 3 slugs válidos", () => {
    for (const slug of LEGAL_SLUGS) expect(isLegalSlug(slug)).toBe(true);
  });
  it("rechaza un slug desconocido", () => {
    expect(isLegalSlug("privacy")).toBe(false);
    expect(isLegalSlug("")).toBe(false);
  });
});

describe("getLegalDoc", () => {
  it("mapea cada slug al documento ES correcto", () => {
    expect(getLegalDoc("terminos", "es")).toBe(TERMS_ES);
    expect(getLegalDoc("privacidad", "es")).toBe(PRIVACY_ES);
    expect(getLegalDoc("descargo", "es")).toBe(DISCLAIMER_ES);
  });
  it("mapea cada slug al documento EN correcto", () => {
    expect(getLegalDoc("terminos", "en")).toBe(TERMS_EN);
    expect(getLegalDoc("privacidad", "en")).toBe(PRIVACY_EN);
    expect(getLegalDoc("descargo", "en")).toBe(DISCLAIMER_EN);
  });
  it("cualquier locale que no sea 'en' cae a ES", () => {
    expect(getLegalDoc("terminos", "fr")).toBe(TERMS_ES);
  });
  it("devuelve null en un slug desconocido (el caller hace notFound())", () => {
    expect(getLegalDoc("privacy", "es")).toBeNull();
  });
});
