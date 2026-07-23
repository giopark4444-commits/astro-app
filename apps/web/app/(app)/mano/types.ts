// Tipos compartidos de la lectura de mano (vista + storage). Los IDs de rol
// ("dominante"/"pasiva") coinciden EXACTO con el contrato del servidor
// (app/api/palm-analysis, lib/palm/schema.ts) — no son un vocabulario propio
// de la UI.
export type HandRole = "dominante" | "pasiva";
export type Side = "derecha" | "izquierda";

export const otherSide = (side: Side): Side => (side === "derecha" ? "izquierda" : "derecha");
