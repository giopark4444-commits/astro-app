// apps/web/lib/content/tarot-es.ts
// Re-export delgado: el contenido tarot ES vive en @aluna/core (packages/core/src/tarot/content-es.ts)
// porque web y móvil lo comparten byte-igual (precedente: glossary). Este archivo
// existe solo para que los consumidores web no cambien sus imports.
export {
  TAROT_CARDS_ES,
  composeReadingProse,
  composeReadingWith,
  type TarotAmbits,
  type TarotCardContent,
  type ReadingComposeDicts,
} from "@aluna/core";
