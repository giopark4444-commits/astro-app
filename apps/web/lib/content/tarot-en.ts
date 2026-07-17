// Tarot content (EN): data only; tarot-es.ts is the engine — same import
// direction as horoscope (es -> en imports types only, no runtime cycle).
// Voice: evolutionary, second person, no fatalism, concrete imagery — the
// same Aluna voice as ES, written fresh in English, never a literal
// translation of the Spanish copy.
import type { TarotCardContent } from "./tarot-es";

export const TAROT_CARDS_EN: Record<string, TarotCardContent> = {
  fool: {
    name: "The Fool",
    keywords: ["beginning", "trust", "leap", "innocence"],
    essence:
      "No map, no net, just the next step. The Fool isn't reckless — he's simply decided that experience will teach him faster than planning ever could. Wonder is the whole strategy.",
    upright: {
      love: "Say yes to the thing that has no script yet. Not knowing how it ends is what makes it real.",
      work: "Pick the project that scares you a little — that flutter in your stomach is information, not a warning.",
      path: "You're allowed a first time. Walking ground with no map isn't naive, it's brave in the plainest sense.",
    },
    reversed: {
      love: "Ask yourself honestly: is this spontaneity, or are you just running from something that needs facing?",
      work: "A little structure won't kill the magic. Even impulse needs somewhere to land.",
      path: "That vertigo you feel is worth listening to — it might be asking for one more breath before the jump.",
    },
    bridge: "The Fool breathes the air of Uranus: the freedom that interrupts anything too predictable.",
  },
  magician: {
    name: "The Magician",
    keywords: ["will", "resourcefulness", "creation", "focus"],
    essence:
      "Nothing is missing. The tools are already in your hands — what's been missing is the decision to use them. The Magician turns intention into a fact on the ground, today, not eventually.",
    upright: {
      love: "Say the want out loud. You don't need permission slips or proof of worthiness first.",
      work: "Stop refining the plan and touch the actual thing — an idea only becomes real once your hands are on it.",
      path: "You're the conduit, not a spectator standing outside your own life. Aim your focus like a tool, not a wish.",
    },
    reversed: {
      love: "There's a difference between expressing what you want and quietly engineering someone else's response — mind the line.",
      work: "Trying to hit five targets means hitting none. Pick one before you move again.",
      path: "Skill without a why becomes a party trick. Ask what all this capability is actually for.",
    },
    bridge: "The Magician carries Mercury's signature: the mind that turns thought into speech and speech into deed.",
  },
  "high-priestess": {
    name: "The High Priestess",
    keywords: ["intuition", "mystery", "stillness", "inner knowing"],
    essence:
      "There's a veil here that force cannot lift, only patience. The High Priestess doesn't argue her way to an answer — she waits for it to surface, already knowing what the noise won't let you hear.",
    upright: {
      love: "You felt it before you could explain it. Trust that first read before you talk yourself out of it.",
      work: "Not every problem yields to more research. Some already have their answer sitting quietly inside you.",
      path: "Go inward — that's not retreat, that's where the realest part of your knowing actually lives.",
    },
    reversed: {
      love: "A secret kept out of fear grows heavier than the truth ever would. Something is ready to be said.",
      work: "You've cut the line to your own gut and now you're just circling the same facts. Reconnect before deciding.",
      path: "Silence stops being wisdom the moment it's used to hide from yourself. Use it to listen instead.",
    },
    bridge: "The High Priestess carries the Moon's silver light: the inner tide that refuses to be rushed.",
  },
  empress: {
    name: "The Empress",
    keywords: ["abundance", "creation", "the body", "nurture"],
    essence:
      "Nothing here is rushed into bloom. The Empress tends what's alive at its own pace, and that patience is precisely what makes the abundance real instead of forced.",
    upright: {
      love: "A shared meal, a long hug — these ordinary pleasures carry as much weight as any deep conversation.",
      work: "Let the project take the time it needs to grow roots. Not everything blooms on your deadline.",
      path: "Your body isn't in the way of your growth — it's the ground it grows in. Feed it like it matters, because it does.",
    },
    reversed: {
      love: "Check the ledger: how much are you giving others, and how much is left over for your own garden?",
      work: "When everything gets reduced to output, the joy of making things quietly dies. Go back to why you liked this in the first place.",
      path: "More isn't the same as abundant. Choose less, chosen well, over a pile of things that don't nourish you.",
    },
    bridge: "The Empress carries Venus's grace: beauty that also knows how to hold things and help them grow.",
  },
  emperor: {
    name: "The Emperor",
    keywords: ["structure", "authority", "discipline", "protection"],
    essence:
      "Someone has to be the frame the house is built on. The Emperor isn't about control for its own sake — he's the discipline that makes it safe for everything else to grow.",
    upright: {
      love: "A clear boundary, stated plainly, doesn't push people away — it's what lets them actually lean on you.",
      work: "Build the scaffolding before the storm arrives, not during it. Order now buys you room to move later.",
      path: "Firmness with yourself isn't punishment — it's the shape that lets your fire actually go somewhere.",
    },
    reversed: {
      love: "When protecting someone turns into deciding for them, the authority has curdled into something else. Ask first.",
      work: "You're gripping too tight and it's stalling the people under you. Loosen your hands a little.",
      path: "A structure that no longer serves a purpose is just a cage you built yourself. Check what it's for.",
    },
    bridge: "The Emperor carries Aries's fire: the will that opens the road, then stands guard over it.",
  },
  hierophant: {
    name: "The Hierophant",
    keywords: ["tradition", "learning", "community", "values"],
    essence:
      "The road you're on has footprints on it already. The Hierophant is what gets passed down and then passed on — not a copy of the past, but a conversation with it.",
    upright: {
      love: "Roots in something shared — family, ritual, a community with history — can hold you up rather than hold you back.",
      work: "A mentor or a method that already works will save you years. There's no shame in learning the road first.",
      path: "Belonging to a tradition doesn't shrink you. It gives a name to something you already felt.",
    },
    reversed: {
      love: "If you're only following the rule because it's the rule, ask whose voice it actually is.",
      work: "The framework you inherited has stopped fitting the shape of what you're doing now. You're allowed to adapt it.",
      path: "A teaching taken without question stops teaching you anything. Honor it, then push back on it a little.",
    },
    bridge: "The Hierophant carries Taurus's fertile ground: tradition that, well planted, still bears fruit.",
  },
  lovers: {
    name: "The Lovers",
    keywords: ["choice", "union", "values", "alignment"],
    essence:
      "This card is rarely just about romance. The Lovers show up whenever a choice forces you to reveal, even to yourself, what you actually value.",
    upright: {
      love: "The realest connections don't blur who you are — they sharpen it. Notice if this one is doing that.",
      work: "The decision on the table is really asking about your values, not just what's easiest right now.",
      path: "Every real choice is a small mirror. It shows you who you're becoming, not just what you're picking.",
    },
    reversed: {
      love: "More chemistry won't fix values that don't line up. That takes an honest conversation, not more feeling.",
      work: "Choosing to avoid disappointing someone else is still avoiding your own decision. Notice the difference.",
      path: "Standing still for too long is its own kind of choice. What are you actually avoiding looking at?",
    },
    bridge: "The Lovers carry Gemini's curious air: the conversation that makes a conscious choice possible.",
  },
  chariot: {
    name: "The Chariot",
    keywords: ["will", "direction", "inner discipline", "momentum"],
    essence:
      "Two horses pulling in different directions, and somehow the chariot still moves. That's the trick of it — real momentum comes from getting your own conflicting instincts to pull the same way.",
    upright: {
      love: "It's not the intensity that keeps a bond moving forward, it's agreeing on where forward even is.",
      work: "The fight that's actually slowing you down is the one happening inside your own head. Settle that first.",
      path: "Whatever you're racing against isn't out there — it's the part of you still pulling the other direction.",
    },
    reversed: {
      love: "Two people heading different ways will stall no matter how hard either one pushes. Talk about the direction, not the pace.",
      work: "Motion without a destination just burns fuel. Stop before you spend more energy going nowhere.",
      path: "Force without control just ends in wreckage. The real advance starts from a calm place, not a clenched one.",
    },
    bridge: "The Chariot carries Cancer's protective water: the will that also knows how to shelter what it loves.",
  },
  strength: {
    name: "Strength",
    keywords: ["gentle courage", "patience", "compassion", "self-mastery"],
    essence:
      "An open hand calms the lion; a clenched fist never could. Strength is what power looks like when it doesn't need to dominate anything to prove it's real.",
    upright: {
      love: "Staying gentle with someone through their hard season takes more strength than walking away ever would.",
      work: "Persistence, applied calmly, outlasts any battle of wills. Breathe before you push back.",
      path: "The wildest thing in you doesn't need a cage — it needs company, until it trusts you enough to help instead of hurt.",
    },
    reversed: {
      love: "Doubting yourself is how you end up giving away ground you never should have given up.",
      work: "Pressing harder on a situation that's already tense just makes it more brittle. Ease off before you push again.",
      path: "Swallowing what you feel isn't mastery, it's just delay. Real strength can hold even the feelings that scare it.",
    },
    bridge: "Strength carries Leo's sun: the courage that shines without ever needing to roar.",
  },
  hermit: {
    name: "The Hermit",
    keywords: ["retreat", "introspection", "inner guide", "chosen solitude"],
    essence:
      "He isn't running from the world by climbing alone — he's finally getting far enough away to actually see it. The Hermit's lamp only lights up once he stops looking for someone else's.",
    upright: {
      love: "Some distance right now might be what steadies things, not what breaks them. Find yourself before you try to find each other.",
      work: "You won't think your way to the answer in another meeting. Quiet is where it's actually waiting for you.",
      path: "Stepping back isn't giving up — it's finally being able to hear your own voice under everyone else's.",
    },
    reversed: {
      love: "The distance has gone on long enough that it's starting to cost more than it protects. Someone's waiting on the other side of the door.",
      work: "An idea kept entirely to yourself never gets tested. Bring it out of the cave and let someone see it.",
      path: "Solitude curdles into isolation the moment it stops feeling like a choice. Your light was also meant for someone else.",
    },
    bridge: "The Hermit carries Virgo's meticulous earth: analysis that becomes wisdom once it's done in quiet.",
  },
  "wheel-of-fortune": {
    name: "The Wheel of Fortune",
    keywords: ["cycles", "change", "fate", "movement"],
    essence:
      "Nobody stays on top of the wheel, and nobody stays crushed under it either. What matters isn't where you land — it's noticing that the whole thing is always turning.",
    upright: {
      love: "Something unplanned is opening a door you weren't watching. Let it surprise you before you try to explain it.",
      work: "Opportunity runs on its own clock, not yours. Stay ready so you actually recognize it when it shows up.",
      path: "Trusting the cycle isn't giving up control — it's knowing the hard stretch is also carrying you somewhere.",
    },
    reversed: {
      love: "Fighting a change that's already underway just drags out the discomfort. Some part of this has already run its course.",
      work: "A setback is one turn of the wheel, not the whole story. Adjust the plan — don't abandon the hope.",
      path: "Blaming fate is a way of stepping out of your own story. There's a choice still sitting there, waiting on you.",
    },
    bridge: "The Wheel carries Jupiter's expansion: the turn that, sooner or later, brings more luck than the one that left.",
  },
  justice: {
    name: "Justice",
    keywords: ["balance", "truth", "accountability", "consequence"],
    essence:
      "The scale isn't cruel, just accurate. Justice asks for an unflinching look at what actually happened, including the part you played in it.",
    upright: {
      love: "The honest version — including the parts that don't flatter you — is the only one that actually balances the ledger.",
      work: "Whatever standard you're applying to others, apply it to yourself too. Fair comes before comfortable.",
      path: "Owning your exact share, no more guilt than it warrants and no less, is the fastest way back to peace.",
    },
    reversed: {
      love: "Dodging the hard conversation to keep the peace tips the scale further than the conflict ever would.",
      work: "Something unfair has been tolerated for too long. It's asking to be named, not managed quietly.",
      path: "Refusing to see your part in it doesn't erase the lesson, it just delays it. The truth costs less than the avoidance does.",
    },
    bridge: "Justice carries Libra's balanced air: the scale that seeks real harmony, not just easy peace.",
  },
  "hanged-man": {
    name: "The Hanged Man",
    keywords: ["pause", "surrender", "new perspective", "conscious sacrifice"],
    essence:
      "Hung upside down, he sees something standing upright never showed him. The Hanged Man's whole teaching is that stopping the fight against the pause is what lets the new angle in.",
    upright: {
      love: "Not everything needs solving today. Sometimes love just means holding still without rushing the clock.",
      work: "A project that's stalled isn't a failure — it's handing you a different vantage point you hadn't tried yet.",
      path: "Letting go of what you can't control isn't giving up. It's the only door into a wisdom you can't force.",
    },
    reversed: {
      love: "Giving more than anyone asked for eventually hollows you out. Check whether this is generosity or habit.",
      work: "Staying frozen to avoid a wrong decision costs more than the wrong decision would. Move again.",
      path: "A pause that's calcified into paralysis has stopped teaching you anything. You already saw it — come down.",
    },
    bridge: "The Hanged Man carries Neptune's dissolution: the surrender that, by letting go of control, becomes vision.",
  },
  death: {
    name: "Death",
    keywords: ["transformation", "closure", "rebirth", "truth"],
    essence:
      "Something has finished, and pretending otherwise costs more each day. Death clears with a steady hand — not to punish, but to make room. What follows can only take root in cleared ground.",
    upright: {
      love: "One version of this bond is ending. Naming it honestly is what makes space for a truer one.",
      work: "The old approach has quietly stopped working. Instead of fighting that, ask who you're becoming next.",
      path: "An identity you've outgrown is peeling away. It's uncomfortable precisely because it's real.",
    },
    reversed: {
      love: "Holding onto something already over only stretches the pain thinner. A clean ending hurts less than a slow denial.",
      work: "The change was going to happen with or without your consent. Resisting it just adds friction, not time.",
      path: "Refusing the transformation doesn't cancel it, it just makes the landing rougher. Let go before the choice is made for you.",
    },
    bridge: "Death carries Scorpio's intensity: the transformation that demands a small death before a truer rebirth.",
  },
  temperance: {
    name: "Temperance",
    keywords: ["balance", "patience", "integration", "flow"],
    essence:
      "One cup pours into the next, and not a drop is lost. Temperance is what happens when opposite forces — haste and calm, wanting and waiting — finally learn to share the same glass.",
    upright: {
      love: "This bond doesn't need a perfect fit today. It needs small, steady adjustments over real time.",
      work: "The proven method and the new idea don't have to compete — blend them and see what actually holds up.",
      path: "Healing rarely comes from picking one side of yourself. It comes from letting the contradictions coexist.",
    },
    reversed: {
      love: "All-in or all-out, either extreme breaks something the relationship actually needed held gently.",
      work: "Wanting the result now is what's sabotaging a process that needed time to actually work.",
      path: "Living at the extremes is exhausting. Come back to the middle before it becomes your default setting.",
    },
    bridge: "Temperance carries Sagittarius's expansive fire: faith that knows how to mix meaning with patience.",
  },
  devil: {
    name: "The Devil",
    keywords: ["attachment", "shadow", "desire", "possible freedom"],
    essence:
      "Look closely at the chains in the image — they were never locked. The Devil isn't a verdict, it's a mirror held up to whatever keeps you in place out of habit, fear, or pleasure. The way out was always unlocked.",
    upright: {
      love: "Jealousy dressed up as passion, control dressed up as care — name the pattern plainly, without turning it into self-punishment.",
      work: "A draining routine survives mostly on fear of the unfamiliar, not on real necessity. There's another option.",
      path: "Your shadow isn't the enemy here — it's the part of you that's been asking, quietly, to be seen instead of hidden.",
    },
    reversed: {
      love: "You're finally seeing the chain clearly. That clarity alone is most of the way toward taking it off.",
      work: "Recognizing the pattern that's been limiting you is more than half the battle already won.",
      path: "Whatever had a grip on you is loosening. Let yourself walk toward the freedom you can already sense.",
    },
    bridge: "The Devil carries Capricorn's dense earth: structure that, without awareness, becomes its own cage.",
  },
  tower: {
    name: "The Tower",
    keywords: ["collapse", "revelation", "sudden truth", "rebuilding"],
    essence:
      "Lightning doesn't strike at random — it finds whatever was built on a lie. The Tower hurts because the truth arrives all at once, but somewhere inside that wreckage is a relief that hasn't spoken up yet.",
    upright: {
      love: "An uncomfortable truth just surfaced. What's collapsing was never the love — it was whatever had been covering it.",
      work: "A sudden shift is rearranging the whole plan. Whatever felt stable wasn't as solid as it looked.",
      path: "The break isn't destroying you, it's waking you up. What falls apart clears ground for something honest.",
    },
    reversed: {
      love: "Every day you postpone the conversation makes the eventual fall a little bigger.",
      work: "Ignoring the crack doesn't seal it, it just delays it. Better to face it now, on your own terms.",
      path: "Fear of the collapse is keeping you in a calm that isn't real. Sometimes something has to fall for the rebuild to be honest.",
    },
    bridge: "The Tower carries Mars's impulse: the sudden rupture that, however uncomfortable, clears a path with truth.",
  },
  star: {
    name: "The Star",
    keywords: ["hope", "healing", "trust", "renewal"],
    essence:
      "After the storm passes, she keeps pouring water without fearing the well will run dry. The Star doesn't pretend the damage away — it simply trusts there's more where that came from.",
    upright: {
      love: "You're letting yourself believe again, with no guarantee attached, because trust rebuilds itself in small doses — and you've already started.",
      work: "Something that grew out of a loss is starting to find its own light. Keep tending it.",
      path: "Your faith here doesn't need evidence. It's the quiet certainty that the worst of it is already behind you.",
    },
    reversed: {
      love: "Discouragement is fogging up something that's actually getting better. Notice the small light that already came back.",
      work: "Losing faith right before things bloom is the real risk here. Hold on a little longer.",
      path: "Feeling far from hope doesn't mean it left — it means it's time to look up again.",
    },
    bridge: "The Star carries Aquarius's visionary air: the collective hope that dares to imagine a different future.",
  },
  moon: {
    name: "The Moon",
    keywords: ["intuition", "shadow", "dreams", "the unspoken"],
    essence:
      "The path looks strange by moonlight, and you have to walk it anyway. The Moon holds what logic can't fully untangle — old fears, dreams, half-formed truths — and asks for instinct instead of certainty.",
    upright: {
      love: "Something's floating between you unsaid. It doesn't all need explaining tonight, but it will need honesty eventually.",
      work: "The full picture isn't visible yet. Move carefully and trust your gut over the incomplete data.",
      path: "Your dreams and your fears are speaking the same dialect tonight. Listen without needing a full translation.",
    },
    reversed: {
      love: "The fog is lifting. What looked like an illusion is starting to show its real shape.",
      work: "A misunderstanding is coming into the light. Something you assumed deserves a second, clearer look.",
      path: "Naming the fear that's been paralyzing you takes most of its power away. The fog is already thinning.",
    },
    bridge: "The Moon carries Pisces's dreamlike water: the dissolving of borders between the conscious and what's still asleep.",
  },
  sun: {
    name: "The Sun",
    keywords: ["joy", "vitality", "clarity", "genuine success"],
    essence:
      "No shadow to argue with here. The Sun is just the plain fact of things going right, and the permission to enjoy it without hunting for the catch.",
    upright: {
      love: "This bond is having a bright season. Let it be good without inspecting it for flaws it doesn't have yet.",
      work: "The credit coming your way is earned. Let yourself be seen instead of shrinking from it.",
      path: "Your vitality is back online. Today doesn't need understanding, just enjoying.",
    },
    reversed: {
      love: "Performing happiness while something quietly weighs on you dims a light that's actually available to you. Be honest first.",
      work: "A real win feels small only when you measure it against an impossible standard. Give the actual win its due.",
      path: "Forced cheer is more exhausting than honest sadness. You have permission to feel what's actually there today.",
    },
    bridge: "The Sun carries the central fire of the star itself: vitality that shines without needing to hide anything.",
  },
  judgement: {
    name: "Judgement",
    keywords: ["calling", "rebirth", "honest reckoning", "awakening"],
    essence:
      "A trumpet sounds and something in you sits up that had been asleep for a while. Judgement asks for an honest look at the whole story, so you can decide from there who to be next.",
    upright: {
      love: "A past or present bond is asking for a clear-eyed look — not idealized, not condemned, just understood.",
      work: "Something bigger than the daily task is calling you. Listen, even if it means changing direction.",
      path: "This is a real wake-up moment. You can't keep unseeing what you've already seen about yourself.",
    },
    reversed: {
      love: "Fear of being too hard on yourself is why you keep avoiding a pattern that keeps repeating. Honesty isn't a punishment.",
      work: "Putting off an honest look at your path doesn't make it optional — it just delays the wake-up already arriving.",
      path: "Harsh self-criticism isn't the same thing as clarity. Set down the judgment so you can actually hear the call.",
    },
    bridge: "Judgement carries Pluto's deep transformation: the symbolic death that comes before a real awakening.",
  },
  world: {
    name: "The World",
    keywords: ["wholeness", "completion", "integration", "achievement"],
    essence:
      "The circle closes not because everything turned out perfect, but because every piece finally found where it belongs. The World is what it feels like to see the whole cycle, complete, from the outside for the first time.",
    upright: {
      love: "This bond has reached a maturity that stands on its own — nothing extra needed to make it whole.",
      work: "A long project has reached its natural end. Take the full credit before you rush to the next thing.",
      path: "Pieces of yourself that used to live apart are finally integrated. This achievement is real even if it's quiet.",
    },
    reversed: {
      love: "It feels like one step is still missing before the cycle can close. Name exactly what that piece is.",
      work: "A nearly finished project is stalling right at the edge of done. Find the loose thread and tie it off.",
      path: "That sense of incompleteness is pointing at one piece that still doesn't fit — not failure, just a last adjustment.",
    },
    bridge: "The World carries Saturn's structure: discipline that, once its time is served, crowns itself in real achievement.",
  },

  // --- Wands (fire: action, creative will, momentum) ---
  "wands-01": {
    name: "Ace of Wands",
    keywords: ["spark", "creative drive", "new venture", "vitality"],
    essence:
      "A hand emerges from a cloud gripping a wand still budding with leaves. Nobody knows yet what this will grow into — that's the point. This is fire in its rawest state, want before shape, yes before plan.",
    upright: {
      love: "You feel pulled toward someone or something without needing to explain the pull first — that's allowed.",
      work: "An idea shows up already burning. Grab it now, before overthinking cools it down.",
      path: "Something in you wants to move. Give that hunger an outlet instead of leaving it as pure enthusiasm.",
    },
    reversed: {
      love: "The spark flares and dies without catching on anything real — figure out if you actually want to build, or just enjoy the flicker.",
      work: "A strong start fizzles fast. First bursts of motivation aren't enough to carry a whole project on their own.",
      path: "The fuel is there but there's no outlet for it yet — find where this energy actually belongs before it burns off into nothing.",
    },
    bridge: "The Ace of Wands is fire before it picks a direction — pure creative charge, still undecided about where it's headed.",
  },
  "wands-02": {
    name: "Two of Wands",
    keywords: ["planning", "vision", "decision", "the wider view"],
    essence:
      "Globe in hand, gaze fixed past the castle walls. This isn't the spark anymore — it's the first real question: where does this fire actually want to go?",
    upright: {
      love: "You're starting to picture something more concrete together. Say the vision out loud instead of keeping it private.",
      work: "The groundwork is done — now the real call is direction, not another reaction to whatever comes next.",
      path: "The world suddenly feels bigger than your usual radius. Let that scale pull you forward instead of freezing you.",
    },
    reversed: {
      love: "Fear of committing to a real future keeps you staring at the horizon instead of stepping toward it.",
      work: "Without a real plan, the energy scatters into five directions at once and none of them go anywhere.",
      path: "Staying in daydream mode without landing a single decision drains the momentum you started with.",
    },
    bridge: "The Two of Wands is fire that starts looking far off — will needs a horizon, or it just burns in place.",
  },
  "wands-03": {
    name: "Three of Wands",
    keywords: ["expansion", "active waiting", "partnership", "long view"],
    essence:
      "Standing at the cliff's edge, watching ships already out at sea. The planting is done. What's left is trust — that the voyage keeps moving even when you can't see the deck anymore.",
    upright: {
      love: "A relationship stretches beyond what's familiar — distance, future plans, a commitment with more range than before.",
      work: "Early signs of payoff start arriving from far away. Keep your eyes on the horizon, patiently, not anxiously.",
      path: "Your vision is already in motion. You don't have to push every ship yourself — you just have to trust the course you set.",
    },
    reversed: {
      love: "Distance starts costing more than it's giving back — check whether the bond is still growing or just stretched thin.",
      work: "An unexpected delay throws off the timeline. Adjust how long you're willing to wait, not the direction itself.",
      path: "Impatience for results makes you doubt a vision that's still very much alive — it's just running late.",
    },
    bridge: "The Three of Wands is fire already traveling far from you — expanded will, trusting its own reach.",
  },
  "wands-04": {
    name: "Four of Wands",
    keywords: ["celebration", "homecoming", "shared achievement", "festive stability"],
    essence:
      "Four staves hold up a garland, and underneath it, people are celebrating. Fire finally lands somewhere solid enough to throw a party on top of it.",
    upright: {
      love: "A shared celebration — a homecoming, an anniversary, moving in together — deserves to be lived slowly, not rushed through.",
      work: "A milestone wants acknowledgment before you move to the next thing. Take the festive pause; you earned it.",
      path: "You land on a stretch of stability that feels like coming home. Let yourself enjoy standing still for once.",
    },
    reversed: {
      love: "The celebration feels hollow or forced somehow — name what's missing for this to actually feel like home.",
      work: "A win that deserved recognition slips by unnoticed. If nobody claps, clap for yourself.",
      path: "Shaky foundations keep you from enjoying what you've already built — go back and shore up the base before you celebrate.",
    },
    bridge: "The Four of Wands is fire turned into a home — will that finally found stability without going out.",
  },
  "wands-05": {
    name: "Five of Wands",
    keywords: ["friction", "competition", "creative conflict", "disorder"],
    essence:
      "Five figures swing staves at once, all out of sync with each other. This is fire multiplied in five directions before anyone agrees on a rhythm — noisy, chaotic, not yet dangerous.",
    upright: {
      love: "Disagreements surface between you two. Friction here isn't the end — it just means both of you still have fire of your own.",
      work: "Competing ideas or egos crowd the room. Somewhere in that clash, tension turns into something creative — find it.",
      path: "What looks like chaos is really unchanneled energy. Give it a structure before it wears you out for nothing.",
    },
    reversed: {
      love: "A conflict you'd been avoiding finally gets resolved, or at least named clearly for the first time.",
      work: "The internal competition on the team starts easing off. Room opens for collaboration instead of collision.",
      path: "You're learning to stop needing to win every friction point — not every disagreement calls for a victory lap.",
    },
    bridge: "The Five of Wands is fire scattered without coordination — many wills that haven't found a shared beat yet.",
  },
  "wands-06": {
    name: "Six of Wands",
    keywords: ["victory", "recognition", "confidence", "visible progress"],
    essence:
      "He rides back crowned in laurel, and a crowd gathers to greet him. Fire that already produced something visible gets to be shown off — no need for false modesty here.",
    upright: {
      love: "The effort you've put into this bond is starting to show. Let people see you enjoying what you built together.",
      work: "Public recognition arrives, and it's earned. Take it in without immediately shrinking it down.",
      path: "Confidence rises here because there's real evidence behind it, not just wishful thinking — walk in it.",
    },
    reversed: {
      love: "Chasing outside approval over your own sense of satisfaction leaves you dependent on other people's opinions.",
      work: "Recognition you expected gets delayed or looks different than imagined — the work's worth doesn't hinge on it.",
      path: "Misplaced pride pulls you away from a humility your path still needs — celebrate without requiring an audience.",
    },
    bridge: "The Six of Wands is fire that got seen — will confirmed by a result other people notice too.",
  },
  "wands-07": {
    name: "Seven of Wands",
    keywords: ["defense", "standing ground", "sustained challenge", "conviction"],
    essence:
      "From the high ground, he holds off staves reaching up from below. This is fire defending what it already built, not because it's under real threat, but because what's up for question is worth protecting.",
    upright: {
      love: "Holding your ground on what you believe about this bond, against outside opinions, takes conviction — not stubbornness.",
      work: "You're defending a hard-won position. Stay firm without needing to win everyone over to your side.",
      path: "The challenge in front of you is confirmation that you've already reached somewhere worth guarding.",
    },
    reversed: {
      love: "Feeling constantly on the defensive wears the bond down — ask whether the threat is real or just assumed.",
      work: "Giving up ground out of exhaustion rather than conviction leaves you somewhere you never actually chose.",
      path: "Defending everything, even what no longer matters, drains you for nothing — pick your battles more carefully.",
    },
    bridge: "The Seven of Wands is fire under pressure-test — will learning what it takes to hold steady.",
  },
  "wands-08": {
    name: "Eight of Wands",
    keywords: ["speed", "movement", "messages", "acceleration"],
    essence:
      "Eight staves fly through open sky in a straight line, nothing in their way. Fire finally hits clear road and moves fast enough that there's no time left for second-guessing.",
    upright: {
      love: "Things move quickly now — news, a reunion, a decision arriving sooner than you expected.",
      work: "Everything speeds up at once: messages, signals, progress. Ride the pace instead of stalling it with overanalysis.",
      path: "The momentum you feel is real. Trust it and act while the wind is still behind you.",
    },
    reversed: {
      love: "Communication jams right when you needed it flowing fastest — figure out what's stuck, and why.",
      work: "Unexpected delays frustrate progress that had real speed behind it — hold steady before forcing the pace back.",
      path: "Rushing to arrive makes you skip steps that mattered. Even fast fire needs a short pause sometimes.",
    },
    bridge: "The Eight of Wands is fire without friction — will moving faster than the mind analyzing it.",
  },
  "wands-09": {
    name: "Nine of Wands",
    keywords: ["resilience", "last reserve", "vigilance", "almost there"],
    essence:
      "Bandaged, exhausted, still standing guard with the last stave in hand. This is fire that has almost nothing left to give and chooses to keep holding anyway.",
    upright: {
      love: "You've given a lot and you're tired, but the bond still deserves one more conscious effort.",
      work: "You're close to the finish, running on reserves — this isn't the moment to quit, it's the moment to hold.",
      path: "Resilience doesn't come from never getting hurt. It comes from staying upright afterward.",
    },
    reversed: {
      love: "Old wounds have you guarding against people who aren't actually attacking you.",
      work: "Exhaustion is making you see threats that aren't there — tell the difference between real caution and tired paranoia.",
      path: "Keeping your guard up at all times, even when it's no longer needed, blocks the rest and healing you actually need.",
    },
    bridge: "The Nine of Wands is fire nearly spent, refusing to go out — will pushing one step further than it thought it had.",
  },
  "wands-10": {
    name: "Ten of Wands",
    keywords: ["overload", "responsibility", "final load", "heavy close"],
    essence:
      "Hunched under all ten staves, barely able to see the road ahead. Fire pushed to its limit — the last stretch of a cycle, heavy right before you finally get to set it down.",
    upright: {
      love: "You're carrying more emotional weight than you're saying out loud — ask for help before you buckle completely.",
      work: "You're near the end of something big and the load feels maximal — you're close, so share the weight if you can.",
      path: "What you're carrying is yours by choice, but that doesn't mean you have to haul it alone to the finish.",
    },
    reversed: {
      love: "You're starting to set down burdens you never should have carried solo — delegating isn't failing, it's finally asking.",
      work: "You recognize you're overloaded and take the first step toward spreading the weight before you collapse under it.",
      path: "Relief arrives the moment you accept that not every responsibility has to stay yours forever.",
    },
    bridge: "The Ten of Wands is fire at its heaviest point — will crowning the cycle right before it finally gets to rest.",
  },
  "wands-page": {
    name: "Page of Wands",
    keywords: ["burning curiosity", "messenger", "enthusiasm", "apprentice of fire"],
    essence:
      "He studies his wand like he's never seen fire before. News, ideas, a curiosity with no destination yet mapped out — and that's exactly the charm of it.",
    upright: {
      love: "Playful, direct energy shows up. Let enthusiasm speak before caution gets a chance to cool it down.",
      work: "A new idea wants exploring even without a finished plan yet — learning is part of the process, not a delay.",
      path: "Your curiosity about the new is spiritual information: it's pointing at exactly where your fire wants to grow next.",
    },
    reversed: {
      love: "Initial excitement scatters before it becomes anything steady — name what it would take to actually sustain it.",
      work: "You start a dozen things at once and finish none of them — the fire needs a little focus so it doesn't burn itself out.",
      path: "Impatience for instant results makes you undervalue the plain fact that you're still learning.",
    },
    bridge: "The Page of Wands is master number eleven turned apprentice — the teacher-in-waiting still playing with its own fire.",
  },
  "wands-knight": {
    name: "Knight of Wands",
    keywords: ["all-in momentum", "adventure", "impatience", "unbraked action"],
    essence:
      "He gallops off before the route is even finished. This is fire in pure motion — action that would rather course-correct on the road than sit still planning the exit.",
    upright: {
      love: "Passion arrives fast and intense — enjoy the rush without demanding it already be a lifelong promise.",
      work: "This is the moment to move decisively even with an unfinished plan — the terrain gets known by walking it.",
      path: "Your fire is asking for real adventure, not a rehearsal. Go move, even without every certainty locked in.",
    },
    reversed: {
      love: "Nonstop impulsiveness leaves wounds that need repairing later — pause before acting purely on the heat of the moment.",
      work: "Starting with zero plan costs you ground you'd already gained — a little direction sharpens the drive, it doesn't kill it.",
      path: "Constant impatience blinds you to when the road is asking for a breather instead of another launch.",
    },
    bridge: "The Knight of Wands is fire already galloping — will testing itself through motion, not through planning.",
  },
  "wands-queen": {
    name: "Queen of Wands",
    keywords: ["magnetism", "radiant confidence", "independence", "warm firmness"],
    essence:
      "Sunflower in hand, black cat at her feet, she isn't asking permission to shine. Fire that became presence — warm and unshakeable in the same breath.",
    upright: {
      love: "Your natural magnetism draws people in without trying — show up as you are instead of dimming yourself smaller.",
      work: "You lead with warmth and resolve at once. The way you show up front and center inspires more than it commands.",
      path: "Your independence doesn't push people away — it invites them toward a more grounded version of you.",
    },
    reversed: {
      love: "Needing outside validation dulls your own shine — remember your fire was never dependent on someone else's gaze.",
      work: "Insecurity dresses itself up as over-control — release the urge to constantly prove your own worth.",
      path: "Measuring your light against someone else's dims it for no reason — your fire isn't in competition, it just is.",
    },
    bridge: "The Queen of Wands is fire matured into presence — will that no longer needs to force itself to be seen.",
  },
  "wands-king": {
    name: "King of Wands",
    keywords: ["visionary leadership", "charisma", "boldness", "clear direction"],
    essence:
      "Wand ablaze in hand, eyes on a horizon only he can see right now. This is fire that finally learned how to lead without scorching what it touches.",
    upright: {
      love: "You bring vision and decisiveness to the bond — lead by example, not by demand.",
      work: "This is the moment to take the reins boldly — your long-range vision can become the whole team's map.",
      path: "Your natural charisma is a spiritual tool when it's used to inspire rather than to dominate.",
    },
    reversed: {
      love: "Needing to always be right suffocates the other person's voice — lead with the bond, not over it.",
      work: "Ambition that never listens isolates your leadership — fire that shares no space eventually burns alone.",
      path: "Boldness without humility curdles into arrogance — even the biggest fire still needs oxygen from somewhere else.",
    },
    bridge: "The King of Wands is fire at full mastery — will that directs without needing to destroy in order to lead.",
  },

  // --- Cups (water: emotion, connection, inner world) ---
  "cups-01": {
    name: "Ace of Cups",
    keywords: ["emotional opening", "new love", "inner fullness", "receptivity"],
    essence:
      "A hand holds a cup so full it spills into five streams below. This is the seed of feeling itself — the heart opening before it even knows where that overflow is headed.",
    upright: {
      love: "A new feeling arrives with a fullness that needs no explanation — let yourself feel it instead of dissecting it.",
      work: "You find a purpose that connects you emotionally to what you do, beyond just the outcome.",
      path: "Your heart is opening to something nourishing — receive it, drop the guard you keep out of habit.",
    },
    reversed: {
      love: "You're struggling to receive the affection coming your way — check if that guard protects you or just isolates you.",
      work: "The job feels emotionally hollow even though it functions fine on paper.",
      path: "There's a disconnect from your own feeling — the water is already there, you just have to stop damming it.",
    },
    bridge: "The Ace of Cups is water in its purest state — emotional opening before it takes any particular shape.",
  },
  "cups-02": {
    name: "Two of Cups",
    keywords: ["mutual connection", "reciprocity", "union", "recognition"],
    essence:
      "Two figures raise their cups to each other at the same moment, eyes locked. Water no longer moving alone — now it mirrors another current entirely.",
    upright: {
      love: "A bond feels balanced, give and take in equal measure — celebrate a reciprocity this rare.",
      work: "A partnership forms on genuine mutual respect — build on that foundation of trust.",
      path: "Recognizing yourself in someone else doesn't divide you, it fills you out a little more — the mirror teaches too.",
    },
    reversed: {
      love: "An imbalance between giving and receiving starts weighing on things — name the asymmetry before it grows.",
      work: "Trust in the partnership starts cracking — an honest conversation is needed to repair it.",
      path: "Looking outside yourself for what you haven't yet found within leaves you dependent on that external mirror.",
    },
    bridge: "The Two of Cups is water meeting water — feeling that recognizes itself reflected in someone else.",
  },
  "cups-03": {
    name: "Three of Cups",
    keywords: ["shared celebration", "friendship", "community", "collective joy"],
    essence:
      "Three figures lift their cups together, celebrating something none of them would have enjoyed the same way alone. Water multiplies the moment it's shared.",
    upright: {
      love: "A circle of friends or family celebrates a good moment alongside you — let the joy stay collective.",
      work: "A team win deserves a group celebration, not a quiet, modest shrug.",
      path: "Community is part of your spiritual path — shared joy is its own form of gratitude.",
    },
    reversed: {
      love: "Too much socializing starts substituting for real one-on-one connection — chase depth, not just company.",
      work: "Team dynamics fill up with gossip or competition dressed as celebration — return to what's genuine.",
      path: "Surrounding yourself with people without real connection leaves you lonelier than it looks from outside.",
    },
    bridge: "The Three of Cups is water shared in a circle — feeling that multiplies instead of splitting apart.",
  },
  "cups-04": {
    name: "Four of Cups",
    keywords: ["apathy", "introspection", "quiet dissatisfaction", "an offer unnoticed"],
    essence:
      "Arms crossed under a tree, he doesn't even look at the cup a hand offers from the cloud above. Water gone still inside — so full of the past it misses what's arriving.",
    upright: {
      love: "A certain indifference creeps in toward something that used to excite you — check if it's needed rest, or real disconnection.",
      work: "Boredom with the familiar blinds you to an opportunity already sitting right in front of you, waiting to be noticed.",
      path: "Today's introspection is valid — just don't let it curdle into prolonged apathy.",
    },
    reversed: {
      love: "You come out of the disconnection and start noticing again what's actually available to you.",
      work: "New motivation shows up right as you were ready to stop refusing what was already being offered.",
      path: "You wake from an emotional slump and turn back outward with genuine curiosity.",
    },
    bridge: "The Four of Cups is water that stopped moving — feeling gone stagnant, needing to turn and notice what's still flowing.",
  },
  "cups-05": {
    name: "Five of Cups",
    keywords: ["grief", "loss", "what remains", "partial view"],
    essence:
      "Back turned to the two cups still standing, he stares only at the three that spilled. Real grief, yes — but also a reminder that even a wounded gaze doesn't see the whole landscape.",
    upright: {
      love: "A loss or disappointment needs mourning without a deadline — grief is its own way of honoring what mattered.",
      work: "A failure hurts, genuinely — give yourself permission to feel it before forcing an early lesson out of it.",
      path: "The pain is real, and something is still standing behind you, waiting for you to turn around.",
    },
    reversed: {
      love: "You start turning toward what you still have, without denying what was lost.",
      work: "Accepting what didn't work opens space to see the opportunity still available.",
      path: "Grief starts turning into insight — you're no longer just staring at what spilled.",
    },
    bridge: "The Five of Cups is water spilled and still stinging — feeling that needs its own time before it turns to face what's left.",
  },
  "cups-06": {
    name: "Six of Cups",
    keywords: ["nostalgia", "childhood", "reunion", "sweetness of the past"],
    essence:
      "In an old courtyard, one child hands another a cup filled with flowers. This is memory's water — the sweetness of who we used to be, occasionally showing up again uninvited.",
    upright: {
      love: "A reunion or shared memory stirs real tenderness — let nostalgia visit without moving in.",
      work: "A skill or passion from your past becomes relevant again — don't write it off as childish.",
      path: "Healing a piece of your inner child unlocks a joy you thought you'd lost.",
    },
    reversed: {
      love: "Idealizing the past clouds your view of the present — today's bond shouldn't have to compete with a memory.",
      work: "Clinging to old methods out of comfort blocks what the current moment actually calls for.",
      path: "Living inside nostalgia keeps you from building new memories — honor the past without staying trapped there.",
    },
    bridge: "The Six of Cups is water remembering its own source — feeling returning to innocence without getting stuck in it.",
  },
  "cups-07": {
    name: "Seven of Cups",
    keywords: ["fantasy", "options", "illusion", "confused choice"],
    essence:
      "Seven cups float in the clouds, each holding a different vision — a castle, a jewel, a shadowed figure. Imagination running wild enough that real desire and mere mirage start looking the same.",
    upright: {
      love: "Several possibilities or fantasies swirl at once — sort out which is genuine longing and which is just comfortable illusion.",
      work: "Too many options with no focus breeds paralysis — pick a direction even while the others still glimmer from a distance.",
      path: "Your imagination is a gift, but today it needs an anchor so it doesn't dissolve into endless maybes.",
    },
    reversed: {
      love: "You start seeing clearly which option was real and which was only fantasy — the fog lifts.",
      work: "You finally make a concrete decision after circling imaginary alternatives for too long.",
      path: "You step out of the daydream and land on what you can actually build with what you have.",
    },
    bridge: "The Seven of Cups is water splitting into mirages — feeling that needs to choose one channel among many possible ones.",
  },
  "cups-08": {
    name: "Eight of Cups",
    keywords: ["walking away", "inner search", "leaving behind", "deeper purpose"],
    essence:
      "He turns his back on eight neatly stacked cups and walks off into the mountains at night. Water deciding that what's already built isn't enough anymore — there's something truer out there worth the walk.",
    upright: {
      love: "Something stable no longer fully satisfies you — listening to that restlessness isn't betrayal, it's honesty.",
      work: "Material success stops feeding your need for purpose — the next step calls for more meaning, not more achievement.",
      path: "You're ready to leave a whole chapter behind, even though letting go of the familiar hurts.",
    },
    reversed: {
      love: "Fear of the unknown keeps you in a bond that no longer nourishes you — name what's really holding you there.",
      work: "Putting off leaving a depleted situation only stretches out the wear — the decision has already been made inside.",
      path: "You go back to what you left without resolving why you left in the first place — check if it's healing or avoidance of the void.",
    },
    bridge: "The Eight of Cups is water pulling away from its known channel — feeling in search of a deeper source than comfort.",
  },
  "cups-09": {
    name: "Nine of Cups",
    keywords: ["satisfaction", "wish fulfilled", "gratitude", "earned pleasure"],
    essence:
      "Arms crossed, nine cups arranged behind him in an arc, he smiles with the ease of someone who got exactly what he wanted. This is pleasure enjoyed without a hint of guilt.",
    upright: {
      love: "You feel a real satisfaction with the bond exactly as it stands — enjoy it without hunting for a flaw.",
      work: "A concrete wish comes true — celebrate the achievement without discounting it.",
      path: "The wellbeing you feel is real and earned — full gratitude is a valid spiritual state on its own.",
    },
    reversed: {
      love: "Surface-level satisfaction is masking a deeper emotional need that's still unresolved.",
      work: "Material success doesn't fill a gap that actually wanted something else — check what you were really after.",
      path: "Complacency stops your growth cold — fulfilled pleasure shouldn't become the ceiling of your path.",
    },
    bridge: "The Nine of Cups is water that knows it's full — feeling satisfied enough to celebrate without needing to justify it.",
  },
  "cups-10": {
    name: "Ten of Cups",
    keywords: ["family fulfillment", "harmony", "shared happiness", "fulfilled sky"],
    essence:
      "A rainbow of ten cups arcs over a family celebrating in an embrace below. Water reaching its fullest channel — happiness that holds because it's shared.",
    upright: {
      love: "Deep, lasting harmony fills the bond — enjoy this fullness as the fruit of what you built together.",
      work: "The balance between work and personal life finally feels sustainable and real.",
      path: "You reach a sense of complete peace — this is the emotional cycle fulfilled in its most generous form.",
    },
    reversed: {
      love: "A picture-perfect family image hides cracks that need honest attention, not just a harmonious surface.",
      work: "The balance you were chasing breaks when one part of your life demands more than the other can give.",
      path: "Mistaking outward harmony for inner peace leaves you performing wellbeing instead of actually feeling it.",
    },
    bridge: "The Ten of Cups is water overflowing into shared abundance — feeling fulfilled through real community.",
  },
  "cups-page": {
    name: "Page of Cups",
    keywords: ["sensitivity", "emotional messenger", "tender creativity", "new intuition"],
    essence:
      "He stares, startled, at a fish poking out of his cup, as if the emotional life keeps revealing secrets he never expected. This is sensitivity just starting to explore what it even feels.",
    upright: {
      love: "A tender, slightly shy feeling wants expression — don't dismiss it just because it feels new or vulnerable.",
      work: "A creative idea arrives from intuition rather than analysis — give it room before you rationalize it to death.",
      path: "Your sensitivity is a doorway, not a weakness — let yourself be surprised by what you're still learning to feel.",
    },
    reversed: {
      love: "Sensitivity turns into shutdown when you're afraid to show what you feel — one small step toward openness helps.",
      work: "A creative idea stays undeveloped out of fear it isn't serious or professional enough.",
      path: "Suppressing what you feel out of discomfort pulls you away from an intuition that was just about to teach you something.",
    },
    bridge: "The Page of Cups is master number eleven turned novice feeling — the emotional teacher-in-waiting only just learning to listen to itself.",
  },
  "cups-knight": {
    name: "Knight of Cups",
    keywords: ["romanticism", "proposal", "idealism", "advancing with the heart"],
    essence:
      "He rides slowly, cup held up like an offering. This is water in motion — not fire's rush, but the care of someone carrying something that genuinely matters to them.",
    upright: {
      love: "A romantic gesture or a meaningful offer is approaching — receive it with the same gentleness it arrives in.",
      work: "An offer or collaboration comes with real, good intentions behind it — trust the sincerity of the gesture.",
      path: "Your idealism moves you forward heart-first — that doesn't make you naive, it makes you loyal to yourself.",
    },
    reversed: {
      love: "Pretty promises aren't always followed by real action — watch what gets done, not just what gets said.",
      work: "An offer that looks great on the surface hides unclear terms — check the fine print before committing.",
      path: "Idealism without action stays pure fantasy — let feeling translate into something concrete too.",
    },
    bridge: "The Knight of Cups is water advancing carefully — feeling moving toward someone else without losing its tenderness.",
  },
  "cups-queen": {
    name: "Queen of Cups",
    keywords: ["deep empathy", "mature intuition", "compassion", "healthy emotional boundaries"],
    essence:
      "She holds a closed cup, unlike everyone else's, studying it with total focus. This is water that learned to contain its own depth without drowning itself, or anyone nearby.",
    upright: {
      love: "Your capacity to feel and hold others with real empathy is a gift — offer it without losing yourself inside it.",
      work: "Your sensitivity toward the team or clients becomes a genuine professional strength, not something to hide.",
      path: "You've learned to feel deeply without overflowing — that's a mature form of emotional wisdom.",
    },
    reversed: {
      love: "You absorb everyone else's emotions until you lose track of your own — set a compassionate boundary.",
      work: "Emotional overload from the environment overwhelms you — you need space to process before holding anyone else up.",
      path: "Caring for others so much that you forget to care for yourself drains the very well you draw from.",
    },
    bridge: "The Queen of Cups is water matured into presence — feeling that holds depth without spilling or sealing shut.",
  },
  "cups-king": {
    name: "King of Cups",
    keywords: ["emotional balance", "wisdom of the heart", "calm under pressure", "compassionate leadership"],
    essence:
      "He sits calm on a throne floating over choppy water. This is water mastering its own tide — feeling everything without being swept away by any of it.",
    upright: {
      love: "You bring emotional stability to the bond, able to hold even the intense moments without overflowing.",
      work: "You lead with real emotional intelligence — listening before reacting builds genuine trust.",
      path: "You've integrated your emotional world with your reason — this calm isn't coldness, it's mastery earned over time.",
    },
    reversed: {
      love: "The calm you show outside hides an inner tide you're not fully allowing yourself to feel.",
      work: "Subtle emotional manipulation disguises itself as serenity — check if your control is balance or avoidance.",
      path: "Suppressing what you feel behind a mask of calm disconnects you from your own real emotional wisdom.",
    },
    bridge: "The King of Cups is water at full mastery — feeling that governs its own tide without ever denying it.",
  },
};
