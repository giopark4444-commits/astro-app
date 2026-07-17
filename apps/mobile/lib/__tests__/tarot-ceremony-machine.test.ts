import { describe, it, expect } from "vitest";
import { mulberry32 } from "@aluna/core";
import {
  INITIAL_CEREMONY_STATE,
  ceremonyReducer,
  ceremonyAllFlipped,
  type CeremonyState,
} from "../tarot-ceremony-machine";

// Semilla fija: la máquina es determinista con mulberry32, así los tests
// verifican el SELLADO real (drawCards corre dentro del reducer) sin mockear.
const rng = () => mulberry32(42);

/** Avanza la máquina por el camino feliz hasta el paso pedido. */
function upTo(step: "shuffle" | "cut" | "fan" | "reveal" | "reading"): CeremonyState {
  let s = ceremonyReducer(INITIAL_CEREMONY_STATE, { type: "ask", question: "¿qué sigue?" });
  if (step === "shuffle") return s;
  s = ceremonyReducer(s, { type: "holdStart" });
  s = ceremonyReducer(s, { type: "holdRelease", rng: rng() });
  if (step === "cut") return s;
  s = ceremonyReducer(s, { type: "cut" });
  if (step === "fan") return s;
  s = ceremonyReducer(s, { type: "pick", fanIndex: 7 });
  s = ceremonyReducer(s, { type: "pick", fanIndex: 21 });
  s = ceremonyReducer(s, { type: "pick", fanIndex: 60 });
  s = ceremonyReducer(s, { type: "fanDone" });
  if (step === "reveal") return s;
  s = ceremonyReducer(s, { type: "flip", slot: 0 });
  s = ceremonyReducer(s, { type: "flip", slot: 1 });
  s = ceremonyReducer(s, { type: "flip", slot: 2 });
  return ceremonyReducer(s, { type: "read" });
}

describe("tarot-ceremony-machine (paridad web + hold táctil)", () => {
  it("arranca en question, sin cartas ni pregunta", () => {
    expect(INITIAL_CEREMONY_STATE.step).toBe("question");
    expect(INITIAL_CEREMONY_STATE.drawn).toEqual([]);
    expect(INITIAL_CEREMONY_STATE.holding).toBe(false);
  });

  it("ask lleva a shuffle y guarda la pregunta solo si viene", () => {
    const conQ = ceremonyReducer(INITIAL_CEREMONY_STATE, { type: "ask", question: "¿y esto?" });
    expect(conQ.step).toBe("shuffle");
    expect(conQ.question).toBe("¿y esto?");
    const sinQ = ceremonyReducer(INITIAL_CEREMONY_STATE, { type: "ask" });
    expect(sinQ.step).toBe("shuffle");
    expect(sinQ.question).toBeUndefined();
  });

  it("ask fuera de question se ignora", () => {
    const s = upTo("cut");
    expect(ceremonyReducer(s, { type: "ask" })).toBe(s);
  });

  describe("el hold (deuda de la web: acá el abort SÍ se testea)", () => {
    it("holdStart solo aplica en shuffle", () => {
      const s = upTo("shuffle");
      expect(ceremonyReducer(s, { type: "holdStart" }).holding).toBe(true);
      expect(ceremonyReducer(INITIAL_CEREMONY_STATE, { type: "holdStart" })).toBe(
        INITIAL_CEREMONY_STATE,
      );
    });

    it("holdStart → holdAbort NO sella: sigue en shuffle sin cartas", () => {
      let s = upTo("shuffle");
      s = ceremonyReducer(s, { type: "holdStart" });
      s = ceremonyReducer(s, { type: "holdAbort" });
      expect(s.step).toBe("shuffle");
      expect(s.holding).toBe(false);
      expect(s.drawn).toEqual([]);
    });

    it("holdRelease sin holding se ignora (soltar sin haber sostenido, o tras un abort)", () => {
      const s = upTo("shuffle");
      expect(ceremonyReducer(s, { type: "holdRelease", rng: rng() })).toBe(s);
      let aborted = ceremonyReducer(s, { type: "holdStart" });
      aborted = ceremonyReducer(aborted, { type: "holdAbort" });
      expect(ceremonyReducer(aborted, { type: "holdRelease", rng: rng() })).toBe(aborted);
    });

    it("holdStart → holdRelease sella con la semilla: 3 cartas, mismo rng = mismo orden", () => {
      const sellar = () => {
        let s = upTo("shuffle");
        s = ceremonyReducer(s, { type: "holdStart" });
        return ceremonyReducer(s, { type: "holdRelease", rng: rng() });
      };
      const a = sellar();
      const b = sellar();
      expect(a.step).toBe("cut");
      expect(a.holding).toBe(false);
      expect(a.drawn).toHaveLength(3);
      expect(a.flipped).toEqual([false, false, false]);
      expect(a.drawn.map((d) => `${d.card.id}:${d.reversed}`)).toEqual(
        b.drawn.map((d) => `${d.card.id}:${d.reversed}`),
      );
    });

    it("shuffleForMe sella sin hold (accesibilidad / reduce-motion)", () => {
      const s = ceremonyReducer(upTo("shuffle"), { type: "shuffleForMe", rng: rng() });
      expect(s.step).toBe("cut");
      expect(s.drawn).toHaveLength(3);
    });

    it("sellar dos veces es imposible: shuffleForMe fuera de shuffle se ignora", () => {
      const s = upTo("cut");
      expect(ceremonyReducer(s, { type: "shuffleForMe", rng: rng() })).toBe(s);
    });
  });

  it("cut es ritual: solo reunifica (cut → fan) y no re-baraja", () => {
    const antes = upTo("cut");
    const despues = ceremonyReducer(antes, { type: "cut" });
    expect(despues.step).toBe("fan");
    expect(despues.drawn).toBe(antes.drawn); // mismo array: el destino ya estaba echado
    expect(ceremonyReducer(despues, { type: "cut" })).toBe(despues); // fuera de cut, ignorado
  });

  describe("el abanico", () => {
    it("pick acumula en orden de elección", () => {
      let s = upTo("fan");
      s = ceremonyReducer(s, { type: "pick", fanIndex: 30 });
      s = ceremonyReducer(s, { type: "pick", fanIndex: 2 });
      expect(s.picked).toEqual([30, 2]);
    });

    it("pick duplicado se ignora", () => {
      let s = upTo("fan");
      s = ceremonyReducer(s, { type: "pick", fanIndex: 5 });
      const otra = ceremonyReducer(s, { type: "pick", fanIndex: 5 });
      expect(otra).toBe(s);
      expect(otra.picked).toEqual([5]);
    });

    it("guard del 4º pick: con 3 elegidas no entra ninguna más", () => {
      let s = upTo("fan");
      s = ceremonyReducer(s, { type: "pick", fanIndex: 1 });
      s = ceremonyReducer(s, { type: "pick", fanIndex: 2 });
      s = ceremonyReducer(s, { type: "pick", fanIndex: 3 });
      expect(ceremonyReducer(s, { type: "pick", fanIndex: 4 })).toBe(s);
    });

    it("pick fuera de fan se ignora", () => {
      const s = upTo("cut");
      expect(ceremonyReducer(s, { type: "pick", fanIndex: 0 })).toBe(s);
    });

    it("fanDone solo transiciona en fan y con las 3 elegidas", () => {
      const incompleto = ceremonyReducer(upTo("fan"), { type: "fanDone" });
      expect(incompleto.step).toBe("fan"); // sin las 3, no avanza
      let s = upTo("fan");
      s = ceremonyReducer(s, { type: "pick", fanIndex: 1 });
      s = ceremonyReducer(s, { type: "pick", fanIndex: 2 });
      s = ceremonyReducer(s, { type: "pick", fanIndex: 3 });
      expect(ceremonyReducer(s, { type: "fanDone" }).step).toBe("reveal");
      const reveal = upTo("reveal");
      expect(ceremonyReducer(reveal, { type: "fanDone" })).toBe(reveal); // fuera de fan
    });
  });

  describe("revelar y leer", () => {
    it("flip voltea el slot pedido y solo en reveal", () => {
      let s = upTo("reveal");
      s = ceremonyReducer(s, { type: "flip", slot: 1 });
      expect(s.flipped).toEqual([false, true, false]);
      const enFan = upTo("fan");
      expect(ceremonyReducer(enFan, { type: "flip", slot: 0 })).toBe(enFan);
    });

    it("no-Leer hasta allFlipped: read se ignora con cartas boca abajo", () => {
      let s = upTo("reveal");
      expect(ceremonyReducer(s, { type: "read" })).toBe(s);
      s = ceremonyReducer(s, { type: "flip", slot: 0 });
      s = ceremonyReducer(s, { type: "flip", slot: 2 });
      expect(ceremonyReducer(s, { type: "read" })).toBe(s); // falta la del medio
      expect(ceremonyAllFlipped(s)).toBe(false);
      s = ceremonyReducer(s, { type: "flip", slot: 1 });
      expect(ceremonyAllFlipped(s)).toBe(true);
      expect(ceremonyReducer(s, { type: "read" }).step).toBe("reading");
    });

    it("ceremonyAllFlipped es false sin cartas (question/shuffle)", () => {
      expect(ceremonyAllFlipped(INITIAL_CEREMONY_STATE)).toBe(false);
    });
  });

  it("save actualiza el estado de guardado en reading", () => {
    let s = upTo("reading");
    expect(s.save).toBe("idle");
    s = ceremonyReducer(s, { type: "save", status: "saving" });
    expect(s.save).toBe("saving");
    s = ceremonyReducer(s, { type: "save", status: "free_limit" });
    expect(s.save).toBe("free_limit");
  });

  it("reset devuelve al estado inicial desde cualquier paso", () => {
    expect(ceremonyReducer(upTo("reading"), { type: "reset" })).toEqual(INITIAL_CEREMONY_STATE);
    expect(ceremonyReducer(upTo("fan"), { type: "reset" })).toEqual(INITIAL_CEREMONY_STATE);
  });
});
