// Glossary of meanings (EN) — same keys as glossary-es.ts, natural English
// voice (not a literal translation). Second person, warm and honest, 2–4
// sentences. Parity with ES is checked by a test.
import type { GlossaryEntry } from "./glossary-es";

export const GLOSSARY_EN: Record<string, GlossaryEntry> = {
  "aspect.trine": {
    title: "Trine", glyph: "△",
    body: "Two planets at 120°, sharing the same element: the energy moves between them with no friction at all. It's a talent you were simply born with — so natural you might not even clock it as a gift. The real work with a trine isn't earning it, it's not taking it for granted.",
  },
  "term.orb": {
    title: "Orb",
    body: "The degrees an aspect is off from being exact. The tighter the orb, the louder it speaks: an aspect at 0.5° talks to you daily; at 7°, it's more of a quiet background hum.",
  },
  "dignity.exaltation": {
    title: "Exaltation",
    body: "The planet lands in a sign that amplifies its best self, like an honored guest at someone else's table. It's not home turf (that would be rulership), but here it gets celebrated: its energy turns up in voltage and wants to express itself big.",
  },
};
