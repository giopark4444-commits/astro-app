// Verificación de firma de los webhooks de Dodo Payments (Standard Webhooks
// spec: https://standardwebhooks.com/): HMAC-SHA256 en base64 de
// "{timestamp}.{rawBody}", header "webhook-signature: v1,<firma>", más una
// ventana anti-replay de 5 minutos sobre "webhook-timestamp" (epoch segundos).
// Server-only (node:crypto).
import crypto from "node:crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function verifyDodoSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { rawBody, signatureHeader, timestampHeader, secret, now = Date.now() } = params;
  if (!signatureHeader || !timestampHeader) return false;

  const provided = signatureHeader.split(",")[1];
  if (!provided) return false;

  const signedPayload = `${timestampHeader}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return false;

  const eventMs = Number(timestampHeader) * 1000;
  if (!Number.isFinite(eventMs)) return false;
  return Math.abs(now - eventMs) <= MAX_CLOCK_SKEW_MS;
}
