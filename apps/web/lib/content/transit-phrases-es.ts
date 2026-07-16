// Frases interpretativas del clima de hoy (ES) — una por aspecto mayor ×
// planeta transitante (a.a de transitAspects). Voz de Aluna: segunda persona,
// cálida, una imagen concreta, sin jerga astrológica en la frase; ≤120 chars.
// Las de square:saturn, opposition:moon y trine:jupiter vienen del mockup 06
// §3.2 (vara de calidad). Clave: `${aspect}:${transiting}`; las claves sin
// cuerpo (`square`, `trine`, …) son el fallback genérico por aspecto.

export const TRANSIT_PHRASES: Record<string, string> = {
  // — conjunción: todo se concentra, lo que empieza empieza en serio —
  "conjunction:sun": "Hoy el día te mira de frente: lo que eres se nota más que nunca, sin dónde esconderlo.",
  "conjunction:moon": "Lo que sientes sube a flor de piel; no lo tapes con quehaceres, déjalo hablar un rato.",
  "conjunction:mercury": "Tienes la palabra justa en la punta de la lengua: dila hoy, que mañana ya no pesa igual.",
  "conjunction:venus": "El cariño toca tu puerta sin avisar; ábrele aunque estés en pijama.",
  "conjunction:mars": "Traes el motor encendido desde que despiertas: dale un camino antes de que se recaliente.",
  "conjunction:jupiter": "El día te sirve el plato más grande de la mesa: come despacio, pero come.",
  "conjunction:saturn": "La vida te toma examen hoy; llegas con la lección más aprendida de lo que crees.",
  "conjunction:uranus": "Un cable suelto chispea en tu rutina: no lo tapes, mira qué luz quiere encender.",
  "conjunction:neptune": "El día amanece con neblina por dentro: camina despacio y no firmes mapas hoy.",
  "conjunction:pluto": "Algo viejo pide ser enterrado hoy con honores; no lo cargues de vuelta a casa.",

  // — sextil: puerta entreabierta, la abre un paso tuyo —
  "sextile:sun": "Hay un rayo de sol en tu ventana exacta: asómate, que dura poco y calienta mucho.",
  "sextile:moon": "Hoy es fácil decir lo que sientes sin drama: esa ventanita no se abre todos los días.",
  "sextile:mercury": "Una conversación pequeña trae una llave grande: escucha hasta el final.",
  "sextile:venus": "Un gesto tuyo de nada —un mensaje, una flor— rinde el doble hoy. Gástalo.",
  "sextile:mars": "El empujón que necesitas es del tamaño de un paso: dalo antes del mediodía.",
  "sextile:jupiter": "La suerte hoy viaja en bus, no en limusina: súbete a lo sencillo que pase.",
  "sextile:saturn": "Hoy rinde ordenar un cajón, una cuenta, una promesa: lo pequeño bien hecho te sostiene.",
  "sextile:uranus": "Prueba el camino que nunca tomas, aunque sea para ir por el pan: algo te espera ahí.",
  "sextile:neptune": "Tu intuición hoy susurra en vez de gritar; baja el volumen del mundo para oírla.",
  "sextile:pluto": "Puedes soltar hoy un rencor chiquito sin ceremonia, como quien saca una piedra del bolsillo.",

  // — cuadratura: fricción, no forzar —
  "square:sun": "El día te lleva la contraria como para probarte; no gastes tu fuego en cada chispa.",
  "square:moon": "Amaneces con el corazón arrugado sin motivo claro; plánchalo con calma, no con culpa.",
  "square:mercury": "Las palabras hoy salen con filo: cuenta hasta tres antes de mandar ese mensaje.",
  "square:venus": "Lo que quieres y lo que te conviene no se saludan hoy; no compres nada para llenar el hueco.",
  "square:mars": "Traes prisa contra un mundo lento: si empujas la puerta que dice «jale», pierdes tú.",
  "square:jupiter": "Hoy todo promete más de lo que cabe en tus manos: di que sí a una sola cosa.",
  "square:saturn": "El deber le aprieta la mano al deseo: hoy no firmes nada del corazón.", // mockup 06
  "square:uranus": "Te pican las ganas de tirarlo todo por la ventana; cambia solo un mueble, no la casa.",
  "square:neptune": "Hoy los espejismos vienen bien vestidos: si suena demasiado bonito, duérmelo una noche.",
  "square:pluto": "Un pulso de poder te busca pelea hoy: gana quien suelta primero la cuerda.",

  // — trígono: el agua corre a favor —
  "trine:sun": "Hoy caminas con el semáforo en verde: haz de una vez eso que venías postergando.",
  "trine:moon": "El corazón amanece en su casa, con la mesa puesta: invita a alguien a sentarse.",
  "trine:mercury": "Hoy las palabras te salen ya peinadas: escribe, llama, firma lo que llevabas trabado.",
  "trine:venus": "El cariño hoy corre cuesta abajo: déjate querer sin revisar el recibo.",
  "trine:mars": "Fuerza y puntería van de la mano hoy: apunta a lo grande, que el brazo alcanza.",
  "trine:jupiter": "Una puerta se abre justo donde ya venías brillando.", // mockup 06
  "trine:saturn": "Lo que construyes hoy queda bien parado por años: pon un ladrillo, aunque sea uno.",
  "trine:uranus": "Una idea fresca te cae limpia como fruta madura: atrápala antes de que toque el piso.",
  "trine:neptune": "Sueñas despierto con buena señal hoy: apunta lo que imagines, que trae instrucciones.",
  "trine:pluto": "Hoy tienes fuerza de raíz: puedes mover eso tan pesado que otros días ni intentas.",

  // — oposición: dos polos, el otro como espejo —
  "opposition:sun": "Alguien enfrente te muestra justo lo que no ves de ti: no discutas con tu espejo.",
  "opposition:moon": "Antojo de romperlo todo; respira dos veces antes de decidir.", // mockup 06
  "opposition:mercury": "Dos verdades tiran de la misma sábana hoy: escucha la otra antes de defender la tuya.",
  "opposition:venus": "Lo que pides y lo que das se miran de lejos hoy: acércalos antes de reclamar nada.",
  "opposition:mars": "La pelea te llama por tu nombre hoy: antes de entrar, pregúntate qué defiendes de verdad.",
  "opposition:jupiter": "Hoy quieres abarcar dos orillas a la vez; el puente se cruza por la mitad, no de un salto.",
  "opposition:saturn": "Alguien te pone una regla justo donde dolía: mide si es muro o si es baranda.",
  "opposition:uranus": "Otro sacude tu mesa sin permiso: rescata lo que importa antes de defender el mantel.",
  "opposition:neptune": "Hoy cuesta ver dónde terminas tú y empieza el otro: vuelve a tu nombre cuando dudes.",
  "opposition:pluto": "Alguien te empuja al fondo del asunto: baja con linterna, no con miedo.",

  // — genéricos por aspecto (fallback si el cuerpo no está en el mapa) —
  conjunction: "Todo se junta hoy en un mismo punto: lo que ahí empiece, empieza en serio.",
  sextile: "Hay una ventana entreabierta hoy: no se abre sola, pero un empujón tuyo la abre entera.",
  square: "El día trae una piedra en el zapato: párate a sacarla en vez de caminar torcido.",
  trine: "Hoy el agua corre a tu favor: rema igual, pero disfruta lo lejos que llegas.",
  opposition: "El día te estira de dos lados: no elijas a las carreras, que el punto medio también es tuyo.",
};

/** Frase para un tránsito: aspecto × planeta transitante, con fallback genérico por aspecto. */
export function transitPhrase(aspect: string, transiting: string): string {
  return TRANSIT_PHRASES[`${aspect}:${transiting}`] ?? TRANSIT_PHRASES[aspect] ?? "";
}
