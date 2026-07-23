// TODO PLANES (2026-07-23, pedido de Gio): la app completa va ABIERTA — sin
// candados Plus — mientras se decide cómo organizar los planes. Este es el
// ÚNICO interruptor: poner ALUNA_ALL_ACCESS="0" restaura todos los candados
// (los tests lo usan para cubrir ambos caminos). Toda la infraestructura de
// suscripciones (Dodo, webhooks, PlanCard, isPlusActive) queda intacta debajo,
// lista para el día que los planes se definan.
export function allAccessEnabled(): boolean {
  return process.env.ALUNA_ALL_ACCESS !== "0";
}
