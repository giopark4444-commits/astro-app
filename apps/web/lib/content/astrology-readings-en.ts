// Base chart reading (EN) by COMPOSITION: planet (what it came to live) + sign
// (how it expresses) + house (in which arena) + dignity. Mirror of
// astrology-readings-es.ts. "Essence" tier; the Deep/Complete AI tiers weave it
// bespoke. Evolutionary-yogic voice: soul purpose, gift and shadow.

import type { BodyReading } from "./astrology-readings-es";

interface PlanetTheme {
  essence: string; // clause WITHOUT trailing period (gets composed)
  flow: string;
  shadow: string;
}

const PLANET_THEME: Record<string, PlanetTheme> = {
  sun: {
    essence: "Your Sun is your essential identity, your purpose, and the center from which you are called to shine",
    flow: "When you inhabit it, you radiate presence, will, and a clear sense of who you are.",
    shadow: "In shadow, the ego shines to be approved, seeks outside what it already is, and forgets its own light.",
  },
  moon: {
    essence: "Your Moon is your emotional world, your inner child, and what your soul needs to feel at home",
    flow: "It gives you intuition, tenderness, and the capacity to nurture and to feel deeply.",
    shadow: "In shadow, emotion rules you, you cling to the past, or seek security where there is none.",
  },
  mercury: {
    essence: "Mercury is your mind, your voice, and the way you think, learn, and communicate",
    flow: "It gives you agility, curiosity, and the gift of joining ideas and people through words.",
    shadow: "In shadow, the mind scatters, rationalizes what it feels, or speaks without listening.",
  },
  venus: {
    essence: "Venus is your way of loving, of enjoying, and of recognizing beauty and your own worth",
    flow: "It gives you magnetism, sweetness, and the capacity to create harmony and bonds.",
    shadow: "In shadow, you please to be loved, lose yourself in pleasure, or measure your worth from outside.",
  },
  mars: {
    essence: "Mars is your force, your desire, and the energy with which you act and defend what is yours",
    flow: "It gives you courage, initiative, and the spark to go after what you want.",
    shadow: "In shadow, force becomes impulse, anger, or fighting for the sake of fighting.",
  },
  jupiter: {
    essence: "Jupiter is your faith, your expansion, and the place where your soul seeks meaning and growth",
    flow: "It gives you generosity, vision, and a confidence that opens doors.",
    shadow: "In shadow, excess, the promise that never lands, or the dogma that thinks it owns the truth.",
  },
  saturn: {
    essence: "Saturn is your teacher, your structure, and the lesson your soul came to mature over time",
    flow: "It gives you discipline, responsibility, and the wisdom of what is built slowly.",
    shadow: "In shadow, fear, rigidity, or the self-demand that paralyzes instead of holding you up.",
  },
  uranus: {
    essence: "Uranus is your spark of freedom, your genius, and what you came to break molds in",
    flow: "It gives you originality, sudden intuition, and the courage to be different.",
    shadow: "In shadow, rebellion without a cause, cold detachment, or change just for change's sake.",
  },
  neptune: {
    essence: "Neptune is your bridge to the invisible, your imagination, and your longing for oneness",
    flow: "It gives you mystical sensitivity, compassion, and a channel toward the sacred and art.",
    shadow: "In shadow, illusion, escape, or the confusion between dream and reality.",
  },
  pluto: {
    essence: "Pluto is your deep power, your capacity to die and be reborn, and what you came to transform",
    flow: "It gives you intensity, regeneration, and the strength to look at what others fear.",
    shadow: "In shadow, control, obsession, or power used from the wound.",
  },
  chiron: {
    essence: "Chiron is your sacred wound, that tender point that, once healed, makes you a healer of others",
    flow: "It gives you empathy with others' pain and the wisdom that only lived experience leaves.",
    shadow: "In shadow, the wound that won't close, feeling broken, or avoiding what hurts.",
  },
  north_node: {
    essence: "Your North Node marks your soul's direction of growth, where you came to evolve",
    flow: "It is uncomfortable yet nourishing: each step toward it draws you closer to your purpose.",
    shadow: "The temptation is to stay in the known instead of daring into this new ground.",
  },
  south_node: {
    essence: "Your South Node is your karmic comfort zone, the gifts and patterns you already carry",
    flow: "It is a natural talent, a place where you move with ease.",
    shadow: "In excess it anchors you: repeating the easy instead of growing toward your North Node.",
  },
  lilith: {
    essence: "Lilith is your wild force, your untamed desire, and what you refuse to repress",
    flow: "It gives you raw authenticity, instinct, and the power to honor your shadow without asking permission.",
    shadow: "In shadow, wounded rage or the rejection of what makes you vulnerable.",
  },
};

const SIGN_TONE: Record<string, string> = {
  aries: "with courage, initiative, and a direct urge to begin",
  taurus: "with calm, awakened senses, and the patience of what endures",
  gemini: "with curiosity, words, and a mind that leaps and connects",
  cancer: "from emotion, care, and the memory of home",
  leo: "with warmth, generosity, and a noble desire to shine",
  virgo: "with detail, service, and the urge to improve what you touch",
  libra: "seeking harmony, connection, and shared beauty",
  scorpio: "with intensity, depth, and truth without filters",
  sagittarius: "with expansion, faith, and a thirst for the horizon",
  capricorn: "with ambition, structure, and an eye on what you build",
  aquarius: "with originality, an eye on the future, and a sense of the collective",
  pisces: "with sensitivity, compassion, and one foot in the invisible",
};

const HOUSE_ARENA: Record<number, string> = {
  1: "your identity, your body, and the way you present yourself to the world",
  2: "your resources, your self-worth, and what you own",
  3: "your mind, your words, and the close bonds of daily life",
  4: "your home, your roots, and your inner world",
  5: "your creativity, pleasure, play, and the love that expresses itself",
  6: "your daily work, health, and service",
  7: "your relationships, partnership, and the meeting with the other",
  8: "the deep, intimacy, crises, and what transforms",
  9: "your search for meaning, travel, philosophy, and faith",
  10: "your vocation, your place in the world, and what you build outward",
  11: "groups, friendships, collective dreams, and the future",
  12: "the invisible, the unconscious, retreat, and surrender",
};

const DIGNITY_NOTE: Record<string, string> = {
  domicile: " It is in its domicile: its energy flows with strength and ease.",
  exaltation: " It is exalted: here it gives its best, elevated.",
  exile: " It is in detriment: its energy rows against the current, and matures by learning to integrate it.",
  fall: " It is in fall: it is harder to express, and right there lives the lesson.",
};

/** Weaves the base reading of a body from planet + sign + house (+ dignity). */
export function composeBodyReading(
  bodyKey: string,
  signKey: string,
  house: number,
  dignity: string | null,
): BodyReading | null {
  const theme = PLANET_THEME[bodyKey];
  const tone = SIGN_TONE[signKey];
  const arena = HOUSE_ARENA[house];
  if (!theme || !tone || !arena) return null;
  const dignityNote = dignity ? (DIGNITY_NOTE[dignity] ?? "") : "";
  return {
    essence: `${theme.essence}. Here you live it ${tone}, in the realm of ${arena}.${dignityNote}`,
    flow: theme.flow,
    shadow: theme.shadow,
  };
}
