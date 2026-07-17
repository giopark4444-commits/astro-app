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
};
