// Horóscopo occidental (EN): datos espejo de horoscope-es.ts. El motor de
// composición vive en es.ts; este archivo solo exporta diccionarios.
import type { SignEssence, ComposeDicts, EasternComposeDicts } from "./horoscope-es";

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

// ---------------------------------------------------------------------------
// Horóscopo oriental (EN): mirror data for the 12 animals. The composition
// engine lives in horoscope-es.ts (composeEasternProse); this file only
// exports dictionaries, same import direction as the western pattern.
export const HOROSCOPE_ANIMALS_EN: Record<string, SignEssence> = {
  rat: {
    essence: "Your soul came with the wit of the one who arrives first: you watch, you calculate, and you find the crack others walk right past.",
    flow: "When you flow, your cunning is a lighthouse and your web of connections becomes shared abundance.",
    shadow: "In shadow, vigilance curdles into distrust; your practice is loosening the grip and letting others get it right too.",
  },
  ox: {
    essence: "Your soul came to plow with endless patience: you carry what others put down and turn quiet effort into a real harvest.",
    flow: "When you flow, your steadiness is a root for the whole tribe and your word, once given, never breaks.",
    shadow: "In shadow, stubbornness disguises itself as duty; your practice is asking for help before the yoke grows too heavy.",
  },
  tiger: {
    essence: "Your soul came to cross open territory with courage: you challenge what is settled and cut a trail where there was only fear.",
    flow: "When you flow, your daring inspires others and your sure instinct protects whoever walks beside you.",
    shadow: "In shadow, momentum roars without listening; your practice is pausing the leap to feel the ground first.",
  },
  rabbit: {
    essence: "Your soul came to weave shelter with delicacy: you read the room's mood and know exactly when to lean in and when to give space.",
    flow: "When you flow, your diplomacy disarms tension and your tenderness makes any place feel safe.",
    shadow: "In shadow, caution turns into flight; your practice is staying one moment longer in the hard conversation.",
  },
  dragon: {
    essence: "Your soul came with ancestral fire: born to lead grand visions and call others toward what does not yet exist.",
    flow: "When you flow, your magnetism moves mountains and your generosity multiplies whatever you touch.",
    shadow: "In shadow, pride demands an altar; your practice is serving the vision without needing to be its center.",
  },
  snake: {
    essence: "Your soul came to shed its skin as many times as it takes: you sense what is hidden and turn old venom into quiet wisdom.",
    flow: "When you flow, your discernment is unerring and your calm disarms what others cannot even name.",
    shadow: "In shadow, mystery curdles into isolation; your practice is letting someone in before you close the door all the way.",
  },
  horse: {
    essence: "Your soul came to run free: you chase horizon, motion, and the freedom to choose your own direction every single day.",
    flow: "When you flow, your energy is contagious and your independence clears the way for whoever follows close behind.",
    shadow: "In shadow, restlessness flees commitment; your practice is putting down roots without feeling like you lose the reins.",
  },
  goat: {
    essence: "Your soul came to make beauty and shelter: sensitive to art and to bonds, you heal with a tenderness others forget to offer.",
    flow: "When you flow, your sensitivity beautifies the everyday and your empathy holds up whoever needs it.",
    shadow: "In shadow, doubt asks permission too often; your practice is trusting your own taste without seeking outside approval.",
  },
  monkey: {
    essence: "Your soul came with the wit of one who plays with the rules: you invent, improvise, and find a way out where others get stuck.",
    flow: "When you flow, your creativity solves the impossible and your humor lightens any load.",
    shadow: "In shadow, cleverness turns into a dishonest shortcut; your practice is choosing the long way when it is the right one.",
  },
  rooster: {
    essence: "Your soul came to announce the dawn with precision: you notice the details others miss and speak with a clarity that brings order.",
    flow: "When you flow, your candor is a compass and your discipline makes what is well done beautiful.",
    shadow: "In shadow, high standards turn into a sharp edge; your practice is aiming that same tenderness inward.",
  },
  dog: {
    essence: "Your soul came to guard what is fair: loyalty, truth, and the quiet watch of one who protects without asking to be seen.",
    flow: "When you flow, your integrity is shelter and your instinct spots what truly matters.",
    shadow: "In shadow, constant alertness wears down into distrust; your practice is resting the watch and trusting a little more.",
  },
  pig: {
    essence: "Your soul came to enjoy without guilt: generous, honest, and able to turn any shared table into abundance.",
    flow: "When you flow, your generosity is contagious and your honesty simplifies what others complicate.",
    shadow: "In shadow, indulgence avoids what is uncomfortable; your practice is holding the line even when it costs the moment's pleasure.",
  },
};

const EASTERN_ANIMAL_NAMES_EN: Record<string, string> = {
  rat: "the Rat", ox: "the Ox", tiger: "the Tiger", rabbit: "the Rabbit",
  dragon: "the Dragon", snake: "the Snake", horse: "the Horse", goat: "the Goat",
  monkey: "the Monkey", rooster: "the Rooster", dog: "the Dog", pig: "the Pig",
};

const EASTERN_PERIOD_LABELS_EN: Record<string, string> = {
  today: "today", week: "this week", month: "this month", year: "this yearly cycle",
};

export const DICTS_EASTERN_EN: EasternComposeDicts = {
  animals: HOROSCOPE_ANIMALS_EN,
  animalNames: EASTERN_ANIMAL_NAMES_EN,
  periodLabels: EASTERN_PERIOD_LABELS_EN,
  t: {
    periodIntro: (periodLabel) => `For ${periodLabel}, the Tong Shu sky crosses your animal straight from that same DNA.`,
    clash: (withName) => `This period brings a clash (冲) with ${withName}: not bad luck, just friction asking you to move with more presence than usual.`,
    harmony: (names) => `There is also harmony (合) with ${names}: let that alliance hold up what you are building.`,
    taiSui: (kinds) => `Facing this year's Tai Sui there is ${kinds}: it is a year to walk with more awareness, not to stop.`,
    monthChange: () => `The month changes sign (節) within this period: notice how the tone shifts before and after the turn.`,
  },
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
