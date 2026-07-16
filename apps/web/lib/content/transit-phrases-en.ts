// Today's-weather interpretive phrases (EN) — one per major aspect ×
// transiting planet (a.a of transitAspects). Aluna's voice: second person,
// warm, one concrete image, no astro jargon inside the phrase; ≤120 chars.
// Not literal translations of the ES set — rewritten with the same soul.
// Key: `${aspect}:${transiting}`; bare-aspect keys are the generic fallback.

export const TRANSIT_PHRASES: Record<string, string> = {
  // — conjunction: everything gathers; what starts, starts for real —
  "conjunction:sun": "The day looks you straight in the eye: who you are shows today, with nowhere to tuck it away.",
  "conjunction:moon": "Whatever you feel rises right to the skin; don't bury it under chores, let it speak a while.",
  "conjunction:mercury": "The right word is sitting on your tongue: say it today — tomorrow it won't carry the same.",
  "conjunction:venus": "Affection knocks without calling first; open the door even if you're still in pajamas.",
  "conjunction:mars": "You wake with the engine already running: give it a road before it overheats.",
  "conjunction:jupiter": "The day serves you the biggest plate at the table: eat slowly, but eat.",
  "conjunction:saturn": "Life hands you a test today; you walk in knowing more of the lesson than you think.",
  "conjunction:uranus": "A loose wire sparks in your routine: don't tape it over — see what light it wants to turn on.",
  "conjunction:neptune": "You wake with fog on the inside: walk slowly and sign no maps today.",
  "conjunction:pluto": "Something old asks to be buried with honors today; don't carry it back home.",

  // — sextile: a half-open door, opened by one step of yours —
  "sextile:sun": "A stripe of sun lands on your exact window: lean into it — it's brief, and it warms deep.",
  "sextile:moon": "Today it's easy to say what you feel without a scene: that little window doesn't open often.",
  "sextile:mercury": "A small conversation carries a large key: listen all the way to the end.",
  "sextile:venus": "One tiny gesture — a message, a flower — pays double today. Spend it.",
  "sextile:mars": "The push you need is exactly one step long: take it before noon.",
  "sextile:jupiter": "Luck rides the bus today, not the limousine: hop on the simple thing that passes.",
  "sextile:saturn": "Today it pays to sort one drawer, one bill, one promise: small things done well hold you up.",
  "sextile:uranus": "Take the street you never take, even just to buy bread: something is waiting there.",
  "sextile:neptune": "Your gut whispers today instead of shouting; turn the world down so you can hear it.",
  "sextile:pluto": "You can drop one small grudge today, no ceremony — like taking a stone out of your pocket.",

  // — square: friction; don't force it —
  "square:sun": "The day argues with you just to test you; don't spend your fire on every spark.",
  "square:moon": "You wake with a wrinkled heart and no clear reason; smooth it with patience, not guilt.",
  "square:mercury": "Words come out with an edge today: count to three before you hit send.",
  "square:venus": "What you want and what's good for you aren't on speaking terms; don't buy anything to fill the gap.",
  "square:mars": "You're rushing against a slow world: push the door marked pull and you're the one who loses.",
  "square:jupiter": "Everything promises more than your hands can hold today: say yes to one thing only.",
  "square:saturn": "Duty is squeezing desire's hand: sign nothing of the heart today.", // mockup 06
  "square:uranus": "You itch to throw it all out the window; move one chair, not the whole house.",
  "square:neptune": "Mirages dress well today: if it sounds too pretty, sleep on it one night.",
  "square:pluto": "A tug-of-war over power wants you in it today: whoever drops the rope first wins.",

  // — trine: the current runs your way —
  "trine:sun": "You walk on green lights today: do the thing you kept putting off, in one go.",
  "trine:moon": "Your heart wakes up at home with the table set: invite someone to sit down.",
  "trine:mercury": "Your words come out already combed today: write, call, sign what's been stuck.",
  "trine:venus": "Love runs downhill today: let yourself be loved without checking the receipt.",
  "trine:mars": "Strength and aim hold hands today: point at something big — your arm will reach.",
  "trine:jupiter": "A door opens exactly where you were already shining.", // mockup 06
  "trine:saturn": "What you build today stands for years: lay one brick, even just one.",
  "trine:uranus": "A fresh idea drops into your hands like ripe fruit: catch it before it hits the ground.",
  "trine:neptune": "You daydream with a clear signal today: write down what you imagine — it comes with instructions.",
  "trine:pluto": "You have root-strength today: you can move the heavy thing you don't even try on other days.",

  // — opposition: two poles, the other as mirror —
  "opposition:sun": "Someone across from you shows exactly what you can't see in yourself: don't argue with your mirror.",
  "opposition:moon": "An urge to break it all; breathe twice before you decide.", // mockup 06
  "opposition:mercury": "Two truths pull on the same blanket today: hear the other out before defending yours.",
  "opposition:venus": "What you ask and what you give are staring from across the room: bring them closer first.",
  "opposition:mars": "The fight calls you by name today: before stepping in, ask what you're really defending.",
  "opposition:jupiter": "You want both shores at once today; a bridge is crossed through the middle, not in one leap.",
  "opposition:saturn": "Someone lays down a rule right where it hurt: check whether it's a wall or a railing.",
  "opposition:uranus": "Someone shakes your table without asking: rescue what matters before defending the tablecloth.",
  "opposition:neptune": "Hard to tell where you end and the other begins today: return to your own name when in doubt.",
  "opposition:pluto": "Someone nudges you toward the bottom of the matter: go down with a lantern, not with fear.",

  // — generic per-aspect fallbacks (when the body isn't in the map) —
  conjunction: "Everything gathers at one point today: whatever starts there, starts for real.",
  sextile: "A window sits half-open today: it won't open itself, but one push from you opens it wide.",
  square: "The day puts a pebble in your shoe: stop and take it out instead of walking crooked.",
  trine: "The current runs your way today: keep rowing, but enjoy how far you get.",
  opposition: "The day pulls you from both sides: don't choose in a rush — the middle is yours too.",
};

/** Phrase for a transit: aspect × transiting planet, with generic per-aspect fallback. */
export function transitPhrase(aspect: string, transiting: string): string {
  return TRANSIT_PHRASES[`${aspect}:${transiting}`] ?? TRANSIT_PHRASES[aspect] ?? "";
}
