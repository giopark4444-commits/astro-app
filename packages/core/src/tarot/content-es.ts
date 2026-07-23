// packages/core/src/tarot/content-es.ts
// Contenido tarot (ES): voz Aluna — evolutiva, segunda persona, sin fatalismo,
// imágenes concretas. Este archivo es el motor de datos ES; content-en.ts SOLO
// exporta datos EN (misma dirección de import que horoscope: es→en).
// Vive en @aluna/core porque web y móvil comparten este contenido byte-igual
// (precedente: glossary).
import { TAROT_CARDS_EN, DICTS_READING_EN } from "./content-en";
import { cardById } from "./deck";

export interface TarotAmbits {
  love: string;
  work: string;
  path: string;
}

export interface TarotCardContent {
  name: string;
  keywords: string[];
  essence: string;
  upright: TarotAmbits;
  reversed: TarotAmbits;
  bridge: string;
}

export const TAROT_CARDS_ES: Record<string, TarotCardContent> = {
  fool: {
    name: "El Loco",
    keywords: ["comienzo", "confianza", "salto", "inocencia"],
    essence:
      "Llegas al borde del acantilado con el equipaje ligero: El Loco no ignora el riesgo, elige confiar más en el camino que en el mapa. Es la energía de empezar sin garantías, con los ojos nuevos.",
    upright: {
      love: "Algo nuevo pide espacio: una persona, una etapa, una forma de querer sin libreto. Di sí antes de tener todas las respuestas.",
      work: "El proyecto que te da un poco de vértigo es el que te va a enseñar. Empieza pequeño, pero empieza.",
      path: "Tu alma pide primera vez: territorio sin mapa. La inocencia aquí no es ingenuidad, es apertura deliberada.",
    },
    reversed: {
      love: "Revisa si el salto es fe o huida: la espontaneidad que no mira a nadie deja caídas ajenas.",
      work: "Frenar no es fracasar. Un plan mínimo convierte el impulso en dirección.",
      path: "El vértigo que sientes es información: algo pide preparación antes que valentía.",
    },
    bridge: "El Loco respira el aire de Urano: la libertad que interrumpe lo previsible.",
  },
  magician: {
    name: "El Mago",
    keywords: ["voluntad", "recursos", "creación", "foco"],
    essence:
      "Todo está ya sobre la mesa: lo que tienes alcanza. El Mago no espera más herramientas, canaliza las que hay con una intención clara y las convierte en resultado.",
    upright: {
      love: "Tienes lo que hace falta para nombrar lo que quieres en voz alta, sin rodeos ni pruebas de fuego.",
      work: "Menos preparación, más ejecución: hoy la idea puede volverse cosa concreta si le pones las manos encima.",
      path: "Eres canal, no espectador: la voluntad enfocada es tu forma de rezar.",
    },
    reversed: {
      love: "Cuidado con manipular el resultado en vez de mostrar tu intención real; la magia sin ética se vuelve truco.",
      work: "La dispersión diluye el poder: elige un solo objetivo antes de mover una sola ficha más.",
      path: "El talento sin dirección se queda en ensayo; pregúntate para qué, no solo cómo.",
    },
    bridge: "El Mago lleva el sello de Mercurio: la mente que convierte pensamiento en palabra y palabra en acto.",
  },
  "high-priestess": {
    name: "La Sacerdotisa",
    keywords: ["intuición", "misterio", "quietud", "saber interior"],
    essence:
      "Entre las columnas hay un velo que no se aparta a la fuerza: La Sacerdotisa guarda un saber que no se explica, se escucha. Es la voz baja que sabe antes de que la mente entienda.",
    upright: {
      love: "Confía en lo que sientes antes de que puedas justificarlo con palabras; el cuerpo ya lo sabe.",
      work: "No todo se resuelve investigando más: hay una respuesta que ya tienes, en silencio, esperando que la oigas.",
      path: "Tu templo es interior. La quietud no es vacío, es donde vive tu verdad más honda.",
    },
    reversed: {
      love: "El secreto que guardas por miedo empieza a pesar más que la verdad que evita; hay algo por nombrar.",
      work: "Desconectada de tu intuición, giras en círculos de datos sin decidir; vuelve adentro un momento.",
      path: "El misterio se vuelve evasión cuando usas el silencio para no mirarte. Hoy el silencio es para escuchar, no para esconder.",
    },
    bridge: "La Sacerdotisa lleva la luz plateada de la Luna: la marea interior que no se puede apurar.",
  },
  empress: {
    name: "La Emperatriz",
    keywords: ["abundancia", "creación", "cuerpo", "cuidado"],
    essence:
      "El jardín crece porque alguien lo riega sin exigirle prisa: La Emperatriz encarna la abundancia que nace de habitar el cuerpo y cuidar lo vivo, no de forzarlo.",
    upright: {
      love: "El placer sencillo — un abrazo largo, un plato compartido — es tan importante como la conversación profunda.",
      work: "Deja que el proyecto tenga su propio ritmo de gestación; no todo florece a la velocidad que quisieras.",
      path: "Tu cuerpo es territorio sagrado, no obstáculo. Nutrirte es también un acto espiritual.",
    },
    reversed: {
      love: "El cuidado que das a otros no puede vaciarte a ti; revisa cuánto de tu jardín te queda para ti misma.",
      work: "La creatividad se ahoga si todo se mide en producto; regresa al placer de hacer, no solo de entregar.",
      path: "Confundir abundancia con acumulación te aleja de lo que en verdad nutre. Menos, mejor elegido.",
    },
    bridge: "La Emperatriz lleva la gracia de Venus: la belleza que también sabe sostener y hacer crecer.",
  },
  emperor: {
    name: "El Emperador",
    keywords: ["estructura", "autoridad", "disciplina", "protección"],
    essence:
      "Alguien tiene que sostener el techo para que la casa no se caiga: El Emperador es la estructura que protege, la disciplina que hace posible que lo demás florezca con seguridad.",
    upright: {
      love: "Poner límites claros no enfría el vínculo, lo hace habitable; di qué necesitas sin pedir disculpas.",
      work: "El orden que impones hoy es el que te va a sostener cuando venga la tormenta. Construye la estructura primero.",
      path: "Tu fuego pide forma, no jaula: ser firme contigo misma es un acto de amor, no de control.",
    },
    reversed: {
      love: "La autoridad que se vuelve rigidez asfixia lo que quería proteger; pregunta antes de decidir por otros.",
      work: "El control excesivo frena a quienes lideras; suelta un poco de las riendas y confía en el proceso.",
      path: "La estructura sin propósito se vuelve prisión propia. Revisa para qué construyes, no solo cómo.",
    },
    bridge: "El Emperador lleva el fuego de Aries: la voluntad que abre camino y después lo defiende.",
  },
  hierophant: {
    name: "El Hierofante",
    keywords: ["tradición", "aprendizaje", "comunidad", "valores"],
    essence:
      "Antes de ti hubo quienes ya caminaron esto: El Hierofante es el puente entre lo que aprendiste de otros y lo que vas a transmitir tú. No inventa la rueda, la honra y la hace propia.",
    upright: {
      love: "Un vínculo que se apoya en valores compartidos — familia, comunidad, ritual — te da raíz, no ataduras.",
      work: "Buscar un mentor o un método probado ahorra caminos que ya fueron recorridos por otros. Aprende antes de reinventar.",
      path: "Pertenecer a una tradición no te hace menos tuya; te da un lenguaje para lo que ya sentías.",
    },
    reversed: {
      love: "Seguir la norma solo porque toca revisa si de verdad te representa, o si es un guion heredado sin cuestionar.",
      work: "La estructura que copiaste ya no te sirve; hay permiso para adaptar la regla a lo que hoy es verdad.",
      path: "El dogma sin pregunta detiene tu crecimiento. Honra la enseñanza, pero atrévete a hacerle preguntas.",
    },
    bridge: "El Hierofante lleva la tierra fértil de Tauro: la tradición que, bien plantada, también da fruto.",
  },
  lovers: {
    name: "Los Enamorados",
    keywords: ["elección", "unión", "valores", "alineación"],
    essence:
      "No es solo una carta de romance: Los Enamorados hablan de la elección que revela quién eres cuando tienes que decidir entre dos caminos que ambos te quieren.",
    upright: {
      love: "La conexión que sientes es real cuando también te ayuda a elegirte a ti misma con más claridad.",
      work: "La decisión frente a ti pide que revises tus valores, no solo la conveniencia inmediata.",
      path: "Cada elección es un espejo: te dice quién quieres ser, no solo qué quieres tener.",
    },
    reversed: {
      love: "El desalineamiento de valores no se resuelve con más pasión; hace falta conversación honesta.",
      work: "Elegir por miedo a decepcionar a otros te aleja de la decisión que en realidad es tuya.",
      path: "La indecisión prolongada también es una elección; pregúntate qué evitas mirando de frente.",
    },
    bridge: "Los Enamorados llevan el aire curioso de Géminis: la conversación que hace posible la elección consciente.",
  },
  chariot: {
    name: "El Carro",
    keywords: ["voluntad", "dirección", "disciplina interna", "avance"],
    essence:
      "Dos fuerzas que tiran en direcciones opuestas y aun así el carro avanza: El Carro es la voluntad que unifica impulsos contrarios y los pone a caminar en la misma dirección.",
    upright: {
      love: "Sostener el vínculo pide dirección compartida, no solo intensidad; ponte de acuerdo en hacia dónde van.",
      work: "El avance es posible si dejas de pelear contigo misma; alinea cabeza y deseo antes de pisar el acelerador.",
      path: "Tu victoria no es contra otros, es contra la dispersión interna que te frena.",
    },
    reversed: {
      love: "Cuando cada parte tira para su lado, el vínculo se estanca; hace falta una conversación que reordene el rumbo.",
      work: "Avanzar sin dirección clara gasta energía sin resultado; frena un momento antes de acelerar de nuevo.",
      path: "La voluntad forzada sin autocontrol termina en choque; el verdadero avance nace de la calma primero.",
    },
    bridge: "El Carro lleva el agua protectora de Cáncer: la voluntad que también sabe resguardar lo que ama.",
  },
  strength: {
    name: "La Fuerza",
    keywords: ["coraje suave", "paciencia", "compasión", "dominio propio"],
    essence:
      "No doma al león a golpes, lo calma con la mano abierta: La Fuerza es el coraje que no necesita imponerse, el poder que se ejerce con ternura y paciencia infinita.",
    upright: {
      love: "La suavidad no es debilidad: sostener a alguien difícil con paciencia es una forma real de fuerza.",
      work: "El desafío se resuelve con constancia calmada, no con una pelea de voluntades. Respira antes de reaccionar.",
      path: "Tu instinto más salvaje no se reprime, se acompaña con compasión hasta que se vuelve aliado.",
    },
    reversed: {
      love: "La duda de ti misma te hace ceder terreno que sí merecías sostener; recuerda tu propio poder tranquilo.",
      work: "Forzar la situación con más presión solo la endurece; vuelve a la calma antes de insistir.",
      path: "Reprimir lo que sientes no es dominio, es negación. La fuerza real abraza incluso lo que asusta.",
    },
    bridge: "La Fuerza lleva el sol de Leo: el coraje que brilla sin necesitar rugir.",
  },
  hermit: {
    name: "El Ermitaño",
    keywords: ["retiro", "introspección", "guía interior", "soledad elegida"],
    essence:
      "Sube solo a la montaña no para escapar del mundo, sino para ver con más claridad: El Ermitaño enciende su propia lámpara cuando afuera todo está en penumbra.",
    upright: {
      love: "Un tiempo de distancia no rompe el vínculo, lo puede ordenar; necesitas encontrarte antes de encontrarte con otro.",
      work: "La respuesta que buscas no está en más reuniones, está en el silencio que te permite pensar con claridad.",
      path: "Retirarte no es abandonar, es afinar el oído hacia tu propia voz sin el ruido de afuera.",
    },
    reversed: {
      love: "El aislamiento prolongado empieza a doler más de lo que protege; hay alguien esperando que abras la puerta.",
      work: "Pensar demasiado sin compartir la idea la deja estancada; sal del retiro y pon tu luz al servicio de otros.",
      path: "La soledad que se vuelve encierro deja de ser sabia. Tu lámpara también sirve para guiar a alguien más.",
    },
    bridge: "El Ermitaño lleva la tierra minuciosa de Virgo: el análisis que se convierte en sabiduría cuando se hace en silencio.",
  },
  "wheel-of-fortune": {
    name: "La Rueda de la Fortuna",
    keywords: ["ciclos", "cambio", "destino", "movimiento"],
    essence:
      "La rueda gira y nadie se queda arriba ni abajo para siempre: es el recordatorio de que estás dentro de un ciclo más grande que tú, y que el movimiento mismo es la lección.",
    upright: {
      love: "Un giro inesperado abre una puerta que no habías considerado; déjate sorprender por el momento.",
      work: "La oportunidad llega en su propio tiempo, no en el tuyo; prepárate para reconocerla cuando aparezca.",
      path: "Confiar en el ciclo no es pasividad: es saber que también las cuestas difíciles llevan a otro paisaje.",
    },
    reversed: {
      love: "Resistirte al cambio del vínculo solo alarga el malestar; pregúntate qué ciclo ya cumplió su propósito.",
      work: "Un revés no es el final de la historia, es un giro más de la rueda; ajusta el plan, no la esperanza.",
      path: "Culpar al destino te desconecta de tu parte activa en el ciclo; hay una elección tuya esperando ser hecha.",
    },
    bridge: "La Rueda lleva la expansión de Júpiter: el giro que, tarde o temprano, trae más suerte que la que se fue.",
  },
  justice: {
    name: "La Justicia",
    keywords: ["equilibrio", "verdad", "responsabilidad", "consecuencia"],
    essence:
      "La balanza no juzga con crueldad, mide con honestidad: La Justicia pide que mires las cosas tal como son, y que aceptes tu parte exacta en lo que ha pasado.",
    upright: {
      love: "La honestidad completa, sin editar lo incómodo, es lo que el vínculo necesita para equilibrarse de verdad.",
      work: "Una decisión pide que midas con la misma vara para todos, incluida tú misma. Sé justa antes que cómoda.",
      path: "Hacerte responsable de tu parte, sin culpa ni negación, es el camino más corto hacia tu propia paz.",
    },
    reversed: {
      love: "Evitar la conversación difícil por miedo al conflicto desequilibra más de lo que protege.",
      work: "Una injusticia que se ha tolerado demasiado tiempo pide ser nombrada, no callada un poco más.",
      path: "Negar tu responsabilidad en lo ocurrido detiene el aprendizaje; la verdad, aunque incómoda, libera.",
    },
    bridge: "La Justicia lleva el aire equilibrado de Libra: la balanza que busca armonía real, no complacencia.",
  },
  "hanged-man": {
    name: "El Colgado",
    keywords: ["pausa", "rendición", "otra perspectiva", "sacrificio consciente"],
    essence:
      "Colgado boca abajo, ve el mundo al revés y descubre algo que no veía de pie: El Colgado enseña que rendirse a la pausa, sin pelear con ella, abre una perspectiva que la prisa no permite.",
    upright: {
      love: "Suelta la necesidad de resolver ya; a veces amar es esperar sin exigirle al tiempo que se apure.",
      work: "Un proyecto detenido no es un fracaso, es una invitación a mirarlo desde un ángulo que no habías probado.",
      path: "Rendirte a lo que no controlas no es debilidad: es el único camino hacia una sabiduría distinta.",
    },
    reversed: {
      love: "Sacrificarte de más sin que nadie lo pida te vacía; revisa si tu entrega es elección o costumbre.",
      work: "Quedarte estancada por miedo a decidir cuesta más que equivocarte; es momento de moverte otra vez.",
      path: "La pausa que se vuelve parálisis deja de enseñar. Ya viste lo que tenías que ver: puedes bajar del árbol.",
    },
    bridge: "El Colgado lleva la disolución de Neptuno: la rendición que, al soltar el control, se vuelve visión.",
  },
  death: {
    name: "La Muerte",
    keywords: ["transformación", "cierre", "renacimiento", "verdad"],
    essence:
      "No es el final que asusta, es el cierre que hace posible lo que sigue: La Muerte poda con precisión lo que ya cumplió su ciclo, para que algo más vivo pueda ocupar su lugar. No hay transformación real sin que algo termine primero.",
    upright: {
      love: "Una forma de vincularte está llegando a su fin; dejarla ir con honestidad abre espacio para algo más verdadero.",
      work: "Lo que funcionaba ya no funciona igual; en vez de resistirte, pregúntate qué versión tuya pide nacer.",
      path: "La identidad que sostenías se está desprendiendo; es incómodo, pero es exactamente lo que toca.",
    },
    reversed: {
      love: "Aferrarte a lo que ya terminó prolonga el dolor sin cambiar el desenlace; el cierre honesto duele menos que la negación.",
      work: "Resistir el cambio necesario solo alarga la incomodidad; el ciclo va a cerrarse igual, con o sin tu permiso.",
      path: "Negar la transformación no la detiene, solo la hace más brusca. Suelta antes de que te suelten a ti.",
    },
    bridge: "La Muerte lleva la intensidad de Escorpio: la transformación que exige morir un poco para renacer más verdadera.",
  },
  temperance: {
    name: "La Templanza",
    keywords: ["equilibrio", "paciencia", "integración", "fluir"],
    essence:
      "Vierte el agua de una copa a otra sin derramar una gota: La Templanza es el arte de mezclar opuestos — prisa y calma, deseo y disciplina — hasta encontrar la medida exacta.",
    upright: {
      love: "El vínculo pide paciencia y ajuste constante, no perfección instantánea; ambos se calibran con el tiempo.",
      work: "Combina lo nuevo con lo probado en vez de elegir un extremo; la mezcla equilibrada es la que rinde.",
      path: "Integrar tus contradicciones — no elegir un solo lado de ti — es tu forma más honesta de sanar.",
    },
    reversed: {
      love: "El exceso hacia un lado, todo entrega o todo distancia, rompe el equilibrio que el vínculo necesitaba.",
      work: "La impaciencia por resultados inmediatos arruina un proceso que pedía tiempo y ajuste gradual.",
      path: "Vivir en extremos te agota; vuelve al punto medio antes de que el desbalance se vuelva costumbre.",
    },
    bridge: "La Templanza lleva el fuego expansivo de Sagitario: la fe que sabe mezclar sentido con paciencia.",
  },
  devil: {
    name: "El Diablo",
    keywords: ["apego", "sombra", "deseo", "libertad posible"],
    essence:
      "Las cadenas en la imagen están flojas, se pueden quitar: El Diablo no es una condena, es un espejo de lo que te ata por costumbre, miedo o placer — y la prueba de que la salida siempre estuvo a tu alcance.",
    upright: {
      love: "Hay un patrón — celos, dependencia, control — que confundes con pasión; nómbralo sin juzgarte para poder soltarlo.",
      work: "Una rutina que te agota se sostiene más por miedo a lo desconocido que por necesidad real. Puedes elegir otra cosa.",
      path: "Tu sombra no es tu enemiga: es la parte de ti que pide ser mirada de frente, no reprimida en secreto.",
    },
    reversed: {
      love: "Estás empezando a ver las cadenas con claridad; ese ver es el primer movimiento real hacia soltarlas.",
      work: "Reconoces el patrón que te limita, y eso ya es más de la mitad del trabajo para cambiarlo.",
      path: "El apego que dominaba empieza a aflojar; date el permiso de caminar hacia la libertad que ya intuyes.",
    },
    bridge: "El Diablo lleva la tierra densa de Capricornio: la estructura que, sin consciencia, se vuelve jaula propia.",
  },
  tower: {
    name: "La Torre",
    keywords: ["quiebre", "revelación", "verdad súbita", "reconstrucción"],
    essence:
      "El rayo no destruye al azar: derriba lo que estaba construido sobre una base falsa. La Torre duele porque revela de golpe una verdad que se venía evitando, y en ese quiebre hay un alivio que todavía no se nota.",
    upright: {
      love: "Una verdad incómoda sale a la luz; lo que se cae no era el amor, era la ilusión que lo cubría.",
      work: "Un cambio abrupto reorganiza el plan entero; lo que parecía estable no lo era tanto como creías.",
      path: "El quiebre no te destruye, te despierta. Lo que se derrumba deja espacio para algo construido con verdad.",
    },
    reversed: {
      love: "Postergar la conversación que sabes que hace falta solo hace más grande la caída cuando llegue.",
      work: "Evitar mirar la grieta en la estructura no la repara, solo retrasa lo inevitable; mejor enfrentarla ahora, en tus términos.",
      path: "El miedo al colapso te mantiene en una calma falsa; a veces hace falta que algo se caiga para poder reconstruir de verdad.",
    },
    bridge: "La Torre lleva el impulso de Marte: la ruptura súbita que, aunque incómoda, abre camino con verdad.",
  },
  star: {
    name: "La Estrella",
    keywords: ["esperanza", "sanación", "confianza", "renovación"],
    essence:
      "Después de la tormenta, vierte agua sobre la tierra sin miedo a quedarse sin nada: La Estrella es la esperanza que no niega lo que dolió, sino que confía en que hay más agua de donde vino esa.",
    upright: {
      love: "Te permites creer otra vez, sin garantías, porque la confianza se reconstruye poco a poco y ya empezaste.",
      work: "Un proyecto que nació de una pérdida empieza a mostrar su propia luz; sigue regando lo que estás sembrando.",
      path: "Tu fe no necesita pruebas para sostenerte; es la certeza tranquila de que lo peor ya pasó.",
    },
    reversed: {
      love: "El desánimo nubla lo que sí está mejorando; date el permiso de notar la luz pequeña que ya volvió.",
      work: "Perder la fe justo antes de que algo florezca es el riesgo más grande ahora; sostén un poco más.",
      path: "La desconexión de tu propia esperanza no significa que se haya ido, solo que necesitas volver a mirar el cielo.",
    },
    bridge: "La Estrella lleva el aire visionario de Acuario: la esperanza colectiva que se atreve a imaginar otro futuro.",
  },
  moon: {
    name: "La Luna",
    keywords: ["intuición", "sombra", "sueños", "lo no dicho"],
    essence:
      "El camino se ve borroso bajo la luz lunar, y aun así hay que caminarlo: La Luna habla de lo que no se entiende del todo con la razón — miedos antiguos, sueños, verdades a medio revelar — y pide que confíes en el instinto más que en la certeza.",
    upright: {
      love: "Hay algo sin decir que flota entre ustedes; no todo necesita explicación inmediata, pero sí honestidad eventual.",
      work: "La situación no es del todo clara todavía; avanza despacio y confía en tu instinto más que en los datos incompletos.",
      path: "Tus sueños y tus miedos están hablando el mismo idioma; escúchalos sin necesitar traducirlos todo de inmediato.",
    },
    reversed: {
      love: "La confusión empieza a despejarse; lo que parecía ilusión se está revelando con más claridad ahora.",
      work: "Un engaño o malentendido sale a la luz; lo que dabas por hecho merece una segunda mirada más despierta.",
      path: "El miedo que te paralizaba pierde fuerza cuando finalmente lo nombras; la niebla empieza a levantar.",
    },
    bridge: "La Luna lleva el agua onírica de Piscis: la disolución de fronteras entre lo consciente y lo que aún duerme.",
  },
  sun: {
    name: "El Sol",
    keywords: ["alegría", "vitalidad", "claridad", "éxito genuino"],
    essence:
      "No hay sombra que discutir aquí: El Sol es la claridad simple de estar viva, de que algo te salió bien y puedes disfrutarlo sin sospechar de la alegría.",
    upright: {
      love: "El vínculo está en un momento luminoso; celebra lo bueno sin buscarle el defecto que todavía no tiene.",
      work: "El reconocimiento que estás recibiendo es merecido; déjate ver sin la incomodidad de restarte mérito.",
      path: "Tu vitalidad natural vuelve a brillar; hoy no hace falta entender todo, solo disfrutar de estar viva.",
    },
    reversed: {
      love: "Fingir que todo está bien cuando algo pesa apaga el brillo real que sí es posible tener; sé honesta primero.",
      work: "Un éxito parcial se siente insuficiente si lo comparas con un ideal imposible; celebra lo que sí lograste.",
      path: "La alegría forzada cansa más que la tristeza honesta; date permiso de sentir lo que en verdad sientes hoy.",
    },
    bridge: "El Sol lleva el fuego central del astro rey: la vitalidad que ilumina sin necesitar ocultar nada.",
  },
  judgement: {
    name: "El Juicio",
    keywords: ["llamado", "renacer", "evaluación honesta", "despertar"],
    essence:
      "La trompeta suena y algo en ti se levanta de donde estaba dormido: El Juicio es el llamado a mirar tu historia completa con honestidad y decidir, desde ahí, quién quieres ser de ahora en adelante.",
    upright: {
      love: "Un vínculo pasado o presente pide una mirada honesta, sin idealizar ni condenar, solo para entender qué aprendiste.",
      work: "Sientes el llamado a un propósito más grande que la tarea diaria; escúchalo, aunque implique un giro.",
      path: "Este es un momento de despertar real: ya no puedes fingir que no viste lo que ya viste sobre ti misma.",
    },
    reversed: {
      love: "El miedo a juzgarte con dureza te hace evitar mirar el patrón que se repite; la honestidad no tiene que ser castigo.",
      work: "Postergar la evaluación honesta de tu camino no la hace innecesaria, solo retrasa el despertar que ya se asoma.",
      path: "La autocrítica excesiva no es lo mismo que la claridad; suéltate del juicio duro para poder escuchar el llamado real.",
    },
    bridge: "El Juicio lleva la transformación profunda de Plutón: la muerte simbólica que precede a un despertar real.",
  },
  world: {
    name: "El Mundo",
    keywords: ["plenitud", "cierre de ciclo", "integración", "logro"],
    essence:
      "El círculo se completa, no porque todo sea perfecto, sino porque cada pieza finalmente encontró su lugar: El Mundo es la plenitud de haber recorrido el ciclo entero y poder mirarlo entero, integrado.",
    upright: {
      love: "El vínculo alcanza una madurez que se siente completa en sí misma, sin necesitar nada más para estar bien.",
      work: "Un proyecto largo llega a su cierre natural; date el crédito completo antes de saltar al siguiente.",
      path: "Has integrado partes de ti que antes estaban separadas; este logro es tan tuyo como silencioso.",
    },
    reversed: {
      love: "Sientes que falta un último paso para cerrar el ciclo; nombra qué es exactamente lo que falta.",
      work: "Un proyecto casi terminado se estanca justo antes de la meta; identifica el detalle pendiente y ciérralo.",
      path: "La sensación de incompletitud señala una pieza que aún no encaja; no es fracaso, es un ajuste final.",
    },
    bridge: "El Mundo lleva la estructura de Saturno: la disciplina que, cumplido su tiempo, se corona en logro real.",
  },

  // --- Bastos (fuego: acción, voluntad creativa, impulso) ---
  "wands-01": {
    name: "As de Bastos",
    keywords: ["chispa", "impulso creativo", "nuevo proyecto", "vitalidad"],
    essence:
      "Una mano sale de la nube sosteniendo un bastón que todavía tiene hojas verdes: el As de Bastos es la semilla pura del fuego, la chispa antes de que sepas siquiera en qué se va a convertir.",
    upright: {
      love: "Sientes ese impulso de acercarte sin pensarlo demasiado; el deseo genuino no necesita justificación.",
      work: "Una idea te llega con toda su fuerza intacta; agárrala ahora, antes de que la razón la enfríe.",
      path: "Tu vitalidad pide expresarse en algo concreto: no la dejes solo en entusiasmo, dale una forma.",
    },
    reversed: {
      love: "El interés se enciende y se apaga sin llegar a nada; pregúntate si de verdad quieres construir o solo sentir la chispa.",
      work: "La motivación arranca fuerte y se estanca rápido; el proyecto necesita más que el primer impulso para sostenerse.",
      path: "Tienes la energía pero no el canal; busca dónde de verdad quieres poner este fuego antes de que se disperse.",
    },
    bridge: "El As de Bastos es fuego en su forma más pura: el impulso creativo antes de que tome cualquier dirección.",
  },
  "wands-02": {
    name: "Dos de Bastos",
    keywords: ["planeación", "visión", "decisión", "horizonte"],
    essence:
      "Con el globo en la mano y la mirada puesta más allá del castillo, el Dos de Bastos ya no es la chispa, es la primera pregunta seria: ¿hacia dónde llevo este fuego?",
    upright: {
      love: "Empiezas a imaginar un futuro compartido más concreto; nombra en voz alta lo que estás visualizando.",
      work: "Tienes el terreno ganado, ahora toca decidir el siguiente paso con visión de largo plazo, no solo reacción.",
      path: "El mundo se siente más grande que tu zona conocida; deja que esa expansión te dé dirección, no vértigo.",
    },
    reversed: {
      love: "El miedo a comprometerte con un futuro concreto te mantiene mirando el horizonte sin dar el paso.",
      work: "La falta de un plan claro hace que la energía se disperse en muchas direcciones a la vez.",
      path: "Quedarte solo en la fantasía del futuro sin aterrizar ninguna decisión frena el impulso que ya tenías.",
    },
    bridge: "El Dos de Bastos es fuego que empieza a mirar lejos: la voluntad que necesita un horizonte para no consumirse en el sitio.",
  },
  "wands-03": {
    name: "Tres de Bastos",
    keywords: ["expansión", "espera activa", "colaboración", "visión a distancia"],
    essence:
      "De pie sobre el acantilado, mirando los barcos zarpar, el Tres de Bastos es la espera que no es pasiva: ya sembraste, ahora toca confiar en que el viaje siga su curso.",
    upright: {
      love: "Un vínculo se expande más allá de lo cercano — distancia, planes a futuro, un compromiso que crece.",
      work: "Los primeros resultados empiezan a llegar desde lejos; sigue mirando el horizonte con paciencia activa.",
      path: "Tu visión ya está en marcha; no necesitas empujar cada barco, solo confiar en el rumbo que le diste.",
    },
    reversed: {
      love: "La distancia empieza a pesar más de lo que suma; revisa si el vínculo sigue creciendo o solo se estiró.",
      work: "Un retraso inesperado frustra el plan; ajusta el tiempo de espera sin abandonar la dirección original.",
      path: "La impaciencia por ver resultados te hace dudar de una visión que en realidad sigue viva, solo tarda.",
    },
    bridge: "El Tres de Bastos es fuego que ya viaja lejos de ti: la voluntad expandida que confía en su propio alcance.",
  },
  "wands-04": {
    name: "Cuatro de Bastos",
    keywords: ["celebración", "hogar", "logro compartido", "estabilidad festiva"],
    essence:
      "Cuatro bastones sostienen una guirnalda de flores y debajo se celebra: el Cuatro de Bastos es el fuego que por fin encuentra un lugar donde asentarse y ser motivo de fiesta.",
    upright: {
      love: "Un momento de celebración compartida — una llegada, un aniversario, un hogar — merece ser vivido sin apuro.",
      work: "Un logro intermedio pide ser reconocido antes de seguir; hazte una pausa festiva antes del siguiente tramo.",
      path: "Encuentras un punto de estabilidad que se siente como llegar a casa; disfrútalo sin culpa por parar un momento.",
    },
    reversed: {
      love: "La celebración se siente incompleta o forzada; nombra qué falta para que el hogar se sienta realmente tuyo.",
      work: "Un logro que debería celebrarse pasa desapercibido; date tú misma el reconocimiento si nadie más lo hace.",
      path: "La inestabilidad en la base te impide disfrutar lo que ya construiste; vuelve a los cimientos antes de festejar.",
    },
    bridge: "El Cuatro de Bastos es fuego que se vuelve hogar: la voluntad que encuentra estabilidad sin apagarse.",
  },
  "wands-05": {
    name: "Cinco de Bastos",
    keywords: ["fricción", "competencia", "conflicto creativo", "desorden"],
    essence:
      "Cinco figuras chocan bastones sin coordinarse entre sí: el Cinco de Bastos es el fuego que se multiplica en direcciones distintas y genera fricción antes de encontrar un ritmo común.",
    upright: {
      love: "Diferencias de opinión salen a la superficie; el roce no es señal de fin, es señal de que ambos tienen fuego propio.",
      work: "La competencia entre ideas o personas genera ruido; encuentra el punto donde la tensión se vuelve creatividad.",
      path: "El caos que sientes no es destrucción, es energía sin canal todavía; dale una estructura antes de agotarte en él.",
    },
    reversed: {
      love: "El conflicto que se evitaba por tanto tiempo finalmente se resuelve o se nombra con claridad.",
      work: "La competencia interna del equipo empieza a bajar; hay espacio para colaborar en vez de chocar.",
      path: "Estás aprendiendo a soltar la necesidad de ganar cada roce; no todo desacuerdo pide una victoria.",
    },
    bridge: "El Cinco de Bastos es fuego sin coordinar: la voluntad múltiple que todavía no encontró su ritmo común.",
  },
  "wands-06": {
    name: "Seis de Bastos",
    keywords: ["victoria", "reconocimiento", "confianza", "avance visible"],
    essence:
      "Vuelve a caballo con la corona de laurel y la gente lo recibe: el Seis de Bastos es el fuego que ya dio fruto visible y merece ser mostrado sin falsa modestia.",
    upright: {
      love: "El esfuerzo puesto en el vínculo empieza a notarse; deja que te vean disfrutar de lo que construiste.",
      work: "Un logro público llega, y es merecido; recíbelo sin restarle importancia por incomodidad.",
      path: "Tu confianza sube porque hay evidencia real detrás, no solo ilusión; camina con esa certeza ganada.",
    },
    reversed: {
      love: "Buscar aprobación externa por encima de tu propia satisfacción te deja dependiente de la mirada ajena.",
      work: "Un reconocimiento que esperabas se retrasa o no llega como imaginabas; el valor del trabajo no depende de eso.",
      path: "El orgullo mal dirigido te aleja de la humildad que también necesita tu camino; celebra sin necesitar aplauso.",
    },
    bridge: "El Seis de Bastos es fuego que ya se hizo ver: la voluntad confirmada por un resultado que otros también notan.",
  },
  "wands-07": {
    name: "Siete de Bastos",
    keywords: ["defensa", "postura firme", "desafío sostenido", "convicción"],
    essence:
      "Desde el punto alto, defiende su posición contra los bastones que suben desde abajo: el Siete de Bastos es el fuego que se sostiene cuando lo que construiste empieza a ser cuestionado.",
    upright: {
      love: "Sostener lo que crees del vínculo frente a opiniones externas te pide convicción, no terquedad.",
      work: "Defiendes una postura ganada con esfuerzo; mantente firme sin necesitar convencer a todos.",
      path: "El desafío que enfrentas confirma que ya llegaste a un lugar que vale la pena proteger.",
    },
    reversed: {
      love: "Sentirte constantemente a la defensiva agota el vínculo; pregúntate si el ataque es real o percibido.",
      work: "Ceder terreno por cansancio en vez de por convicción te deja en una posición que no elegiste realmente.",
      path: "Defender todo, incluso lo que ya no importa, te agota sin sentido; elige mejor tus batallas.",
    },
    bridge: "El Siete de Bastos es fuego puesto a prueba: la voluntad que aprende a sostenerse bajo presión.",
  },
  "wands-08": {
    name: "Ocho de Bastos",
    keywords: ["velocidad", "movimiento", "mensajes", "aceleración"],
    essence:
      "Ocho bastones vuelan por el aire en línea recta, sin obstáculos: el Ocho de Bastos es el fuego que finalmente encuentra vía libre y avanza a una velocidad que no da tiempo a dudar.",
    upright: {
      love: "Las cosas se mueven rápido — una noticia, un reencuentro, una decisión que llega antes de lo esperado.",
      work: "Todo se acelera de golpe: mensajes, señales, avances; súbete al ritmo en vez de frenarlo con exceso de análisis.",
      path: "El momentum que sientes es real; confía en el impulso y actúa mientras el viento sigue a favor.",
    },
    reversed: {
      love: "La comunicación se traba justo cuando más rápido necesitabas que fluyera; revisa qué se está frenando y por qué.",
      work: "Retrasos inesperados frustran un avance que venía tomando velocidad; paciencia antes de forzar el ritmo perdido.",
      path: "La prisa por llegar te hace saltarte pasos importantes; a veces el fuego rápido también necesita una pausa breve.",
    },
    bridge: "El Ocho de Bastos es fuego sin fricción: la voluntad que avanza más rápido que el pensamiento que la analiza.",
  },
  "wands-09": {
    name: "Nueve de Bastos",
    keywords: ["resiliencia", "última reserva", "vigilancia", "casi llegar"],
    essence:
      "Herido pero de pie, sostiene el último bastón con la guardia todavía en alto: el Nueve de Bastos es el fuego que ya dio casi todo lo que tenía y aun así elige no soltar.",
    upright: {
      love: "Has puesto mucho de tu parte y estás cansada, pero el vínculo sigue mereciendo un último esfuerzo consciente.",
      work: "Estás cerca de la meta, agotada pero con reservas; no es el momento de abandonar, es el momento de sostener.",
      path: "Tu resiliencia no viene de no haber sido herida, viene de seguir de pie después de estarlo.",
    },
    reversed: {
      love: "La desconfianza acumulada por heridas pasadas te hace defenderte incluso de quien no te está atacando.",
      work: "El agotamiento te hace ver amenazas donde no las hay; discierne entre vigilancia útil y paranoia cansada.",
      path: "Sostener la guardia todo el tiempo, incluso cuando ya no hace falta, te impide descansar y sanar de verdad.",
    },
    bridge: "El Nueve de Bastos es fuego casi consumido que se niega a apagarse: la voluntad que persiste un paso más.",
  },
  "wands-10": {
    name: "Diez de Bastos",
    keywords: ["sobrecarga", "responsabilidad", "carga final", "cierre pesado"],
    essence:
      "Carga los diez bastones encorvado, casi sin ver el camino frente a él: el Diez de Bastos es el fuego llevado al límite, la culminación de un ciclo que pesa justo antes de poder soltarlo.",
    upright: {
      love: "Cargas más responsabilidad emocional de la que compartes en voz alta; pide ayuda antes de doblarte del todo.",
      work: "Estás en el tramo final de un proyecto grande y el peso se siente máximo; ya casi llegas, distribuye la carga si puedes.",
      path: "Lo que cargas es tuyo por elección, pero eso no significa que debas llevarlo sola hasta el final.",
    },
    reversed: {
      love: "Empiezas a soltar cargas que nunca debiste llevar sola; delegar no es fallar, es finalmente pedir apoyo.",
      work: "Reconoces que estás sobrecargada y das el primer paso para redistribuir el trabajo antes de colapsar.",
      path: "El alivio llega cuando aceptas que no toda responsabilidad tiene que ser tuya para siempre.",
    },
    bridge: "El Diez de Bastos es fuego en su punto más pesado: la voluntad que corona el ciclo justo antes de poder descansar.",
  },
  "wands-page": {
    name: "Paje de Bastos",
    keywords: ["curiosidad ardiente", "mensajero", "entusiasmo", "aprendiz del fuego"],
    essence:
      "Mira su bastón como si fuera la primera vez que ve fuego: el Paje de Bastos trae noticias, ideas y una curiosidad que todavía no sabe adónde la va a llevar, y eso es justo su encanto.",
    upright: {
      love: "Llega con una energía juguetona y directa; deja que el entusiasmo hable antes de que la cautela lo enfríe.",
      work: "Una idea nueva pide ser explorada sin plan perfecto todavía; el aprendizaje es parte del proceso, no un obstáculo.",
      path: "Tu curiosidad por lo nuevo es información espiritual: te está mostrando por dónde quiere crecer tu fuego.",
    },
    reversed: {
      love: "El entusiasmo inicial se dispersa antes de convertirse en algo constante; nombra qué haría falta para sostenerlo.",
      work: "Empiezas muchas cosas a la vez sin terminar ninguna; el fuego pide un poco de enfoque para no apagarse solo.",
      path: "La impaciencia por resultados inmediatos te hace subestimar el valor de simplemente estar aprendiendo.",
    },
    bridge: "El Paje de Bastos es el número 11 vuelto aprendiz: el maestro en potencia que todavía juega con su propio fuego.",
  },
  "wands-knight": {
    name: "Caballero de Bastos",
    keywords: ["impulso total", "aventura", "impaciencia", "acción sin freno"],
    essence:
      "Sale al galope antes de terminar de planear la ruta: el Caballero de Bastos es el fuego en movimiento puro, la acción que prefiere corregir en el camino a quedarse pensando en la salida.",
    upright: {
      love: "La pasión llega con intensidad y prisa; disfruta el impulso sin exigirle que ya sea una promesa definitiva.",
      work: "Es momento de moverte con decisión aunque el plan no esté cerrado del todo; el terreno se conoce andando.",
      path: "Tu fuego pide aventura real, no simulacro; sal a moverte aunque no tengas todas las certezas.",
    },
    reversed: {
      love: "La impulsividad sin pausa deja heridas que después hay que reparar; frena antes de actuar solo por el calor del momento.",
      work: "Empezar sin ningún plan te hace perder terreno ganado; un poco de dirección no apaga el impulso, lo enfoca.",
      path: "La impaciencia constante te impide notar cuándo el camino pide un respiro en vez de otro arranque.",
    },
    bridge: "El Caballero de Bastos es fuego que ya galopa: la voluntad que se prueba a sí misma moviéndose, no planeando.",
  },
  "wands-queen": {
    name: "Reina de Bastos",
    keywords: ["magnetismo", "confianza radiante", "independencia", "calidez firme"],
    essence:
      "Sentada con el girasol y el gato negro a sus pies, la Reina de Bastos no pide permiso para brillar: es el fuego que se volvió presencia, cálido y firme al mismo tiempo.",
    upright: {
      love: "Tu magnetismo natural atrae sin esfuerzo; muéstrate como eres, sin apagar tu brillo para hacerte más pequeña.",
      work: "Lideras con calidez y determinación a la vez; tu forma de estar al frente inspira más que exige.",
      path: "Tu independencia no te aleja de otros, los invita a acercarse a una versión tuya más segura de sí misma.",
    },
    reversed: {
      love: "La necesidad de validación externa opaca tu propio brillo; recuerda que tu fuego no depende de la mirada de otros.",
      work: "La inseguridad se disfraza de exceso de control; suelta la necesidad de demostrar constantemente tu valor.",
      path: "Comparar tu luz con la de otros apaga la tuya sin necesidad; tu fuego no compite, simplemente es.",
    },
    bridge: "La Reina de Bastos es fuego hecho presencia madura: la voluntad que ya no necesita imponerse para ser vista.",
  },
  "wands-king": {
    name: "Rey de Bastos",
    keywords: ["visión de liderazgo", "carisma", "audacia", "dirección clara"],
    essence:
      "Sostiene su bastón en llamas con la mirada puesta en un horizonte que solo él ve todavía: el Rey de Bastos es el fuego que ya aprendió a liderar sin quemar lo que toca.",
    upright: {
      love: "Traes visión y decisión al vínculo; lidera con el ejemplo, no con la imposición.",
      work: "Es momento de asumir la dirección con audacia; tu visión de largo plazo puede convertirse en el mapa del equipo.",
      path: "Tu carisma natural es una herramienta espiritual cuando se usa para inspirar, no para dominar.",
    },
    reversed: {
      love: "La necesidad de tener siempre la razón asfixia la voz del otro; lidera con el vínculo, no sobre él.",
      work: "El exceso de ambición sin escuchar a nadie más aísla tu liderazgo; el fuego que no comparte espacio termina solo.",
      path: "La audacia sin humildad se vuelve arrogancia; recuerda que hasta el fuego más grande necesita oxígeno de otros.",
    },
    bridge: "El Rey de Bastos es fuego en su máxima maestría: la voluntad que dirige sin necesitar destruir para liderar.",
  },

  // --- Copas (agua: emoción, vínculo, mundo interior) ---
  "cups-01": {
    name: "As de Copas",
    keywords: ["apertura emocional", "amor nuevo", "plenitud interior", "receptividad"],
    essence:
      "Una mano sostiene una copa que desborda agua hacia cinco chorros: el As de Copas es la semilla pura del sentir, el corazón que se abre antes de saber a dónde va a llevarlo ese desborde.",
    upright: {
      love: "Un sentimiento nuevo llega con una plenitud que no necesita explicación; déjate sentirlo sin analizarlo de más.",
      work: "Encuentras un propósito que te conecta emocionalmente con lo que haces, más allá del resultado.",
      path: "Tu corazón se abre a una experiencia que va a nutrirte; recibe sin la guardia que a veces pones por costumbre.",
    },
    reversed: {
      love: "Te cuesta recibir el cariño que llega; revisa si la guardia que pones protege o solo aísla.",
      work: "Sientes el trabajo vacío de significado emocional, aunque funcione en lo práctico.",
      path: "Hay una desconexión con tu propio sentir; el agua está ahí, solo necesitas dejar de contenerla.",
    },
    bridge: "El As de Copas es agua en su forma más pura: la apertura emocional antes de que tome cualquier forma de vínculo.",
  },
  "cups-02": {
    name: "Dos de Copas",
    keywords: ["conexión mutua", "reciprocidad", "unión", "reconocimiento"],
    essence:
      "Dos figuras se ofrecen sus copas al mismo tiempo, con la mirada puesta la una en la otra: el Dos de Copas es el agua que ya no fluye sola, sino en espejo con otra persona.",
    upright: {
      love: "Un vínculo se siente equilibrado, con dar y recibir a partes iguales; celebra esa reciprocidad rara.",
      work: "Una alianza o sociedad nace con respeto mutuo genuino; construyan sobre esa base de confianza.",
      path: "Reconocerte en otra persona no te divide, te completa un poco más; el espejo también enseña.",
    },
    reversed: {
      love: "El desequilibrio entre lo que das y lo que recibes empieza a pesar; nombra la asimetría antes de que crezca.",
      work: "La confianza en la sociedad se resquebraja; hace falta una conversación honesta para reparar el vínculo.",
      path: "Buscar en otro lo que todavía no encuentras en ti misma te deja dependiente de ese espejo externo.",
    },
    bridge: "El Dos de Copas es agua que se encuentra con otra agua: el sentir que se reconoce reflejado en alguien más.",
  },
  "cups-03": {
    name: "Tres de Copas",
    keywords: ["celebración compartida", "amistad", "comunidad", "alegría colectiva"],
    essence:
      "Tres figuras alzan sus copas juntas, celebrando algo que ninguna hubiera disfrutado igual en soledad: el Tres de Copas es el agua que se multiplica cuando se comparte con otras.",
    upright: {
      love: "Un círculo de amistades o familia celebra contigo un buen momento; deja que la alegría sea colectiva.",
      work: "Un logro de equipo merece ser festejado en conjunto, no minimizado por modestia.",
      path: "Tu comunidad es parte de tu camino espiritual; la alegría compartida también es una forma de gratitud.",
    },
    reversed: {
      love: "El exceso social empieza a sustituir la conexión real uno a uno; busca la profundidad, no solo la compañía.",
      work: "La dinámica de equipo se llena de chismes o competencia disfrazada de celebración; vuelve a lo genuino.",
      path: "Rodearte de mucha gente sin verdadera conexión te deja más sola de lo que parece desde afuera.",
    },
    bridge: "El Tres de Copas es agua que se comparte en grupo: el sentir que se multiplica en vez de dividirse.",
  },
  "cups-04": {
    name: "Cuatro de Copas",
    keywords: ["apatía", "introspección", "insatisfacción silenciosa", "nueva oferta ignorada"],
    essence:
      "Sentado bajo el árbol, con los brazos cruzados, ignora la copa que una mano le ofrece desde la nube: el Cuatro de Copas es el agua estancada por dentro, tan llena de lo pasado que no ve lo nuevo que llega.",
    upright: {
      love: "Sientes cierta indiferencia hacia algo que antes te emocionaba; revisa si es descanso necesario o desconexión real.",
      work: "El aburrimiento con lo conocido te ciega ante una oportunidad que ya está frente a ti, esperando ser vista.",
      path: "La introspección de hoy es válida, pero cuidado con confundirla con apatía prolongada.",
    },
    reversed: {
      love: "Sales de la desconexión y empiezas a notar de nuevo lo que sí está disponible para ti.",
      work: "Una nueva motivación aparece justo cuando estabas lista para dejar de rechazar lo que se ofrecía.",
      path: "Despiertas de un letargo emocional y vuelves a mirar hacia afuera con curiosidad genuina.",
    },
    bridge: "El Cuatro de Copas es agua que dejó de moverse: el sentir estancado que necesita voltear a ver lo que sí fluye.",
  },
  "cups-05": {
    name: "Cinco de Copas",
    keywords: ["duelo", "pérdida", "lo que aún queda", "mirada parcial"],
    essence:
      "De espaldas a las dos copas que siguen en pie, mira solo las tres derramadas: el Cinco de Copas es el duelo real, pero también el recordatorio de que la mirada, aunque dolida, no ve todo el paisaje.",
    upright: {
      love: "Una pérdida o decepción pide ser llorada sin apuro; el duelo también es una forma de honrar lo que importó.",
      work: "Un fracaso duele genuinamente; date el permiso de sentirlo antes de forzar una lección prematura.",
      path: "El dolor que sientes es real, y aun así hay algo que sigue en pie detrás de ti, esperando que voltees.",
    },
    reversed: {
      love: "Empiezas a girarte hacia lo que todavía tienes, sin negar lo que se perdió.",
      work: "La aceptación de lo que no funcionó abre espacio para ver la oportunidad que sigue disponible.",
      path: "El duelo empieza a transformarse en aprendizaje; ya no te quedas solo mirando lo derramado.",
    },
    bridge: "El Cinco de Copas es agua derramada que todavía dolió: el sentir que necesita su tiempo antes de voltear a ver lo que queda.",
  },
  "cups-06": {
    name: "Seis de Copas",
    keywords: ["nostalgia", "infancia", "reencuentro", "dulzura del pasado"],
    essence:
      "Un niño le entrega una copa con flores a otro en un patio antiguo: el Seis de Copas es el agua de la memoria, la dulzura de lo que fuimos y que a veces vuelve a visitarnos sin avisar.",
    upright: {
      love: "Un reencuentro o un recuerdo compartido reaviva una ternura genuina; deja que la nostalgia te visite sin quedarte a vivir ahí.",
      work: "Una habilidad o pasión de tu pasado vuelve a ser relevante; no la descartes por creerla infantil.",
      path: "Sanar una parte de tu niñez interior te da acceso a una alegría que creías perdida.",
    },
    reversed: {
      love: "Idealizar el pasado te impide ver con claridad el presente; el vínculo de hoy no tiene que competir con la memoria.",
      work: "Aferrarte a métodos antiguos por comodidad te impide adoptar lo que el momento actual necesita.",
      path: "Vivir instalada en la nostalgia te aleja de construir nuevos recuerdos; honra el pasado sin quedarte atrapada en él.",
    },
    bridge: "El Seis de Copas es agua que recuerda su propio origen: el sentir que vuelve a la inocencia sin quedarse encerrado en ella.",
  },
  "cups-07": {
    name: "Siete de Copas",
    keywords: ["fantasía", "opciones", "ilusión", "elección confusa"],
    essence:
      "Siete copas flotan entre las nubes, cada una con una visión distinta — un castillo, una joya, una sombra: el Siete de Copas es la imaginación desbordada que hace difícil distinguir el deseo real del espejismo.",
    upright: {
      love: "Tienes varias posibilidades o fantasías dando vueltas; discierne cuál es un deseo genuino y cuál solo ilusión cómoda.",
      work: "Demasiadas opciones sin foco generan parálisis; elige una dirección aunque las demás sigan brillando desde lejos.",
      path: "Tu imaginación es un don, pero hoy pide anclarse en algo real para no perderse en posibilidades infinitas.",
    },
    reversed: {
      love: "Empiezas a ver con claridad cuál de las opciones era real y cuál solo fantasía; la niebla se disipa.",
      work: "Tomas por fin una decisión concreta después de mucho darle vueltas a alternativas imaginarias.",
      path: "Sales de la ensoñación y aterrizas en lo que de verdad puedes construir con lo que tienes.",
    },
    bridge: "El Siete de Copas es agua que se multiplica en espejismos: el sentir que necesita elegir un cauce entre tantos posibles.",
  },
  "cups-08": {
    name: "Ocho de Copas",
    keywords: ["alejamiento", "búsqueda interior", "dejar atrás", "propósito más profundo"],
    essence:
      "De espaldas a las ocho copas ya apiladas, camina de noche hacia las montañas: el Ocho de Copas es el agua que decide que ya no basta con lo construido y sale a buscar algo más verdadero.",
    upright: {
      love: "Sientes que algo, aunque estable, ya no te llena del todo; escuchar esa inquietud no es traición, es honestidad.",
      work: "Un logro material ya no satisface tu necesidad de propósito; el siguiente paso pide más significado, no más éxito.",
      path: "Estás lista para dejar atrás una etapa completa, aunque duela soltar lo conocido.",
    },
    reversed: {
      love: "El miedo a lo desconocido te hace quedarte en un vínculo que ya no te nutre; nombra qué te detiene realmente.",
      work: "Postergar la salida de una situación agotada solo alarga el desgaste; el paso ya está decidido adentro.",
      path: "Regresas a lo dejado atrás sin haber resuelto por qué te fuiste; revisa si es sanación o evasión del vacío.",
    },
    bridge: "El Ocho de Copas es agua que se retira del cauce conocido: el sentir que busca una fuente más profunda que la comodidad.",
  },
  "cups-09": {
    name: "Nueve de Copas",
    keywords: ["satisfacción", "deseo cumplido", "gratitud", "placer merecido"],
    essence:
      "Sentado con los brazos cruzados frente a nueve copas dispuestas en arco, sonríe con la satisfacción de quien consiguió lo que quería: el Nueve de Copas es el placer disfrutado sin culpa.",
    upright: {
      love: "Sientes una satisfacción genuina con el vínculo tal como está hoy; permítete disfrutarla sin buscarle defecto.",
      work: "Un deseo concreto se cumple; celebra el logro material o profesional sin restarle mérito.",
      path: "El bienestar que sientes es real y merecido; la gratitud plena también es un estado espiritual válido.",
    },
    reversed: {
      love: "La satisfacción superficial esconde una necesidad emocional más profunda sin resolver.",
      work: "El éxito material no llena el vacío que en realidad pedía otra cosa; revisa qué es lo que de verdad querías.",
      path: "La complacencia te impide seguir creciendo; el placer cumplido no debería ser el techo de tu camino.",
    },
    bridge: "El Nueve de Copas es agua que se sabe llena: el sentir satisfecho que celebra sin necesitar justificarse.",
  },
  "cups-10": {
    name: "Diez de Copas",
    keywords: ["plenitud familiar", "armonía", "felicidad compartida", "cielo cumplido"],
    essence:
      "Un arcoíris de diez copas se despliega sobre una familia que celebra abrazada: el Diez de Copas es el agua que llegó a su cauce más pleno, la felicidad que se sostiene porque se comparte.",
    upright: {
      love: "Una armonía profunda y duradera baña el vínculo; disfruta esta plenitud como el fruto de lo que sembraste juntos.",
      work: "El equilibrio entre lo profesional y lo personal por fin se siente sostenible y verdadero.",
      path: "Alcanzas una sensación de paz completa; este es el ciclo emocional cumplido en su forma más generosa.",
    },
    reversed: {
      love: "La imagen de familia perfecta esconde grietas que piden atención honesta, no solo apariencia armoniosa.",
      work: "El equilibrio que buscabas se rompe cuando una parte de tu vida exige más de lo que la otra puede dar.",
      path: "Confundir la armonía externa con paz interior te deja actuando bienestar en vez de sentirlo de verdad.",
    },
    bridge: "El Diez de Copas es agua que se derrama en abundancia compartida: el sentir cumplido cuando se vive en comunidad real.",
  },
  "cups-page": {
    name: "Paje de Copas",
    keywords: ["sensibilidad", "mensajero emocional", "creatividad tierna", "intuición nueva"],
    essence:
      "Mira sorprendido al pez que asoma de su copa, como si la vida emocional siguiera revelándole secretos: el Paje de Copas es la sensibilidad que recién empieza a explorar lo que siente.",
    upright: {
      love: "Una emoción tierna y algo tímida pide expresarse; no le restes seriedad por sentirse nueva o vulnerable.",
      work: "Una idea creativa llega desde un lugar intuitivo más que analítico; dale espacio antes de racionalizarla de más.",
      path: "Tu sensibilidad es una puerta, no una debilidad; deja que te sorprenda lo que todavía estás aprendiendo a sentir.",
    },
    reversed: {
      love: "La sensibilidad se vuelve hermetismo cuando temes mostrar lo que sientes; un paso pequeño hacia la apertura ayuda.",
      work: "Una idea creativa se queda sin desarrollar por miedo a que no sea lo bastante seria o profesional.",
      path: "Reprimir lo que sientes por incomodidad te aleja de la intuición que justo estaba por enseñarte algo.",
    },
    bridge: "El Paje de Copas es el número 11 vuelto sentir novato: el maestro emocional en potencia que recién empieza a escucharse.",
  },
  "cups-knight": {
    name: "Caballero de Copas",
    keywords: ["romanticismo", "propuesta", "idealismo", "avance con el corazón"],
    essence:
      "Avanza despacio, con la copa en alto como una ofrenda: el Caballero de Copas es el agua que se mueve, no con la prisa del fuego, sino con la delicadeza de quien lleva algo que le importa de verdad.",
    upright: {
      love: "Una propuesta romántica o un gesto significativo se acerca; recíbelo con la misma delicadeza con que llega.",
      work: "Una oferta o colaboración se presenta con buenas intenciones genuinas; confía en el gesto sincero.",
      path: "Tu idealismo te mueve hacia adelante con el corazón por delante; eso no te hace ingenua, te hace fiel a ti.",
    },
    reversed: {
      love: "Las promesas bonitas no siempre vienen acompañadas de acción real; observa lo que se hace, no solo lo que se dice.",
      work: "Una oferta atractiva en la superficie esconde condiciones poco claras; revisa antes de comprometerte.",
      path: "El idealismo sin acción se queda en fantasía; deja que el sentir también se traduzca en movimiento concreto.",
    },
    bridge: "El Caballero de Copas es agua que avanza con cuidado: el sentir que se mueve hacia otro sin perder su ternura.",
  },
  "cups-queen": {
    name: "Reina de Copas",
    keywords: ["empatía profunda", "intuición madura", "compasión", "límites emocionales sanos"],
    essence:
      "Sostiene una copa cerrada, distinta a todas las demás, mirándola con atención total: la Reina de Copas es el agua que aprendió a contener su propia profundidad sin ahogarse ni ahogar a otros.",
    upright: {
      love: "Tu capacidad de sentir y sostener a otros con empatía real es un regalo; ofrécelo sin perderte a ti misma en el proceso.",
      work: "Tu sensibilidad hacia el equipo o los clientes se vuelve una fortaleza profesional real, no una debilidad a esconder.",
      path: "Has aprendido a sentir profundo sin desbordarte; esa es una forma madura de sabiduría emocional.",
    },
    reversed: {
      love: "Absorbes las emociones de otros hasta perder el rastro de las tuyas propias; pon un límite compasivo.",
      work: "La sobrecarga emocional del entorno te desborda; necesitas un espacio para procesar antes de seguir sosteniendo a otros.",
      path: "Cuidar tanto de los demás que olvidas cuidarte a ti misma vacía la fuente de la que das.",
    },
    bridge: "La Reina de Copas es agua hecha presencia madura: el sentir que contiene profundidad sin desbordarse ni cerrarse.",
  },
  "cups-king": {
    name: "Rey de Copas",
    keywords: ["equilibrio emocional", "sabiduría del corazón", "calma bajo presión", "liderazgo compasivo"],
    essence:
      "Sentado sobre un trono que flota entre aguas agitadas, permanece sereno: el Rey de Copas es el agua que domina su propia marea, sintiendo todo sin ser arrastrado por nada.",
    upright: {
      love: "Traes estabilidad emocional al vínculo, capaz de sostener incluso lo intenso sin desbordarte.",
      work: "Lideras con inteligencia emocional real; escuchas antes de reaccionar y eso genera confianza genuina.",
      path: "Has integrado tu mundo emocional con tu razón; esa calma no es frialdad, es maestría ganada con el tiempo.",
    },
    reversed: {
      love: "La calma que muestras hacia afuera esconde una marea interna que no te estás permitiendo sentir del todo.",
      work: "La manipulación emocional sutil se disfraza de serenidad; revisa si tu control es equilibrio o evasión.",
      path: "Reprimir lo que sientes bajo una máscara de calma te desconecta de tu propia sabiduría emocional real.",
    },
    bridge: "El Rey de Copas es agua en su máxima maestría: el sentir que gobierna su propia marea sin negarla nunca.",
  },

  // --- Espadas (aire: mente, verdad, conflicto) ---
  "swords-01": {
    name: "As de Espadas",
    keywords: ["claridad", "verdad", "avance mental", "corte limpio"],
    essence:
      "Una mano sale de la nube sosteniendo la espada en alto, coronada: el As de Espadas es la semilla pura del aire, el pensamiento que corta la confusión de un solo tajo y deja ver lo que de verdad es.",
    upright: {
      love: "Una conversación pendiente pide decirse sin adornos; la claridad, aunque incómoda, es la forma más real de cuidar el vínculo.",
      work: "Una idea llega con filo y dirección; úsala para cortar de raíz lo que ya no aporta, no para herir sin necesidad.",
      path: "Tu mente ve algo con una nitidez que no habías tenido antes; confía en ese corte limpio.",
    },
    reversed: {
      love: "La verdad se dice con más filo del necesario y hiere en vez de aclarar; busca precisión sin crueldad.",
      work: "La claridad que creías tener se revela parcial; antes de cortar, verifica que ves el cuadro completo.",
      path: "El pensamiento sin dirección se vuelve arma contra ti misma; la mente afilada también necesita un propósito.",
    },
    bridge: "El As de Espadas es aire en su forma más pura: la mente que corta antes de saber todavía hacia dónde va a apuntar.",
  },
  "swords-02": {
    name: "Dos de Espadas",
    keywords: ["indecisión", "tregua tensa", "ceguera elegida", "equilibrio forzado"],
    essence:
      "Sentada con los ojos vendados, cruza las dos espadas frente al pecho: el Dos de Espadas es la mente que se niega a decidir porque ambas opciones duelen, y la venda no es paz, es una pausa que ya pesa.",
    upright: {
      love: "Evitas una decisión porque las dos salidas cuestan; nombrar el dilema en voz alta ya es un primer movimiento.",
      work: "Sostienes dos opciones en equilibrio forzado; la tregua sirve un tiempo, pero no reemplaza la decisión pendiente.",
      path: "Te venda los ojos protege de un dolor, pero también te impide ver el camino que sigue esperando.",
    },
    reversed: {
      love: "La verdad que evitabas empieza a abrirse paso; quitarte la venda duele menos de lo que temías.",
      work: "La parálisis se rompe y una de las dos opciones finalmente pesa más que la otra; sigue esa señal.",
      path: "Dejas de fingir equilibrio donde había estancamiento; el primer paso real empieza por mirar de frente.",
    },
    bridge: "El Dos de Espadas es aire detenido en tensión: la mente que sostiene dos verdades sin animarse a elegir ninguna todavía.",
  },
  "swords-03": {
    name: "Tres de Espadas",
    keywords: ["dolor", "desengaño", "verdad que corta", "corazón atravesado"],
    essence:
      "Tres espadas atraviesan un corazón bajo la lluvia: el Tres de Espadas no suaviza el golpe, nombra el dolor tal como es. No es catástrofe ni condena, es la verdad de una herida que necesita ser sentida, no negada, para poder cerrar.",
    upright: {
      love: "Una traición, una ruptura o una verdad dolorosa atraviesa el pecho; llorarla de frente es lo que empieza a sanarla.",
      work: "Una crítica o un fracaso duele más de lo esperado; el dolor no mide tu valor, mide cuánto te importaba.",
      path: "Hay una herida honesta que pedía ser nombrada; el corte de hoy es real, y también es el principio del alivio.",
    },
    reversed: {
      love: "El dolor empieza a ceder, aunque la cicatriz todavía se sienta; date permiso de sanar en tu propio tiempo.",
      work: "Sigues cargando una decepción antigua que ya podrías soltar; la herida sirvió su propósito, ahora puede cerrar.",
      path: "Reabrir la misma herida una y otra vez sin dejarla sanar te mantiene atrapada en el mismo dolor; hoy toca soltar.",
    },
    bridge: "El Tres de Espadas es aire que corta hasta el corazón: la verdad más dura del palo, sentida sin adorno y sin exageración.",
  },
  "swords-04": {
    name: "Cuatro de Espadas",
    keywords: ["descanso", "retirada", "recuperación", "pausa necesaria"],
    essence:
      "Yace en calma sobre la tumba, con las tres espadas colgadas encima y una en la mano: el Cuatro de Espadas es la mente que por fin se permite detenerse, no por rendición, sino para recuperar la fuerza que necesita.",
    upright: {
      love: "Un tiempo de silencio compartido no es distancia, es descanso que el vínculo también necesita para seguir sano.",
      work: "Antes de la siguiente batalla, hace falta parar; el descanso de hoy es lo que hace posible la claridad de mañana.",
      path: "Tu mente pide tregua, no huida; detenerte a recuperar fuerzas es también un acto de sabiduría.",
    },
    reversed: {
      love: "El descanso se ha alargado más de lo sano; vuelve al vínculo cuando estés lista, pero no lo pospongas indefinidamente.",
      work: "Retomas actividad después de una pausa necesaria; el cuerpo y la mente ya están listos para el siguiente paso.",
      path: "El aislamiento que era sanador empieza a volverse encierro; nota cuándo el descanso ya cumplió su función.",
    },
    bridge: "El Cuatro de Espadas es aire que se aquieta: la mente que se retira un momento para poder pensar con más filo después.",
  },
  "swords-05": {
    name: "Cinco de Espadas",
    keywords: ["victoria vacía", "conflicto", "orgullo herido", "costo del ganar"],
    essence:
      "Recoge las espadas mientras los otros se alejan derrotados: el Cinco de Espadas pregunta qué ganaste en realidad si ganar te dejó sola. No toda victoria vale lo que costó.",
    upright: {
      love: "Ganar la discusión no es lo mismo que ganar el vínculo; revisa si la razón te importa más que la relación.",
      work: "Un conflicto se resuelve a tu favor, pero el ambiente queda tenso; considera qué precio pagaste por imponerte.",
      path: "El orgullo de tener razón puede costarte una conexión que valía más que tener razón.",
    },
    reversed: {
      love: "Estás lista para reparar lo dañado por un conflicto pasado; la disculpa honesta pesa más que la razón ganada.",
      work: "Reconoces que el conflicto costó más de lo que valía; buscas ahora reconstruir en vez de seguir compitiendo.",
      path: "Sueltas la necesidad de ganar cada roce; hay batallas que de verdad no valen la pena pelear.",
    },
    bridge: "El Cinco de Espadas es aire que corta sin cuidado: la mente que gana el argumento y pierde la conexión.",
  },
  "swords-06": {
    name: "Seis de Espadas",
    keywords: ["transición", "alejarse", "aguas más calmas", "avance silencioso"],
    essence:
      "El barquero lleva a la mujer y al niño hacia aguas más tranquilas, dejando atrás la orilla agitada: el Seis de Espadas es la mente que elige moverse, aunque el destino todavía no se vea del todo claro.",
    upright: {
      love: "Un vínculo o una etapa se mueve hacia aguas más tranquilas; el alejamiento de lo difícil es parte del proceso, no una derrota.",
      work: "Dejas atrás una situación tensa por una más estable; el tránsito puede sentirse lento, pero va en la dirección correcta.",
      path: "Te alejas de lo que dolía sin necesidad de mirar atrás con culpa; avanzar también es una forma de sanar.",
    },
    reversed: {
      love: "Te cuesta soltar amarras aunque sepas que ya es momento; el barco no se mueve mientras sigas mirando la orilla.",
      work: "Resistes un cambio de rumbo necesario; quedarte donde ya no fluye solo prolonga la tormenta.",
      path: "El apego a lo conocido, aunque duela, te frena de llegar a las aguas más calmas que ya te esperan.",
    },
    bridge: "El Seis de Espadas es aire que por fin se mueve: la mente que deja atrás la tormenta con un rumbo, aunque sea incierto.",
  },
  "swords-07": {
    name: "Siete de Espadas",
    keywords: ["estrategia", "sigilo", "atajo cuestionable", "autosuficiencia"],
    essence:
      "Se aleja del campamento cargando cinco espadas, dejando dos atrás, mirando hacia atrás con cautela: el Siete de Espadas es la mente estratégica que a veces elige el atajo, y el espejo que pregunta a qué costo.",
    upright: {
      love: "Guardas algo para ti antes de compartirlo del todo; pregúntate si es prudencia o si es evitar una conversación honesta.",
      work: "Un plan discreto o independiente te da ventaja; asegúrate de que la estrategia no cruce la línea hacia el engaño.",
      path: "Tu autosuficiencia es una fortaleza, pero revisa si a veces la usas para evitar pedir ayuda que sí necesitas.",
    },
    reversed: {
      love: "Un secreto o una verdad a medias sale a la luz; la honestidad completa, aunque incómoda, repara más que el silencio.",
      work: "Una estrategia poco transparente se descubre; es momento de corregir el rumbo con estas cartas sobre la mesa.",
      path: "Dejas de esconderte detrás de la astucia y eliges la vulnerabilidad de pedir lo que en verdad necesitas.",
    },
    bridge: "El Siete de Espadas es aire que se mueve en sigilo: la mente estratégica que a veces olvida que el atajo también tiene precio.",
  },
  "swords-08": {
    name: "Ocho de Espadas",
    keywords: ["atrapamiento mental", "autolimitación", "percepción", "libertad posible"],
    essence:
      "Atada y con los ojos vendados, rodeada de espadas clavadas en el suelo, la figura no nota que las cuerdas están sueltas: el Ocho de Espadas es la mente que se convence de estar presa cuando la salida siempre estuvo cerca.",
    upright: {
      love: "Te sientes atrapada en un patrón del vínculo que, mirado de cerca, tiene más salidas de las que crees.",
      work: "La sensación de no tener opciones es más mental que real; hay un movimiento posible que todavía no consideraste.",
      path: "Tu propia narrativa te tiene inmóvil; cambiar la historia que te cuentas es el primer paso hacia soltar las cuerdas.",
    },
    reversed: {
      love: "Empiezas a ver que la trampa era en gran parte tuya; ese ver es lo que te permite finalmente moverte.",
      work: "Te atreves a cuestionar la limitación que dabas por hecha, y descubres que había más margen del que creías.",
      path: "Te quitas la venda de tu propio relato limitante; la libertad estaba esperando que dejaras de creerte presa.",
    },
    bridge: "El Ocho de Espadas es aire que se enreda en sí mismo: la mente que se ata con historias más apretadas que cualquier cuerda real.",
  },
  "swords-09": {
    name: "Nueve de Espadas",
    keywords: ["ansiedad", "insomnio", "miedo nocturno", "peso mental"],
    essence:
      "Se sienta en la cama a medianoche con el rostro entre las manos, nueve espadas suspendidas en la oscuridad detrás: el Nueve de Espadas es el peor momento de la noche, cuando la mente magnifica lo que a la luz del día se vería distinto. No es catástrofe real, es la catástrofe que la mente construye a solas.",
    upright: {
      love: "El miedo a perder lo que tienes te tiene despierta imaginando lo peor; casi nunca es tan grave como en la oscuridad.",
      work: "La ansiedad por un resultado incierto te consume más energía que el problema real; busca hablarlo con alguien, no rumiarlo sola.",
      path: "Tu mente de noche no es tu mente de día; date permiso de esperar la luz antes de creer del todo lo que hoy temes.",
    },
    reversed: {
      love: "El miedo empieza a perder su poder cuando por fin lo dices en voz alta; nombrarlo lo hace más pequeño.",
      work: "Sales de la rumiación nocturna y encuentras que el problema tenía solución más simple de lo que la ansiedad prometía.",
      path: "El peso mental empieza a aliviarse cuando dejas de cargarlo en silencio; pedir ayuda no es debilidad, es salida.",
    },
    bridge: "El Nueve de Espadas es aire que se vuelve contra sí mismo en la oscuridad: la mente que magnifica el miedo hasta el amanecer.",
  },
  "swords-10": {
    name: "Diez de Espadas",
    keywords: ["final doloroso", "rendición", "punto más bajo", "amanecer después"],
    essence:
      "Diez espadas clavadas en la espalda bajo un cielo que empieza a aclarar en el horizonte: el Diez de Espadas es el fondo real, el punto en que ya no queda nada por negar. Duele de frente, sin adorno, y aun así el amanecer al fondo de la imagen no es casualidad: después de esto, solo queda subir.",
    upright: {
      love: "Un ciclo termina de la forma más definitiva posible; no hay ambigüedad que suavice el cierre, solo la certeza de que ya acabó.",
      work: "Un proyecto o etapa llega a su final más brusco; no hay forma de seguir fingiendo que hay algo que salvar aquí.",
      path: "Tocas un fondo real, y es exactamente eso: un fondo, no un abismo sin salida. El amanecer ya empieza a asomar.",
    },
    reversed: {
      love: "Empiezas a levantarte después del golpe más duro; la recuperación es lenta, pero ya es real.",
      work: "Lo peor ya pasó y empiezas a reconstruir con lo que queda; el fondo tocado te da un punto de partida honesto.",
      path: "Te resistes a aceptar que algo terminó del todo, y esa resistencia alarga el dolor más de lo necesario.",
    },
    bridge: "El Diez de Espadas es aire en su corte más final: la mente que toca fondo justo antes de que el cielo empiece a aclarar.",
  },
  "swords-page": {
    name: "Paje de Espadas",
    keywords: ["curiosidad alerta", "mensajero mental", "vigilancia", "aprendiz de la verdad"],
    essence:
      "Sostiene la espada en alto, escrutando el horizonte con el viento revolviéndole el cabello: el Paje de Espadas es la mente joven que todavía está aprendiendo a distinguir la información real del rumor.",
    upright: {
      love: "Llega una conversación directa, quizás inesperada; escúchala con la mente abierta antes de reaccionar a la defensiva.",
      work: "Una idea nueva pide ser investigada con curiosidad honesta, sin todavía tener todas las respuestas.",
      path: "Tu mente alerta te sirve para observar antes de opinar; aprende a distinguir el dato de la suposición.",
    },
    reversed: {
      love: "Un comentario apresurado se dice sin pensar del todo el efecto; revisa antes de hablar la próxima vez.",
      work: "Te dejas llevar por un chisme o una información sin verificar; confirma antes de actuar sobre lo que oíste.",
      path: "La mente que todavía no distingue bien la señal del ruido necesita más quietud antes de emitir un veredicto.",
    },
    bridge: "El Paje de Espadas es el número 11 vuelto aprendiz: el pensador en potencia que todavía confunde el rumor con la verdad.",
  },
  "swords-knight": {
    name: "Caballero de Espadas",
    keywords: ["acción directa", "impaciencia mental", "ímpetu verbal", "avance sin filtro"],
    essence:
      "Carga a toda velocidad con la espada al frente, sin mirar el terreno que pisa: el Caballero de Espadas es el aire hecho velocidad pura, la mente tan segura de su verdad que a veces olvida frenar antes de decirla.",
    upright: {
      love: "Dices lo que piensas sin rodeos; la honestidad directa puede ser un regalo si viene acompañada de algo de tacto.",
      work: "Es momento de actuar rápido y con determinación sobre una decisión ya clara en tu mente.",
      path: "Tu convicción avanza como una carga; asegúrate de que el terreno que pisas también merece esa velocidad.",
    },
    reversed: {
      love: "Las palabras salen antes de pensarlas del todo y hieren más de lo que pretendías; frena antes de hablar.",
      work: "La prisa por imponer tu punto de vista atropella a quien también tenía algo que decir; escucha antes de cargar.",
      path: "El ímpetu sin discernimiento gasta energía en batallas que no valían la velocidad que les diste.",
    },
    bridge: "El Caballero de Espadas es aire que ya galopa sin frenos: la mente que confunde velocidad con certeza.",
  },
  "swords-queen": {
    name: "Reina de Espadas",
    keywords: ["claridad afilada", "independencia", "verdad sin adorno", "límites firmes"],
    essence:
      "Sentada de perfil, con la espada en alto y la mirada puesta lejos del trono, la Reina de Espadas ve con una claridad que no se deja nublar por sentimentalismo; su verdad es su forma de cuidar.",
    upright: {
      love: "Dices lo que necesitas sin rodeos ni culpa; tu claridad, aunque directa, viene de un lugar honesto.",
      work: "Tu criterio afilado corta la ambigüedad de la situación; confía en tu lectura precisa aunque incomode a alguien.",
      path: "Tu independencia mental es fortaleza, no frialdad; ver con claridad no te aleja de sentir profundo.",
    },
    reversed: {
      love: "La claridad se vuelve dureza cuando olvidas el tacto; la verdad también puede decirse con calidez.",
      work: "El criterio agudo se vuelve crítica constante; discierne cuándo cortar y cuándo simplemente acompañar.",
      path: "Usar la mente como escudo contra el sentir te deja precisa pero sola; la verdad no tiene que excluir la ternura.",
    },
    bridge: "La Reina de Espadas es aire hecho presencia madura: la mente que corta con precisión sin perder su propio centro.",
  },
  "swords-king": {
    name: "Rey de Espadas",
    keywords: ["autoridad intelectual", "juicio justo", "objetividad", "verdad con poder"],
    essence:
      "Sentado con la espada en línea recta hacia el cielo, el Rey de Espadas gobierna desde la claridad mental, no desde el impulso; su poder es la objetividad que no se deja comprar por la simpatía ni el miedo.",
    upright: {
      love: "Aportas al vínculo una honestidad estructurada, capaz de nombrar lo difícil sin dramatismo ni evasión.",
      work: "Es momento de decidir desde el análisis frío, no desde la presión del momento; tu juicio claro guía al equipo.",
      path: "Tu autoridad nace de pensar con rigor, no de imponer; esa es una forma madura de liderazgo mental.",
    },
    reversed: {
      love: "La lógica fría sustituye la calidez que el vínculo también necesita; la razón sin ternura se siente distante.",
      work: "El poder del cargo se usa para controlar en vez de guiar; revisa si tu autoridad todavía sirve a un propósito justo.",
      path: "El intelecto sin compasión se vuelve tiranía silenciosa; la verdadera maestría mental también sabe ser humana.",
    },
    bridge: "El Rey de Espadas es aire en su máxima maestría: la mente que gobierna con objetividad y no necesita imponerse a gritos.",
  },

  // --- Oros (tierra: materia, trabajo, cuerpo) ---
  "pentacles-01": {
    name: "As de Oros",
    keywords: ["oportunidad", "semilla material", "nuevo recurso", "posibilidad concreta"],
    essence:
      "Una mano sostiene una moneda dorada sobre un jardín en flor: el As de Oros es la semilla pura de la tierra, la oportunidad concreta que todavía no sabes en qué se va a convertir, pero que ya está en tu mano.",
    upright: {
      love: "Se abre la posibilidad de construir algo estable juntos — un hogar, un proyecto compartido, un compromiso con raíces.",
      work: "Una oportunidad concreta llega con potencial real; plántala con cuidado antes de esperar la cosecha completa.",
      path: "Tu bienestar material también es camino espiritual; cuidar de tu cuerpo y tus recursos es una forma de honrar la vida.",
    },
    reversed: {
      love: "Una oportunidad de estabilidad se deja pasar por miedo o desconfianza; revisa qué te impide sembrarla.",
      work: "Un recurso o una propuesta se malgasta por falta de plan; la semilla necesita tierra preparada, no solo buena intención.",
      path: "Perseguir la seguridad material sin propósito claro te deja con las manos llenas y el sentido vacío.",
    },
    bridge: "El As de Oros es tierra en su forma más pura: la posibilidad concreta antes de que sepas todavía qué va a dar de fruto.",
  },
  "pentacles-02": {
    name: "Dos de Oros",
    keywords: ["malabarismo", "adaptabilidad", "prioridades", "equilibrio en movimiento"],
    essence:
      "Hace malabares con dos monedas unidas por un lazo infinito, con los barcos meciéndose al fondo: el Dos de Oros es la tierra que aprende que el equilibrio no es quietud, es movimiento constante bien calibrado.",
    upright: {
      love: "Balanceas el vínculo con otras responsabilidades; la clave no es tener todo perfecto, es fluir entre las prioridades.",
      work: "Manejas varios proyectos a la vez con agilidad; disfruta el ritmo en vez de estresarte por no tener uno solo.",
      path: "Tu adaptabilidad es una fortaleza real; el equilibrio de hoy no es estático, se sostiene bailando.",
    },
    reversed: {
      love: "Intentas sostener demasiadas cosas y el vínculo empieza a sentir la falta de atención; algo necesita soltarse.",
      work: "La sobrecarga de tareas simultáneas empieza a costarte calidad; prioriza en vez de seguir malabareando todo.",
      path: "El desequilibrio prolongado te agota; revisa qué puedes soltar para recuperar un ritmo sostenible.",
    },
    bridge: "El Dos de Oros es tierra en movimiento: la materia que se sostiene equilibrándose, no quedándose quieta.",
  },
  "pentacles-03": {
    name: "Tres de Oros",
    keywords: ["colaboración", "maestría", "trabajo en equipo", "reconocimiento del oficio"],
    essence:
      "Un artesano revisa su trabajo en la catedral junto a quienes lo encargaron: el Tres de Oros es la tierra que entiende que la maestría real se construye en conjunto, no en aislamiento.",
    upright: {
      love: "Construir algo juntos — un proyecto, un hogar, una meta compartida — fortalece el vínculo más que cualquier palabra.",
      work: "La colaboración con otros expertos eleva tu trabajo más allá de lo que lograrías sola; valora el equipo.",
      path: "Tu oficio se refina cuando lo compartes con otros que también lo dominan; el aprendizaje colectivo también es sagrado.",
    },
    reversed: {
      love: "La falta de coordinación entre ambos hace que los planes compartidos se tropiecen; alinéense antes de seguir construyendo.",
      work: "Un proyecto grupal sufre por mala comunicación o falta de reconocimiento mutuo; nombra lo que no está funcionando.",
      path: "Trabajar sin reconocer el aporte de otros te deja una obra a medias; el oficio maduro sabe compartir el crédito.",
    },
    bridge: "El Tres de Oros es tierra construida en conjunto: la materia que se vuelve obra cuando varias manos la sostienen.",
  },
  "pentacles-04": {
    name: "Cuatro de Oros",
    keywords: ["control", "seguridad material", "apego", "miedo a perder"],
    essence:
      "Abraza una moneda contra el pecho, con otra bajo cada pie y una en la cabeza: el Cuatro de Oros es la tierra que confunde seguridad con control absoluto, y en el intento de no perder nada, deja de disfrutar lo que ya tiene.",
    upright: {
      love: "El miedo a perder lo construido te hace aferrarte más de lo necesario; la seguridad real no depende de apretar tanto.",
      work: "Guardas recursos o información con cautela; está bien proteger lo tuyo, pero revisa si el control ya te está costando flexibilidad.",
      path: "Tu necesidad de estabilidad es válida, pero cuando se vuelve rigidez, te aleja de la abundancia que temes perder.",
    },
    reversed: {
      love: "Empiezas a soltar el control excesivo sobre el vínculo; compartir da más seguridad de la que da acaparar.",
      work: "Te animas a invertir o compartir recursos que antes guardabas con miedo; el riesgo calculado también genera crecimiento.",
      path: "Sueltas un poco el puño cerrado y descubres que la vida no se te escapa por abrir la mano.",
    },
    bridge: "El Cuatro de Oros es tierra apretada con fuerza: la materia que, sostenida con miedo, deja de fluir y de dar.",
  },
  "pentacles-05": {
    name: "Cinco de Oros",
    keywords: ["escasez", "exclusión", "dificultad material", "ayuda cercana no vista"],
    essence:
      "Dos figuras caminan heridas por la nieve, pasando frente a una ventana iluminada sin notarla: el Cinco de Oros es la tierra en tiempos difíciles, y también el recordatorio de que el refugio a veces está más cerca de lo que el dolor deja ver.",
    upright: {
      love: "Un momento de dificultad económica o de salud pesa sobre el vínculo; atravesarlo juntas cuenta tanto como resolverlo.",
      work: "Una racha difícil — pérdida de ingreso, inseguridad laboral — pide apoyo real, no orgullo silencioso.",
      path: "Sentirte excluida o en carencia es un dolor real; y aun así, hay ayuda cerca que quizás todavía no has visto.",
    },
    reversed: {
      love: "Empiezas a aceptar el apoyo que antes rechazabas por orgullo; dejarte ayudar también es un acto de amor propio.",
      work: "Lo peor de la crisis material queda atrás; encuentras un camino de recuperación que antes no veías.",
      path: "Sales del aislamiento y descubres que la comunidad estuvo dispuesta a sostenerte todo este tiempo.",
    },
    bridge: "El Cinco de Oros es tierra en su momento más frío: la materia escasa que enseña a pedir y a recibir ayuda real.",
  },
  "pentacles-06": {
    name: "Seis de Oros",
    keywords: ["generosidad", "intercambio justo", "dar y recibir", "equilibrio de poder"],
    essence:
      "Un comerciante reparte monedas con una balanza en la otra mano: el Seis de Oros es la tierra que fluye en equilibrio, el dar que se sostiene porque también sabe medir con justicia.",
    upright: {
      love: "El dar y recibir se siente equilibrado en el vínculo; agradece tanto lo que ofreces como lo que te permites aceptar.",
      work: "Compartir recursos, tiempo o conocimiento con generosidad genuina fortalece tu posición, no la debilita.",
      path: "Estás en posición de ayudar a otros; hazlo desde la abundancia real, no desde la necesidad de sentirte superior.",
    },
    reversed: {
      love: "El dar se ha vuelto desigual, con una parte siempre entregando más que la otra; nombra el desbalance.",
      work: "Una ayuda ofrecida con condiciones ocultas genera dependencia en vez de crecimiento mutuo; revisa la intención.",
      path: "Dar solo para sentirte necesitada vacía el gesto de su generosidad real; da porque quieres, no porque temes soltar el poder.",
    },
    bridge: "El Seis de Oros es tierra que circula con justicia: la materia que se comparte sin perder su propio equilibrio.",
  },
  "pentacles-07": {
    name: "Siete de Oros",
    keywords: ["paciencia", "evaluación", "inversión a largo plazo", "espera activa"],
    essence:
      "Se apoya en su azadón mirando el fruto que todavía cuelga verde de la planta: el Siete de Oros es la tierra que aprendió que el crecimiento real no se apura, se evalúa con paciencia mientras sigue trabajando.",
    upright: {
      love: "El vínculo pide tiempo para madurar; evalúa el progreso con honestidad, sin exigirle una cosecha antes de tiempo.",
      work: "Un proyecto de largo plazo empieza a mostrar señales, aunque el resultado final todavía tarde; sigue invirtiendo con paciencia.",
      path: "Tu crecimiento se mide en temporadas, no en días; hoy toca revisar el progreso sin exigir la cosecha completa.",
    },
    reversed: {
      love: "La impaciencia por resultados inmediatos te hace subestimar un vínculo que en realidad va bien encaminado.",
      work: "Inviertes tiempo y esfuerzo en algo que no está dando fruto; es momento de decidir si ajustar el método o el terreno.",
      path: "La frustración por no ver resultados rápidos te hace querer abandonar justo antes de que algo empiece a florecer.",
    },
    bridge: "El Siete de Oros es tierra en pausa activa: la materia que crece despacio y pide una mirada honesta antes de decidir el siguiente paso.",
  },
  "pentacles-08": {
    name: "Ocho de Oros",
    keywords: ["maestría", "dedicación", "trabajo minucioso", "perfeccionamiento del oficio"],
    essence:
      "Talla moneda tras moneda con total concentración, repitiendo el gesto hasta dominarlo: el Ocho de Oros es la tierra que entiende que la maestría se construye repetición a repetición, sin atajos.",
    upright: {
      love: "Dedicas tiempo y cuidado consciente al vínculo, como quien pule un oficio; el esfuerzo constante también es amor.",
      work: "Te concentras en perfeccionar tu habilidad con disciplina genuina; el detalle que cuidas hoy es la maestría de mañana.",
      path: "Tu compromiso con la práctica constante es en sí mismo un camino espiritual; el oficio bien hecho también es devoción.",
    },
    reversed: {
      love: "Pones todo el esfuerzo en la forma y descuidas la conexión real; revisa si el perfeccionismo te aleja de lo esencial.",
      work: "El exceso de detalle sin avanzar hacia el resultado te estanca; a veces basta con suficientemente bien.",
      path: "Buscar la perfección antes de permitirte mostrar el trabajo te mantiene atrapada en un ensayo que nunca termina.",
    },
    bridge: "El Ocho de Oros es tierra trabajada con dedicación: la materia que se refina a través de la práctica repetida y consciente.",
  },
  "pentacles-09": {
    name: "Nueve de Oros",
    keywords: ["autosuficiencia", "abundancia ganada", "placer solitario", "independencia plena"],
    essence:
      "De pie en su propio jardín cultivado, con el halcón en la mano y sin necesitar compañía para disfrutarlo, el Nueve de Oros es la tierra que floreció por esfuerzo propio, y el placer tranquilo de disfrutarla sola, sin pedirle permiso a nadie.",
    upright: {
      love: "Disfrutas de tu propia compañía con plenitud; cualquier vínculo que llegue ahora se suma a algo que ya está completo.",
      work: "Cosechas el resultado de un esfuerzo sostenido en el tiempo; el logro es tuyo y mereces disfrutarlo sin apuro.",
      path: "Tu independencia no es soledad, es la libertad de haber construido tu propio jardín con tus propias manos.",
    },
    reversed: {
      love: "Confundes autosuficiencia con no dejar entrar a nadie; revisa si la independencia se volvió una muralla.",
      work: "El éxito material no se siente pleno si nadie más lo ve o lo celebra contigo; permítete compartir el logro.",
      path: "Disfrutar en soledad está bien, pero aislarte del todo por miedo a depender de otros te empobrece de otra forma.",
    },
    bridge: "El Nueve de Oros es tierra en plena cosecha propia: la materia disfrutada por quien la cultivó con sus propias manos.",
  },
  "pentacles-10": {
    name: "Diez de Oros",
    keywords: ["legado", "abundancia familiar", "estabilidad duradera", "culminación material"],
    essence:
      "Tres generaciones conviven bajo el mismo techo, con los perros y el arco que enmarca la escena entera: el Diez de Oros es la tierra en su culminación más plena, la abundancia que trasciende a una sola persona y se vuelve legado.",
    upright: {
      love: "El vínculo alcanza una estabilidad que se siente generacional, capaz de sostener no solo a ustedes sino a lo que vendrá después.",
      work: "Un proyecto de largo aliento culmina en algo que perdura más allá del esfuerzo inicial; construiste algo con raíces.",
      path: "Tu legado no se mide solo en logros propios, sino en lo que dejas disponible para quienes vienen después.",
    },
    reversed: {
      love: "Tensiones familiares o patrones heredados amenazan la estabilidad que creías firme; revisa qué patrón antiguo se repite.",
      work: "Una estructura sólida se tambalea por decisiones que no consideraron el largo plazo; ajusta antes de que se erosione más.",
      path: "Confundir estabilidad con estancamiento te impide notar que el legado también necesita renovarse para seguir vivo.",
    },
    bridge: "El Diez de Oros es tierra en su culminación generacional: la materia que se vuelve legado cuando trasciende a quien la sembró.",
  },
  "pentacles-page": {
    name: "Paje de Oros",
    keywords: ["estudiante aplicado", "curiosidad práctica", "mensajero material", "aprendiz de la tierra"],
    essence:
      "Observa la moneda dorada con total atención, como si estudiara un mapa hacia su futuro: el Paje de Oros es la mente joven que aprende que los sueños se construyen paso a paso, con los pies en la tierra.",
    upright: {
      love: "Un interés nuevo se acerca con intenciones serias, aunque todavía en etapa de aprendizaje; dale tiempo para crecer.",
      work: "Una oportunidad de estudio o un proyecto nuevo pide dedicación práctica; empieza con humildad de principiante.",
      path: "Tu curiosidad por lo concreto y tangible es una forma válida de crecimiento espiritual; aprende haciendo.",
    },
    reversed: {
      love: "El interés se queda en promesas sin acción concreta que las respalde; observa si hay compromiso real detrás.",
      work: "Falta disciplina para convertir la buena idea en resultado tangible; el estudio sin práctica no basta.",
      path: "La procrastinación te aleja de un aprendizaje que ya estaba listo para empezar; da el primer paso concreto hoy.",
    },
    bridge: "El Paje de Oros es el número 11 vuelto aprendiz: el maestro material en potencia que todavía estudia cómo sembrar su propio futuro.",
  },
  "pentacles-knight": {
    name: "Caballero de Oros",
    keywords: ["constancia", "método", "trabajo sostenido", "fiabilidad"],
    essence:
      "Se detiene, inmóvil sobre su caballo también quieto, mirando el campo arado que tiene enfrente: el Caballero de Oros es la tierra que avanza sin prisa, paso a paso, confiando en que la constancia rinde más que la velocidad.",
    upright: {
      love: "Ofreces al vínculo una presencia confiable y constante, sin necesitar grandes gestos para demostrar compromiso.",
      work: "El progreso lento pero seguro es tu fortaleza ahora; sigue el método aunque no sea el más veloz.",
      path: "Tu paciencia metódica es una forma de disciplina espiritual; no todo camino sagrado requiere prisa.",
    },
    reversed: {
      love: "La rutina se vuelve estancamiento cuando deja de tener intención detrás; revisa si la constancia sigue siendo elección.",
      work: "Te aferras tanto al método que pierdes la capacidad de adaptarte cuando la situación lo pide.",
      path: "La disciplina sin propósito se vuelve rigidez vacía; pregúntate para qué sigues el paso constante que llevas.",
    },
    bridge: "El Caballero de Oros es tierra que avanza sin prisa: la materia que confía en el paso constante más que en el galope.",
  },
  "pentacles-queen": {
    name: "Reina de Oros",
    keywords: ["cuidado práctico", "abundancia terrenal", "generosidad tangible", "sabiduría del cuerpo"],
    essence:
      "Sentada en su jardín exuberante con el conejo a sus pies y la moneda en el regazo, la Reina de Oros nutre lo que toca con una generosidad que se siente en lo concreto: comida, cobijo, cuidado real.",
    upright: {
      love: "Cuidas al vínculo con gestos tangibles — un plato preparado, un espacio ordenado, presencia constante que se siente.",
      work: "Tu habilidad para sostener proyectos y personas a la vez es un talento real; administra con la misma generosidad que ya tienes.",
      path: "Tu sabiduría vive en el cuerpo y en lo cotidiano; el cuidado práctico también es una forma profunda de espiritualidad.",
    },
    reversed: {
      love: "Cuidas tanto de los demás que descuidas tu propio bienestar físico; revisa cuánto te queda a ti misma.",
      work: "Te sobrecargas administrando todo para todos; delegar no te resta valor, te permite sostenerlo con más calidad.",
      path: "Confundir productividad con valor propio te desconecta del cuerpo que también merece tu cuidado.",
    },
    bridge: "La Reina de Oros es tierra hecha presencia madura: la materia que nutre con generosidad sin descuidar su propia raíz.",
  },
  "pentacles-king": {
    name: "Rey de Oros",
    keywords: ["prosperidad", "liderazgo estable", "abundancia consolidada", "generosidad con base"],
    essence:
      "Sentado en su trono rodeado de vides cargadas de fruto, con la moneda firme en la mano, el Rey de Oros gobierna desde una abundancia construida con esfuerzo sostenido, no heredada por azar.",
    upright: {
      love: "Traes estabilidad y generosidad concreta al vínculo; tu presencia se siente segura, no solo en palabras sino en hechos.",
      work: "Lideras con visión práctica y resultados tangibles; tu éxito abre camino para que otros también prosperen contigo.",
      path: "Tu abundancia madura sabe compartirse sin empobrecerse; la prosperidad real también es capacidad de generosidad.",
    },
    reversed: {
      love: "El foco excesivo en lo material deja poco espacio para la conexión emocional que el vínculo también necesita.",
      work: "El poder acumulado se usa para controlar en vez de nutrir el crecimiento de otros; revisa el propósito detrás del éxito.",
      path: "Medir tu valor solo por lo que posees te desconecta de una riqueza más profunda que el patrimonio no alcanza a nombrar.",
    },
    bridge: "El Rey de Oros es tierra en su máxima maestría: la materia consolidada que sabe sostener y también sabe compartir.",
  },
};

// ---------------------------------------------------------------------------
// composeReadingProse (v2): prosa de SESIÓN REAL, SIN IA — se compone solo
// desde datos deterministas (nombre/esencia/ámbito/puente de la carta, según
// orientación) nunca puede contradecir la carta. v2 (T3) profundiza sobre el
// mismo principio de v1: apertura → clima de la tirada (mayorías) → 2-3
// párrafos por carta (escena=essence anclada al rol, ámbito+eco de la
// pregunta, puente astrológico como cierre) → jumpers (si vienen) → cierre
// que teje las relaciones reales de la tirada. Firma pública retrocompatible:
// el único agregado es `opts?.jumpers`, opcional.
//
// Mapping role → ámbito: TODOS los roles de posición (past/present/future,
// heart/crossing/foundation/crown/self/environment/hopes-fears/outcome,
// message, free-N) usan el ámbito `path` de la carta. Es la lectura de
// "camino de alma", la más general y la que menos supone sobre el tipo de
// pregunta. Un ámbito explícito (love/work) por posición queda para cuando el
// usuario indique el tema de la tirada; v2 mantiene esta única fuente para no
// inventar contenido nuevo.
//
// Las etiquetas de posición (past→"el pasado", etc.) y los ordinales de la
// tirada libre (free-N→"la primera carta"…) aún no tienen i18n de UI propio
// (esa capa vive en otra task); por eso este archivo trae su propio dict
// interno ES/EN indexado por `key` de posición.
export interface ReadingClimateInfo {
  /** Elemento dominante (ya traducido al locale) cuando ≥50% de las cartas
   *  MENORES de la tirada (y al menos 2) comparten el mismo elemento de palo.
   *  undefined si no hay una mayoría clara o la tirada no trae menores. */
  dominantElementLabel: string | undefined;
  reversedCount: number;
  total: number;
  majorsCount: number;
  minorsCount: number;
}

export interface ReadingComposeDicts {
  positionLabels: Record<string, string>;
  /** Ordinales para la tirada libre (spreadId "free"): index 0 = "la primera
   *  carta"/"the first card"… hasta 10. Las posiciones `free-N` no tienen rol,
   *  así que la prosa las presenta por orden de aparición, no por sentido. */
  ordinals: readonly string[];
  elementLabels: Record<"fire" | "water" | "air" | "earth", string>;
  t: {
    openingWithQuestion: (question: string) => string;
    openingDefault: () => string;
    /** Un párrafo de "clima": mayoría elemental, invertidas, mayores vs
     *  menores. Solo se emite con 2+ cartas (con 1 sola carta no hay mayoría
     *  que leer). */
    climate: (info: ReadingClimateInfo) => string;
    /** Escena de la carta: essence anclada al rol de la posición ("En tu
     *  pasado, El Loco…"). Rota por índice de carta (i % length). */
    sceneParagraphs: ReadonlyArray<(cardName: string, positionLabel: string, essence: string) => string>;
    /** Ámbito (`path`) desarrollado, con eco de la pregunta si existe. */
    ambitParagraphs: ReadonlyArray<(ambitText: string, question?: string) => string>;
    /** Puente astrológico como cierre del párrafo de la carta. */
    bridgeParagraphs: ReadonlyArray<(bridge: string) => string>;
    jumpersIntro: () => string;
    /** Un párrafo por jumper (essence + ámbito tejidos). */
    jumperParagraphs: ReadonlyArray<(cardName: string, essence: string, ambitText: string) => string>;
    /** Se agrega al cierre cuando hay elemento dominante. */
    closingSuitRepeat: (elementLabel: string) => string;
    /** Se agrega al cierre cuando TODAS las cartas son arcanos mayores (2+). */
    closingAllMajors: () => string;
    closingMostlyReversed: () => string;
    closingNormal: () => string;
  };
}

export const READING_POSITION_LABELS_ES: Record<string, string> = {
  day: "el día de hoy",
  past: "el pasado",
  present: "el presente",
  future: "el futuro",
  heart: "el corazón del asunto",
  crossing: "lo que cruza tu camino",
  foundation: "la raíz de la situación",
  crown: "lo que corona el asunto",
  self: "tu propia mirada",
  environment: "tu entorno",
  "hopes-fears": "tus esperanzas y temores",
  outcome: "el desenlace posible",
  // ---- relación ----
  you: "quién eres tú en esto",
  other: "quién es la otra persona",
  connection: "lo que los conecta",
  "your-feelings": "lo que tú sientes",
  "their-feelings": "lo que la otra persona siente",
  challenge: "el desafío del vínculo",
  tendency: "hacia dónde va esto",
  // ---- rueda del año ----
  "month-1": "enero",
  "month-2": "febrero",
  "month-3": "marzo",
  "month-4": "abril",
  "month-5": "mayo",
  "month-6": "junio",
  "month-7": "julio",
  "month-8": "agosto",
  "month-9": "septiembre",
  "month-10": "octubre",
  "month-11": "noviembre",
  "month-12": "diciembre",
  theme: "el tema del año",
  // ---- decisión ----
  situation: "la situación",
  "option-a": "la opción A",
  "brings-a": "lo que trae la opción A",
  "option-b": "la opción B",
  "brings-b": "lo que trae la opción B",
  unseen: "lo que no estás viendo",
  advice: "el consejo",
  // ---- herradura / cruz simple ----
  hidden: "una influencia oculta",
  obstacle: "el obstáculo",
  cause: "la causa",
  synthesis: "la síntesis",
  // ---- chakras ----
  "chakra-crown": "tu corona",
  "chakra-heart": "tu corazón",
  "third-eye": "tu tercer ojo",
  throat: "tu garganta",
  solar: "tu plexo solar",
  sacral: "tu sacro",
  root: "tu raíz",
  // ---- elementos ----
  spirit: "el espíritu que envuelve todo",
  air: "el aire",
  fire: "el fuego",
  water: "el agua",
  earth: "la tierra",
  // ---- sí o no ----
  answer: "la respuesta",
};

const READING_ORDINALS_ES: readonly string[] = [
  "la primera carta",
  "la segunda carta",
  "la tercera carta",
  "la cuarta carta",
  "la quinta carta",
  "la sexta carta",
  "la séptima carta",
  "la octava carta",
  "la novena carta",
  "la décima carta",
];

const DICTS_READING_ES: ReadingComposeDicts = {
  positionLabels: READING_POSITION_LABELS_ES,
  ordinals: READING_ORDINALS_ES,
  elementLabels: { fire: "fuego", water: "agua", air: "aire", earth: "tierra" },
  t: {
    openingWithQuestion: (question) =>
      `Traes contigo una pregunta — "${question}" — y las cartas responden no con certezas, sino con espejos.`,
    openingDefault: () => "Las cartas se abren para mostrarte lo que tu alma ya intuye, aunque aún no tenga palabras.",
    climate: ({ dominantElementLabel, reversedCount, total, majorsCount }) => {
      const lead = dominantElementLabel
        ? `En esta tirada domina el ${dominantElementLabel}`
        : majorsCount === total
          ? "Esta tirada viene cargada de arcanos mayores"
          : "La tirada mezcla energías sin un solo color dominante";
      const reversedBit =
        reversedCount === 0
          ? "ninguna carta llegó invertida"
          : reversedCount === total
            ? "todas las cartas llegaron invertidas"
            : `${reversedCount} de ${total} cartas llegaron invertidas`;
      return `${lead}, y ${reversedBit}.`;
    },
    sceneParagraphs: [
      (cardName, positionLabel, essence) => `En ${positionLabel}, ${cardName} planta la escena: ${essence}`,
      (cardName, positionLabel, essence) => `${cardName} se instala en ${positionLabel} y trae su propia escena. ${essence}`,
      (cardName, positionLabel, essence) => `Miras hacia ${positionLabel} y ahí está ${cardName}: ${essence}`,
      (cardName, positionLabel, essence) => `${positionLabel} habla hoy con la voz de ${cardName}. ${essence}`,
    ],
    ambitParagraphs: [
      (ambitText, question) =>
        question ? `${ambitText} Con "${question}" todavía resonando, esto no es un detalle menor.` : ambitText,
      (ambitText, question) =>
        question ? `${ambitText} Vuelve a "${question}": esta carta ya empezó a contestar.` : ambitText,
      (ambitText, question) =>
        question ? `${ambitText} Frente a "${question}", esto es lo que no puedes saltarte.` : ambitText,
    ],
    bridgeParagraphs: [
      (bridge) => `Y el cielo lo confirma: ${bridge}`,
      (bridge) => `${bridge} Ese es el eco astrológico que sostiene la escena.`,
      (bridge) => `Detrás de la imagen hay cielo real: ${bridge}`,
      (bridge) => `El puente astrológico cierra la carta sin adornos: ${bridge}`,
    ],
    jumpersIntro: () =>
      "Estas cartas saltaron del mazo antes de tiempo: escúchalas aparte, sin mezclarlas con la tirada principal.",
    jumperParagraphs: [
      (cardName, essence, ambitText) =>
        `${cardName} no esperó a ser elegida — saltó porque tenía algo urgente que decir. ${essence} ${ambitText}`,
      (cardName, essence, ambitText) =>
        `Que ${cardName} se cayera del mazo no es azar menor: ${essence} ${ambitText}`,
      (cardName, essence, ambitText) =>
        `${cardName} se adelantó al orden de la tirada. ${essence} ${ambitText}`,
    ],
    closingSuitRepeat: (elementLabel) =>
      `El ${elementLabel} vuelve una y otra vez en esta tirada — no es casualidad, es el tono que domina la sesión.`,
    closingAllMajors: () =>
      "Todas las cartas que salieron son arcanos mayores: el alma habla fuerte hoy, sin detalles menores que la distraigan.",
    closingMostlyReversed: () =>
      "La mayoría de las cartas llegó invertida: el cielo te pide revisar antes que avanzar, no como castigo sino como cuidado.",
    closingNormal: () =>
      "Teje estas voces con calma: la tirada no decide por ti, te devuelve el espejo para que decidas con más claridad.",
  },
};

/** Posición de una carta dentro de la tirada libre ("free-3" → índice 2). */
function freeOrdinalIndex(position: string): number | undefined {
  const match = /^free-(\d+)$/.exec(position);
  if (!match) return undefined;
  return Number(match[1]) - 1;
}

function labelForPosition(dicts: ReadingComposeDicts, position: string): string {
  const ordinalIndex = freeOrdinalIndex(position);
  if (ordinalIndex !== undefined) return dicts.ordinals[ordinalIndex] ?? position;
  return dicts.positionLabels[position] ?? position;
}

interface Majority {
  dominantElementLabel: string | undefined;
  reversedCount: number;
  total: number;
  majorsCount: number;
  minorsCount: number;
  allMajors: boolean;
}

/** Mayorías de la tirada: elemento dominante (solo entre cartas menores,
 *  ≥50% y al menos 2), conteo de invertidas, mayores vs menores. Determinista
 *  — nunca inventa una mayoría que no está en los datos. */
function computeMajority(cards: ReadonlyArray<{ cardId: string; reversed: boolean }>, dicts: ReadingComposeDicts): Majority {
  const total = cards.length;
  const reversedCount = cards.filter((c) => c.reversed).length;
  const elementCounts = new Map<"fire" | "water" | "air" | "earth", number>();
  let minorsCount = 0;
  for (const c of cards) {
    const deckCard = cardById(c.cardId);
    if (!deckCard || deckCard.arcana !== "minor") continue;
    minorsCount++;
    const el = deckCard.correspondence.element;
    elementCounts.set(el, (elementCounts.get(el) ?? 0) + 1);
  }
  const majorsCount = total - minorsCount;
  let dominantElementLabel: string | undefined;
  for (const [el, count] of elementCounts) {
    if (count >= 2 && count / minorsCount >= 0.5) {
      dominantElementLabel = dicts.elementLabels[el];
      break;
    }
  }
  return {
    dominantElementLabel,
    reversedCount,
    total,
    majorsCount,
    minorsCount,
    allMajors: total >= 2 && majorsCount === total,
  };
}

/** Prosa determinista de lectura de tarot (sin IA), v2: apertura + clima →
 *  2-3 párrafos por carta (escena/ámbito+pregunta/puente) → jumpers → cierre
 *  tejido. `spreadId` sigue sin participar directo en la composición (las
 *  posiciones llegan ya en `cards`, y `free-N` se detecta por el propio
 *  formato de `position`) — se mantiene en la firma pública porque la lectura
 *  por tipo de tirada con ámbitos propios por rol lo va a necesitar sin
 *  romper a los llamadores existentes. `opts.jumpers` es el único agregado a
 *  la firma pública: opcional, retrocompatible. */
export function composeReadingProse(
  locale: "es" | "en",
  spreadId: string,
  cards: Array<{ cardId: string; reversed: boolean; position: string }>,
  question?: string,
  opts?: { jumpers?: Array<{ cardId: string; reversed: boolean }> },
): string[] {
  void spreadId; // reservado (ver doc arriba)
  return composeReadingWith(
    cards,
    locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES,
    locale === "en" ? DICTS_READING_EN : DICTS_READING_ES,
    question,
    opts,
  );
}

export function composeReadingWith(
  cards: Array<{ cardId: string; reversed: boolean; position: string }>,
  cardDict: Record<string, TarotCardContent>,
  dicts: ReadingComposeDicts,
  question?: string,
  opts?: { jumpers?: Array<{ cardId: string; reversed: boolean }> },
): string[] {
  const parts: string[] = [];

  parts.push(question ? dicts.t.openingWithQuestion(question) : dicts.t.openingDefault());

  const majority = computeMajority(cards, dicts);
  if (cards.length >= 2) {
    parts.push(
      dicts.t.climate({
        dominantElementLabel: majority.dominantElementLabel,
        reversedCount: majority.reversedCount,
        total: majority.total,
        majorsCount: majority.majorsCount,
        minorsCount: majority.minorsCount,
      }),
    );
  }

  let emitted = 0;
  for (const drawn of cards) {
    const card = cardDict[drawn.cardId];
    if (!card) continue;
    const positionLabel = labelForPosition(dicts, drawn.position);
    const ambitText = drawn.reversed ? card.reversed.path : card.upright.path;
    const scene = dicts.t.sceneParagraphs[emitted % dicts.t.sceneParagraphs.length]!;
    const ambit = dicts.t.ambitParagraphs[emitted % dicts.t.ambitParagraphs.length]!;
    const bridge = dicts.t.bridgeParagraphs[emitted % dicts.t.bridgeParagraphs.length]!;
    parts.push(scene(card.name, positionLabel, card.essence));
    parts.push(ambit(ambitText, question));
    parts.push(bridge(card.bridge));
    emitted++;
  }

  const jumpers = opts?.jumpers ?? [];
  if (jumpers.length > 0) {
    parts.push(dicts.t.jumpersIntro());
    jumpers.forEach((jumper, i) => {
      const card = cardDict[jumper.cardId];
      if (!card) return;
      const ambitText = jumper.reversed ? card.reversed.path : card.upright.path;
      const paragraph = dicts.t.jumperParagraphs[i % dicts.t.jumperParagraphs.length]!;
      parts.push(paragraph(card.name, card.essence, ambitText));
    });
  }

  const closing: string[] = [];
  closing.push(
    majority.total > 0 && majority.reversedCount / majority.total >= 0.5
      ? dicts.t.closingMostlyReversed()
      : dicts.t.closingNormal(),
  );
  if (majority.dominantElementLabel) closing.push(dicts.t.closingSuitRepeat(majority.dominantElementLabel));
  if (majority.allMajors) closing.push(dicts.t.closingAllMajors());
  parts.push(closing.join(" "));

  return parts;
}
