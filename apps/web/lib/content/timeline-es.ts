// Contenido ES del "Camino de vida" — títulos formulaicos + blurbs por KIND
// (no por año) en voz Aluna, cálida y honesta, sin horóscopo barato. La MISMA
// fuente la consumen la UI de /perfil/lifetime y el chat (via timelineLabel):
// una sola fuente de fraseo, jamás dos versiones del mismo hito.
import type { TimelineKind } from "../timeline/types";

export interface TimelineContent {
  /** Título por kind. Los formulaicos reciben lo que interpolan ya resuelto. */
  titles: {
    birth: string;
    saturnReturn: (ordinal: string) => string;
    jupiterReturn: string;
    uranusOpposition: string;
    uranusReturn: string;
    personalYear1: string;
    pinnacleChange: (value: string | null) => string;
    luckPillarChange: (god: string | null) => string;
    annualClash: string;
    confluence: (signals: string | null) => string;
  };
  /** 1–2 frases por kind: qué significa VIVENCIALMENTE (voz glosario). */
  blurbs: Record<TimelineKind, string>;
  /** Ordinal humano: 1 → "1º" (ES) / "1st" (EN). */
  ordinal: (n: number) => string;
  /** Nombres de los diez dioses — MISMOS strings que la UI de pilares
   *  (messages/*.json pilares.god*), para que camino y lámina nunca discrepen. */
  gods: Record<string, string>;
  /** Señales de confluencia (meta.signals) en lenguaje humano. */
  signals: Record<string, string>;
}

export const TIMELINE_ES: TimelineContent = {
  titles: {
    birth: "Naciste",
    saturnReturn: (ordinal) => `Retorno de Saturno (${ordinal})`,
    jupiterReturn: "Retorno de Júpiter",
    uranusOpposition: "Oposición de Urano — mitad del camino",
    uranusReturn: "Retorno de Urano",
    personalYear1: "Inicio de un ciclo de 9",
    pinnacleChange: (value) =>
      value === null ? "Cambia tu pináculo" : `Cambia tu pináculo (al ${value})`,
    luckPillarChange: (god) =>
      god === null ? "Nuevo pilar de suerte (大運)" : `Nuevo pilar de suerte (大運) — ${god}`,
    annualClash: "Año de choque (冲) con tu día",
    confluence: (signals) =>
      signals === null ? "Año de confluencia" : `Año de confluencia — ${signals}`,
  },
  blurbs: {
    birth:
      "Aquí empieza todo lo que este camino despliega: el cielo, los números y los pilares de este día son la partitura que el resto de tu vida interpreta a su manera.",
    "saturn-return":
      "El maestro del tiempo vuelve al punto donde estaba cuando naciste: lo que construiste de verdad se queda; lo que era prestado, se cae. No es castigo — es fundación.",
    "jupiter-return":
      "Júpiter regresa a su lugar natal y el ciclo de crecimiento vuelve a empezar: una puerta que se abre hacia más mundo, si te atreves a cruzarla.",
    "uranus-opposition":
      "Urano se pone exactamente enfrente de donde nació contigo: la vida te pregunta qué partes de ti quedaron sin vivir. Lo que despierta aquí incomoda — y libera.",
    "uranus-return":
      "El planeta que despierta completa su vuelta entera, algo que solo se vive una vez: la vida invita a mirar el círculo completo y reconocer que el camino fue tuyo.",
    "personal-year-1":
      "Se cierra un ciclo de nueve años y arranca otro desde la semilla: lo que plantes ahora — hábitos, vínculos, proyectos — marca el tono de casi una década.",
    "pinnacle-change":
      "La escuela de tu numerología cambia de aula: el número que ahora manda trae otra lección y otra forma de crecer. No pierdes lo aprendido — lo llevas contigo.",
    "luck-pillar-change":
      "Cambia la estación larga de tu BaZi: durante unos diez años, el clima de fondo de tu vida sopla desde otro elemento. No cambias tú — cambia el terreno que pisas.",
    "annual-clash":
      "La rama del año choca de frente con la rama de tu día natal: algo pide moverse de lugar, de plan o de ritmo. Incomoda justo para destrabar.",
    confluence:
      "Varios de tus ciclos giran a la vez este año — no promete nada, pero cuando los relojes coinciden, los movimientos que haces suelen llegar más lejos.",
  },
  ordinal: (n) => `${n}º`,
  // Mismos nombres que messages/es.json → pilares.god* (UI de /pilares).
  gods: {
    peer: "Paralelo",
    rob: "Compañero rival",
    eating: "Genio",
    hurting: "Rebelde",
    wealth_indirect: "Riqueza indirecta",
    wealth_direct: "Riqueza directa",
    power_indirect: "Poder indirecto",
    power_direct: "Autoridad",
    resource_indirect: "Recurso indirecto",
    resource_direct: "Recurso directo",
  },
  signals: {
    "jupiter-return": "retorno de Júpiter",
    "personal-year-1": "año personal 1",
    "luck-pillar-change": "nuevo pilar de suerte",
  },
};
