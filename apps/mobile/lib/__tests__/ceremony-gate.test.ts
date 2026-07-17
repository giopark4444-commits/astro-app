import { describe, it, expect, beforeEach } from "vitest";
import { hasCeremonyPlayed, markCeremonyPlayed, resetCeremonyGate } from "../ceremony-gate";

describe("ceremony-gate (R5, gate de una vez por sesión de app)", () => {
  beforeEach(() => {
    resetCeremonyGate();
  });

  it("arranca sin jugarse", () => {
    expect(hasCeremonyPlayed()).toBe(false);
  });

  it("markCeremonyPlayed lo marca como jugado", () => {
    markCeremonyPlayed();
    expect(hasCeremonyPlayed()).toBe(true);
  });

  it("es idempotente: marcar dos veces no cambia el resultado", () => {
    markCeremonyPlayed();
    markCeremonyPlayed();
    expect(hasCeremonyPlayed()).toBe(true);
  });

  it("persiste entre 'pantallas' (no hay reset implícito) — solo resetCeremonyGate lo baja", () => {
    markCeremonyPlayed();
    expect(hasCeremonyPlayed()).toBe(true);
    expect(hasCeremonyPlayed()).toBe(true); // segunda lectura, simula re-entrar a la pantalla
    resetCeremonyGate();
    expect(hasCeremonyPlayed()).toBe(false);
  });
});
