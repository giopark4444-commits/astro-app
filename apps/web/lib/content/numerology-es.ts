// Borrador de la voz de Aluna para numerología (ES). Evolutivo-yóguico: propósito
// del alma, compasivo pero honesto (nombra la sombra), con una práctica al cierre.
// Es el primer paso del corpus del Plan 6 (AI draft → edición humana → plantilla fija).

export interface NumberMeaning {
  essence: string;  // qué vino a vivir esta vibración
  flow: string;     // energía fluida (el don, la luz)
  shadow: string;   // energía no fluida (la sombra, el reto)
  practice: string; // una práctica concreta, con tinte yóguico
}

/** Arquetipo de cada número (1–9 + maestros 11/22/33). El mismo número se colorea
 *  según la posición (ver POSITION_LENS_ES). */
export const NUMBER_MEANINGS_ES: Record<number, NumberMeaning> = {
  1: {
    essence: "Tu alma vino a aprender a sostenerse en pie por sí misma: a empezar sin pedir permiso y a confiar en su propia chispa.",
    flow: "Eres iniciativa, coraje y originalidad. Cuando estás en tu eje, abres caminos donde otros solo ven muro y le das permiso al resto de atreverse.",
    shadow: "El riesgo es el ego que se aísla: imponerte, no escuchar, confundir fuerza con dureza. La soledad del que cree que solo él puede.",
    practice: "Hoy inicia algo pequeño tú solo, y al terminar pregúntate: ¿lo hice para brillar, o para crear? Practica ahimsa (no-violencia) contigo cuando falles.",
  },
  2: {
    essence: "Viniste a aprender el arte de unir: la sensibilidad, la pausa y el tejido invisible que sostiene a dos.",
    flow: "Tu don es la empatía y la diplomacia. Sientes lo que el otro no dice y armonizas sin imponerte; eres el puente.",
    shadow: "La sombra es perderte en el otro: complacer hasta desaparecer, evitar el conflicto a costa de tu verdad, depender para sentirte.",
    practice: "Pon un límite amable hoy, sin culpa. Respira en santosha (contentamiento): no necesitas la aprobación de nadie para estar completo.",
  },
  3: {
    essence: "Tu alma vino a expresarse: a poner afuera lo que siente, a crear y a alegrar el mundo con su voz.",
    flow: "Eres creatividad, palabra y luz social. Contagias entusiasmo y conviertes la emoción en arte, en risa, en encuentro.",
    shadow: "El reto es la dispersión: empezar mil cosas y terminar ninguna, esconder la herida tras el chiste, hablar para no sentir.",
    practice: "Crea algo hoy sin público, solo por el gozo. Y guarda un silencio: deja que lo no dicho también te hable.",
  },
  4: {
    essence: "Viniste a construir: a darle forma, raíz y cimiento a lo que sueñas, ladrillo a ladrillo.",
    flow: "Eres orden, constancia y lealtad. Donde pones tu mano, queda firme; eres la estructura en la que otros descansan.",
    shadow: "La sombra es la rigidez: el control que ahoga, el miedo al cambio, confundir seguridad con jaula.",
    practice: "Suelta hoy un plan y deja que algo fluya sin tu control. Aparigraha: no aferrarse. Lo sólido también respira.",
  },
  5: {
    essence: "Tu alma vino a ser libre: a probar la vida con todos los sentidos y a no temerle al cambio.",
    flow: "Eres aventura, versatilidad y magnetismo. Te adaptas, exploras y le recuerdas al mundo que vivir es moverse.",
    shadow: "El riesgo es la fuga: la inquietud que no echa raíz, el exceso, escapar cuando algo pide presencia y compromiso.",
    practice: "Quédate hoy en algo incómodo cinco minutos más de lo que querrías. La libertad madura no es huir: es elegir quedarte.",
  },
  6: {
    essence: "Viniste a amar y a cuidar: a sostener al hogar, a la tribu, a lo que necesita ternura.",
    flow: "Eres entrega, belleza y responsabilidad. Sanas, embelleces y haces que la gente se sienta en casa contigo.",
    shadow: "La sombra es cargar de más: el sacrificio que pasa factura, el control disfrazado de cuidado, olvidarte de ti.",
    practice: "Cuídate hoy con la misma devoción con que cuidas a otros. Pregúntate: ¿esto lo doy desde el amor, o desde el deber?",
  },
  7: {
    essence: "Tu alma vino a buscar la verdad: a mirar hacia adentro y a entender el misterio detrás de lo visible.",
    flow: "Eres profundidad, intuición y sabiduría. Necesitas tu silencio, y de él traes claridad que otros no alcanzan.",
    shadow: "El reto es el aislamiento: la mente que se encierra, el frío que pone distancia, la fe que cuesta cuando todo se analiza.",
    practice: "Medita hoy aunque sea cinco minutos: svadhyaya, el estudio de uno mismo. Y luego confía en algo que no puedas demostrar.",
  },
  8: {
    essence: "Viniste a dominar el mundo material con alma: a manejar el poder, el dinero y los logros sin venderte.",
    flow: "Eres ambición, autoridad y abundancia. Sabes materializar, dirigir y construir prosperidad; el plano físico te obedece.",
    shadow: "La sombra es el poder que corrompe: medir tu valor en cifras, el control, olvidar que la riqueza también es interior.",
    practice: "Da algo hoy sin esperar retorno. El verdadero poder es el que se atreve a soltar y a servir.",
  },
  9: {
    essence: "Tu alma vino a entregar y a soltar: a amar sin condición y a cerrar ciclos para que otros empiecen.",
    flow: "Eres compasión, generosidad y amplitud. Sientes el dolor del mundo como propio y das sin medir; eres el que sana.",
    shadow: "El reto es el desapego que duele: cargar el sufrimiento ajeno, no saber recibir, aferrarte a lo que ya terminó.",
    practice: "Suelta hoy algo que ya cumplió su tiempo, con gratitud. Y deja que alguien te dé: recibir también es amor.",
  },
  11: {
    essence: "Eres un número maestro: tu alma vino a ser canal. A iluminar, a inspirar y a recordarle a otros lo que no pueden ver solos. El 2 elevado a su máxima sensibilidad.",
    flow: "Eres intuición luminosa, visión y una sensibilidad casi medial. Cuando confías en ella, tu sola presencia despierta y eleva a quien te rodea.",
    shadow: "La maestría pesa: ansiedad, exceso de sensibilidad, sentir que no encajas en este mundo. El miedo a brillar te empuja a esconder tu luz en el 2 cómodo.",
    practice: "Honra tu sensibilidad como un don, no como una falla. Respira, aterriza el cuerpo (svadhyaya), y atrévete a decir lo que intuyes: el mundo necesita tu visión.",
  },
  22: {
    essence: "Número maestro: el constructor del sueño imposible. Tu alma vino a volver real, en el plano material, una visión que beneficie a muchos. El 4 con alas.",
    flow: "Unes la visión del 11 con la mano firme del 4: puedes edificar legados, instituciones, obras que trascienden tu vida. Sueñas grande y lo aterrizas.",
    shadow: "La presión de tu propio potencial puede paralizarte, o el miedo puede encogerte a metas pequeñas que no te llenan. El control vuelve aquí con más fuerza.",
    practice: "Da hoy un paso concreto hacia tu sueño más grande, por mínimo que sea. Confía: no tienes que ver toda la escalera para subir el primer escalón.",
  },
  33: {
    essence: "Número maestro raro: el maestro del amor. Tu alma vino a servir y a sanar desde un corazón que ama sin condición. El 6 entregado a lo universal.",
    flow: "Eres compasión hecha acción, entrega luminosa, guía. Cuando vives en tu eje, tu amor educa y sana a quien se cruza contigo.",
    shadow: "La sombra es el sacrificio que se vacía, el peso de cargar a todos, el martirio. Amar tanto que olvidas que tú también necesitas ser sostenido.",
    practice: "Pon hoy tu cuidado en ti primero, sin culpa. Solo la copa llena puede desbordar: santosha, descansa en lo que ya eres.",
  },
};

/** Lente de cada posición: qué significa este número AHÍ. */
export const POSITION_LENS_ES: Record<string, string> = {
  lifePath: "Es el camino que tu alma eligió recorrer en esta vida: tu propósito y la lección central de tu viaje.",
  expression: "Es el don que viniste a ofrecer al mundo: tus talentos naturales y la forma en que estás llamado a brillar.",
  soulUrge: "Es lo que tu alma anhela en lo más hondo, tu motivación secreta: lo que de verdad te hace sentir vivo.",
  personality: "Es la puerta que el mundo ve primero: la impresión que das antes de que te conozcan por dentro.",
  birthday: "Es un regalo innato que traes contigo, un talento que matiza y endulza tu camino de vida.",
  maturity: "Es hacia dónde converge tu vida en la segunda mitad: la versión madura de ti que se revela con los años.",
};
