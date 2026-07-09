import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyDodoSignature } from "../dodo-webhook";

const SECRET = "whsec_test_1234567890";

function sign(rawBody: string, timestamp: string, secret: string): string {
  const signed = `${timestamp}.${rawBody}`;
  const sig = crypto.createHmac("sha256", secret).update(signed).digest("base64");
  return `v1,${sig}`;
}

describe("verifyDodoSignature (Standard Webhooks spec)", () => {
  it("true con firma válida y timestamp fresco", () => {
    const rawBody = '{"type":"subscription.active"}';
    const nowSec = Math.floor(Date.now() / 1000);
    const timestampHeader = String(nowSec);
    const signatureHeader = sign(rawBody, timestampHeader, SECRET);
    expect(
      verifyDodoSignature({ rawBody, signatureHeader, timestampHeader, secret: SECRET, now: nowSec * 1000 }),
    ).toBe(true);
  });
  it("false con firma incorrecta", () => {
    const rawBody = '{"type":"subscription.active"}';
    const timestampHeader = String(Math.floor(Date.now() / 1000));
    expect(
      verifyDodoSignature({
        rawBody,
        signatureHeader: "v1,firmaFalsa==",
        timestampHeader,
        secret: SECRET,
      }),
    ).toBe(false);
  });
  it("false si el body fue alterado después de firmar", () => {
    const timestampHeader = String(Math.floor(Date.now() / 1000));
    const signatureHeader = sign('{"type":"subscription.active"}', timestampHeader, SECRET);
    expect(
      verifyDodoSignature({
        rawBody: '{"type":"subscription.cancelled"}',
        signatureHeader,
        timestampHeader,
        secret: SECRET,
      }),
    ).toBe(false);
  });
  it("false si faltan headers", () => {
    expect(
      verifyDodoSignature({ rawBody: "{}", signatureHeader: null, timestampHeader: "123", secret: SECRET }),
    ).toBe(false);
    expect(
      verifyDodoSignature({ rawBody: "{}", signatureHeader: "v1,x", timestampHeader: null, secret: SECRET }),
    ).toBe(false);
  });
  it("false si el timestamp tiene más de 5 minutos de diferencia (anti-replay)", () => {
    const rawBody = "{}";
    const oldSec = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás
    const timestampHeader = String(oldSec);
    const signatureHeader = sign(rawBody, timestampHeader, SECRET);
    expect(
      verifyDodoSignature({ rawBody, signatureHeader, timestampHeader, secret: SECRET, now: Date.now() }),
    ).toBe(false);
  });
  it("false si el timestamp está más de 5 minutos en el futuro (anti-replay bidireccional)", () => {
    const rawBody = "{}";
    const nowSec = Math.floor(Date.now() / 1000);
    const futureSec = nowSec + 600; // 10 minutos en el futuro
    const timestampHeader = String(futureSec);
    const signatureHeader = sign(rawBody, timestampHeader, SECRET);
    expect(
      verifyDodoSignature({ rawBody, signatureHeader, timestampHeader, secret: SECRET, now: nowSec * 1000 }),
    ).toBe(false);
  });
});
