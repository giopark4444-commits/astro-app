// La máquina de la ceremonia de tres cartas — PURA, sin React Native, para
// poder testearla en el entorno node de vitest (patrón de todo lib/).
// Paridad con el reducer de apps/web/app/(app)/tarot/ceremony.tsx:57-85
// (question → shuffle → cut → fan → reveal → reading), adaptada a touch:
// el barajado web era pointerDown/pointerUp con `holding` en un useState
// aparte; acá el hold vive DENTRO de la máquina (holdStart/holdAbort/
// holdRelease) para que el abort del gesto — la deuda que la web dejó sin
// testear — sea un guard testeable: abortar jamás sella, soltar sella una
// sola vez y con la semilla del instante del gesto.
//
// El sellado corre dentro del reducer (drawCards de @aluna/core es puro): el
// componente solo fabrica el Rng (gestureRng con el timestamp del gesto) y lo
// entrega en la acción. Mismo principio que la web: el instante de SOLTAR
// siembra el orden y todo lo que sigue (corte, abanico) es coreografía sobre
// un destino ya echado.
import { drawCards, spreadById, type DrawnCard, type Rng } from "@aluna/core";

export const DECK_SIZE = 78;
export const SPREAD_ID = "three" as const;

/** La tirada de tres, resuelta una vez: past/present/future. */
export const CEREMONY_SPREAD = spreadById(SPREAD_ID)!;

export type CeremonyStep = "question" | "shuffle" | "cut" | "fan" | "reveal" | "reading";
export type SaveState = "idle" | "saving" | "saved" | "free_limit" | "error";

export interface CeremonyState {
  step: CeremonyStep;
  question?: string;
  /** true mientras el dedo sostiene el mazo (solo significativo en shuffle). */
  holding: boolean;
  /** Orden sellado por el gesto del barajado (drawCards con gestureRng). */
  drawn: DrawnCard[];
  /** Índices del abanico ya elegidos, en orden de elección: la 1ª que tocas
   *  se convierte en drawn[0] (pasado), la 2ª en drawn[1], etc. */
  picked: number[];
  flipped: boolean[];
  save: SaveState;
}

export type CeremonyAction =
  | { type: "ask"; question?: string }
  | { type: "holdStart" }
  | { type: "holdAbort" }
  | { type: "holdRelease"; rng: Rng }
  | { type: "shuffleForMe"; rng: Rng }
  | { type: "cut" }
  | { type: "pick"; fanIndex: number }
  | { type: "fanDone" }
  | { type: "flip"; slot: number }
  | { type: "read" }
  | { type: "save"; status: SaveState }
  | { type: "reset" };

export const INITIAL_CEREMONY_STATE: CeremonyState = {
  step: "question",
  holding: false,
  drawn: [],
  picked: [],
  flipped: [],
  save: "idle",
};

/** ¿Están las tres cartas boca arriba? (false sin cartas: aún no hay tirada). */
export function ceremonyAllFlipped(state: CeremonyState): boolean {
  return state.flipped.length > 0 && state.flipped.every(Boolean);
}

/** Sella el orden: de shuffle a cut con las cartas echadas. */
function seal(state: CeremonyState, rng: Rng): CeremonyState {
  const drawn = drawCards(CEREMONY_SPREAD.cardCount, rng);
  return { ...state, step: "cut", holding: false, drawn, flipped: drawn.map(() => false) };
}

export function ceremonyReducer(state: CeremonyState, action: CeremonyAction): CeremonyState {
  switch (action.type) {
    case "ask":
      if (state.step !== "question") return state;
      return {
        ...state,
        step: "shuffle",
        ...(action.question !== undefined ? { question: action.question } : {}),
      };
    case "holdStart":
      if (state.step !== "shuffle") return state;
      return { ...state, holding: true };
    case "holdAbort":
      // El dedo se fue (cancel/leave): NO sella — el rito espera otro intento.
      return state.holding ? { ...state, holding: false } : state;
    case "holdRelease":
      // Soltar solo sella si venía sosteniendo (guard que la web dejó sin
      // testear): un pressOut fantasma tras un cancel no echa cartas.
      if (state.step !== "shuffle" || !state.holding) return state;
      return seal(state, action.rng);
    case "shuffleForMe":
      // "Barajar por mí": sella sin gesto (accesibilidad / reduce-motion).
      if (state.step !== "shuffle") return state;
      return seal(state, action.rng);
    case "cut":
      // RITUAL, no re-aleatorización: tocar un montón solo reunifica el mazo.
      // La semilla del gesto ya selló el orden en holdRelease/shuffleForMe;
      // re-barajar aquí traicionaría el gesto del usuario.
      if (state.step !== "cut") return state;
      return { ...state, step: "fan" };
    case "pick": {
      if (state.step !== "fan") return state;
      if (state.picked.includes(action.fanIndex) || state.picked.length >= state.drawn.length)
        return state;
      return { ...state, picked: [...state.picked, action.fanIndex] };
    }
    case "fanDone":
      // Solo cuando el abanico terminó de verdad: en fan y con las 3 elegidas
      // (la web solo guardaba el paso; el guard extra evita un salto a reveal
      // si el timer del vuelo dispara tarde tras un reset).
      if (state.step !== "fan" || state.picked.length < state.drawn.length || state.drawn.length === 0)
        return state;
      return { ...state, step: "reveal" };
    case "flip":
      if (state.step !== "reveal") return state;
      return { ...state, flipped: state.flipped.map((f, i) => (i === action.slot ? true : f)) };
    case "read":
      // No-Leer hasta allFlipped: en la web era solo UI (el botón no existía);
      // acá el guard vive en la máquina y se testea.
      if (state.step !== "reveal" || !ceremonyAllFlipped(state)) return state;
      return { ...state, step: "reading" };
    case "save":
      return { ...state, save: action.status };
    case "reset":
      return INITIAL_CEREMONY_STATE;
    default:
      return state;
  }
}
