// Glossary of meanings (EN) — same keys as glossary-es.ts, natural English
// voice (not a literal translation). Second person, warm and honest, 2–4
// sentences. Parity with ES is checked by a test.
import type { GlossaryEntry } from "./glossary-es";

export const GLOSSARY_EN: Record<string, GlossaryEntry> = {
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

  // ——— Aspects ———
  "aspect.conjunction": {
    title: "Conjunction", glyph: "☌",
    body: "Two planets at the same degree, so close their energies fuse into one. They don't see each other — they act as a unit, for better or for tangle, like two paints mixed past the point of separating. It's the most potent aspect there is: where you have a conjunction, you have an engine.",
  },
  "aspect.opposition": {
    title: "Opposition", glyph: "☍",
    body: "Two planets face to face, 180° apart, pulling you toward opposite shores. It feels like an inner tug-of-war — or like you live one end yourself and keep meeting the other end in someone else. The work isn't picking a winner: it's learning to hold both without splitting in two.",
  },
  "aspect.trine": {
    title: "Trine", glyph: "△",
    body: "Two planets at 120°, sharing the same element: the energy moves between them with no friction at all. It's a talent you were simply born with — so natural you might not even clock it as a gift. The real work with a trine isn't earning it, it's not taking it for granted.",
  },
  "aspect.square": {
    title: "Square", glyph: "□",
    body: "Two planets at 90°, colliding at a right angle: each one wants something that gets in the other's way. It's friction, yes — but friction that strikes sparks. Squares are the aspects that make you work the hardest, and precisely where you build the most muscle: almost everything you're proud of has one behind it.",
  },
  "aspect.sextile": {
    title: "Sextile", glyph: "⚹",
    body: "Two planets at 60°, in elements that get along: a door left ajar between them. It's an opportunity, not a gift — the energy cooperates when you invite it, but it won't insist on its own the way a trine does. Where you have a sextile, there's a talent that only wakes up when you say yes to it.",
  },
  "aspect.quincunx": {
    title: "Quincunx", glyph: "⚻",
    body: "Two planets at 150°, in signs that share neither element nor mode: they speak different languages, and there's no interpreter. It feels like a diffuse discomfort, something that never quite fits no matter how you arrange it. Its work is fine adjustment: not resolving the tension, but learning to live with it cleverly.",
  },
  "aspect.semisextile": {
    title: "Semisextile", glyph: "⚺",
    body: "Two planets at 30°, in neighboring signs: close enough to brush shoulders, different enough not to understand each other. It's a subtle aspect — a faint background rub rather than open conflict. It asks you to notice the difference between two parts of you that live next door but lead separate lives.",
  },

  // ——— Terms ———
  "term.orb": {
    title: "Orb",
    body: "The degrees an aspect is off from being exact. The tighter the orb, the louder it speaks: an aspect at 0.5° talks to you daily; at 7°, it's more of a quiet background hum.",
  },
  "term.applying": {
    title: "Applying",
    body: "The aspect is still forming: the faster planet is closing in on exact but hasn't arrived yet. It's the crescendo phase — the energy is building, like a wave you can see coming. Applying aspects feel more alive than ones already past: whatever they announce still lies ahead.",
  },
  "term.separating": {
    title: "Separating",
    body: "The aspect has already had its exact moment, and the planets are drifting apart. The energy doesn't vanish all at once — it lingers as an echo, something that already happened and is still ringing. It feels less like waiting for what's coming and more like digesting what just was.",
  },
  "term.retrograde": {
    title: "Retrograde",
    body: "Seen from Earth, the planet appears to walk backward — it isn't really, but the effect is felt. That planet's themes turn inward: instead of advancing, they review, repeat, ripen. It's not the sky punishing you: it's life asking for a second look before the next step.",
  },
  "term.transit": {
    title: "Transit",
    body: "A planet moving through the sky today, touching a point in your natal chart. If the chart is the map, transits are the weather: they tell you which season each area of your life is passing through, and for how long. They force nothing — they open and close doors that you still have to walk through yourself.",
  },
  "term.natal": {
    title: "Natal",
    body: "What was fixed at the instant you were born: the snapshot of the sky that travels with you for life. Your natal chart doesn't change — how you inhabit it does. It's the instrument you arrived with; the music you draw from it is up to you.",
  },

  // ——— Dignities ———
  "dignity.domicile": {
    title: "Domicile",
    body: "The planet sits in the sign it rules: in its own house, keys in hand. There its energy expresses itself without translation or permission — its clearest, most natural version. A planet in domicile doesn't need pushing: it knows exactly what it came to do.",
  },
  "dignity.exaltation": {
    title: "Exaltation",
    body: "The planet lands in a sign that amplifies its best self, like an honored guest at someone else's table. It's not home turf (that would be rulership), but here it gets celebrated: its energy turns up in voltage and wants to express itself big.",
  },
  "dignity.detriment": {
    title: "Detriment",
    body: "The planet sits in the sign opposite its domicile: far from home, in a culture that doesn't speak its language. Its energy doesn't disappear — it just struggles more, coming out awkwardly or through side doors. And there's the hidden gift: what doesn't come easy becomes conscious, and what's conscious can be worked with.",
  },
  "dignity.fall": {
    title: "Fall",
    body: "The planet sits in the sign opposite its exaltation: where it was once the guest of honor, nobody here saves it a seat. Its energy speaks in a low voice, doubting itself. It doesn't mean that planet is broken — it means its strength asks for more patience and humility to bloom, and when it does, it's strength truly earned.",
  },
  "dignity.peregrine": {
    title: "Peregrine",
    body: "The planet holds no dignity at all in that sign: no home, no honors, no debts. It's a traveler without papers — not strong, not weak, just unanchored, and easily colored by whatever planets touch it. Its lesson is finding its own direction in a land that doesn't claim it.",
  },

  // ——— Patterns ———
  "pattern.stellium": {
    title: "Stellium",
    body: "Three or more planets bunched in the same sign or house: a concentration of energy that's hard to ignore. That area of your life weighs more than the rest — there you're intense, a specialist, sometimes a one-topic person. The challenge isn't turning it down: it's not letting that single spotlight swallow the rest of the map.",
  },
  "pattern.grandtrine": {
    title: "Grand Trine",
    body: "Three planets forming a triangle of trines, usually all in one element: a closed circuit where energy flows on its own. It's an enormous gift — and a dangerous hammock, because what costs nothing also wakes nothing. Its work is giving all that ease a job, so the talent circulates outward instead of just spinning in place.",
  },
  "pattern.tsquare": {
    title: "T-Square",
    body: "Two planets in opposition and a third squaring them both: all the tension funnels into that focal planet. It feels like constant pressure in that area of your life — and also like your biggest engine. People with T-squares don't rest easy, but they build: the way through is giving the focal planet work worthy of its force.",
  },
  "pattern.yod": {
    title: "Yod",
    body: "Two planets in sextile and a third 150° from both: they call it \"the finger of God\" because it seems to point at something. The planet being pointed at carries an uncomfortable sense of mission — something life asks you to adjust again and again, never letting you settle. It doesn't resolve in one go: it gets tuned over the years, like a rare instrument only you know how to play.",
  },
  "pattern.grandcross": {
    title: "Grand Cross",
    body: "Four planets forming two crossed oppositions: tension in all four directions at once. It's one of the most demanding patterns — the feeling that there's always an open front, whichever way you pull. Its gift matches the price: whoever learns to carry that cross develops a capacity for work and endurance few charts ever know.",
  },

  // ——— House systems ———
  "housesystem.placidus": {
    title: "Placidus",
    body: "It divides the sky by how long each degree takes to rise over the horizon, so the houses come out unequal in size. It's the most widely used system in modern Western astrology: if you've never chosen one, you're probably already using it.",
  },
  "housesystem.koch": {
    title: "Koch",
    body: "Similar to Placidus, but it calculates the intermediate houses anchored more tightly to your exact birthplace. It has loyal followers — especially in Europe — who feel houses 2 through 12 describe their lives better with this cut.",
  },
  "housesystem.equal": {
    title: "Equal House",
    body: "Twelve houses of exactly 30° each, counted from your Ascendant. It's simple and steady, and makes special sense for anyone born at extreme latitudes, where other systems stretch the houses out of all proportion.",
  },
  "housesystem.wholesign": {
    title: "Whole Sign",
    body: "Each full sign is one house: your Ascendant's sign is your entire 1st house, the next sign the 2nd, and so on. It's the oldest system we know of — the favorite of Hellenistic astrology and of anyone who prefers reading the chart in clean strokes, with no borders cutting through mid-sign.",
  },
  "housesystem.regiomontanus": {
    title: "Regiomontanus",
    body: "It slices the sky by projecting divisions from the celestial equator down to your horizon, a medieval method that ruled Europe for centuries. Today it makes sense above all for horary astrologers — the ones answering concrete questions — where it remains the classical standard.",
  },
  "housesystem.porphyry": {
    title: "Porphyry",
    body: "It takes the four angles of your chart and splits each quadrant into three equal parts: an elegant middle ground between simple and astronomical. It makes sense for anyone who wants to honor their exact angles without marrying more intricate math.",
  },

  // ——— Zodiacs ———
  "zodiac.tropical": {
    title: "Tropical Zodiac",
    body: "It anchors the zodiac to the seasons: Aries always begins at the northern spring equinox, regardless of which constellation sits behind it. It's the system of Western astrology — it reads your chart through the relationship between Earth and Sun, the cycle of light.",
  },
  "zodiac.sidereal": {
    title: "Sidereal Zodiac",
    body: "It anchors the zodiac to the constellations actually visible in the sky, which have drifted from the seasons over the centuries — the gap is now around 24°. It's the system of Vedic astrology: if your Sun \"changes sign\" when calculated this way, it's not an error — it's a different map measuring with a different stick.",
  },

  // ——— Elements ———
  "element.fire": {
    title: "Fire",
    body: "The element of drive, faith, and enthusiasm. With a lot of fire in your chart, you start fast, spread energy, and need motion — the risk is burning out, or burning others with all that flame. With little, lighting your own motivation is hard: you don't lack ability, you lack the first spark, and it helps to surround yourself with people and projects that lend you one.",
  },
  "element.earth": {
    title: "Earth",
    body: "The element of the concrete: the body, money, whatever can be touched and held. With a lot of earth, you're someone others lean on — practical, steady — though you can overstay in what's safe. With little, ideas come easily and landing them doesn't: your work is giving your visions a body, one habit and one deadline at a time.",
  },
  "element.air": {
    title: "Air",
    body: "The element of mind and connection: words, ideas, the distance that makes understanding possible. With a lot of air, you think everything through and talk everything out — the risk is living in your head, watching your own life from the balcony. With little, it's hard to put what's happening to you into words or step back for perspective: writing and talking things through with others sorts you out inside.",
  },
  "element.water": {
    title: "Water",
    body: "The element of feeling: emotions, intuition, the things you know without knowing how. With a lot of water, you're a sponge — you pick up the emotional weather of any room, and you need shores so you don't drown in what isn't yours. With little, emotions arrive late or in a foreign language: it's not coldness, it's that your feeling asks for more time and more permission.",
  },

  // ——— Modalities ———
  "modality.cardinal": {
    title: "Cardinal",
    body: "The energy that initiates: the one that sees empty ground and lays the first stone. With a lot of cardinal energy, you launch projects effortlessly — finishing them is another story — and waiting for others to decide makes you itch. With little, you'd rather join what's already moving: taking the first step yourself is the muscle to train.",
  },
  "modality.fixed": {
    title: "Fixed",
    body: "The energy that sustains: the one that stays after the opening excitement is gone. With a lot of fixed energy, you have a persistence that moves mountains — and a stubbornness that sometimes keeps defending them after they've stopped serving you. With little, starting comes easy and staying costs you: your work is to remain one chapter longer than the impulse asks.",
  },
  "modality.mutable": {
    title: "Mutable",
    body: "The energy that adapts: the one that bends without breaking when the plan changes. With a lot of mutable energy, you flow with any turn — the risk is scattering so much that nobody knows where you stand, including you. With little, last-minute changes throw you off: advance notice is a gift to you, and letting go of the plan is your practice.",
  },
};
