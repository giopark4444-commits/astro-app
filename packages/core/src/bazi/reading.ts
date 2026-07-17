// packages/core/src/bazi/reading.ts
// Lectura narrativa de los Cuatro Pilares (Ba Zi / Saju) — COMPOSICIÓN determinista,
// voz de Aluna, fuente ÚNICA para web y móvil (antes cada plataforma solo pintaba
// símbolos, sin prosa). Excepción deliberada: igual que el glosario en
// @aluna/core/glossary, este archivo SÍ lleva texto ES/EN (no solo datos) porque la
// lectura tiene que ser IDÉNTICA en ambas pieles — moverla a la capa i18n de cada app
// habría duplicado la prosa dos veces.
//
// `DAY_MASTER_VOICE` vivía en apps/mobile/content/bazi.ts (1 línea poética curada por
// tronco celeste, mockup 11 §B.4); se mueve aquí para que la web también pueda usarla
// en `essence` sin duplicar el catálogo.
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, type WuXingElement } from "./bazi";
import type { PillarSet } from "./interactions";
import { dayMasterStrength, favorableElements, type StrengthVerdict } from "./strength";

export type BaziReadingLocale = "es" | "en";

export interface BaziReading {
  essence: string;
  strength: string;
  favorable: string;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Voz poética del Maestro del Día (日主) — 1 línea curada por tronco celeste (10
 *  combinaciones, no cruzada con rama). Clave = StemDef.key de @aluna/core. */
export const DAY_MASTER_VOICE: Record<string, { es: string; en: string }> = {
  jia:  { es: "Roble al amanecer: creces derecho aunque el viento diga otra cosa.",        en: "Oak at dawn: you grow straight even when the wind says otherwise." },
  yi:   { es: "Enredadera viva: no rompes el muro — lo conviertes en camino.",             en: "Living vine: you don't break the wall — you turn it into a path." },
  bing: { es: "Sol de mediodía: calor que da vida sin pedir permiso.",                     en: "Midday sun: warmth that gives life without asking permission." },
  ding: { es: "Llama de vela: luz íntima que enseña más que mil focos.",                   en: "Candle flame: an intimate light that teaches more than a thousand lamps." },
  wu:   { es: "Montaña quieta: los demás descansan porque tú no te mueves.",               en: "Still mountain: others rest because you do not move." },
  ji:   { es: "Tierra de huerto: todo lo que te confían, florece.",                        en: "Garden soil: everything entrusted to you, blooms." },
  geng: { es: "Acero templado: cortas lo que sobra para que quede lo verdadero.",          en: "Tempered steel: you cut away the excess so the true remains." },
  xin:  { es: "Joya pulida: tu brillo viene de la presión que supiste sostener.",          en: "Polished gem: your shine comes from the pressure you learned to hold." },
  ren:  { es: "Río ancho: llegas lejos porque no peleas con el cauce.",                    en: "Wide river: you go far because you don't fight the current." },
  gui:  { es: "Rocío del alba: tocas suave y aun así lo transformas todo.",                en: "Dawn dew: you touch softly and still transform everything." },
};

const ELEMENT_NAME: Record<WuXingElement, { es: string; en: string }> = {
  wood: { es: "Madera", en: "Wood" },
  fire: { es: "Fuego", en: "Fire" },
  earth: { es: "Tierra", en: "Earth" },
  metal: { es: "Metal", en: "Metal" },
  water: { es: "Agua", en: "Water" },
};

const POLARITY_NAME: Record<"yin" | "yang", { es: string; en: string }> = {
  yin: { es: "yin", en: "Yin" },
  yang: { es: "yang", en: "Yang" },
};

const ANIMAL_NAME: Record<string, { es: string; en: string }> = {
  rat: { es: "la Rata", en: "the Rat" },
  ox: { es: "el Buey", en: "the Ox" },
  tiger: { es: "el Tigre", en: "the Tiger" },
  rabbit: { es: "el Conejo", en: "the Rabbit" },
  dragon: { es: "el Dragón", en: "the Dragon" },
  snake: { es: "la Serpiente", en: "the Snake" },
  horse: { es: "el Caballo", en: "the Horse" },
  goat: { es: "la Cabra", en: "the Goat" },
  monkey: { es: "el Mono", en: "the Monkey" },
  rooster: { es: "el Gallo", en: "the Rooster" },
  dog: { es: "el Perro", en: "the Dog" },
  pig: { es: "el Cerdo", en: "the Pig" },
};

/** Qué significa vivir con esa fuerza — no el veredicto en sí, sino su consecuencia práctica. */
const STRENGTH_TEXT: Record<StrengthVerdict, { es: string; en: string }> = {
  strong: {
    es: "Tu Maestro del Día llega fuerte a esta vida: tienes energía de sobra para iniciar, sostener a otros y gastarte sin temor a vaciarte. Te favorece soltar — dar, producir, drenar esa fuerza — más que seguir acumulando.",
    en: "Your Day Master arrives strong in this life: you have energy to spare to start things, hold others up, and spend yourself without fear of running out. Letting go — giving, producing, draining that strength — serves you more than gathering still more of it.",
  },
  weak: {
    es: "Tu Maestro del Día llega delicado a esta vida: no es debilidad, es la forma en que recargas. Te nutre recibir apoyo, descansar antes de que te lo pidan y dejar que otros carguen un tramo contigo.",
    en: "Your Day Master arrives delicate in this life: this isn't weakness, it's how you recharge. You're nourished by receiving support, resting before you're asked to, and letting others carry a stretch of the road with you.",
  },
  balanced: {
    es: "Tu Maestro del Día está en equilibrio: ni te sobra ni te falta fuerza. El arte no está en corregir un desbalance sino en escuchar el matiz de cada temporada que atraviesas.",
    en: "Your Day Master is in balance: you have neither too much nor too little strength. The art isn't correcting an imbalance but listening to the nuance of whatever season you're moving through.",
  },
};

/** Hint concreto de vida diaria por elemento — usado para `favorable`. */
const ELEMENT_HINT: Record<WuXingElement, { es: string; en: string }> = {
  wood: { es: "empezar cosas y dejar crecer proyectos nuevos", en: "starting things and letting new projects grow" },
  fire: { es: "socializar y mostrarte sin esconder tu brillo", en: "socializing and showing yourself without hiding your shine" },
  earth: { es: "rutinas estables y contacto con lo concreto", en: "steady routines and staying grounded in the concrete" },
  metal: { es: "poner límites claros y soltar lo que ya no sirve", en: "setting clear limits and letting go of what no longer serves" },
  water: { es: "el descanso y la escucha", en: "rest and listening" },
};

/** Elemento dominante del gráfico: cuenta troncos+ramas de los pilares presentes;
 *  empate se resuelve por el orden canónico wood→fire→earth→metal→water. */
function dominantElement(pillars: PillarSet): WuXingElement {
  const counts: Record<WuXingElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const entries = [pillars.year, pillars.month, pillars.day, ...(pillars.hour ? [pillars.hour] : [])];
  for (const p of entries) {
    counts[HEAVENLY_STEMS[mod(p.stem, 10)]!.element]++;
    counts[EARTHLY_BRANCHES[mod(p.branch, 12)]!.element]++;
  }
  const order: WuXingElement[] = ["wood", "fire", "earth", "metal", "water"];
  return order.reduce((best, el) => (counts[el] > counts[best] ? el : best), order[0]!);
}

function joinList(items: string[], locale: BaziReadingLocale): string {
  if (items.length <= 1) return items.join("");
  const last = items[items.length - 1];
  const head = items.slice(0, -1).join(", ");
  return `${head} ${locale === "en" ? "and" : "y"} ${last}`;
}

/** Compone la lectura de los Cuatro Pilares: esencia (Maestro del Día + rama de día +
 *  elemento dominante), fuerza (qué significa vivir así) y elementos favorables (con
 *  un gesto concreto de vida diaria por elemento). Determinista — misma entrada, mismo
 *  texto; ambos idiomas escritos de forma natural, no traducidos palabra por palabra. */
export function composeBaziReading(pillars: PillarSet, locale: BaziReadingLocale): BaziReading {
  const dm = HEAVENLY_STEMS[mod(pillars.day.stem, 10)]!;
  const dayBranch = EARTHLY_BRANCHES[mod(pillars.day.branch, 12)]!;
  const voice = DAY_MASTER_VOICE[dm.key]?.[locale] ?? "";
  const dmElementName = ELEMENT_NAME[dm.element][locale];
  const polarityName = POLARITY_NAME[dm.yin ? "yin" : "yang"][locale];
  const animalName = ANIMAL_NAME[dayBranch.animal]?.[locale] ?? dayBranch.animal;
  const dominant = dominantElement(pillars);
  const dominantName = ELEMENT_NAME[dominant][locale];

  const essence =
    locale === "en"
      ? `${voice} You carry a ${dmElementName} ${polarityName} stem, with ${animalName} beating beneath your day — that pairing is your signature. Across your whole chart, ${dominantName} is the note that repeats the most, the element that colors most of how you move through the world.`
      : `${voice} Cargas un tronco de ${dmElementName} ${polarityName}, con ${animalName} latiendo bajo tu día — esa mezcla es tu firma. En el conjunto de tu carta domina el elemento ${dominantName}, la nota que más se repite en tu manera de estar en el mundo.`;

  const strengthResult = dayMasterStrength(pillars);
  const strength = STRENGTH_TEXT[strengthResult.verdict][locale];

  const { favor } = favorableElements(strengthResult.verdict, pillars.day.stem);
  let favorable: string;
  if (favor.length === 0) {
    favorable =
      locale === "en"
        ? "In balance, no single element is especially favorable or to avoid — follow what each season asks of you instead."
        : "En equilibrio, ningún elemento es especialmente favorable ni a evitar — sigue lo que cada temporada te pida.";
  } else {
    const names = joinList(favor.map((e) => ELEMENT_NAME[e][locale]), locale);
    const hints = joinList(favor.map((e) => ELEMENT_HINT[e][locale]), locale);
    favorable =
      locale === "en"
        ? `Your favorable elements are ${names} — make room in your daily life for ${hints}.`
        : `Tus elementos favorables son ${names} — hazle espacio en tu día a día a ${hints}.`;
  }

  return { essence, strength, favorable };
}
