// Contenido tarot (ES): voz Aluna — evolutiva, segunda persona, sin fatalismo,
// imágenes concretas. Este archivo es el motor de datos ES; tarot-en.ts SOLO
// exporta datos EN (misma dirección de import que horoscope: es→en).

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
};
