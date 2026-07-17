// apps/mobile/content/day-voice.ts
// Contenido curado de la pantalla Hoy (mockup 01-hoy-hub.html), keyed por
// SIGNO LUNAR (no por fase — el mockup no muestra fase, solo signo).
//
// DAY_VOICE: "voz de Aluna" (19px itálica, bajo el saludo). Contenido EXACTO
// dado en task-3-brief.md — transcrito literal, no redactado por el implementador.
export const DAY_VOICE: Record<string, { es: string; en: string }> = {
  aries:       { es: "El cielo te pide chispa hoy.",      en: "The sky asks you for spark today." },
  taurus:      { es: "El cielo te pide calma hoy.",       en: "The sky asks you for calm today." },
  gemini:      { es: "El cielo te pide palabras hoy.",    en: "The sky asks you for words today." },
  cancer:      { es: "El cielo te pide hogar hoy.",       en: "The sky asks you for home today." },
  leo:         { es: "El cielo te pide corazón hoy.",     en: "The sky asks you for heart today." },
  virgo:       { es: "El cielo te pide raíces hoy.",      en: "The sky asks you for roots today." },
  libra:       { es: "El cielo te pide equilibrio hoy.",  en: "The sky asks you for balance today." },
  scorpio:     { es: "El cielo te pide hondura hoy.",     en: "The sky asks you for depth today." },
  sagittarius: { es: "El cielo te pide horizonte hoy.",   en: "The sky asks you for horizon today." },
  capricorn:   { es: "El cielo te pide paso firme hoy.",  en: "The sky asks you for steady steps today." },
  aquarius:    { es: "El cielo te pide aire nuevo hoy.",  en: "The sky asks you for fresh air today." },
  pisces:      { es: "El cielo te pide marea hoy.",       en: "The sky asks you for tide today." },
};

// MOON_ENERGY: palabra-arquetipo del mini-card lunar ("LUNA EN {signo} ✦
// ENERGÍA DE {X}"). A diferencia de DAY_VOICE, esto NO viene dado verbatim en
// el brief — el gap-analysis (§B.1) lo marca como "mapeo curado de 12 signos,
// estático, sin API" pendiente de autoría. El único punto de verdad externo es
// Virgo → "Orden" (literal del mockup: "ENERGÍA DE ORDEN"); el resto sigue el
// mismo criterio arquetípico, coherente con las esencias ya curadas en
// content/horoscope.ts (HOROSCOPE_SIGNS_ES/EN) para no introducir un segundo
// vocabulario de personalidad de signos que contradiga al primero.
export const MOON_ENERGY: Record<string, { es: string; en: string }> = {
  aries:       { es: "Impulso",    en: "Drive" },
  taurus:      { es: "Constancia", en: "Steadiness" },
  gemini:      { es: "Curiosidad", en: "Curiosity" },
  cancer:      { es: "Ternura",    en: "Tenderness" },
  leo:         { es: "Brillo",     en: "Radiance" },
  virgo:       { es: "Orden",      en: "Order" },
  libra:       { es: "Armonía",    en: "Harmony" },
  scorpio:     { es: "Intensidad", en: "Intensity" },
  sagittarius: { es: "Expansión",  en: "Expansion" },
  capricorn:   { es: "Disciplina", en: "Discipline" },
  aquarius:    { es: "Visión",     en: "Vision" },
  pisces:      { es: "Intuición",  en: "Intuition" },
};
