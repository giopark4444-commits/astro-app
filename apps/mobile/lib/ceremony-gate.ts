// apps/mobile/lib/ceremony-gate.ts
// Gate de "una vez por SESIÓN de app" para la ceremonia de dibujo de la rueda
// (R5, Task 3 del brief ceremonia-rueda). Antes vivía en un `useRef` dentro de
// `astros/carta.tsx` — eso la limitaba a "una vez por MONTAJE de pantalla", así
// que se repetía cada vez que se re-entraba a la pestaña Carta. Ahora vive a
// nivel de MÓDULO: sobrevive a desmontajes/remontajes de la pantalla y solo se
// resetea al reiniciar el proceso JS (nueva sesión de la app). Lógica pura, sin
// react-native — vive en `lib/` para poder testearse bajo vitest (ver
// vitest.config.ts: solo cubre `lib/**/__tests__`).
let played = false;

/** true si la ceremonia YA se jugó en esta sesión de app. */
export function hasCeremonyPlayed(): boolean {
  return played;
}

/** Marca la ceremonia como jugada. Idempotente — se llama tras el primer chart listo. */
export function markCeremonyPlayed(): void {
  played = true;
}

/** SOLO para tests: vuelve el gate a su estado inicial (no usar en código de app). */
export function resetCeremonyGate(): void {
  played = false;
}
