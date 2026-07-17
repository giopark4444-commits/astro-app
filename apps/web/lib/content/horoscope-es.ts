// Horóscopo occidental (ES): ADN de cada signo en voz Aluna (evolutiva-yóguica,
// don y sombra, sin fatalismo) + etiquetas de casas solares + composición.
// La prosa del periodo SE COMPONE desde el payload calculado: nunca puede
// contradecir la lámina Pro (regla anti-funa).
import { solarHouseOf } from "@aluna/core";
import { astroLabels } from "./astrology-labels";
import type { WesternPayload } from "@/lib/horoscope/western";
import { DICTS_EN, DICTS_EASTERN_EN } from "./horoscope-en";

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

/** Párrafos deterministas SOLO desde el payload. Orden: ADN → drivers → evento → cierre.
 *  horoscope-en.ts solo exporta DATOS (dicts); el motor vive aquí. es.ts→en.ts es la
 *  única dirección de import runtime (en.ts importa de es.ts SOLO tipos) → sin ciclo. */
export function composeWesternProse(locale: "es" | "en", payload: WesternPayload): string[] {
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

// ---------------------------------------------------------------------------
// Horóscopo oriental (12 animales): mismo patrón que los signos solares —
// ADN evolutivo-yóguico, segunda persona, sin fatalismo. es.ts es el motor de
// composición (composeEasternProse); horoscope-en.ts SOLO exporta dicts EN.
//
// CONTRATO PROVISIONAL H2: la Task 2 (apps/web/lib/horoscope/eastern.ts) aún
// no existe. Este tipo describe el payload MÍNIMO que composeEasternProse
// necesita; el motor de eastern.ts debe producir esto (o un superset). La
// Task 5 (UI) hará el mapeo real del payload completo del motor a esta forma.
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

/** Prosa oriental compuesta SOLO desde el payload (contrato provisional H2 arriba).
 *  Espejo estructural de composeWith: ADN del animal → interacción del periodo
 *  (choque tenso / armonía favorable) → Tai Sui o cambio de mes si vienen → cierre
 *  flow/shadow según toneBalance. */
export function composeEasternProse(locale: "es" | "en", payload: EasternProsePayload): string[] {
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

export function composeWith(locale: "es" | "en", payload: WesternPayload, dicts: ComposeDicts): string[] {
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
    const evHouse = solarHouseOf(payload.sign, lun.longitude);
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
