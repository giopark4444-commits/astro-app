// Glosario de significados (ES) — la capa "toca y entiende" de toda la web.
// Voz Aluna: segunda persona, cálida y honesta, 2–4 frases. Claves en inglés,
// namespaced (sign.* planet.* house.* aspect.* term.* dignity.* pattern.*
// housesystem.* zodiac.* element.* modality.* bazi.*). Paridad EN vigilada por test.
export interface GlossaryEntry { title: string; glyph?: string; body: string }

export const GLOSSARY_ES: Record<string, GlossaryEntry> = {
  // ——— Signos ———
  "sign.aries": {
    title: "Aries", glyph: "♈",
    body: "Fuego cardinal: la chispa que enciende antes de pensar. Donde Aries toca tu carta, arrancas primero y preguntas después — ahí eres pionero, valiente, incapaz de esperar permiso. Su don es el coraje de empezar; su sombra, la impaciencia que rompe lo que aún no terminó de nacer.",
  },
  "sign.taurus": {
    title: "Tauro", glyph: "♉",
    body: "Tierra fija: el arte de quedarse. Donde Tauro habita tu carta, quieres lo real — lo que se toca, se saborea y perdura — y construyes despacio pero para siempre. Su don es la calma que sostiene; su sombra, aferrarse a lo conocido cuando la vida ya pidió otra cosa.",
  },
  "sign.gemini": {
    title: "Géminis", glyph: "♊",
    body: "Aire mutable: la curiosidad con dos manos y mil preguntas. Donde Géminis vive en tu carta, necesitas nombrar, conectar, probar el otro lado de cada idea — ahí eres puente entre mundos. Su don es la agilidad de la mente; su sombra, rozar tantas superficies que ninguna llega a hondura.",
  },
  "sign.cancer": {
    title: "Cáncer", glyph: "♋",
    body: "Agua cardinal: la marea que cuida. Donde Cáncer toca tu carta, tu brújula es el hogar — el de las paredes y el del pecho — y proteges lo tuyo con una fuerza que no parece suya. Su don es la memoria emocional que nutre; su sombra, el caparazón que confunde protegerse con no dejar entrar a nadie.",
  },
  "sign.leo": {
    title: "Leo", glyph: "♌",
    body: "Fuego fijo: el corazón que necesita brillar para dar calor. Donde Leo vive en tu carta, hay algo tuyo que pide escenario — no por vanidad, sino porque tu luz existe para compartirse. Su don es la generosidad que enciende a otros; su sombra, necesitar el aplauso para creer que vales.",
  },
  "sign.virgo": {
    title: "Virgo", glyph: "♍",
    body: "Tierra mutable: el amor hecho detalle. Donde Virgo habita tu carta, sirves afinando — ves lo que falta, lo que sobra, lo que se puede hacer mejor — y tu cuidado se nota en lo pequeño. Su don es la precisión que sana; su sombra, la crítica que no perdona, empezando por ti.",
  },
  "sign.libra": {
    title: "Libra", glyph: "♎",
    body: "Aire cardinal: la balanza que busca al otro. Donde Libra toca tu carta, piensas en espejo — necesitas el encuentro, la belleza, el acuerdo justo — y sabes tender puentes donde había trinchera. Su don es la armonía que reconcilia; su sombra, complacer tanto que tu propia voz queda fuera del trato.",
  },
  "sign.scorpio": {
    title: "Escorpio", glyph: "♏",
    body: "Agua fija: la intensidad que no sabe quedarse en la superficie. Donde Escorpio toca tu carta, no te conformas con la versión oficial de nada — quieres la verdad con raíces. Su don es transformarse; su sombra, controlar lo que ama por miedo a perderlo.",
  },
  "sign.sagittarius": {
    title: "Sagitario", glyph: "♐",
    body: "Fuego mutable: la flecha que apunta más allá del mapa. Donde Sagitario vive en tu carta, necesitas horizonte — viajar, estudiar, creer en algo más grande — y contagias esa fe sin proponértelo. Su don es el sentido que expande; su sombra, prometer el cielo y estar ya en otro camino cuando toca cumplir.",
  },
  "sign.capricorn": {
    title: "Capricornio", glyph: "♑",
    body: "Tierra cardinal: la montaña que se sube paso a paso. Donde Capricornio toca tu carta, hay una ambición seria y paciente — construyes con tiempo, con disciplina, con la palabra que se cumple. Su don es la madurez que sostiene a otros; su sombra, cargar tanto deber que olvidas que también viniste a vivir.",
  },
  "sign.aquarius": {
    title: "Acuario", glyph: "♒",
    body: "Aire fijo: la mente que mira desde afuera del círculo. Donde Acuario habita tu carta, cuestionas lo que todos dan por hecho — ahí eres futuro, tribu elegida, idea que llega antes de tiempo. Su don es liberar lo que estaba rígido; su sombra, volverse tan distinto que nadie puede tocarte de cerca.",
  },
  "sign.pisces": {
    title: "Piscis", glyph: "♓",
    body: "Agua mutable: el océano donde se borran los bordes. Donde Piscis vive en tu carta, sientes lo que flota en el aire — la compasión, el arte, lo invisible te atraviesan sin pedir permiso. Su don es la entrega que disuelve el ego; su sombra, escaparse de la orilla cuando la realidad pide manos.",
  },

  // ——— Planetas y puntos ———
  "planet.sun": {
    title: "Sol", glyph: "☉",
    body: "El centro de tu carta y de tu identidad: quién vienes a ser cuando dejas de imitar. El Sol no es tu personalidad entera — es el fuego que la alimenta, el propósito que te enciende cuando lo vives y te apaga cuando lo pospones. Vivir tu Sol no es egoísmo: es tu manera de dar luz.",
  },
  "planet.moon": {
    title: "Luna", glyph: "☽",
    body: "Tu mundo emocional: cómo sientes, qué te calma, dónde vuelves cuando el día te gastó. La Luna es la niña o el niño que sigue adentro pidiendo lo mismo de siempre — y también tu instinto más sabio. Conocer tu Luna es saber qué necesitas de verdad, antes de que lo pidas llorando o lo cobres en silencio.",
  },
  "planet.mercury": {
    title: "Mercurio", glyph: "☿",
    body: "Tu mente en movimiento: cómo piensas, hablas, aprendes y conectas los puntos. Mercurio es el mensajero entre tu mundo interno y el de afuera — su signo te dice si tu palabra corre, pesa, corta o abraza. Cuando fluye, traduce; cuando no, enreda: habla mucho y dice poco.",
  },
  "planet.venus": {
    title: "Venus", glyph: "♀",
    body: "Lo que amas y cómo amas: tu manera de atraer, de disfrutar, de decir «esto es bello». Venus marca qué te da placer y qué valoras — en las personas, en las cosas, en ti. Su trabajo no es solo el romance: es aprender a recibir sin culpa y a querer sin ponerle precio.",
  },
  "planet.mars": {
    title: "Marte", glyph: "♂",
    body: "Tu fuego de acción: cómo deseas, cómo peleas, cómo vas por lo que quieres. Marte es la espada que corta camino — bien usada defiende lo tuyo, mal usada hiere o se oxida de rabia guardada. Su signo te dice si tu energía embiste, calcula, seduce o resiste.",
  },
  "planet.jupiter": {
    title: "Júpiter", glyph: "♃",
    body: "Tu principio de expansión: dónde la vida te abre puertas y tú te atreves a creer. Júpiter señala tu fe, tu abundancia, tu manera de encontrar sentido — ahí tienes suerte, pero es una suerte que se activa con confianza. Su exceso también existe: prometer de más, crecer sin raíz, confundir optimismo con no mirar.",
  },
  "planet.saturn": {
    title: "Saturno", glyph: "♄",
    body: "Tu maestro interno: el que pone límite, estructura y examen. Donde está Saturno sientes el peso — miedo, retraso, exigencia — pero también es donde puedes construir lo más sólido de tu vida, porque nada tuyo ahí es regalado. Saturno no castiga: madura. Lo que te pide temprano, te lo devuelve tarde y multiplicado.",
  },
  "planet.uranus": {
    title: "Urano", glyph: "♅",
    body: "El rayo que despierta: donde Urano toca tu carta, no puedes ser como los demás aunque lo intentes. Es tu genio, tu rebeldía, la parte de ti que necesita romper el molde para respirar. Su regalo es la libertad auténtica; su riesgo, romper por romper, confundiendo el portazo con la liberación.",
  },
  "planet.neptune": {
    title: "Neptuno", glyph: "♆",
    body: "La niebla y el océano: donde Neptuno habita, los bordes se disuelven — ahí eres místico, artista, soñador, y también ahí te puedes perder. Es tu antena hacia lo invisible, tu compasión sin condiciones. Su lección es fina: aprender a distinguir la inspiración del espejismo, la entrega de la fuga.",
  },
  "planet.pluto": {
    title: "Plutón", glyph: "♇",
    body: "Tu poder de fondo: lento, invisible y total. Donde Plutón toca tu carta hay algo que muere y renace una y otra vez — ahí la vida no te deja quedarte a medias. Su regalo es una fuerza de transformación que pocos sostienen; su sombra, la obsesión y el control cuando te resistes a soltar.",
  },
  "planet.chiron": {
    title: "Quirón", glyph: "⚷",
    body: "La herida que enseña: el punto donde algo dolió temprano y nunca cerró del todo. La paradoja de Quirón es que justo ahí, donde no puedes sanarte por completo, desarrollas una medicina enorme para otros. No se trata de arreglar la herida — se trata de dejar que te vuelva sabio.",
  },
  "planet.lilith": {
    title: "Lilith", glyph: "⚸",
    body: "Lo indomable en ti: el instinto que no negocia, el deseo que no pide disculpas. Lilith marca dónde te exiliaron — o te exiliaste — por no encajar, y dónde reprimiste algo salvaje para ser aceptable. Recuperarla no es venganza: es volver a habitar la parte tuya que nunca debió pedir perdón por existir.",
  },
  "planet.northnode": {
    title: "Nodo Norte", glyph: "☊",
    body: "La dirección de tu alma en esta vida: lo que viniste a aprender, no lo que ya sabes hacer. El Nodo Norte incomoda porque señala territorio nuevo — cada paso hacia él se siente torpe al principio y profundamente correcto después. No es un destino que te pasa: es uno que se camina.",
  },
  "planet.southnode": {
    title: "Nodo Sur", glyph: "☋",
    body: "Tu equipaje de origen: los talentos y hábitos que traes tan aprendidos que los haces dormido. El Nodo Sur es zona cómoda y por eso mismo es trampa — quedarse ahí es repetir una historia que ya diste por vivida. No se trata de renegar de esos dones, sino de ponerlos al servicio del camino nuevo.",
  },
  "point.ascendant": {
    title: "Ascendente",
    body: "El signo que subía por el horizonte cuando naciste: la puerta por donde el mundo te encuentra. Es tu primera impresión, tu estilo de arrancar las cosas, la ropa que tu esencia se pone para salir. No es máscara falsa — es umbral: con los años, dejas de actuarlo y empiezas a habitarlo.",
  },

  // ——— Casas ———
  "house.1": {
    title: "Casa 1",
    body: "Tu cuerpo, tu rostro, la manera en que entras a una habitación: el yo que aparece. Es la casa del comienzo — cómo arrancas la vida y cada cosa dentro de ella. Los planetas aquí se notan a primera vista: son la carta de presentación que no puedes esconder.",
  },
  "house.2": {
    title: "Casa 2",
    body: "El terreno de lo tuyo: tu dinero, tus talentos, el suelo que pisas cuando todo lo demás tiembla. Aquí se pregunta qué vales para ti — no para el mercado. Su trabajo es construir una seguridad que nadie te pueda quitar, porque nace de recursos que son cuerpo tuyo.",
  },
  "house.3": {
    title: "Casa 3",
    body: "El terreno de lo cercano: hermanos, calles de tu barrio, la palabra dicha y la escuchada. Es la casa de la mente cotidiana — cómo aprendes, escribes, conversas, te mueves por tu mundo inmediato. Aquí la vida no llega en revelaciones: llega en recados, mensajes y trayectos cortos.",
  },
  "house.4": {
    title: "Casa 4",
    body: "La raíz de la carta: tu casa de infancia, tu familia, la tierra emocional donde creciste. Es el fondo del cielo — lo más privado de ti, el lugar al que vuelves cuando el mundo pesa. Lo que siembres aquí sostiene todo lo demás: nadie florece lejos de sus raíces sin llevarlas dentro.",
  },
  "house.5": {
    title: "Casa 5",
    body: "Aquí vive el gozo: lo que creas, los hijos, el juego, el romance que te hace sentir vivo. Es la casa donde el corazón se expresa sin pedir permiso — tu arte, tu riesgo, tu manera de brillar por puro placer. Si en este terreno no juegas, la vida se te vuelve solo deber.",
  },
  "house.6": {
    title: "Casa 6",
    body: "El terreno de lo cotidiano: tu trabajo de cada día, tus rutinas, tu cuerpo pidiendo que lo escuches. Es la casa donde lo sagrado se vuelve práctico — el orden, el servicio, la salud como hábito y no como emergencia. Aquí no hay gloria: hay constancia, y la constancia es la que sana.",
  },
  "house.7": {
    title: "Casa 7",
    body: "El terreno del otro: la pareja, los socios, los acuerdos que firmas con el alma o con la mano. Es tu espejo — lo que buscas (o atraes) en quien tienes enfrente suele ser algo tuyo que aún no reconoces. Aquí aprendes que el vínculo no te completa: te revela.",
  },
  "house.8": {
    title: "Casa 8",
    body: "El terreno de lo compartido y lo que no se puede controlar: la intimidad profunda, el dinero de otros, las crisis que te rehacen. Los planetas aquí no viven cómodos — viven hondos. Es la casa donde aprendes a soltar para renacer.",
  },
  "house.9": {
    title: "Casa 9",
    body: "La casa del horizonte: los viajes largos, los estudios superiores, la fe y la filosofía con que le das sentido al caos. Este terreno te saca de tu aldea — a veces en avión, a veces con un libro que te cambia el mapa. Aquí la pregunta no es cómo vivir, sino para qué.",
  },
  "house.10": {
    title: "Casa 10",
    body: "El terreno de la cima visible: tu vocación, tu reputación, la huella que dejas en la plaza pública. Es el punto más alto de la carta — lo que construyes ante los ojos de todos, y lo que el mundo te pedirá cuentas de haber hecho. Aquí no se hereda el lugar: se sube a él.",
  },
  "house.11": {
    title: "Casa 11",
    body: "La tribu: los amigos, los grupos, las causas más grandes que tú. Es la casa de los proyectos de futuro — los sueños que solo se cumplen en red, con otros que miran hacia el mismo horizonte. En este terreno descubres que tu voz individual encuentra su eco en lo colectivo.",
  },
  "house.12": {
    title: "Casa 12",
    body: "El terreno de lo oculto: los sueños, los finales, lo que hiciste tan tuyo que ya no lo ves. Es la casa del retiro y del inconsciente — los planetas aquí trabajan tras bambalinas, en el silencio, en lo que se suelta. No es una casa de castigo: es donde el alma descansa del personaje y recuerda de dónde viene.",
  },

  // ——— Aspectos ———
  "aspect.conjunction": {
    title: "Conjunción", glyph: "☌",
    body: "Dos planetas en el mismo grado, tan pegados que sus energías se funden en una sola. No se ven entre sí — actúan juntos, para bien o para complicación, como dos colores mezclados que ya no puedes separar. Es el aspecto más potente: donde tienes una conjunción, tienes un motor.",
  },
  "aspect.opposition": {
    title: "Oposición", glyph: "☍",
    body: "Dos planetas frente a frente, a 180°, tirando de ti hacia lados contrarios. Se siente como un tira y afloja interno — o como si vivieras un extremo tú y el otro te llegara siempre a través de alguien más. Su trabajo no es que gane un lado: es aprender a sostener los dos sin partirte.",
  },
  "aspect.trine": {
    title: "Trígono", glyph: "△",
    body: "Dos planetas a 120°, en el mismo elemento: la energía fluye entre ellos sin esfuerzo. Es un talento que ya traes de serie — tan natural que a veces ni lo notas. El trabajo con un trígono no es ganarlo, es no darlo por sentado.",
  },
  "aspect.square": {
    title: "Cuadratura", glyph: "□",
    body: "Dos planetas a 90°, chocando en ángulo recto: cada uno quiere algo que al otro le estorba. Es fricción, sí — pero fricción que enciende. Las cuadraturas son los aspectos que más te hacen trabajar, y por eso mismo donde más músculo desarrollas: casi todo lo que logras con orgullo tiene una detrás.",
  },
  "aspect.sextile": {
    title: "Sextil", glyph: "⚹",
    body: "Dos planetas a 60°, en elementos que se llevan bien: una puerta entreabierta entre ellos. Es una oportunidad, no un regalo — la energía coopera si tú la invitas, pero no insiste sola como el trígono. Donde tienes un sextil, hay un talento que despierta solo cuando le dices que sí.",
  },
  "aspect.quincunx": {
    title: "Quincuncio", glyph: "⚻",
    body: "Dos planetas a 150°, en signos que no comparten ni elemento ni modalidad: hablan idiomas distintos y no hay traductor. Se siente como una incomodidad difusa, algo que nunca encaja del todo por más que lo acomodes. Su trabajo es el ajuste fino: no resolver la tensión, sino aprender a convivir con ella con ingenio.",
  },
  "aspect.semisextile": {
    title: "Semisextil", glyph: "⚺",
    body: "Dos planetas a 30°, en signos vecinos: tan cerca que se rozan, tan distintos que no se entienden. Es un aspecto sutil — un leve roce de fondo más que un conflicto abierto. Te pide notar la diferencia entre dos partes tuyas que viven puerta con puerta pero llevan vidas separadas.",
  },

  // ——— Términos ———
  "term.orb": {
    title: "Orbe",
    body: "Los grados que le faltan (o le sobran) al aspecto para ser exacto. Cuanto más pequeño el orbe, más fuerte se siente: un aspecto a 0.5° te habla a diario; a 7°, susurra de fondo.",
  },
  "term.applying": {
    title: "Aplicativo",
    body: "El aspecto aún se está formando: el planeta más rápido se acerca al exacto pero todavía no llega. Es la fase creciente — la energía va en aumento, como una ola que ves venir. Los aspectos aplicativos se sienten más vivos que los que ya pasaron: lo que anuncian está por delante.",
  },
  "term.separating": {
    title: "Separativo",
    body: "El aspecto ya tuvo su momento exacto y los planetas se están alejando. La energía no desaparece de golpe — queda como un eco, algo que ya ocurrió y todavía resuena. Se siente más como integrar lo vivido que como esperar lo que viene.",
  },
  "term.retrograde": {
    title: "Retrógrado",
    body: "Visto desde la Tierra, el planeta parece caminar hacia atrás — no lo hace de verdad, pero el efecto se siente. Los temas de ese planeta giran hacia adentro: en vez de avanzar, revisan, repiten, maduran. No es un castigo del cielo: es la vida pidiéndote una segunda mirada antes del siguiente paso.",
  },
  "term.transit": {
    title: "Tránsito",
    body: "Un planeta que se mueve hoy por el cielo tocando un punto de tu carta natal. Si la carta es el mapa, los tránsitos son el clima: te dicen qué estación atraviesa cada zona de tu vida y por cuánto tiempo. No obligan nada — abren y cierran puertas que sigues cruzando tú.",
  },
  "term.natal": {
    title: "Natal",
    body: "Lo que quedó fijado en el instante de tu nacimiento: la foto del cielo que te acompaña toda la vida. Tu carta natal no cambia — cambia tu manera de habitarla. Es el instrumento con el que naciste; la música que saques de él es cosa tuya.",
  },

  // ——— Dignidades ———
  "dignity.domicile": {
    title: "Domicilio",
    body: "El planeta está en el signo que gobierna: en su propia casa, con las llaves en la mano. Ahí su energía se expresa sin traducciones ni permisos — es su versión más nítida y natural. Un planeta en domicilio no necesita que lo empujes: sabe exactamente qué vino a hacer.",
  },
  "dignity.exaltation": {
    title: "Exaltación",
    body: "El planeta está en un signo que amplifica su mejor versión, como un invitado de honor. No está en su casa (eso sería domicilio), pero aquí se le celebra: su energía sube de voltaje y pide expresarse en grande.",
  },
  "dignity.detriment": {
    title: "Exilio",
    body: "El planeta está en el signo opuesto a su domicilio: lejos de casa, en una cultura que no habla su idioma. Su energía no desaparece — le cuesta más, se expresa con torpeza o por caminos indirectos. Y ahí está el regalo escondido: lo que no sale fácil se vuelve consciente, y lo consciente se puede trabajar.",
  },
  "dignity.fall": {
    title: "Caída",
    body: "El planeta está en el signo opuesto a su exaltación: donde antes era invitado de honor, aquí nadie le guarda silla. Su energía suena en voz baja, dudando de sí misma. No significa que ese planeta esté roto — significa que su fuerza pide más paciencia y humildad para florecer, y cuando lo hace, es fuerza ganada de verdad.",
  },
  "dignity.peregrine": {
    title: "Peregrino",
    body: "El planeta no tiene ninguna dignidad en ese signo: ni casa, ni honor, ni deuda. Es un viajero sin papeles — no está fuerte ni débil, está sin referencias, y se deja teñir mucho por los planetas que lo tocan. Su lección es encontrar rumbo propio en tierra que no lo reclama.",
  },

  // ——— Patrones ———
  "pattern.stellium": {
    title: "Stellium",
    body: "Tres o más planetas juntos en el mismo signo o casa: una concentración de energía difícil de ignorar. Esa zona de tu vida pesa más que las demás — ahí eres intenso, especialista, a veces monotemático. El reto no es apagarlo: es no dejar que ese único foco se coma el resto del mapa.",
  },
  "pattern.grandtrine": {
    title: "Gran Trígono",
    body: "Tres planetas formando un triángulo de trígonos, casi siempre en el mismo elemento: un circuito cerrado donde la energía fluye sola. Es un don enorme — y una hamaca peligrosa, porque lo que no cuesta tampoco despierta. Su trabajo es ponerle una tarea a tanta facilidad, para que el talento circule hacia afuera y no solo gire en redondo.",
  },
  "pattern.tsquare": {
    title: "Cuadratura en T",
    body: "Dos planetas en oposición y un tercero que los cuadra a ambos: toda la tensión desemboca en ese planeta focal. Se siente como una presión constante en esa zona de tu vida — y también como tu mayor generador de empuje. La gente con cuadraturas en T no descansa fácil, pero construye: la salida está en darle al planeta focal un trabajo digno de su fuerza.",
  },
  "pattern.yod": {
    title: "Yod",
    body: "Dos planetas en sextil y un tercero a 150° de ambos: le dicen «el dedo de Dios» porque parece señalar algo. El planeta señalado carga una sensación de misión incómoda — algo que la vida te pide ajustar una y otra vez, sin dejarte instalar. No se resuelve de una vez: se afina con los años, como un instrumento raro que solo tú sabes tocar.",
  },
  "pattern.grandcross": {
    title: "Gran Cruz",
    body: "Cuatro planetas formando dos oposiciones cruzadas: tensión en las cuatro direcciones a la vez. Es de los patrones más exigentes — la sensación de que siempre hay un frente abierto, tire donde tires. Su regalo está a la altura: quien aprende a sostener esa cruz desarrolla una capacidad de trabajo y de aguante que pocos mapas conocen.",
  },

  // ——— Sistemas de casas ———
  "housesystem.placidus": {
    title: "Placidus",
    body: "Divide el cielo según el tiempo que cada grado tarda en subir por el horizonte, así que las casas salen de tamaños desiguales. Es el sistema más usado en la astrología occidental moderna: si no sabes cuál elegir, probablemente ya estás usando este.",
  },
  "housesystem.koch": {
    title: "Koch",
    body: "Parecido a Placidus, pero calcula las casas intermedias anclándolas más al lugar exacto de tu nacimiento. Tiene seguidores fieles — sobre todo en Europa — que sienten que sus casas 2 a 12 describen mejor su vida con este corte.",
  },
  "housesystem.equal": {
    title: "Casas Iguales",
    body: "Doce casas de exactamente 30° cada una, contadas desde tu Ascendente. Es simple y estable, y tiene sentido especial para quien nació en latitudes extremas, donde otros sistemas deforman las casas hasta lo absurdo.",
  },
  "housesystem.wholesign": {
    title: "Signos Enteros",
    body: "Cada signo completo es una casa: el signo de tu Ascendente es toda tu casa 1, el siguiente la 2, y así. Es el sistema más antiguo que se conoce — el favorito de la astrología helenística y de quienes prefieren leer la carta con trazos claros y sin fronteras a mitad de signo.",
  },
  "housesystem.regiomontanus": {
    title: "Regiomontanus",
    body: "Corta el cielo proyectando divisiones desde el ecuador celeste hacia tu horizonte, un método medieval que dominó Europa durante siglos. Hoy tiene sentido sobre todo para quienes practican astrología horaria — la de responder preguntas concretas — donde sigue siendo el estándar clásico.",
  },
  "housesystem.porphyry": {
    title: "Porfirio",
    body: "Toma los cuatro ángulos de tu carta y divide cada cuadrante en tres partes iguales: un punto medio elegante entre lo simple y lo astronómico. Tiene sentido para quien quiere respetar sus ángulos exactos sin casarse con cálculos más intrincados.",
  },

  // ——— Zodiacos ———
  "zodiac.tropical": {
    title: "Zodiaco Tropical",
    body: "Ancla el zodiaco a las estaciones: Aries empieza siempre en el equinoccio de primavera del hemisferio norte, sin importar qué constelación haya detrás. Es el sistema de la astrología occidental — lee tu carta en clave de la relación entre la Tierra y el Sol, el ciclo de la luz.",
  },
  "zodiac.sidereal": {
    title: "Zodiaco Sideral",
    body: "Ancla el zodiaco a las constelaciones visibles en el cielo, que se han ido corriendo respecto a las estaciones — hoy la diferencia ronda los 24°. Es el sistema de la astrología védica: si tu Sol «cambia de signo» al calcularlo así, no es un error — es otro mapa midiendo con otra vara.",
  },

  // ——— Elementos ———
  "element.fire": {
    title: "Fuego",
    body: "El elemento del impulso, la fe y el entusiasmo. Con mucho fuego en tu carta, arrancas rápido, contagias energía y necesitas movimiento — el riesgo es quemarte o quemar a otros con tanta llama. Con poco, encender la propia motivación cuesta: no te falta capacidad, te falta chispa inicial, y ayuda rodearte de gente y proyectos que te la presten.",
  },
  "element.earth": {
    title: "Tierra",
    body: "El elemento de lo concreto: el cuerpo, el dinero, lo que se puede tocar y sostener. Con mucha tierra, eres alguien en quien apoyarse — práctico, constante — aunque puedas quedarte de más en lo seguro. Con poca, las ideas te sobran y el aterrizaje te falta: tu trabajo es darle cuerpo a lo que imaginas, un hábito y una fecha a la vez.",
  },
  "element.air": {
    title: "Aire",
    body: "El elemento de la mente y el vínculo: las palabras, las ideas, la distancia que permite entender. Con mucho aire, lo piensas todo y lo conversas todo — el riesgo es vivir en la cabeza y mirar tu propia vida desde el balcón. Con poco, te cuesta poner en palabras lo que te pasa o tomar perspectiva: escribir y hablar con otros te ordena por dentro.",
  },
  "element.water": {
    title: "Agua",
    body: "El elemento del sentir: las emociones, la intuición, lo que se sabe sin saber cómo. Con mucha agua, eres esponja — captas el clima emocional de cualquier cuarto, y necesitas orillas para no ahogarte en lo ajeno. Con poca, las emociones te llegan con retraso o en idioma extranjero: no es frialdad, es que tu sentir pide más tiempo y más permiso.",
  },

  // ——— Modalidades ———
  "modality.cardinal": {
    title: "Cardinal",
    body: "La energía que inicia: la que ve el terreno vacío y pone la primera piedra. Con mucha energía cardinal, arrancas proyectos sin esfuerzo — terminarlos es otra historia — y te impacienta esperar a que otros decidan. Con poca, prefieres sumarte a lo que ya está en marcha: dar tú el primer paso es tu músculo a entrenar.",
  },
  "modality.fixed": {
    title: "Fija",
    body: "La energía que sostiene: la que se queda cuando el entusiasmo inicial se fue. Con mucha energía fija, tienes una constancia que mueve montañas — y una terquedad que a veces las defiende aunque ya no sirvan. Con poca, empezar te resulta fácil y sostener te cuesta: tu trabajo es quedarte un capítulo más de lo que el impulso te pide.",
  },
  "modality.mutable": {
    title: "Mutable",
    body: "La energía que se adapta: la que dobla sin romperse cuando el plan cambia. Con mucha energía mutable, fluyes con cualquier giro — el riesgo es dispersarte tanto que nadie sepa dónde estás parado, ni siquiera tú. Con poca, los cambios de última hora te descolocan: avisarte con tiempo es un regalo, y practicar soltar el plan, tu aprendizaje.",
  },
};
