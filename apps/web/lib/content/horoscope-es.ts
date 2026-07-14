// Horóscopo occidental (ES): ADN de cada signo en voz Aluna (evolutiva-yóguica,
// don y sombra, sin fatalismo) + etiquetas de casas solares + composición.
// La prosa del periodo SE COMPONE desde el payload calculado: nunca puede
// contradecir la lámina Pro (regla anti-funa).
import { solarHouseOf } from "@aluna/core";
import { astroLabels } from "./astrology-labels";
import type { WesternPayload } from "@/lib/horoscope/western";
import { DICTS_EN } from "./horoscope-en";

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
