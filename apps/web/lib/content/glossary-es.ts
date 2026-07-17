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
};
