// Glosario de significados (ES) — la capa "toca y entiende" de toda la web.
// Voz Aluna: segunda persona, cálida y honesta, 2–4 frases. Claves en inglés,
// namespaced (sign.* planet.* house.* aspect.* term.* dignity.* pattern.*
// housesystem.* zodiac.* element.* modality.* bazi.*). Paridad EN vigilada por test.
export interface GlossaryEntry { title: string; glyph?: string; body: string }

export const GLOSSARY_ES: Record<string, GlossaryEntry> = {
  "aspect.trine": {
    title: "Trígono", glyph: "△",
    body: "Dos planetas a 120°, en el mismo elemento: la energía fluye entre ellos sin esfuerzo. Es un talento que ya traes de serie — tan natural que a veces ni lo notas. El trabajo con un trígono no es ganarlo, es no darlo por sentado.",
  },
  "term.orb": {
    title: "Orbe",
    body: "Los grados que le faltan (o le sobran) al aspecto para ser exacto. Cuanto más pequeño el orbe, más fuerte se siente: un aspecto a 0.5° te habla a diario; a 7°, susurra de fondo.",
  },
  "dignity.exaltation": {
    title: "Exaltación",
    body: "El planeta está en un signo que amplifica su mejor versión, como un invitado de honor. No está en su casa (eso sería domicilio), pero aquí se le celebra: su energía sube de voltaje y pide expresarse en grande.",
  },

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
};
