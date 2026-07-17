// Horóscopo occidental (ES+EN): ADN de cada signo en voz Aluna (evolutiva-yóguica,
// don y sombra, sin fatalismo) + etiquetas de casas solares + composición.
// Espejo del corpus web (apps/web/lib/content/horoscope-es.ts + horoscope-en.ts),
// combinados aquí en UN solo archivo (mismo patrón que content/bazi.ts).
// La prosa del periodo SE COMPONE desde el payload calculado: nunca puede
// contradecir la lámina Pro (regla anti-funa).
import { ZODIAC_SIGNS } from "@aluna/core";
import { astroLabels } from "./astrology";
import type { WesternHoroscopePayload } from "../lib/horoscope-api";
import type { EasternPayload } from "../lib/eastern-api";

export interface SignEssence { essence: string; flow: string; shadow: string; }

export const HOROSCOPE_SIGNS_ES: Record<string, SignEssence> = {
  aries: {
    essence: "Tu alma vino a encender el primer fuego: iniciar, atreverse, abrir camino donde nadie ha pisado.",
    flow: "Cuando tu energía fluye, tu coraje contagia y tu impulso pone el mundo en movimiento.",
    shadow: "En sombra, la prisa arrasa lo que aún no madura; tu práctica es el aliento antes del salto.",
  },
  taurus: {
    essence: "Tu alma vino a habitar el cuerpo y la tierra: sostener, cultivar y saborear lo que permanece.",
    flow: "Cuando fluyes, tu calma es raíz para otros y tu constancia convierte semillas en jardines.",
    shadow: "En sombra, el apego confunde seguridad con quietud; aparigraha, soltar, es tu llave.",
  },
  gemini: {
    essence: "Tu alma vino a tejer puentes con la palabra: preguntar, aprender y unir mundos que no se hablaban.",
    flow: "Cuando fluyes, tu curiosidad es viento fresco y tu voz traduce lo complejo en cercano.",
    shadow: "En sombra, la mente se dispersa en mil chispas; tu práctica es elegir una llama y cuidarla.",
  },
  cancer: {
    essence: "Tu alma vino a custodiar el hogar interior: sentir hondo, nutrir y hacer del cuidado un templo.",
    flow: "Cuando fluyes, tu ternura sana raíces y tu intuición lee lo que nadie dice.",
    shadow: "En sombra, el caparazón se cierra al amor que teme perder; santosha, el contento, te devuelve al presente.",
  },
  leo: {
    essence: "Tu alma vino a brillar con corazón: crear, jugar y recordarle a otros su propia luz.",
    flow: "Cuando fluyes, tu presencia es sol que calienta sin pedir nada a cambio.",
    shadow: "En sombra, el brillo mendiga aplauso; tu práctica es brillar igual cuando nadie mira.",
  },
  virgo: {
    essence: "Tu alma vino a pulir lo sagrado en lo pequeño: servir, ordenar y sanar con manos precisas.",
    flow: "Cuando fluyes, tu discernimiento es medicina y tu humildad hace útil la perfección.",
    shadow: "En sombra, la crítica se vuelve jaula; svadhyaya te recuerda que también tú mereces tu compasión.",
  },
  libra: {
    essence: "Tu alma vino a afinar la balanza: crear belleza, armonía y encuentros donde ambos respiran.",
    flow: "Cuando fluyes, tu diplomacia teje paz real y tu estética eleva lo cotidiano.",
    shadow: "En sombra, complaces para no incomodar; tu práctica es decir tu verdad con la misma gracia.",
  },
  scorpio: {
    essence: "Tu alma vino a mirar donde otros apartan la vista: transformar, morir y renacer más verdadera.",
    flow: "Cuando fluyes, tu intensidad es alquimia: conviertes herida en poder sereno.",
    shadow: "En sombra, el control sustituye a la confianza; soltar el timón es tu iniciación.",
  },
  sagittarius: {
    essence: "Tu alma vino a disparar la flecha del sentido: explorar, creer y ensanchar el horizonte.",
    flow: "Cuando fluyes, tu fe abre caminos y tu risa enseña más que mil doctrinas.",
    shadow: "En sombra, la promesa vuela sin aterrizar; tu práctica es honrar lo que siembras.",
  },
  capricorn: {
    essence: "Tu alma vino a escalar con propósito: construir despacio lo que sostiene a muchos.",
    flow: "Cuando fluyes, tu disciplina es amor en acción y tu palabra vale una montaña.",
    shadow: "En sombra, la exigencia congela el corazón; recuerda que la cima también se comparte.",
  },
  aquarius: {
    essence: "Tu alma vino a abrir ventanas al futuro: liberar, innovar y pertenecer sin dejar de ser tú.",
    flow: "Cuando fluyes, tu visión oxigena al grupo y tu rareza es exactamente tu regalo.",
    shadow: "En sombra, el desapego se vuelve distancia; tu práctica es dejar que te toquen el corazón.",
  },
  pisces: {
    essence: "Tu alma vino a disolver las orillas: soñar, compadecer y recordar que todo está unido.",
    flow: "Cuando fluyes, tu sensibilidad es océano que inspira y consuela sin palabras.",
    shadow: "En sombra, la niebla evade lo concreto; anclar el sueño en un paso real es tu yoga.",
  },
};

export const SOLAR_HOUSE_LABELS_ES: Record<number, string> = {
  1: "tu casa 1 solar, tu cuerpo y tu presencia",
  2: "tu casa 2 solar, tu recurso y tu valor propio",
  3: "tu casa 3 solar, tu mente y tus palabras",
  4: "tu casa 4 solar, tu raíz y tu hogar",
  5: "tu casa 5 solar, tu creación y tu gozo",
  6: "tu casa 6 solar, tu oficio y tus hábitos",
  7: "tu casa 7 solar, tus vínculos de a dos",
  8: "tu casa 8 solar, lo profundo y lo compartido",
  9: "tu casa 9 solar, tu horizonte y tu fe",
  10: "tu casa 10 solar, tu vocación y tu montaña",
  11: "tu casa 11 solar, tu tribu y tu buen espíritu",
  12: "tu casa 12 solar, tu descanso y tu mundo interior",
};

const LUNATION_ES = { new: "Luna Nueva", full: "Luna Llena" } as const;

/** Párrafos deterministas SOLO desde el payload. Orden: ADN → drivers → evento → cierre. */
export function composeWesternProse(locale: "es" | "en", payload: WesternHoroscopePayload): string[] {
  return composeWith(locale, payload, locale === "en" ? DICTS_EN : DICTS_ES);
}

export interface ComposeDicts {
  signs: Record<string, SignEssence>;
  houseLabels: Record<number, string>;
  lunation: Record<"new" | "full", string>;
  t: {
    favorable: (body: string, house: string) => string;
    tense: (body: string, house: string) => string;
    lunationIn: (name: string, house: string) => string;
    eclipse: string;
    stationRetro: (body: string) => string;
  };
}

const DICTS_ES: ComposeDicts = {
  signs: HOROSCOPE_SIGNS_ES,
  houseLabels: SOLAR_HOUSE_LABELS_ES,
  lunation: LUNATION_ES,
  t: {
    favorable: (body, house) => `${body} camina por ${house}: hay viento a favor ahí, úsalo con presencia.`,
    tense: (body, house) => `${body} pide trabajo en ${house}: no es castigo, es músculo del alma haciéndose.`,
    lunationIn: (name, house) => `La ${name} de este ciclo cae en ${house}; es buen momento para escucharla.`,
    eclipse: "Además trae energía de eclipse: los cambios que abre son más hondos de lo que parecen.",
    stationRetro: (body) => `${body} estaciona retrógrado: el cielo invita a revisar antes que a empujar.`,
  },
};

export function composeWith(locale: "es" | "en", payload: WesternHoroscopePayload, dicts: ComposeDicts): string[] {
  const L = astroLabels(locale);
  const parts: string[] = [];
  const sign = dicts.signs[payload.sign];
  if (sign) parts.push(sign.essence);

  const drivers = payload.areas
    .flatMap((a) => a.drivers)
    .filter((d, i, arr) => arr.findIndex((x) => x.body === d.body && x.house === d.house) === i);
  const fav = drivers.find((d) => d.favorable);
  const tense = drivers.find((d) => !d.favorable);
  const driverLines: string[] = [];
  if (fav) driverLines.push(dicts.t.favorable(L.bodies[fav.body] ?? fav.body, dicts.houseLabels[fav.house]!));
  if (tense) driverLines.push(dicts.t.tense(L.bodies[tense.body] ?? tense.body, dicts.houseLabels[tense.house]!));
  if (driverLines.length) parts.push(driverLines.join(" "));

  const lun = payload.events.find((e) => e.kind === "lunation");
  if (lun && lun.kind === "lunation") {
    const evHouse = solarHouseOfEvent(payload, lun.longitude);
    let line = dicts.t.lunationIn(dicts.lunation[lun.phase], dicts.houseLabels[evHouse]!);
    if (lun.eclipse) line += ` ${dicts.t.eclipse}`;
    parts.push(line);
  } else {
    const st = payload.events.find((e) => e.kind === "station" && e.direction === "retrograde");
    if (st && st.kind === "station") parts.push(dicts.t.stationRetro(L.bodies[st.body] ?? st.body));
  }

  const tones = payload.areas.map((a) => a.tone);
  const closing = tones.filter((t) => t === "high").length >= tones.filter((t) => t === "low").length
    ? sign?.flow : sign?.shadow;
  if (closing) parts.push(closing);
  return parts;
}

/** Casa solar de una longitud del payload (mismo whole-sign, sin recomputar motor). */
function solarHouseOfEvent(payload: WesternHoroscopePayload, longitude: number): number {
  const base = ZODIAC_SIGNS.findIndex((s) => s.key === payload.sign);
  const idx = Math.floor(((longitude % 360) + 360) % 360 / 30);
  return ((idx - base + 12) % 12) + 1;
}

// ---------------------------------------------------------------------------
// EN: datos espejo del bloque ES de arriba (equivalente a horoscope-en.ts).
// El motor de composición es el mismo (composeWith); este bloque solo aporta
// los diccionarios en inglés.
// ---------------------------------------------------------------------------

export const HOROSCOPE_SIGNS_EN: Record<string, SignEssence> = {
  aries: {
    essence: "Your soul came to strike the first fire: to begin, to dare, to open paths where no one has walked.",
    flow: "When your energy flows, your courage is contagious and your drive sets the world in motion.",
    shadow: "In shadow, haste tramples what is still ripening; your practice is one breath before the leap.",
  },
  taurus: {
    essence: "Your soul came to inhabit the body and the earth: to sustain, to cultivate, to savor what endures.",
    flow: "When you flow, your calm becomes a root for others and your constancy turns seeds into gardens.",
    shadow: "In shadow, attachment mistakes stillness for safety; aparigraha, letting go, is your key.",
  },
  gemini: {
    essence: "Your soul came to weave bridges with words: to ask, to learn, to join worlds that never spoke.",
    flow: "When you flow, your curiosity is fresh wind and your voice turns the complex into the familiar.",
    shadow: "In shadow, the mind scatters into a thousand sparks; your practice is choosing one flame and tending it.",
  },
  cancer: {
    essence: "Your soul came to keep the inner home: to feel deeply, to nourish, to make care a temple.",
    flow: "When you flow, your tenderness heals roots and your intuition reads what is never said.",
    shadow: "In shadow, the shell closes around the love it fears to lose; santosha, contentment, returns you to the present.",
  },
  leo: {
    essence: "Your soul came to shine from the heart: to create, to play, to remind others of their own light.",
    flow: "When you flow, your presence is a sun that warms without asking anything back.",
    shadow: "In shadow, the shine begs for applause; your practice is to glow the same when no one is watching.",
  },
  virgo: {
    essence: "Your soul came to polish the sacred in the small: to serve, to order, to heal with precise hands.",
    flow: "When you flow, your discernment is medicine and your humility makes perfection useful.",
    shadow: "In shadow, critique becomes a cage; svadhyaya reminds you that you too deserve your compassion.",
  },
  libra: {
    essence: "Your soul came to tune the scales: to create beauty, harmony, and meetings where both can breathe.",
    flow: "When you flow, your diplomacy weaves real peace and your sense of beauty lifts the everyday.",
    shadow: "In shadow, you please to avoid discomfort; your practice is speaking your truth with the same grace.",
  },
  scorpio: {
    essence: "Your soul came to look where others turn away: to transform, to die and be reborn more true.",
    flow: "When you flow, your intensity is alchemy: you turn wounds into quiet power.",
    shadow: "In shadow, control replaces trust; releasing the helm is your initiation.",
  },
  sagittarius: {
    essence: "Your soul came to shoot the arrow of meaning: to explore, to believe, to widen the horizon.",
    flow: "When you flow, your faith opens roads and your laughter teaches more than a thousand doctrines.",
    shadow: "In shadow, the promise flies but never lands; your practice is honoring what you sow.",
  },
  capricorn: {
    essence: "Your soul came to climb with purpose: to build slowly what will hold many.",
    flow: "When you flow, your discipline is love in action and your word is worth a mountain.",
    shadow: "In shadow, demand freezes the heart; remember the summit is also for sharing.",
  },
  aquarius: {
    essence: "Your soul came to open windows to the future: to free, to innovate, to belong without ceasing to be you.",
    flow: "When you flow, your vision brings oxygen to the group and your strangeness is exactly your gift.",
    shadow: "In shadow, detachment turns to distance; your practice is letting your heart be touched.",
  },
  pisces: {
    essence: "Your soul came to dissolve the shores: to dream, to feel with others, to remember that all is one.",
    flow: "When you flow, your sensitivity is an ocean that inspires and consoles without words.",
    shadow: "In shadow, the mist avoids the concrete; anchoring the dream in one real step is your yoga.",
  },
};

export const SOLAR_HOUSE_LABELS_EN: Record<number, string> = {
  1: "your solar 1st house, your body and your presence",
  2: "your solar 2nd house, your resources and self-worth",
  3: "your solar 3rd house, your mind and your words",
  4: "your solar 4th house, your roots and your home",
  5: "your solar 5th house, your creation and your joy",
  6: "your solar 6th house, your craft and your habits",
  7: "your solar 7th house, your one-to-one bonds",
  8: "your solar 8th house, the deep and the shared",
  9: "your solar 9th house, your horizon and your faith",
  10: "your solar 10th house, your calling and your mountain",
  11: "your solar 11th house, your tribe and good spirit",
  12: "your solar 12th house, your rest and inner world",
};

export const DICTS_EN: ComposeDicts = {
  signs: HOROSCOPE_SIGNS_EN,
  houseLabels: SOLAR_HOUSE_LABELS_EN,
  lunation: { new: "New Moon", full: "Full Moon" },
  t: {
    favorable: (body, house) => `${body} moves through ${house}: there is wind at your back there — use it with presence.`,
    tense: (body, house) => `${body} asks for work in ${house}: not punishment, but soul-muscle in the making.`,
    lunationIn: (name, house) => `This cycle's ${name} falls in ${house}; it is a good moment to listen to it.`,
    eclipse: "It also carries eclipse energy: the changes it opens run deeper than they seem.",
    stationRetro: (body) => `${body} stations retrograde: the sky invites review before push.`,
  },
};

// ---------------------------------------------------------------------------
// Horóscopo oriental (12 animales): mismo patrón que composeWesternProse —
// ADN evolutivo-yóguico del animal, en segunda persona, sin fatalismo.
// Espejo EXACTO de apps/web/lib/content/horoscope-es.ts + horoscope-en.ts
// (composeEasternProse/composeEasternWith): la prosa se compone SOLO desde
// el payload calculado (regla anti-funa — nunca contradice la lámina Pro).
// ---------------------------------------------------------------------------

export interface EasternProsePayload {
  animal: string;
  period: string;
  clash?: { withAnimal: string } | null;
  harmonies?: string[];
  taiSui?: Array<{ kind: "zhi" | "chong" | "hai" | "zixing" | "po" }> | null;
  monthChange?: { atIso: string } | null;
  toneBalance: "favorable" | "tense" | "mixed";
}

export const HOROSCOPE_ANIMALS_ES: Record<string, SignEssence> = {
  rat: {
    essence: "Tu alma vino con el ingenio de quien llega primero: observas, calculas y encuentras la grieta por donde otros no ven salida.",
    flow: "Cuando fluyes, tu astucia es faro y tu red de vínculos se convierte en abundancia compartida.",
    shadow: "En sombra, la vigilancia se vuelve desconfianza; tu práctica es soltar el control y dejar que otros también acierten.",
  },
  ox: {
    essence: "Tu alma vino a arar con paciencia infinita: cargas lo que otros sueltan y conviertes el esfuerzo callado en cosecha real.",
    flow: "Cuando fluyes, tu constancia es raíz para toda la tribu y tu palabra dada nunca se quiebra.",
    shadow: "En sombra, la terquedad se disfraza de deber; tu práctica es pedir ayuda antes de que el yugo pese demasiado.",
  },
  tiger: {
    essence: "Tu alma vino a cruzar el territorio con coraje: desafías lo establecido y abres senda donde había solo miedo.",
    flow: "Cuando fluyes, tu valentía inspira y tu instinto certero protege a quien camina contigo.",
    shadow: "En sombra, el ímpetu ruge sin escuchar; tu práctica es pausar el salto y sentir el suelo primero.",
  },
  rabbit: {
    essence: "Tu alma vino a tejer refugio con delicadeza: lees el ánimo del entorno y sabes cuándo acercarte y cuándo guardar distancia.",
    flow: "Cuando fluyes, tu diplomacia desarma tensiones y tu ternura vuelve seguro cualquier lugar.",
    shadow: "En sombra, la cautela se vuelve huida; tu práctica es quedarte un instante más en la conversación difícil.",
  },
  dragon: {
    essence: "Tu alma vino con fuego ancestral: nace para liderar visiones grandes y convocar a otros hacia lo que aún no existe.",
    flow: "Cuando fluyes, tu magnetismo mueve montañas y tu generosidad multiplica lo que tocas.",
    shadow: "En sombra, el orgullo exige altares; tu práctica es servir a la visión sin necesitar ser el centro de ella.",
  },
  snake: {
    essence: "Tu alma vino a mudar de piel las veces que haga falta: intuyes lo oculto y transformas el veneno del pasado en sabiduría quieta.",
    flow: "Cuando fluyes, tu discernimiento es certero y tu calma desarma lo que otros no logran nombrar.",
    shadow: "En sombra, el misterio se vuelve aislamiento; tu práctica es dejar que alguien entre antes de cerrarte del todo.",
  },
  horse: {
    essence: "Tu alma vino a galopar libre: buscas horizonte, movimiento y la libertad de decidir tu propio rumbo cada día.",
    flow: "Cuando fluyes, tu energía contagia y tu independencia abre camino para quien te sigue de cerca.",
    shadow: "En sombra, la inquietud huye del compromiso; tu práctica es plantar raíz sin sentir que pierdes las riendas.",
  },
  goat: {
    essence: "Tu alma vino a crear belleza y refugio: sensible al arte y al vínculo, sanas con la ternura que otros olvidan ofrecer.",
    flow: "Cuando fluyes, tu sensibilidad embellece lo cotidiano y tu empatía sostiene a quien lo necesita.",
    shadow: "En sombra, la duda pide permiso de más; tu práctica es confiar en tu propio gusto sin pedir aprobación ajena.",
  },
  monkey: {
    essence: "Tu alma vino con el ingenio del que juega con las reglas: inventas, improvisas y encuentras salida donde otros se traban.",
    flow: "Cuando fluyes, tu creatividad resuelve lo imposible y tu humor aligera cualquier carga.",
    shadow: "En sombra, la astucia se vuelve atajo deshonesto; tu práctica es elegir el camino largo cuando es el correcto.",
  },
  rooster: {
    essence: "Tu alma vino a anunciar el amanecer con precisión: observas los detalles que otros pasan por alto y hablas con una claridad que ordena.",
    flow: "Cuando fluyes, tu franqueza es brújula y tu disciplina vuelve hermoso lo bien hecho.",
    shadow: "En sombra, la exigencia se vuelve crítica afilada; tu práctica es aplicar la misma ternura hacia adentro.",
  },
  dog: {
    essence: "Tu alma vino a guardar lo justo: lealtad, verdad y la vigilancia silenciosa de quien protege sin pedir reconocimiento.",
    flow: "Cuando fluyes, tu integridad es refugio y tu instinto detecta lo que de verdad importa.",
    shadow: "En sombra, la alerta constante se agota en desconfianza; tu práctica es descansar la guardia y confiar un poco más.",
  },
  pig: {
    essence: "Tu alma vino a disfrutar sin culpa: generoso, sincero y capaz de convertir cualquier mesa compartida en abundancia.",
    flow: "Cuando fluyes, tu generosidad es contagiosa y tu honestidad simplifica lo que otros complican.",
    shadow: "En sombra, la indulgencia evita lo incómodo; tu práctica es sostener el límite aunque cueste el gusto del momento.",
  },
};

const EASTERN_ANIMAL_NAMES_ES: Record<string, string> = {
  rat: "la Rata", ox: "el Buey", tiger: "el Tigre", rabbit: "el Conejo",
  dragon: "el Dragón", snake: "la Serpiente", horse: "el Caballo", goat: "la Cabra",
  monkey: "el Mono", rooster: "el Gallo", dog: "el Perro", pig: "el Cerdo",
};

export interface EasternComposeDicts {
  animals: Record<string, SignEssence>;
  animalNames: Record<string, string>;
  periodLabels: Record<string, string>;
  t: {
    periodIntro: (periodLabel: string) => string;
    clash: (withName: string) => string;
    harmony: (names: string) => string;
    taiSui: (kinds: string) => string;
    monthChange: () => string;
  };
}

const EASTERN_PERIOD_LABELS_ES: Record<string, string> = {
  yesterday: "ayer", today: "hoy", tomorrow: "mañana",
  week: "esta semana", month: "este mes", year: "este ciclo anual",
};

const TAI_SUI_LABELS_ES: Record<string, string> = {
  zhi: "值太歲 (año regido por tu animal)",
  chong: "冲太歲 (choque frontal)",
  hai: "害太歲 (perjuicio silencioso)",
  zixing: "自刑太歲 (autocastigo)",
  po: "破太歲 (ruptura)",
};

const DICTS_EASTERN_ES: EasternComposeDicts = {
  animals: HOROSCOPE_ANIMALS_ES,
  animalNames: EASTERN_ANIMAL_NAMES_ES,
  periodLabels: EASTERN_PERIOD_LABELS_ES,
  t: {
    periodIntro: (periodLabel) => `Para ${periodLabel}, el cielo del Tong Shu se cruza con tu animal desde ese mismo ADN.`,
    clash: (withName) => `Este periodo trae un choque (冲) con ${withName}: no es mala suerte, es fricción que te pide moverte con más presencia que de costumbre.`,
    harmony: (names) => `También hay armonía (合) con ${names}: deja que esa alianza sostenga lo que estás construyendo.`,
    taiSui: (kinds) => `Frente al Tai Sui del año hay ${kinds}: es un año para caminar con más consciencia, no para detenerte.`,
    monthChange: () => `El mes cambia de signo (節) dentro de este periodo: nota cómo el tono se transforma antes y después del corte.`,
  },
};

const TAI_SUI_KIND_LABELS: Record<"es" | "en", Record<string, string>> = {
  es: TAI_SUI_LABELS_ES,
  en: {
    zhi: "值太歲 (your year to lead)",
    chong: "冲太歲 (head-on clash)",
    hai: "害太歲 (quiet harm)",
    zixing: "自刑太歲 (self-punishment)",
    po: "破太歲 (breakage)",
  },
};

/** Prosa oriental compuesta SOLO desde el payload — espejo estructural de
 *  composeWith: ADN del animal → interacción del periodo (choque tenso /
 *  armonía favorable) → Tai Sui o cambio de mes si vienen → cierre
 *  flow/shadow según toneBalance. */
export function composeEasternProse(locale: "es" | "en", payload: EasternPayload): string[] {
  return composeEasternWith(locale, payload, locale === "en" ? DICTS_EASTERN_EN : DICTS_EASTERN_ES);
}

export function composeEasternWith(
  locale: "es" | "en",
  payload: EasternProsePayload,
  dicts: EasternComposeDicts,
): string[] {
  const parts: string[] = [];
  const animal = dicts.animals[payload.animal];
  if (animal) parts.push(animal.essence);

  const periodLabel = dicts.periodLabels[payload.period] ?? payload.period;
  parts.push(dicts.t.periodIntro(periodLabel));

  const interactionLines: string[] = [];
  if (payload.clash) {
    const withName = dicts.animalNames[payload.clash.withAnimal] ?? payload.clash.withAnimal;
    interactionLines.push(dicts.t.clash(withName));
  }
  if (payload.harmonies && payload.harmonies.length > 0) {
    const names = payload.harmonies.map((a) => dicts.animalNames[a] ?? a).join(locale === "en" ? " and " : " y ");
    interactionLines.push(dicts.t.harmony(names));
  }
  if (interactionLines.length) parts.push(interactionLines.join(" "));

  if (payload.taiSui && payload.taiSui.length > 0) {
    const kinds = payload.taiSui.map((h) => TAI_SUI_KIND_LABELS[locale][h.kind]).join(", ");
    parts.push(dicts.t.taiSui(kinds));
  } else if (payload.monthChange) {
    parts.push(dicts.t.monthChange());
  }

  const closing = payload.toneBalance === "tense" ? animal?.shadow : animal?.flow;
  if (closing) parts.push(closing);
  return parts;
}

export const HOROSCOPE_ANIMALS_EN: Record<string, SignEssence> = {
  rat: {
    essence: "Your soul came with the wit of the one who arrives first: you watch, you calculate, and you find the crack others walk right past.",
    flow: "When you flow, your cunning is a lighthouse and your web of connections becomes shared abundance.",
    shadow: "In shadow, vigilance curdles into distrust; your practice is loosening the grip and letting others get it right too.",
  },
  ox: {
    essence: "Your soul came to plow with endless patience: you carry what others put down and turn quiet effort into a real harvest.",
    flow: "When you flow, your steadiness is a root for the whole tribe and your word, once given, never breaks.",
    shadow: "In shadow, stubbornness disguises itself as duty; your practice is asking for help before the yoke grows too heavy.",
  },
  tiger: {
    essence: "Your soul came to cross open territory with courage: you challenge what is settled and cut a trail where there was only fear.",
    flow: "When you flow, your daring inspires others and your sure instinct protects whoever walks beside you.",
    shadow: "In shadow, momentum roars without listening; your practice is pausing the leap to feel the ground first.",
  },
  rabbit: {
    essence: "Your soul came to weave shelter with delicacy: you read the room's mood and know exactly when to lean in and when to give space.",
    flow: "When you flow, your diplomacy disarms tension and your tenderness makes any place feel safe.",
    shadow: "In shadow, caution turns into flight; your practice is staying one moment longer in the hard conversation.",
  },
  dragon: {
    essence: "Your soul came with ancestral fire: born to lead grand visions and call others toward what does not yet exist.",
    flow: "When you flow, your magnetism moves mountains and your generosity multiplies whatever you touch.",
    shadow: "In shadow, pride demands an altar; your practice is serving the vision without needing to be its center.",
  },
  snake: {
    essence: "Your soul came to shed its skin as many times as it takes: you sense what is hidden and turn old venom into quiet wisdom.",
    flow: "When you flow, your discernment is unerring and your calm disarms what others cannot even name.",
    shadow: "In shadow, mystery curdles into isolation; your practice is letting someone in before you close the door all the way.",
  },
  horse: {
    essence: "Your soul came to run free: you chase horizon, motion, and the freedom to choose your own direction every single day.",
    flow: "When you flow, your energy is contagious and your independence clears the way for whoever follows close behind.",
    shadow: "In shadow, restlessness flees commitment; your practice is putting down roots without feeling like you lose the reins.",
  },
  goat: {
    essence: "Your soul came to make beauty and shelter: sensitive to art and to bonds, you heal with a tenderness others forget to offer.",
    flow: "When you flow, your sensitivity beautifies the everyday and your empathy holds up whoever needs it.",
    shadow: "In shadow, doubt asks permission too often; your practice is trusting your own taste without seeking outside approval.",
  },
  monkey: {
    essence: "Your soul came with the wit of one who plays with the rules: you invent, improvise, and find a way out where others get stuck.",
    flow: "When you flow, your creativity solves the impossible and your humor lightens any load.",
    shadow: "In shadow, cleverness turns into a dishonest shortcut; your practice is choosing the long way when it is the right one.",
  },
  rooster: {
    essence: "Your soul came to announce the dawn with precision: you notice the details others miss and speak with a clarity that brings order.",
    flow: "When you flow, your candor is a compass and your discipline makes what is well done beautiful.",
    shadow: "In shadow, high standards turn into a sharp edge; your practice is aiming that same tenderness inward.",
  },
  dog: {
    essence: "Your soul came to guard what is fair: loyalty, truth, and the quiet watch of one who protects without asking to be seen.",
    flow: "When you flow, your integrity is shelter and your instinct spots what truly matters.",
    shadow: "In shadow, constant alertness wears down into distrust; your practice is resting the watch and trusting a little more.",
  },
  pig: {
    essence: "Your soul came to enjoy without guilt: generous, honest, and able to turn any shared table into abundance.",
    flow: "When you flow, your generosity is contagious and your honesty simplifies what others complicate.",
    shadow: "In shadow, indulgence avoids what is uncomfortable; your practice is holding the line even when it costs the moment's pleasure.",
  },
};

const EASTERN_ANIMAL_NAMES_EN: Record<string, string> = {
  rat: "the Rat", ox: "the Ox", tiger: "the Tiger", rabbit: "the Rabbit",
  dragon: "the Dragon", snake: "the Snake", horse: "the Horse", goat: "the Goat",
  monkey: "the Monkey", rooster: "the Rooster", dog: "the Dog", pig: "the Pig",
};

const EASTERN_PERIOD_LABELS_EN: Record<string, string> = {
  yesterday: "yesterday", today: "today", tomorrow: "tomorrow",
  week: "this week", month: "this month", year: "this yearly cycle",
};

export const DICTS_EASTERN_EN: EasternComposeDicts = {
  animals: HOROSCOPE_ANIMALS_EN,
  animalNames: EASTERN_ANIMAL_NAMES_EN,
  periodLabels: EASTERN_PERIOD_LABELS_EN,
  t: {
    periodIntro: (periodLabel) => `For ${periodLabel}, the Tong Shu sky crosses your animal straight from that same DNA.`,
    clash: (withName) => `This period brings a clash (冲) with ${withName}: not bad luck, just friction asking you to move with more presence than usual.`,
    harmony: (names) => `There is also harmony (合) with ${names}: let that alliance hold up what you are building.`,
    taiSui: (kinds) => `Facing this year's Tai Sui there is ${kinds}: it is a year to walk with more awareness, not to stop.`,
    monthChange: () => `The month changes sign (節) within this period: notice how the tone shifts before and after the cut.`,
  },
};
