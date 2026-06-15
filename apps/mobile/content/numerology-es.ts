// Voz de Aluna para numerología (ES) — portada de apps/web/lib/content/numerology-es.ts.
// Evolutivo-yóguico: propósito del alma, compasivo pero honesto (nombra la sombra),
// con una práctica al cierre. Nivel "Esencia": hondo pero conciso. Los niveles
// "Profunda"/"Completa" (IA) se muestran como "próximamente" en el móvil.

export interface NumberMeaning {
  essence: string;
  flow: string;
  shadow: string;
  practice: string;
}

export const NUMBER_MEANINGS_ES: Record<number, NumberMeaning> = {
  1: {
    essence:
      "Tu alma vino a aprender a sostenerse en pie por sí misma: a empezar sin pedir permiso, a confiar en su propia chispa y a recordar que toda creación nace de alguien que se atrevió a ser el primero.",
    flow: "Eres iniciativa, coraje y originalidad. Cuando estás en tu eje, abres caminos donde otros solo ven muro, y tu sola decisión le da permiso al resto de atreverse. Lideras no por mandar, sino por ir adelante.",
    shadow:
      "El riesgo es el ego que se aísla: imponerte, no escuchar, confundir fuerza con dureza. Cuando dudas de ti, lo tapas con arrogancia o te paralizas esperando que otro empiece por ti.",
    practice:
      "Hoy inicia algo pequeño tú solo, y al terminar pregúntate: ¿lo hice para brillar, o para crear? Practica ahimsa, la no-violencia, contigo mismo cuando falles: el pionero también tropieza.",
  },
  2: {
    essence:
      "Viniste a aprender el arte de unir: la sensibilidad, la pausa y el tejido invisible que sostiene a dos. Tu alma crece en la relación, no en la conquista.",
    flow: "Tu don es la empatía y la diplomacia. Sientes lo que el otro no dice, armonizas sin imponerte y conviertes la diferencia en encuentro. Eres el puente, la mano que calma.",
    shadow:
      "La sombra es perderte en el otro: complacer hasta desaparecer, evitar el conflicto a costa de tu verdad, depender de una mirada ajena para sentirte. Tu miedo a no ser querido te calla.",
    practice:
      "Pon un límite amable hoy, sin culpa. Respira en santosha, el contentamiento: no necesitas la aprobación de nadie para estar completo; ya lo estás.",
  },
  3: {
    essence:
      "Tu alma vino a expresarse: a poner afuera lo que siente, a crear y a alegrar el mundo con su voz. Naciste para que la vida pase por ti y salga hecha color.",
    flow: "Eres creatividad, palabra y luz social. Contagias entusiasmo, conviertes la emoción en arte, en risa, en encuentro, y donde llegas se enciende algo. Tu alegría es medicina.",
    shadow:
      "El reto es la dispersión: empezar mil cosas y terminar ninguna, esconder la herida tras el chiste, hablar para no sentir. Cuando te hieren, te ríes; cuando temes, te dispersas.",
    practice:
      "Crea algo hoy sin público, solo por el gozo. Y guarda un silencio: deja que lo no dicho también te hable. No toda tu hondura necesita aplausos.",
  },
  4: {
    essence:
      "Viniste a construir: a darle forma, raíz y cimiento a lo que sueñas, ladrillo a ladrillo. Tu alma confía en el trabajo honesto y en lo que perdura.",
    flow: "Eres orden, constancia y lealtad. Donde pones tu mano, queda firme; eres la estructura en la que otros descansan, la palabra que se cumple, el cimiento que no tiembla.",
    shadow:
      "La sombra es la rigidez: el control que ahoga, el miedo al cambio, confundir seguridad con jaula. Tanto cuidas el muro que olvidas que también querías habitarlo.",
    practice:
      "Suelta hoy un plan y deja que algo fluya sin tu control. Aparigraha, el no aferrarse: lo sólido también respira, y lo vivo cambia de forma para seguir vivo.",
  },
  5: {
    essence:
      "Tu alma vino a ser libre: a probar la vida con todos los sentidos, a no temerle al cambio y a entender que la existencia es movimiento. Naciste para experimentar.",
    flow: "Eres aventura, versatilidad y magnetismo. Te adaptas, exploras, encantas, y le recuerdas al mundo que vivir es atreverse. Donde otros ven riesgo, tú ves una puerta.",
    shadow:
      "El riesgo es la fuga: la inquietud que no echa raíz, el exceso que aturde, escapar justo cuando algo pide presencia y compromiso. Confundes libertad con no quedarte nunca.",
    practice:
      "Quédate hoy en algo incómodo cinco minutos más de lo que querrías. La libertad madura no es huir: es elegir quedarte, y descubrir que la raíz también es alas.",
  },
  6: {
    essence:
      "Viniste a amar y a cuidar: a sostener el hogar, la tribu, lo que necesita ternura. Tu alma encuentra su sentido en el servicio y en la belleza que crea para otros.",
    flow: "Eres entrega, belleza y responsabilidad. Sanas, embelleces, armonizas, y haces que la gente se sienta en casa contigo. Tu presencia abriga.",
    shadow:
      "La sombra es cargar de más: el sacrificio que pasa factura, el control disfrazado de cuidado, olvidarte de ti hasta vaciarte. Das tanto que luego reclamas en silencio.",
    practice:
      "Cuídate hoy con la misma devoción con que cuidas a otros. Pregúntate antes de dar: ¿esto nace del amor, o del deber? Solo lo primero no te cuesta el alma.",
  },
  7: {
    essence:
      "Tu alma vino a buscar la verdad: a mirar hacia adentro, a entender el misterio detrás de lo visible y a no conformarse con la respuesta fácil. Naciste para conocer.",
    flow: "Eres profundidad, intuición y sabiduría. Necesitas tu silencio, y de él traes claridad que otros no alcanzan. Ves capas donde el resto ve superficie.",
    shadow:
      "El reto es el aislamiento: la mente que se encierra, el frío que pone distancia, la fe que cuesta cuando todo se analiza. A veces piensas tanto la vida que olvidas vivirla.",
    practice:
      "Medita hoy aunque sean cinco minutos: svadhyaya, el estudio de uno mismo. Y luego confía en algo que no puedas demostrar: no todo lo real cabe en la razón.",
  },
  8: {
    essence:
      "Viniste a dominar el mundo material con alma: a manejar el poder, el dinero y los logros sin venderte, y a aprender que la abundancia es energía que circula. Naciste para materializar.",
    flow: "Eres ambición, autoridad y abundancia. Sabes dirigir, construir prosperidad y sostener lo grande; el plano físico te obedece cuando lo mandas con integridad.",
    shadow:
      "La sombra es el poder que corrompe: medir tu valor en cifras, el control que aplasta, olvidar que la verdadera riqueza también es interior. Cuando temes perder, aprietas.",
    practice:
      "Da algo hoy sin esperar retorno. El verdadero poder no es el que acumula, sino el que se atreve a soltar y a servir: ahí empieza la abundancia que no se gasta.",
  },
  9: {
    essence:
      "Tu alma vino a entregar y a soltar: a amar sin condición, a cerrar ciclos para que otros empiecen y a comprender que se posee de verdad solo lo que se da. Naciste para trascender.",
    flow: "Eres compasión, generosidad y amplitud. Sientes el dolor del mundo como propio y das sin medir; eres el que perdona, el que sana, el que abraza lo que ya nadie quiere.",
    shadow:
      "El reto es el desapego que duele: cargar el sufrimiento ajeno, no saber recibir, aferrarte a lo que ya terminó. Tu corazón es tan grande que a veces se olvida de sí.",
    practice:
      "Suelta hoy algo que ya cumplió su tiempo, con gratitud por lo que te dio. Y deja que alguien te dé: recibir también es amor, y tu copa también merece llenarse.",
  },
  11: {
    essence:
      "Eres un número maestro: tu alma vino a ser canal. A iluminar, a inspirar y a recordarle a otros lo que no pueden ver solos. El 2 elevado a su máxima sensibilidad.",
    flow: "Eres intuición luminosa, visión y una sensibilidad casi medial. Cuando confías en ella, tu sola presencia despierta y eleva a quien te rodea.",
    shadow:
      "La maestría pesa: ansiedad, exceso de sensibilidad, sentir que no encajas en este mundo. El miedo a brillar te empuja a esconder tu luz en el 2 cómodo.",
    practice:
      "Honra tu sensibilidad como un don, no como una falla. Respira, aterriza el cuerpo (svadhyaya), y atrévete a decir lo que intuyes: el mundo necesita tu visión.",
  },
  22: {
    essence:
      "Número maestro: el constructor del sueño imposible. Tu alma vino a volver real, en el plano material, una visión que beneficie a muchos. El 4 con alas.",
    flow: "Unes la visión del 11 con la mano firme del 4: puedes edificar legados, instituciones, obras que trascienden tu vida. Sueñas grande y lo aterrizas.",
    shadow:
      "La presión de tu propio potencial puede paralizarte, o el miedo puede encogerte a metas pequeñas que no te llenan. El control vuelve aquí con más fuerza.",
    practice:
      "Da hoy un paso concreto hacia tu sueño más grande, por mínimo que sea. Confía: no tienes que ver toda la escalera para subir el primer escalón.",
  },
  33: {
    essence:
      "Número maestro raro: el maestro del amor. Tu alma vino a servir y a sanar desde un corazón que ama sin condición. El 6 entregado a lo universal.",
    flow: "Eres compasión hecha acción, entrega luminosa, guía. Cuando vives en tu eje, tu amor educa y sana a quien se cruza contigo.",
    shadow:
      "La sombra es el sacrificio que se vacía, el peso de cargar a todos, el martirio. Amar tanto que olvidas que tú también necesitas ser sostenido.",
    practice:
      "Pon hoy tu cuidado en ti primero, sin culpa. Solo la copa llena puede desbordar: santosha, descansa en lo que ya eres.",
  },
};

/** Lente de cada posición: qué significa este número AHÍ. */
export const POSITION_LENS_ES: Record<string, string> = {
  lifePath:
    "Es el camino que tu alma eligió recorrer en esta vida: tu propósito y la lección central de tu viaje.",
  expression:
    "Es el don que viniste a ofrecer al mundo: tus talentos naturales y la forma en que estás llamado a brillar.",
  soulUrge:
    "Es lo que tu alma anhela en lo más hondo, tu motivación secreta: lo que de verdad te hace sentir vivo.",
  personality:
    "Es la puerta que el mundo ve primero: la impresión que das antes de que te conozcan por dentro.",
  birthday: "Es un regalo innato que traes contigo, un talento que matiza y endulza tu camino de vida.",
  maturity:
    "Es hacia dónde converge tu vida en la segunda mitad: la versión madura de ti que se revela con los años.",
};

/** Etiquetas y glosas (portadas de messages/es.json → numerology). */
export const LABELS = {
  lifePath: "Camino de Vida",
  expression: "Expresión",
  soulUrge: "Alma",
  personality: "Personalidad",
  birthday: "Día",
  maturity: "Madurez",
} as const;

export const GLOSS: Record<string, string> = {
  lifePath: "tu camino y propósito",
  expression: "tu don al mundo",
  soulUrge: "lo que tu alma anhela",
  personality: "cómo te percibe el mundo",
  birthday: "tu regalo innato",
  maturity: "hacia dónde madura tu vida",
};

/**
 * Voz del "día personal" (ES): una línea cálida por número, en clave evolutiva
 * (invitación, no predicción). Cubre 1–9 y los maestros 11/22 que el ciclo del
 * día puede arrojar. Portada de apps/web/lib/content/personal-day-es.ts.
 */
export const PERSONAL_DAY_ES: Record<number, string> = {
  1: "Día de comenzar. Da tú el primer paso, aunque sea pequeño.",
  2: "Día de pausa y vínculo. Escucha más de lo que empujas.",
  3: "Día de expresarte. Deja que tu voz y tu alegría salgan al mundo.",
  4: "Día de cimientos. Lo que ordenes hoy con calma, sostiene mañana.",
  5: "Día de movimiento. Ábrete a lo inesperado sin soltar tu centro.",
  6: "Día de cuidar. Atiende a los tuyos, y date a ti la misma ternura.",
  7: "Día de adentro. Busca silencio: la respuesta vive en tu hondura.",
  8: "Día de poder. Decide con firmeza lo que de verdad merece tu fuerza.",
  9: "Día de cierre. Suelta lo cumplido para dejar sitio a lo que viene.",
  11: "Día luminoso. Tu intuición habla claro: confía en lo que sientes.",
  22: "Día de construir en grande. Aterriza un sueño en un acto concreto.",
};
