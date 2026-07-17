// apps/web/lib/content/tarot-en.ts
// Re-export delgado: el contenido tarot EN vive en @aluna/core (packages/core/src/tarot/content-en.ts)
// porque web y móvil lo comparten byte-igual (precedente: glossary). Este archivo
// existe solo para que los consumidores web no cambien sus imports.
export { TAROT_CARDS_EN } from "@aluna/core";
