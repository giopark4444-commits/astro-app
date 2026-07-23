// CANON QUIROMÁNTICO de Aluna — la única fuente de significado de la lectura
// de mano (misma filosofía que el canon del tarot: la IA JAMÁS inventa fuera
// de él). Compacto pero profesional: tradición quiromántica occidental clásica
// + puente astrológico (regencias) que es el diferenciador de Aluna. La regla
// de oro va en el prompt: la mano muestra TENDENCIAS que cambian con la vida
// (las líneas cambian), nunca sentencias — prohibido el fatalismo ("línea de
// vida corta = vida corta" es un MITO y se dice como tal si sale el tema).

export const PALM_CANON: Record<"es" | "en", string> = {
  es: `CANON QUIROMÁNTICO (tu única fuente de significado):

FORMA DE LA MANO (temperamento base):
- Tierra (palma cuadrada, dedos cortos): práctica, constancia, cuerpo, hechos antes que teorías.
- Aire (palma cuadrada, dedos largos): mente, palabra, vínculos sociales, necesidad de entender.
- Fuego (palma rectangular, dedos cortos): impulso, entusiasmo, liderazgo, urgencia de hacer.
- Agua (palma rectangular, dedos largos): sensibilidad, imaginación, empatía, vida emocional honda.
- Nudillos lisos = intuición fluida; nudosos = análisis que filtra antes de aceptar.
- Pulgar: apertura amplia = generosidad e independencia; cerrada = cautela. Falange superior = voluntad; inferior = lógica; su balance dice cómo se decide.
- Dedos: Júpiter (índice) autoafirmación y ambición; Saturno (medio) deber y estructura; Apolo (anular) expresión y brillo; Mercurio (meñique) palabra, comercio, ingenio. Largo = énfasis; corto = economía de esa energía; inclinado hacia otro dedo = esa energía se pone al servicio del vecino.

LÍNEAS (ríos de energía; su calidad importa más que su longitud):
- Vida (rodea Venus): vitalidad, arraigo, ganas de estar aquí. Amplia = energía generosa; pegada al pulgar = reserva de fuerzas. NUNCA duración de la vida.
- Cabeza: cómo piensa. Recta = concreta; inclinada a Luna = imaginativa; larga = análisis; corta = decisión rápida; unida a Vida al inicio = prudencia familiar; separada = independencia temprana.
- Corazón: cómo ama. Alta hacia Júpiter = idealismo amoroso; hacia Saturno = amor contenido; curva = expresivo; recta = interior. Encadenada = corazón que ha aprendido a fuerza de oleajes.
- Destino/Saturno (sube al medio): sentido de dirección y vocación. Desde la base = rumbo temprano; desde Luna = camino guiado por otros/lo público; ausente = vida que se inventa sobre la marcha (libertad, no desgracia).
- Sol/Apolo: brillo propio, reconocimiento, arte. Presente y clara = talento que encuentra escenario.
- Mercurio/salud: comunicación y cuerpo-energía (JAMÁS diagnóstico médico). Clara = expresión fluida.
- Matrimonio/uniones (borde bajo Mercurio): vínculos significativos; profundidad = huella del vínculo.
- Intuición (arco en Luna): percepción fina, olfato para lo invisible.
- Vía Láctea/viajes: inquietud de horizontes.
- Brazaletes/rascetas: tradicionalmente vitalidad y fortuna acumulada.
- Anillo de Venus (arco bajo los dedos medios): sensibilidad estética y emocional a flor de piel.
- Anillo de Salomón (arco bajo Júpiter): don de comprender a otros; vocación de guía.
- Simiesca (cabeza y corazón fundidas): intensidad total — pensar y sentir son un solo acto.

MONTES (reservas de energía; prominente = tema central, plano = tema en reposo):
- Venus (base del pulgar): amor, calidez, sensualidad, vitalidad. Regente: Venus natal.
- Júpiter (bajo índice): ambición, fe, liderazgo. Regente: Júpiter.
- Saturno (bajo medio): seriedad, soledad fértil, disciplina. Regente: Saturno.
- Apolo (bajo anular): arte, alegría, éxito. Regente: Sol.
- Mercurio (bajo meñique): ingenio, comercio, palabra. Regente: Mercurio.
- Marte positivo (sobre pulgar): coraje activo. Marte negativo (bajo Mercurio, borde): resistencia, aguante. Llanura de Marte (centro): campo de batalla cotidiano. Regente: Marte.
- Luna (base opuesta al pulgar): imaginación, mareas internas, memoria del alma. Regente: Luna.

MARCAS (acentos locales — leen EN su línea o monte):
- Isla = periodo de energía dividida; cadena = etapa de oleaje; ruptura = giro de capítulo (mirar si hay línea hermana que releva); estrella = fogonazo (impacto o don según dónde); cruz = encrucijada; cuadrado = protección que contiene; rejilla = dispersión; triángulo = talento que se organiza; lunar = sello personal.

PUENTE ASTRAL (el sello Aluna): cada monte/dedo tiene regente planetario; contrasta el estado del monte con la posición NATAL de su regente (p.ej. monte de Venus prominente + Venus natal fuerte = confirmación; monte plano + planeta fuerte = energía disponible aún no habitada; monte prominente + planeta en tensión = tema central que pide trabajo consciente). La mano muestra cómo se VIVE hoy lo que la carta promete.

MANOS: la dominante muestra el presente y lo elegido; la pasiva, el potencial y lo heredado. Comparar ambas = distancia entre lo que se trae y lo que se está haciendo con ello.`,
  en: `PALMISTRY CANON (your only source of meaning):

HAND SHAPE (base temperament): Earth (square palm, short fingers) practical, steady, embodied. Air (square palm, long fingers) mental, verbal, social. Fire (rectangular palm, short fingers) impulsive, enthusiastic, leading. Water (rectangular palm, long fingers) sensitive, imaginative, deeply feeling. Smooth knuckles = fluid intuition; knotted = filtering analysis. Thumb: wide opening = generosity/independence; closed = caution; upper phalange = will, lower = logic — their balance shows how decisions are made. Fingers: Jupiter (index) self-assertion/ambition; Saturn (middle) duty/structure; Apollo (ring) expression/shine; Mercury (little) word/trade/wit. Long = emphasis; short = economy; leaning toward a neighbor = that energy serves it.

LINES (rivers of energy; quality over length): Life (around Venus): vitality and rootedness — NEVER lifespan. Head: straight = concrete; sloping to Luna = imaginative; long = analysis; short = quick decision; joined to Life at start = early prudence; separate = early independence. Heart: toward Jupiter = idealistic love; toward Saturn = contained love; curved = expressive; straight = inward; chained = a heart schooled by tides. Fate/Saturn: sense of direction; from base = early course; from Luna = path shaped by others/public; absent = self-invented life (freedom, not misfortune). Sun/Apollo: own shine, recognition, art. Mercury/health: communication and body-energy (NEVER medical diagnosis). Marriage/unions (edge under Mercury): significant bonds. Intuition (arc on Luna): fine perception. Via Lactea/travel: horizon-hunger. Bracelets: accumulated vitality/fortune (traditional). Girdle of Venus: aesthetic/emotional sensitivity at skin level. Ring of Solomon: gift for understanding others; guide's vocation. Simian line (head+heart fused): total intensity — thinking and feeling as one act.

MOUNTS (energy reserves; prominent = central theme, flat = at rest): Venus (thumb base) love/warmth/vitality — ruler natal Venus. Jupiter (under index) ambition/faith — Jupiter. Saturn (under middle) discipline/fertile solitude — Saturn. Apollo (under ring) art/joy/success — Sun. Mercury (under little) wit/trade/word — Mercury. Mars positive (above thumb) active courage; Mars negative (edge) endurance; Plain of Mars (center) daily battlefield — Mars. Luna (opposite base) imagination/inner tides/soul memory — Moon.

MARKS (local accents, read ON their line/mount): island = divided energy period; chain = choppy stretch; break = chapter turn (look for a sister line taking over); star = flash (impact or gift by location); cross = crossroads; square = protective container; grid = dispersion; triangle = organized talent; mole = personal seal.

ASTRAL BRIDGE (Aluna's seal): each mount/finger has a planetary ruler; contrast the mount's state with the NATAL position of its ruler (prominent mount + strong natal planet = confirmation; flat mount + strong planet = available energy not yet inhabited; prominent mount + tense planet = central theme asking conscious work). The hand shows how what the chart promises is being LIVED today.

HANDS: dominant = present and chosen; passive = potential and inherited. Comparing both = the distance between what one brings and what one is doing with it.`,
};
