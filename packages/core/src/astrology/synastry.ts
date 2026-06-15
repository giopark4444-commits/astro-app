// packages/core/src/astrology/synastry.ts
import { detectAspectsBetween, type AspectPoint } from "./aspects";
import type { Aspect } from "./types";

/**
 * ── Sinastría / Compatibilidad ──────────────────────────────────────────────
 *
 * Compara dos cartas (los planetas de A contra los de B) y devuelve un retrato
 * EVOLUTIVO del vínculo: no un "buen/mal match", sino dónde fluye la energía,
 * dónde se enciende, dónde hay que crecer. Determinista y explicable: cada
 * número sale de aspectos concretos (drivers) que se pueden mostrar al usuario.
 *
 * MODELO (mismo espíritu que scoreLifeAreas):
 *  1. Se calculan los inter-aspectos A→B con los aspectos MAYORES y orbes de
 *     sinastría (algo más amplios que los natales: en un vínculo cuentan más
 *     contactos). detectAspectsBetween devuelve { a:planetaA, b:planetaB, ... }.
 *  2. Cada aspecto aporta una "señal" = fuerza × valencia:
 *       - fuerza  = cercaníaDeOrbe(0..1) × pesoDePlaneta(promedio de los dos cuerpos)
 *       - valencia: armónico(soft)=+1, tenso(hard)=−1; conjunción según los
 *         cuerpos (benéficos suman, Saturno/maléficos restan, resto neutro-suave).
 *  3. Esa señal se reparte a uno o varios TEMAS según los cuerpos implicados:
 *       · atracción     → pares entre {Sol, Luna, Venus, Marte} (química, deseo, afecto)
 *       · comunicación  → contactos de Mercurio, y Mercurio↔Luna (mente + corazón)
 *       · armonía       → aspectos SUAVES entre luminarias/benéficos {Sol,Luna,Venus,Júpiter}
 *       · crecimiento   → aspectos TENSOS (cuadratura/oposición) y TODO contacto de
 *                         Saturno: la fricción que pide madurez y hace crecer.
 *  4. Cada tema parte de 50 (neutral) y se mueve con sus señales; se acota a 0..100.
 *     "atracción", "comunicación" y "armonía" suben con lo armónico y bajan con lo
 *     tenso. "crecimiento" es distinto: mide CUÁNTA fricción evolutiva hay, así que
 *     SUBE con la tensión (un 50 = vínculo plácido; alto = mucho que trabajar juntos).
 *  5. El score global (0..100, 50 = neutral) es el clima afectivo general: media
 *     ponderada de atracción/comunicación/armonía (lo que "fluye"), suavizada por la
 *     fricción (mucha tensión sin contrapeso lo baja un poco). NO es una nota de
 *     "compatibles o no": es el punto de partida del relato.
 *
 * Nada de esto es fortuna ni veredicto. Es un mapa del terreno compartido.
 */

export type SynastryTheme = "attraction" | "communication" | "harmony" | "growth";

export const SYNASTRY_THEMES: readonly SynastryTheme[] = [
  "attraction",
  "communication",
  "harmony",
  "growth",
];

export type SynastryTone = "low" | "mixed" | "high";

/** Un inter-aspecto que mueve un tema (para mostrar el "por qué" en glifos). */
export interface SynastryDriver {
  /** planeta de la persona A */
  a: string;
  /** planeta de la persona B */
  b: string;
  aspect: string;
  /** orbe en grados (más pequeño = más fuerte) */
  orb: number;
  harmony: Aspect["harmony"];
  /** ¿este contacto suma luz al vínculo? (en "crecimiento", suma fricción útil) */
  favorable: boolean;
}

export interface SynastryThemeScore {
  key: SynastryTheme;
  /** 0..100; 50 = neutral. */
  score: number;
  tone: SynastryTone;
  /** los contactos que más mueven el tema (máx 3, por magnitud). */
  drivers: SynastryDriver[];
}

export interface SynastryReport {
  /** 0..100, 50 = neutral. Clima afectivo general del vínculo. */
  overall: number;
  tone: SynastryTone;
  themes: SynastryThemeScore[];
  /** todos los inter-aspectos mayores hallados, ordenados por cercanía de orbe. */
  aspects: Aspect[];
}

// ── Parámetros del modelo ────────────────────────────────────────────────────

/** Orbes de sinastría: algo más amplios que los natales por defecto; solo mayores. */
const SYNASTRY_ORBS: Readonly<Record<string, number>> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 5,
};

/** Cuerpos que cuentan en sinastría (personales + sociales; los transpersonales
 *  lentos importan menos en el vínculo día a día y se omiten para no diluir). */
const SYNASTRY_BODIES = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
]);

/** Peso por cuerpo: las luminarias y los planetas del amor/comunicación pesan más
 *  que los sociales en un vínculo personal. */
const BODY_WEIGHT: Record<string, number> = {
  sun: 1.2,
  moon: 1.3,
  venus: 1.2,
  mars: 1.1,
  mercury: 1,
  jupiter: 0.9,
  saturn: 1,
};

const BENEFIC = new Set(["venus", "jupiter"]);
const MALEFIC = new Set(["mars", "saturn"]);

/** Cuerpos "afectivos" cuyos cruces encienden la ATRACCIÓN. */
const ATTRACTION_BODIES = new Set(["sun", "moon", "venus", "mars"]);
/** Luminarias + benéficos: su buen entendimiento es la ARMONÍA del vínculo. */
const HARMONY_BODIES = new Set(["sun", "moon", "venus", "jupiter"]);

const BASE = 50;
/** Cuánto puede mover una señal saturada un tema (±, antes de acotar). */
const IMPACT = 16;

/** Orbe máximo considerado por aspecto (para normalizar la cercanía a 0..1). */
function maxOrbFor(aspect: string): number {
  return SYNASTRY_ORBS[aspect] ?? 0;
}

/** Valencia (−1..+1): armónico = luz; tenso = reto; conjunción según los cuerpos. */
function valence(asp: Aspect): number {
  if (asp.harmony === "soft") return 1;
  if (asp.harmony === "hard") return -1;
  // conjunción (neutral): depende de quién se une.
  const benefic = BENEFIC.has(asp.a) || BENEFIC.has(asp.b);
  const malefic = MALEFIC.has(asp.a) || MALEFIC.has(asp.b);
  if (benefic && !malefic) return 1;
  if (malefic && !benefic) return -0.5;
  if (benefic && malefic) return 0.2; // p.ej. Venus☌Saturno: tibio
  return 0.4; // unión neutra (Sol☌Mercurio, etc.): suave acercamiento
}

/** ¿El aspecto es tenso (cuadratura/oposición)? (define la fricción de crecimiento). */
function isTense(asp: Aspect): boolean {
  return asp.aspect === "square" || asp.aspect === "opposition";
}

/** ¿Mercurio está implicado? (eje de la comunicación). */
function involves(asp: Aspect, body: string): boolean {
  return asp.a === body || asp.b === body;
}

/** ¿Ambos cuerpos del aspecto pertenecen al conjunto dado? */
function bothIn(asp: Aspect, set: Set<string>): boolean {
  return set.has(asp.a) && set.has(asp.b);
}

interface ThemeContrib {
  delta: number;
  asp: Aspect;
  favorable: boolean;
}

function toneOf(score: number): SynastryTone {
  if (score >= 60) return "high";
  if (score <= 40) return "low";
  return "mixed";
}

function topDrivers(contribs: ThemeContrib[]): SynastryDriver[] {
  return contribs
    .slice()
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 3)
    .map((c) => ({
      a: c.asp.a,
      b: c.asp.b,
      aspect: c.asp.aspect,
      orb: c.asp.orb,
      harmony: c.asp.harmony,
      favorable: c.favorable,
    }));
}

/**
 * Genera el reporte de sinastría a partir de las posiciones planetarias de dos
 * cartas. DETERMINISTA. `bodiesA` y `bodiesB` son listas con al menos
 * `{ body, longitude }` por punto (acepta BodyPosition de @aluna/ephemeris o
 * cualquier objeto compatible). No usa imports de `node:`; seguro en RN.
 */
export function synastryReport(
  bodiesA: ReadonlyArray<{ body: string; longitude: number }>,
  bodiesB: ReadonlyArray<{ body: string; longitude: number }>,
): SynastryReport {
  const toPoints = (
    list: ReadonlyArray<{ body: string; longitude: number }>,
  ): AspectPoint[] =>
    list
      .filter((b) => SYNASTRY_BODIES.has(b.body))
      .map((b) => ({ key: b.body, longitude: b.longitude, speed: 0 }));

  // a = planeta de A, b = planeta de B. Sin velocidad → applying siempre false
  // (en sinastría el tiempo está congelado; importa el ángulo, no la dirección).
  const aspects = detectAspectsBetween(toPoints(bodiesA), toPoints(bodiesB), {
    orbs: SYNASTRY_ORBS,
  }).sort((x, y) => x.orb - y.orb);

  const raw: Record<SynastryTheme, number> = {
    attraction: BASE,
    communication: BASE,
    harmony: BASE,
    growth: BASE,
  };
  const contribs: Record<SynastryTheme, ThemeContrib[]> = {
    attraction: [],
    communication: [],
    harmony: [],
    growth: [],
  };

  // Acumuladores del clima global: luz (flow) vs fricción (tension), ponderados.
  let flow = 0;
  let tension = 0;

  for (const asp of aspects) {
    const maxOrb = maxOrbFor(asp.aspect);
    if (maxOrb <= 0) continue;
    const orbWeight = Math.max(0, 1 - asp.orb / maxOrb);
    if (orbWeight <= 0) continue;
    const planetWeight =
      ((BODY_WEIGHT[asp.a] ?? 0.8) + (BODY_WEIGHT[asp.b] ?? 0.8)) / 2;
    const v = valence(asp);
    const strength = orbWeight * planetWeight; // 0..~1.3
    const signal = v * strength; // −..+ : luz si >0, reto si <0

    if (signal > 0) flow += signal;
    else tension += -signal;

    const delta = signal * IMPACT;

    // ── ATRACCIÓN: cruces entre cuerpos afectivos (Sol/Luna/Venus/Marte) ──
    if (bothIn(asp, ATTRACTION_BODIES)) {
      raw.attraction += delta;
      contribs.attraction.push({ delta, asp, favorable: delta > 0 });
    }

    // ── COMUNICACIÓN: cualquier contacto de Mercurio (mente compartida) ──
    if (involves(asp, "mercury")) {
      raw.communication += delta;
      contribs.communication.push({ delta, asp, favorable: delta > 0 });
    }

    // ── ARMONÍA: aspectos SUAVES entre luminarias/benéficos ──
    if (asp.harmony === "soft" && bothIn(asp, HARMONY_BODIES)) {
      raw.harmony += delta; // delta ya es positivo (soft → valence +1)
      contribs.harmony.push({ delta, asp, favorable: true });
    }

    // ── CRECIMIENTO: fricción evolutiva. Aspectos tensos + TODO contacto de
    //    Saturno. Aquí la tensión SUMA (más fricción = más que trabajar juntos),
    //    así que usamos la magnitud, no la valencia. ──
    const tenseContact = isTense(asp);
    const saturnContact = involves(asp, "saturn");
    if (tenseContact || saturnContact) {
      // peso: los tensos pesan pleno; un contacto suave de Saturno, parcial.
      const frictionMag = (tenseContact ? 1 : 0.5) * strength * IMPACT;
      raw.growth += frictionMag;
      // En "crecimiento" un driver "favorable=true" significa "fricción fértil",
      // siempre, porque el tema entero trata de eso.
      contribs.growth.push({ delta: frictionMag, asp, favorable: true });
    }
  }

  const themes: SynastryThemeScore[] = SYNASTRY_THEMES.map((key) => {
    const score = Math.round(Math.min(100, Math.max(0, raw[key])));
    return {
      key,
      score,
      tone: toneOf(score),
      drivers: topDrivers(contribs[key]),
    };
  });

  // ── Clima global ──
  // Centramos en 50 y movemos con el balance luz−fricción. La fricción resta menos
  // que lo que suma la luz (el reto no anula un vínculo, lo matiza): factor 0.6.
  const overallRaw = BASE + (flow - tension * 0.6) * (IMPACT / 2);
  const overall = Math.round(Math.min(100, Math.max(0, overallRaw)));

  return {
    overall,
    tone: toneOf(overall),
    themes,
    aspects,
  };
}
