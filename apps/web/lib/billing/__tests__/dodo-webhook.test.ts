import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { Webhook } from "standardwebhooks";
import { verifyDodoSignature } from "../dodo-webhook";

// Firmamos con la propia librería `standardwebhooks` (no con nuestro propio
// HMAC) para que estos tests verifiquen interoperabilidad real con el
// esquema de Dodo, no que la función se firme y verifique a sí misma con el
// mismo eventual bug. El secreto sigue el formato real: prefijo "whsec_" +
// base64 (acá generado con bytes aleatorios para que sea válido).
const SECRET = "whsec_" + crypto.randomBytes(24).toString("base64");
const WEBHOOK_ID = "msg_2sPbwIveEK6UyzUgV73aEUEBWHW";

function sign(webhookId: string, timestamp: Date, payload: string): string {
  return new Webhook(SECRET).sign(webhookId, timestamp, payload);
}

describe("verifyDodoSignature (interop real con standardwebhooks)", () => {
  it("true con firma válida (webhook-id + timestamp + body correctos)", () => {
    const rawBody = '{"type":"subscription.active"}';
    const timestamp = new Date();
    const signatureHeader = sign(WEBHOOK_ID, timestamp, rawBody);
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: WEBHOOK_ID,
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("false con firma incorrecta", () => {
    const rawBody = '{"type":"subscription.active"}';
    const timestampHeader = String(Math.floor(Date.now() / 1000));
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: WEBHOOK_ID,
        signatureHeader: "v1,firmaFalsaQueNoMatchea==",
        timestampHeader,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("false si el body fue alterado después de firmar", () => {
    const timestamp = new Date();
    const signatureHeader = sign(WEBHOOK_ID, timestamp, '{"type":"subscription.active"}');
    expect(
      verifyDodoSignature({
        rawBody: '{"type":"subscription.cancelled"}',
        webhookId: WEBHOOK_ID,
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("false si el webhook-id no coincide con el usado para firmar (participa del contenido firmado)", () => {
    const rawBody = '{"type":"subscription.active"}';
    const timestamp = new Date();
    const signatureHeader = sign(WEBHOOK_ID, timestamp, rawBody);
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: "msg_otroIdCompletamenteDistinto",
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("false si falta cualquiera de los 3 headers", () => {
    const rawBody = "{}";
    const timestamp = new Date();
    const signatureHeader = sign(WEBHOOK_ID, timestamp, rawBody);
    const timestampHeader = String(Math.floor(timestamp.getTime() / 1000));
    expect(
      verifyDodoSignature({ rawBody, webhookId: null, signatureHeader, timestampHeader, secret: SECRET }),
    ).toBe(false);
    expect(
      verifyDodoSignature({ rawBody, webhookId: WEBHOOK_ID, signatureHeader: null, timestampHeader, secret: SECRET }),
    ).toBe(false);
    expect(
      verifyDodoSignature({ rawBody, webhookId: WEBHOOK_ID, signatureHeader, timestampHeader: null, secret: SECRET }),
    ).toBe(false);
  });

  it("false si el timestamp tiene más de 5 minutos en el pasado (anti-replay)", () => {
    const rawBody = "{}";
    const timestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 min atrás
    const signatureHeader = sign(WEBHOOK_ID, timestamp, rawBody);
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: WEBHOOK_ID,
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("false si el timestamp está más de 5 minutos en el futuro (anti-replay bidireccional)", () => {
    const rawBody = "{}";
    const timestamp = new Date(Date.now() + 10 * 60 * 1000); // 10 min en el futuro
    const signatureHeader = sign(WEBHOOK_ID, timestamp, rawBody);
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: WEBHOOK_ID,
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("true si el header trae varias firmas separadas por espacio y solo una matchea (rotación de secreto)", () => {
    const rawBody = '{"type":"subscription.renewed"}';
    const timestamp = new Date();
    const validSignature = sign(WEBHOOK_ID, timestamp, rawBody);
    const signatureHeader = `v1,firmaDeUnSecretoRotadoQueNoMatchea== ${validSignature}`;
    expect(
      verifyDodoSignature({
        rawBody,
        webhookId: WEBHOOK_ID,
        signatureHeader,
        timestampHeader: String(Math.floor(timestamp.getTime() / 1000)),
        secret: SECRET,
      }),
    ).toBe(true);
  });
});
