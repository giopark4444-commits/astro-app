// Horóscopo occidental (EN): datos espejo de horoscope-es.ts. El motor de
// composición vive en es.ts; este archivo solo exporta diccionarios.
import type { SignEssence, ComposeDicts } from "./horoscope-es";

export const HOROSCOPE_SIGNS_EN: Record<string, SignEssence> = {
  aries: {
    essence: "Your soul came to strike the first fire: to begin, to dare, to open paths where no one has walked.",
    flow: "When your energy flows, your courage is contagious and your drive sets the world in motion.",
    shadow: "In shadow, haste tramples what is still ripening; your practice is one breath before the leap.",
  },
  taurus: {
    essence: "Your soul came to inhabit the body and the earth: to sustain, to cultivate, to savor what endures.",
    flow: "When you flow, your calm becomes a root for others and your constancy turns seeds into gardens.",
    shadow: "In shadow, attachment mistakes stillness for safety; aparigraha, letting go, is your key.",
  },
  gemini: {
    essence: "Your soul came to weave bridges with words: to ask, to learn, to join worlds that never spoke.",
    flow: "When you flow, your curiosity is fresh wind and your voice turns the complex into the familiar.",
    shadow: "In shadow, the mind scatters into a thousand sparks; your practice is choosing one flame and tending it.",
  },
  cancer: {
    essence: "Your soul came to keep the inner home: to feel deeply, to nourish, to make care a temple.",
    flow: "When you flow, your tenderness heals roots and your intuition reads what is never said.",
    shadow: "In shadow, the shell closes around the love it fears to lose; santosha, contentment, returns you to the present.",
  },
  leo: {
    essence: "Your soul came to shine from the heart: to create, to play, to remind others of their own light.",
    flow: "When you flow, your presence is a sun that warms without asking anything back.",
    shadow: "In shadow, the shine begs for applause; your practice is to glow the same when no one is watching.",
  },
  virgo: {
    essence: "Your soul came to polish the sacred in the small: to serve, to order, to heal with precise hands.",
    flow: "When you flow, your discernment is medicine and your humility makes perfection useful.",
    shadow: "In shadow, critique becomes a cage; svadhyaya reminds you that you too deserve your compassion.",
  },
  libra: {
    essence: "Your soul came to tune the scales: to create beauty, harmony, and meetings where both can breathe.",
    flow: "When you flow, your diplomacy weaves real peace and your sense of beauty lifts the everyday.",
    shadow: "In shadow, you please to avoid discomfort; your practice is speaking your truth with the same grace.",
  },
  scorpio: {
    essence: "Your soul came to look where others turn away: to transform, to die and be reborn more true.",
    flow: "When you flow, your intensity is alchemy: you turn wounds into quiet power.",
    shadow: "In shadow, control replaces trust; releasing the helm is your initiation.",
  },
  sagittarius: {
    essence: "Your soul came to shoot the arrow of meaning: to explore, to believe, to widen the horizon.",
    flow: "When you flow, your faith opens roads and your laughter teaches more than a thousand doctrines.",
    shadow: "In shadow, the promise flies but never lands; your practice is honoring what you sow.",
  },
  capricorn: {
    essence: "Your soul came to climb with purpose: to build slowly what will hold many.",
    flow: "When you flow, your discipline is love in action and your word is worth a mountain.",
    shadow: "In shadow, demand freezes the heart; remember the summit is also for sharing.",
  },
  aquarius: {
    essence: "Your soul came to open windows to the future: to free, to innovate, to belong without ceasing to be you.",
    flow: "When you flow, your vision brings oxygen to the group and your strangeness is exactly your gift.",
    shadow: "In shadow, detachment turns to distance; your practice is letting your heart be touched.",
  },
  pisces: {
    essence: "Your soul came to dissolve the shores: to dream, to feel with others, to remember that all is one.",
    flow: "When you flow, your sensitivity is an ocean that inspires and consoles without words.",
    shadow: "In shadow, the mist avoids the concrete; anchoring the dream in one real step is your yoga.",
  },
};

export const SOLAR_HOUSE_LABELS_EN: Record<number, string> = {
  1: "your solar 1st house, your body and your presence",
  2: "your solar 2nd house, your resources and self-worth",
  3: "your solar 3rd house, your mind and your words",
  4: "your solar 4th house, your roots and your home",
  5: "your solar 5th house, your creation and your joy",
  6: "your solar 6th house, your craft and your habits",
  7: "your solar 7th house, your one-to-one bonds",
  8: "your solar 8th house, the deep and the shared",
  9: "your solar 9th house, your horizon and your faith",
  10: "your solar 10th house, your calling and your mountain",
  11: "your solar 11th house, your tribe and good spirit",
  12: "your solar 12th house, your rest and inner world",
};

export const DICTS_EN: ComposeDicts = {
  signs: HOROSCOPE_SIGNS_EN,
  houseLabels: SOLAR_HOUSE_LABELS_EN,
  lunation: { new: "New Moon", full: "Full Moon" },
  t: {
    favorable: (body, house) => `${body} moves through ${house}: there is wind at your back there — use it with presence.`,
    tense: (body, house) => `${body} asks for work in ${house}: not punishment, but soul-muscle in the making.`,
    lunationIn: (name, house) => `This cycle's ${name} falls in ${house}; it is a good moment to listen to it.`,
    eclipse: "It also carries eclipse energy: the changes it opens run deeper than they seem.",
    stationRetro: (body) => `${body} stations retrograde: the sky invites review before push.`,
  },
};
