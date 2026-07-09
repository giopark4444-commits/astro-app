// Verificación de firma de los webhooks de Dodo Payments — delega en la
// librería real `standardwebhooks` (Standard Webhooks spec), la misma que
// usa internamente el SDK oficial de Dodo (dodopayments/resources/webhooks,
// método `unwrap`). Confirmado leyendo esa librería instalada
// (node_modules/.pnpm/standardwebhooks@1.0.0), NO asumido de la doc pública:
//  - El contenido firmado real es "{webhook-id}.{webhook-timestamp}.{rawBody}"
//    — el header "webhook-id" SÍ participa de la firma.
//  - La clave HMAC no es el secreto crudo: `new Webhook(secret)` le saca el
//    prefijo "whsec_" y decodifica el resto de base64 a bytes — es la
//    librería la que hace esto, no lo repetimos acá.
//  - "webhook-signature" puede traer varias firmas "v1,<sig>" separadas por
//    ESPACIO (rotación de secreto); `.verify()` acepta cualquiera que matchee.
//
// Nota sobre `now`: la versión anterior de esta función aceptaba un `now`
// inyectable para tests deterministas. La ventana anti-replay de 5 minutos
// la aplica `Webhook.verify()` de forma interna y exclusiva contra
// `Date.now()` real (ver `verifyTimestamp` en el paquete) — no expone forma
// de inyectar un reloj propio. Reimplementar esa ventana acá aparte, solo
// para poder inyectar `now`, crearía una segunda fuente de verdad para un
// chequeo de seguridad crítico, con riesgo real de que diverja del real
// (p.ej. semántica de borde `>` vs `>=`). Se decidió NO duplicarla y quitar
// `now` del contrato: los tests logran determinismo igual que antes, generando
// el `webhook-timestamp` en relación a `Date.now()` real en el momento del
// test (no contra un reloj falso) — ver dodo-webhook.test.ts.
// Server-only (usa node:crypto por debajo, vía la librería).
import { Webhook } from "standardwebhooks";

export function verifyDodoSignature(params: {
  rawBody: string;
  webhookId: string | null;
  signatureHeader: string | null;
  timestampHeader: string | null;
  secret: string;
}): boolean {
  const { rawBody, webhookId, signatureHeader, timestampHeader, secret } = params;
  if (!webhookId || !signatureHeader || !timestampHeader) return false;

  try {
    const webhook = new Webhook(secret);
    webhook.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-signature": signatureHeader,
      "webhook-timestamp": timestampHeader,
    });
    return true;
  } catch {
    // Firma inválida, timestamp fuera de ventana, o headers mal formados —
    // el contrato de esta función sigue siendo boolean, nunca lanzar: la
    // consume route.ts sin try/catch alrededor de esta llamada.
    return false;
  }
}
