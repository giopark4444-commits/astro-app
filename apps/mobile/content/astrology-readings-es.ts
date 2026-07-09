// Espejo del corpus web (apps/web/lib/content/astrology-readings-es.ts) — mantener sincronizados a mano.

export interface BodyReading {
  essence: string; // planeta + signo + casa, tejido
  flow: string; // el don del planeta
  shadow: string; // la sombra del planeta
}

interface PlanetTheme {
  essence: string; // cláusula SIN punto final (se compone)
  flow: string;
  shadow: string;
}

const PLANET_THEME: Record<string, PlanetTheme> = {
  sun: {
    essence: "Tu Sol es tu identidad esencial, tu propósito y el centro desde donde estás llamado a brillar",
    flow: "Cuando lo habitas, irradias presencia, voluntad y un sentido claro de quién eres.",
    shadow: "En sombra, el ego brilla para ser aprobado, busca afuera lo que ya es y olvida su propia luz.",
  },
  moon: {
    essence: "Tu Luna es tu mundo emocional, tu niño interior y lo que tu alma necesita para sentirse en casa",
    flow: "Te da intuición, ternura y la capacidad de nutrir y de sentir hondo.",
    shadow: "En sombra, la emoción te gobierna, te aferras al pasado o buscas seguridad donde no la hay.",
  },
  mercury: {
    essence: "Mercurio es tu mente, tu voz y la forma en que piensas, aprendes y te comunicas",
    flow: "Te da agilidad, curiosidad y el don de unir ideas y personas con la palabra.",
    shadow: "En sombra, la mente se dispersa, racionaliza lo que siente o habla sin escuchar.",
  },
  venus: {
    essence: "Venus es tu forma de amar, de disfrutar y de reconocer la belleza y tu propio valor",
    flow: "Te da magnetismo, dulzura y la capacidad de crear armonía y vínculos.",
    shadow: "En sombra, complaces para ser querido, te pierdes en el placer o mides tu valor por fuera.",
  },
  mars: {
    essence: "Marte es tu fuerza, tu deseo y la energía con que actúas y defiendes lo tuyo",
    flow: "Te da coraje, iniciativa y la chispa para ir tras lo que quieres.",
    shadow: "En sombra, la fuerza se vuelve impulso, ira o lucha por luchar.",
  },
  jupiter: {
    essence: "Júpiter es tu fe, tu expansión y el lugar donde tu alma busca sentido y crecimiento",
    flow: "Te da generosidad, visión y una confianza que abre puertas.",
    shadow: "En sombra, el exceso, la promesa que no aterriza o el dogma que cree tener la verdad.",
  },
  saturn: {
    essence: "Saturno es tu maestro, tu estructura y la lección que tu alma vino a madurar con el tiempo",
    flow: "Te da disciplina, responsabilidad y la sabiduría de lo que se construye despacio.",
    shadow: "En sombra, el miedo, la rigidez o la autoexigencia que paraliza en vez de sostener.",
  },
  uranus: {
    essence: "Urano es tu chispa de libertad, tu genio y aquello en lo que viniste a romper moldes",
    flow: "Te da originalidad, intuición súbita y el valor de ser distinto.",
    shadow: "En sombra, la rebeldía sin causa, el desapego frío o el cambio solo por cambiar.",
  },
  neptune: {
    essence: "Neptuno es tu puente con lo invisible, tu imaginación y tu anhelo de unidad",
    flow: "Te da sensibilidad mística, compasión y un canal hacia lo sagrado y el arte.",
    shadow: "En sombra, la ilusión, la huida o la confusión entre el sueño y lo real.",
  },
  pluto: {
    essence: "Plutón es tu poder profundo, tu capacidad de morir y renacer, y lo que viniste a transformar",
    flow: "Te da intensidad, regeneración y la fuerza de mirar lo que otros temen.",
    shadow: "En sombra, el control, la obsesión o el poder usado desde la herida.",
  },
  chiron: {
    essence: "Quirón es tu herida sagrada, ese punto sensible que, al sanarlo, te vuelve sanador de otros",
    flow: "Te da empatía con el dolor ajeno y la sabiduría que solo deja lo vivido.",
    shadow: "En sombra, la herida que no cierra, el sentirte roto o evitar tocar lo que duele.",
  },
  north_node: {
    essence: "Tu Nodo Norte marca la dirección de crecimiento de tu alma, hacia donde vienes a evolucionar",
    flow: "Es incómodo pero nutritivo: cada paso hacia él te acerca a tu propósito.",
    shadow: "La tentación es quedarte en lo ya conocido en vez de atreverte a este nuevo terreno.",
  },
  south_node: {
    essence: "Tu Nodo Sur es tu zona de confort kármica, los dones y patrones que ya traes de antes",
    flow: "Es un talento natural, un lugar donde te mueves sin esfuerzo.",
    shadow: "En exceso te ancla: repetir lo fácil en vez de crecer hacia tu Nodo Norte.",
  },
  lilith: {
    essence: "Lilith es tu fuerza salvaje, tu deseo no domesticado y aquello que no estás dispuesto a reprimir",
    flow: "Te da autenticidad cruda, instinto y el poder de honrar tu sombra sin pedir permiso.",
    shadow: "En sombra, la rabia herida o el rechazo a lo que te hace vulnerable.",
  },
};

const SIGN_TONE: Record<string, string> = {
  aries: "con coraje, iniciativa y un impulso directo de empezar",
  taurus: "con calma, sentidos despiertos y la paciencia de lo que perdura",
  gemini: "con curiosidad, palabra y una mente que salta y conecta",
  cancer: "desde la emoción, el cuidado y la memoria del hogar",
  leo: "con calidez, generosidad y un deseo noble de brillar",
  virgo: "con detalle, servicio y el afán de mejorar lo que tocas",
  libra: "buscando armonía, vínculo y belleza compartida",
  scorpio: "con intensidad, hondura y verdad sin filtros",
  sagittarius: "con expansión, fe y sed de horizonte",
  capricorn: "con ambición, estructura y la mira en lo que se construye",
  aquarius: "con originalidad, mirada al futuro y sentido de lo colectivo",
  pisces: "con sensibilidad, compasión y un pie en lo invisible",
};

const HOUSE_ARENA: Record<number, string> = {
  1: "tu identidad, tu cuerpo y la forma en que te presentas al mundo",
  2: "tus recursos, tu valor propio y lo que posees",
  3: "tu mente, tus palabras y los vínculos cercanos del día a día",
  4: "tu hogar, tus raíces y tu mundo íntimo",
  5: "tu creatividad, el placer, el juego y el amor que se expresa",
  6: "tu trabajo cotidiano, la salud y el servicio",
  7: "tus relaciones, la pareja y el encuentro con el otro",
  8: "lo profundo, la intimidad, las crisis y lo que se transforma",
  9: "tu búsqueda de sentido, los viajes, la filosofía y la fe",
  10: "tu vocación, tu lugar en el mundo y lo que construyes hacia afuera",
  11: "los grupos, las amistades, los sueños colectivos y el futuro",
  12: "lo invisible, el inconsciente, el retiro y la entrega",
};

const DIGNITY_NOTE: Record<string, string> = {
  domicile: " Está en su domicilio: su energía fluye con fuerza y naturalidad.",
  exaltation: " Está exaltado: aquí da lo mejor de sí, elevado.",
  exile: " Está en exilio: su energía rema a contracorriente, y madura al aprender a integrarla.",
  fall: " Está en caída: cuesta más expresarlo, y justo ahí vive la lección.",
};

/** Teje la lectura base de un cuerpo a partir de planeta + signo + casa (+ dignidad). */
export function composeBodyReading(
  bodyKey: string,
  signKey: string,
  house: number,
  dignity: string | null,
): BodyReading | null {
  const theme = PLANET_THEME[bodyKey];
  const tone = SIGN_TONE[signKey];
  const arena = HOUSE_ARENA[house];
  if (!theme || !tone || !arena) return null;
  const dignityNote = dignity ? (DIGNITY_NOTE[dignity] ?? "") : "";
  return {
    essence: `${theme.essence}. Aquí lo vives ${tone}, en el terreno de ${arena}.${dignityNote}`,
    flow: theme.flow,
    shadow: theme.shadow,
  };
}
