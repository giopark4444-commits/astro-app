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

  // ——— Signs ———
  "sign.aries": {
    title: "Aries", glyph: "♈",
    body: "Cardinal fire: the spark that ignites before it thinks. Wherever Aries touches your chart, you move first and ask questions later — there you're a pioneer, brave, allergic to waiting for permission. Its gift is the courage to begin; its shadow, the impatience that breaks what hasn't finished being born.",
  },
  "sign.taurus": {
    title: "Taurus", glyph: "♉",
    body: "Fixed earth: the art of staying. Wherever Taurus lives in your chart, you want what's real — what can be touched, tasted, and kept — and you build slowly but for good. Its gift is the calm that holds steady; its shadow, gripping the familiar after life has already asked for something else.",
  },
  "sign.gemini": {
    title: "Gemini", glyph: "♊",
    body: "Mutable air: curiosity with two hands and a thousand questions. Wherever Gemini lives in your chart, you need to name things, connect them, try the other side of every idea — there you're a bridge between worlds. Its gift is the quickness of mind; its shadow, skimming so many surfaces that none of them ever gets depth.",
  },
  "sign.cancer": {
    title: "Cancer", glyph: "♋",
    body: "Cardinal water: the tide that takes care. Wherever Cancer touches your chart, home is your compass — the one with walls and the one in your chest — and you protect what's yours with a strength that surprises even you. Its gift is emotional memory that nourishes; its shadow, a shell that mistakes protecting yourself for letting no one in.",
  },
  "sign.leo": {
    title: "Leo", glyph: "♌",
    body: "Fixed fire: the heart that needs to shine in order to give warmth. Wherever Leo lives in your chart, something in you asks for a stage — not out of vanity, but because your light exists to be shared. Its gift is the generosity that lights others up; its shadow, needing applause to believe you're worth anything.",
  },
  "sign.virgo": {
    title: "Virgo", glyph: "♍",
    body: "Mutable earth: love expressed as detail. Wherever Virgo lives in your chart, you serve by refining — you see what's missing, what's excess, what could be done better — and your care shows up in the small things. Its gift is precision that heals; its shadow, criticism that forgives nothing, starting with you.",
  },
  "sign.libra": {
    title: "Libra", glyph: "♎",
    body: "Cardinal air: the scale that reaches for the other. Wherever Libra touches your chart, you think in mirrors — you need the meeting, the beauty, the fair deal — and you know how to build bridges where there were trenches. Its gift is the harmony that reconciles; its shadow, pleasing so much that your own voice gets left out of the bargain.",
  },
  "sign.scorpio": {
    title: "Scorpio", glyph: "♏",
    body: "Fixed water: intensity that doesn't know how to stay on the surface. Wherever Scorpio touches your chart, you won't settle for the official version of anything — you want the truth with its roots attached. Its gift is transformation; its shadow, controlling what it loves out of fear of losing it.",
  },
  "sign.sagittarius": {
    title: "Sagittarius", glyph: "♐",
    body: "Mutable fire: the arrow aimed past the edge of the map. Wherever Sagittarius lives in your chart, you need horizon — to travel, to study, to believe in something bigger — and you spread that faith without trying. Its gift is meaning that expands; its shadow, promising the sky and already being halfway down another road when it's time to deliver.",
  },
  "sign.capricorn": {
    title: "Capricorn", glyph: "♑",
    body: "Cardinal earth: the mountain climbed one step at a time. Wherever Capricorn touches your chart, there's an ambition that is serious and patient — you build with time, with discipline, with a word that gets kept. Its gift is the maturity others lean on; its shadow, carrying so much duty you forget you also came here to live.",
  },
  "sign.aquarius": {
    title: "Aquarius", glyph: "♒",
    body: "Fixed air: the mind that watches from outside the circle. Wherever Aquarius lives in your chart, you question what everyone takes for granted — there you are the future, the chosen tribe, the idea that arrives ahead of its time. Its gift is freeing what had gone rigid; its shadow, becoming so different that no one can touch you up close.",
  },
  "sign.pisces": {
    title: "Pisces", glyph: "♓",
    body: "Mutable water: the ocean where edges dissolve. Wherever Pisces lives in your chart, you feel what's floating in the air — compassion, art, the invisible all pass through you without asking. Its gift is a surrender that dissolves the ego; its shadow, swimming away from shore just when reality is asking for your hands.",
  },

  // ——— Planets & points ———
  "planet.sun": {
    title: "Sun", glyph: "☉",
    body: "The center of your chart and of your identity: who you're here to become once you stop imitating. The Sun isn't your whole personality — it's the fire that feeds it, the purpose that lights you up when you live it and dims you when you keep postponing it. Living your Sun isn't selfishness: it's how you give light.",
  },
  "planet.moon": {
    title: "Moon", glyph: "☽",
    body: "Your emotional world: how you feel, what soothes you, where you return when the day has worn you down. The Moon is the child still inside you asking for the same things it always did — and also your wisest instinct. Knowing your Moon means knowing what you truly need, before you demand it in tears or collect it in silence.",
  },
  "planet.mercury": {
    title: "Mercury", glyph: "☿",
    body: "Your mind in motion: how you think, speak, learn, and connect the dots. Mercury is the messenger between your inner world and the outer one — its sign tells you whether your words run, weigh, cut, or embrace. When it flows, it translates; when it doesn't, it tangles: talking a lot and saying little.",
  },
  "planet.venus": {
    title: "Venus", glyph: "♀",
    body: "What you love and how you love: your way of attracting, of enjoying, of saying \"this is beautiful.\" Venus marks what gives you pleasure and what you value — in people, in things, in yourself. Its work isn't just romance: it's learning to receive without guilt and to love without keeping a tab.",
  },
  "planet.mars": {
    title: "Mars", glyph: "♂",
    body: "Your fire of action: how you desire, how you fight, how you go after what you want. Mars is the sword that cuts a path — used well it defends what's yours, used badly it wounds or rusts with swallowed anger. Its sign tells you whether your energy charges, calculates, seduces, or endures.",
  },
  "planet.jupiter": {
    title: "Jupiter", glyph: "♃",
    body: "Your principle of expansion: where life opens doors and you dare to believe. Jupiter marks your faith, your abundance, your way of finding meaning — you have luck there, but it's the kind of luck that switches on with trust. Its excess is real too: overpromising, growing without roots, mistaking optimism for not looking.",
  },
  "planet.saturn": {
    title: "Saturn", glyph: "♄",
    body: "Your inner teacher: the one who sets limits, structure, and exams. Where Saturn sits you feel the weight — fear, delay, demand — but it's also where you can build the most solid thing in your life, because nothing of yours there comes free. Saturn doesn't punish: it matures. What it asks of you early, it returns late and multiplied.",
  },
  "planet.uranus": {
    title: "Uranus", glyph: "♅",
    body: "The lightning that wakes you: where Uranus touches your chart, you can't be like everyone else no matter how hard you try. It's your genius, your rebellion, the part of you that has to break the mold in order to breathe. Its gift is authentic freedom; its risk, breaking things just to break them, mistaking the slammed door for liberation.",
  },
  "planet.neptune": {
    title: "Neptune", glyph: "♆",
    body: "The fog and the ocean: where Neptune lives, the edges dissolve — there you're a mystic, an artist, a dreamer, and there you can also lose yourself. It's your antenna to the invisible, your compassion without conditions. Its lesson is a fine one: learning to tell inspiration from mirage, surrender from escape.",
  },
  "planet.pluto": {
    title: "Pluto", glyph: "♇",
    body: "Your underground power: slow, invisible, and total. Where Pluto touches your chart, something dies and is reborn again and again — life won't let you stay halfway there. Its gift is a transformative force few can hold; its shadow, obsession and control whenever you resist letting go.",
  },
  "planet.chiron": {
    title: "Chiron", glyph: "⚷",
    body: "The wound that teaches: the place where something hurt early and never fully closed. Chiron's paradox is that right there — where you can't completely heal yourself — you develop an enormous medicine for others. The point isn't to fix the wound; it's to let it make you wise.",
  },
  "planet.lilith": {
    title: "Lilith", glyph: "⚸",
    body: "The untamable in you: the instinct that doesn't negotiate, the desire that doesn't apologize. Lilith marks where you were exiled — or exiled yourself — for not fitting in, and where you buried something wild to stay acceptable. Reclaiming her isn't revenge: it's coming home to the part of you that never should have asked forgiveness for existing.",
  },
  "planet.northnode": {
    title: "North Node", glyph: "☊",
    body: "Your soul's direction in this life: what you came to learn, not what you already know how to do. The North Node is uncomfortable because it points at new territory — every step toward it feels clumsy at first and deeply right afterward. It isn't a destiny that happens to you: it's one you walk.",
  },
  "planet.southnode": {
    title: "South Node", glyph: "☋",
    body: "The luggage you arrived with: talents and habits so well-learned you do them in your sleep. The South Node is comfort zone, and that's exactly why it's a trap — staying there means replaying a story you've already lived through. The point isn't to renounce those gifts, but to put them in service of the new road.",
  },
  "point.ascendant": {
    title: "Ascendant",
    body: "The sign rising over the horizon when you were born: the doorway through which the world meets you. It's your first impression, your style of starting things, the clothes your essence puts on to go outside. It's no false mask — it's a threshold: over the years, you stop performing it and start inhabiting it.",
  },

  // ——— Houses ———
  "house.1": {
    title: "House 1",
    body: "Your body, your face, the way you walk into a room: the self that shows. It's the house of beginnings — how you start life, and everything inside it. Planets here are visible at first glance: they're the introduction you can't hide.",
  },
  "house.2": {
    title: "House 2",
    body: "The terrain of what's yours: your money, your talents, the ground under your feet when everything else shakes. The question here is what you're worth to yourself — not to the market. Its work is building a security no one can take from you, because it grows from resources that are part of your body.",
  },
  "house.3": {
    title: "House 3",
    body: "The terrain of the nearby: siblings, the streets of your neighborhood, the word spoken and the word heard. It's the house of the everyday mind — how you learn, write, converse, and move through your immediate world. Life here doesn't arrive in revelations: it arrives in errands, messages, and short trips.",
  },
  "house.4": {
    title: "House 4",
    body: "The root of the chart: your childhood home, your family, the emotional soil you grew in. It's the bottom of the sky — the most private place in you, where you return when the world gets heavy. What you plant here holds up everything else: no one blooms far from their roots without carrying them inside.",
  },
  "house.5": {
    title: "House 5",
    body: "Joy lives here: what you create, your children, play, the romance that makes you feel alive. It's the house where the heart expresses itself without asking permission — your art, your risk, your way of shining for pure pleasure. If you don't play on this ground, life turns into nothing but duty.",
  },
  "house.6": {
    title: "House 6",
    body: "The terrain of the daily: your everyday work, your routines, your body asking to be listened to. It's the house where the sacred becomes practical — order, service, health as a habit rather than an emergency. There's no glory here: there's consistency, and consistency is what heals.",
  },
  "house.7": {
    title: "House 7",
    body: "The terrain of the other: partners in love and in business, the agreements you sign with your soul or your hand. It's your mirror — what you seek (or attract) in the person across from you is usually something of yours you haven't recognized yet. Here you learn that a bond doesn't complete you: it reveals you.",
  },
  "house.8": {
    title: "House 8",
    body: "The terrain of the shared and the uncontrollable: deep intimacy, other people's money, the crises that remake you. Planets here don't live comfortably — they live deep. It's the house where you learn to let go in order to be reborn.",
  },
  "house.9": {
    title: "House 9",
    body: "The house of the horizon: long journeys, higher learning, the faith and philosophy you use to make sense of the chaos. This is the terrain that pulls you out of your village — sometimes on a plane, sometimes through a book that redraws your map. The question here isn't how to live, but what for.",
  },
  "house.10": {
    title: "House 10",
    body: "The terrain of the visible summit: your calling, your reputation, the mark you leave in the public square. It's the highest point of the chart — what you build in front of everyone, and what the world will ask you to account for. No one inherits this place: you climb to it.",
  },
  "house.11": {
    title: "House 11",
    body: "The tribe: friends, groups, causes bigger than you. It's the house of future projects — the dreams that only come true in a network, alongside others looking at the same horizon. On this ground you discover that your individual voice finds its echo in the collective.",
  },
  "house.12": {
    title: "House 12",
    body: "The terrain of the hidden: dreams, endings, what you've made so much your own that you no longer see it. It's the house of retreat and of the unconscious — planets here work backstage, in silence, in what gets released. It's not a house of punishment: it's where the soul rests from the character and remembers where it came from.",
  },
};
