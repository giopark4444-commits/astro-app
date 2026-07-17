// packages/core/src/tarot/content-en.ts
// Tarot content (EN): data only; content-es.ts is the engine — same import
// direction as horoscope (es -> en imports types only, no runtime cycle).
// Voice: evolutionary, second person, no fatalism, concrete imagery — the
// same Aluna voice as ES, written fresh in English, never a literal
// translation of the Spanish copy.
import type { TarotCardContent, ReadingComposeDicts } from "./content-es";

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
    bridge: "The Wheel carries Jupiter's expansion — every turn, sooner or later, swings more fortune in than it carried out.",
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
      "What the lightning finds was already hollow; the strike only makes it public. When the Tower goes down it takes the false floor with it — and loud as the crash is, notice what's still standing afterward: you, closer to solid ground than you've been in years.",
    upright: {
      love: "The illusion cracked, not the love underneath it. Now you finally get to see which of the two you'd been living in.",
      work: "Better to learn the plan had no footing today than after building three more floors on top of it. Salvage what's true; let the rest fall.",
      path: "This isn't ruin — it's a forced awakening. Ground zero is also the first honest ground you've stood on in a long time.",
    },
    reversed: {
      love: "You already know which conversation you're postponing. The longer the fuse, the bigger the blast — light it yourself, gently, now.",
      work: "Living around the crack doesn't make the structure sound. Open up the wall on your own schedule, before it chooses one for you.",
      path: "The calm you're guarding is held together with tape. Let one small thing fall, and notice how much sturdier the rebuild feels.",
    },
    bridge: "The Tower carries the fire of Mars — the blow that breaks a false thing open so the truth finally has a door.",
  },
  star: {
    name: "The Star",
    keywords: ["hope", "healing", "trust", "renewal"],
    essence:
      "One foot on the grass, one in the pool, and the jug keeps giving. This is what hope looks like once it has survived something: unhurried, undramatic, sure that the well is deeper than the damage ever was.",
    upright: {
      love: "You've started trusting again — not because anyone promised you safety, but because staying closed was costing more. It's working. Keep going.",
      work: "Out of that loss, something is quietly taking root and reaching for light. Judge it in a season, not a week — for now, just keep watering.",
      path: "This kind of faith asks for no proof. It's the calm that settles in once you realize the storm actually ended.",
    },
    reversed: {
      love: "Look again: part of what you're mourning has already begun to mend. The small light is back — you've just been too tired to notice it.",
      work: "The moment before something blooms is exactly when quitting feels most reasonable. Don't. Hold the thread one more week.",
      path: "Hope didn't leave; you've only stopped looking where it lives. Lift your eyes — the sky kept every one of its stars.",
    },
    bridge: "The Star carries the visionary air of Aquarius — hope wide enough to hold a future no one has dared to picture yet.",
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
      love: "Shapes are coming back as the fog thins — and some of what frightened you turns out to be a coat on a chair.",
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
      love: "There's real brightness on offer here, but it can't reach you through a painted-on smile. Say the heavy thing first — the light follows.",
      work: "Measured against fantasy, every real win loses. Measure it against where you started instead, then celebrate accordingly.",
      path: "You're allowed a cloudy day. Manufactured cheer drains twice what honest sadness costs — feel the true weather, and it passes sooner.",
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
      love: "You're tired for good reason — you've given real things. But this bond has one more deliberate effort left in it, and so do you.",
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
      love: "Something new is filling the cup, and it doesn't owe you an explanation. Feel it first; the analysis can wait its turn.",
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
      love: "The stability is real and something in you is still unsatisfied. That restlessness isn't betrayal — it's the most honest voice in the room.",
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

  "swords-01": {
    name: "Ace of Swords",
    keywords: ["clarity", "truth", "mental breakthrough", "clean cut"],
    essence:
      "A crowned blade rises straight out of the cloud, and everything blurry snaps into focus. This is thought at its sharpest — the single insight that slices through noise and shows you exactly what's real.",
    upright: {
      love: "Something needs saying plainly. Skip the cushioning — clarity, even when it stings, is the kindest thing here.",
      work: "An idea lands with real edge to it. Use it to cut away what isn't working, not to wound anyone unnecessarily.",
      path: "You're seeing something with a sharpness you haven't had before. Trust that cut.",
    },
    reversed: {
      love: "Precision was the assignment, but the blade came down harder than the moment called for. Truth wielded as a weapon clarifies nothing.",
      work: "The clarity you thought you had turns out to be partial. Check the whole picture before you cut anything.",
      path: "A mind without direction turns its blade on itself. Even a sharp mind needs somewhere to point.",
    },
    bridge: "The Ace of Swords is air at its rawest — a mind that cuts before it even knows which way it's aiming.",
  },
  "swords-02": {
    name: "Two of Swords",
    keywords: ["indecision", "tense standoff", "chosen blindness", "forced balance"],
    essence:
      "Blindfolded, arms crossed, two blades held level against her chest. Neither option is painless, so she's stopped choosing at all — and calling the stalemate peace doesn't make it one.",
    upright: {
      love: "Both doors cost something, so you've stopped standing in front of either. Start smaller: describe the crossroads to someone. Out loud counts as motion.",
      work: "That careful stalemate takes real effort to maintain. Spend the effort on choosing instead — a truce was never meant to become an address.",
      path: "The blindfold works: it does block the pain. It also blocks the road. You can't keep the first benefit without paying the second cost.",
    },
    reversed: {
      love: "Off comes the blindfold — and the truth, seen straight on, turns out gentler than the years you spent bracing for it.",
      work: "The scale tipped on its own: one option started costing you sleep and the other started looking like relief. That's your answer.",
      path: "What you were calling balance was just parking. The engine still runs — looking directly at the choice is how it starts.",
    },
    bridge: "The Two of Swords is air locked in tension — a mind holding two truths, unwilling yet to pick either one.",
  },
  "swords-03": {
    name: "Three of Swords",
    keywords: ["heartbreak", "disillusionment", "cutting truth", "pierced heart"],
    essence:
      "Rain, a gray sky, and a heart holding three blades — the deck's most honest picture of hurt. Nothing here asks you to dramatize the pain, and nothing lets you argue it away. The assignment is harder and simpler: feel it all the way through, because that's the only road any wound has ever taken toward closing.",
    upright: {
      love: "Whatever went through you — the betrayal, the ending, the sentence you can't unhear — deserves real tears, not a brave face. Grief that gets felt is grief that ends.",
      work: "That rejection stings deeper than logic says it should. It isn't weakness; it's the exact measure of how much you'd invested.",
      path: "The wound finally got its true name today. Naming it hurt — and it's also the first thing that has actually helped.",
    },
    reversed: {
      love: "The ache is quieter than it was. Don't rush the scar, but stop testing it, too — it has permission to fade.",
      work: "That old disappointment has been paid in full. You can put down the receipt now.",
      path: "Every time you reopen the cut to check whether it still hurts, it does. Leave it closed today, and see what grows over it.",
    },
    bridge: "The Three of Swords is air reaching the heart — the suit's hardest truth, and its cleanest, because it dresses the wound in nothing but rain.",
  },
  "swords-04": {
    name: "Four of Swords",
    keywords: ["rest", "retreat", "recovery", "necessary pause"],
    essence:
      "A knight lies still on a tomb, three swords mounted above, one held close. This isn't surrender — it's a mind finally allowing itself to stop moving long enough to actually recover.",
    upright: {
      love: "Quiet together is still together. Some seasons of a bond are for talking things through; this one is for resting side by side.",
      work: "You can't sharpen a blade while you're swinging it. Step off the field — today's stillness is tomorrow's edge.",
      path: "This is retreat as maintenance, not as defeat. Even your mind has the right to lie down somewhere safe.",
    },
    reversed: {
      love: "Rest was the medicine, and every medicine has a dose. Check whether you're still recovering, or just hiding in the infirmary.",
      work: "The pause did its work — the thinking is clear again. Get up before comfort turns the bed into a bunker.",
      path: "Solitude healed you; don't let it start keeping you. There's a door in this room, and it opens from the inside.",
    },
    bridge: "The Four of Swords is air gone still — a mind stepping back so it can think with a sharper edge afterward.",
  },
  "swords-05": {
    name: "Five of Swords",
    keywords: ["hollow victory", "conflict", "wounded pride", "the cost of winning"],
    essence:
      "The field is his, the swords are his — and everyone who might have shared the victory is walking away. The Five of Swords never says you were wrong. It asks a colder question: was being right worth the empty field?",
    upright: {
      love: "You can take the point or keep the person; today those may be different choices. Decide knowing which one still keeps you warm tonight.",
      work: "The ruling went your way and the room went quiet. Wins that silence a team have a way of sending the invoice later.",
      path: "Notice how alone the summit of 'I told you so' turns out to be. Some victories are just defeats with better posture.",
    },
    reversed: {
      love: "The apology you're drafting is worth more than the argument you won. Deliver it before the interest accrues.",
      work: "You've run the numbers on that conflict and they don't lie: it cost more than it paid. Rebuilding is the profitable move now.",
      path: "One by one, you're handing back the swords you collected. It turns out peace weighs less than trophies.",
    },
    bridge: "The Five of Swords cuts without care — a mind that wins the argument and loses the connection.",
  },
  "swords-06": {
    name: "Six of Swords",
    keywords: ["transition", "moving on", "calmer waters", "quiet forward motion"],
    essence:
      "You can see the smoother water from the boat — that's the whole promise of this card. No far shore guaranteed, only this: the oars are moving, the worst is behind the stern, and the crossing itself is doing quiet repair work on everyone aboard.",
    upright: {
      love: "The two of you are pulling out of the rough stretch. It won't feel like arrival yet — crossings never do — but the water calms a little every day, and that's the only sign you need.",
      work: "The move from the tense place to the steadier one is underway. Ferry speed, not flight speed. Let it be slow and right.",
      path: "Leaving what hurt requires neither a backward glance nor a justification. The current already agrees with you.",
    },
    reversed: {
      love: "You know it's time, and the rope is still tied. Every day spent watching the shore is a day the calm water waits without you.",
      work: "The course correction is overdue and you're still negotiating with it. Storms don't improve by being sat in longer.",
      path: "Familiar pain keeps a strange kind of hold. But the ferry runs daily — feeling ready is not required. Boarding is.",
    },
    bridge: "The Six of Swords is air finally in motion — a mind leaving the storm behind with a heading, even an uncertain one.",
  },
  "swords-07": {
    name: "Seven of Swords",
    keywords: ["strategy", "stealth", "questionable shortcut", "self-reliance"],
    essence:
      "Five swords in his arms, two left standing in the ground, one last glance over the shoulder. This isn't a villain's card — it's what cleverness looks like when it stops auditing its own motives. The plan might be brilliant; the backward glance says even he isn't sure it was clean.",
    upright: {
      love: "Keeping part of yourself in reserve can be wisdom or evasion — the test is whether you'd admit it out loud if asked directly.",
      work: "Playing your own angle quietly is fair, up to a line. Know exactly where that line runs before you find yourself standing on it.",
      path: "Handling everything alone reads as strength from the outside. From the inside, check how often it's really the fear of owing anyone anything.",
    },
    reversed: {
      love: "The half-truth found its way to daylight, as they tend to. What repairs things now isn't an explanation — it's the whole story, told plainly.",
      work: "The clever route got exposed. Good: now you can rebuild on ground that actually bears weight.",
      path: "You've set the tricks down and asked for help in plain words. That isn't surrender — it's the strongest move left on the board.",
    },
    bridge: "The Seven of Swords is air in stealth — a strategist sharp enough to find every shortcut, wise only on the days it counts the cost.",
  },
  "swords-08": {
    name: "Eight of Swords",
    keywords: ["mental entrapment", "self-limitation", "perception", "possible freedom"],
    essence:
      "Ropes, blindfold, a fence of blades — and every restraint in the picture would fail the first real test. The Eight of Swords is the mind as its own jailer: the cell gets described so vividly, so often, that nobody ever thinks to try the door.",
    upright: {
      love: "The pattern feels sealed on every side, but that map was drawn by fear, not by fact. Push on one wall of it — just one — and feel it give.",
      work: "'I have no options' is a sentence, not a finding. Somewhere in this situation sits a move you dismissed without ever actually testing it.",
      path: "The story you keep telling about yourself has hardened into a fence. You wrote it — you still hold the editing rights.",
    },
    reversed: {
      love: "Seeing that most of the trap was your own knots doesn't shame you; it frees you. What was self-tied comes undone the same way.",
      work: "You asked 'says who?' about the old limitation, and nobody answered. That silence was the sound of the door opening.",
      path: "Off comes the blindfold you wove from an old story. Freedom hadn't moved an inch — it was waiting on your eyes.",
    },
    bridge: "The Eight of Swords is air tangled in itself — a mind that binds itself with stories tighter than any real rope.",
  },
  "swords-09": {
    name: "Nine of Swords",
    keywords: ["anxiety", "insomnia", "night fear", "mental weight"],
    essence:
      "Three in the morning, the house silent, and the mind wide awake, curating its museum of worst cases. Look closely at the card: the nine swords on the wall never actually touch her. That's its secret. The suffering is real — but its architect is the hour, not the facts.",
    upright: {
      love: "Run the fear through daylight before you believe it. The version keeping you awake is the least accurate one you own.",
      work: "The dread of the outcome is doing more damage than any outcome could. Say it to another person — worry spoken shrinks, worry hoarded compounds.",
      path: "You at midnight and you at noon are two different judges. Adjourn the trial until the honest one is on the bench.",
    },
    reversed: {
      love: "You finally said the fear out loud, and it did what fears do in open air: got smaller.",
      work: "Morning came, the problem held still, and it turned out to have a handle you couldn't see in the dark.",
      path: "The weight lifts the moment it's shared — not because anyone solved it, but because carrying it alone was most of the weight.",
    },
    bridge: "The Nine of Swords is air closing in on itself at night — thought unspooling in the dark until first light calls its bluff.",
  },
  "swords-10": {
    name: "Ten of Swords",
    keywords: ["painful ending", "surrender", "rock bottom", "dawn after"],
    essence:
      "It looks like the worst card in the deck, and in one sense it is: flat on the ground, ten blades, nothing left to argue about. But check the sky — it's already turning gold at the edge. A true ending carries one strange mercy: it cannot get worse, which means every direction from here is up.",
    upright: {
      love: "This one is over — fully, past negotiating. The kindness hidden inside that finality is that you can stop hoping sideways and start healing forward.",
      work: "The project didn't stumble; it ended. Call it, close the file, and keep your energy for what's next instead of standing guard over a finished thing.",
      path: "A real bottom offers one gift no other place does: solid ground. Stand on it. That light at the horizon isn't a metaphor — it's morning.",
    },
    reversed: {
      love: "You're up on one elbow, then on your feet. Slow counts. After an ending like that, slow is the only honest speed.",
      work: "You've taken inventory of the rubble and some of it still holds. Rebuilding from zero is brutal — and clean. Mostly clean.",
      path: "The only blade still hurting you is the refusal to admit it's finished. Pull that one out yourself, and the dawn does the rest.",
    },
    bridge: "The Ten of Swords is air spent to its last cut — the mind's long night ending exactly where the sky begins to pale.",
  },
  "swords-page": {
    name: "Page of Swords",
    keywords: ["alert curiosity", "mental messenger", "vigilance", "apprentice of truth"],
    essence:
      "Wind everywhere, sword up, eyes darting. The Page of Swords wants to know everything and hasn't yet learned which parts are worth knowing — all the makings of a sharp mind, with the sieve for sorting truth from noise still on order.",
    upright: {
      love: "A blunt conversation may land out of nowhere. Hear it all the way through — curiosity first, verdict later.",
      work: "Chase the new idea the way a good student would: with questions, not conclusions. Not knowing yet is the correct starting position.",
      path: "Watchfulness is a gift when it observes and a liability when it assumes. Practice telling those two apart in real time.",
    },
    reversed: {
      love: "The remark flew out faster than the thought behind it. Next time, let the sentence finish forming before it leaves.",
      work: "You acted on something you'd heard but never checked. The verification would have cost a minute; the correction is costing more.",
      path: "A mind still learning to filter needs quiet more than it needs opinions. Sit with the signal before ruling on the noise.",
    },
    bridge: "The Page of Swords is master number eleven turned apprentice — the thinker-in-waiting still learning to tell rumor from truth.",
  },
  "swords-knight": {
    name: "Knight of Swords",
    keywords: ["direct action", "mental impatience", "verbal charge", "unfiltered advance"],
    essence:
      "Horse at full stretch, sword already committed, terrain unread. The Knight of Swords owns the fastest mind in the deck and the shortest distance between thinking a thing and saying it — his gift and his bill, always arriving together.",
    upright: {
      love: "Your honesty travels at full gallop. It can arrive as a gift — if you saddle it with a little gentleness first.",
      work: "The decision is already clear in your head; now speed becomes a virtue. Ride, while others are still clearing their throats.",
      path: "Conviction like yours covers ground fast. Just glance down now and then — make sure the cause is worth the horse.",
    },
    reversed: {
      love: "The sentence left the stable before the thought did, and it drew blood you never intended. Rein in first; speak second.",
      work: "You charged the room and flattened someone mid-sentence. Speed that costs you listeners isn't speed — it's spillage.",
      path: "Not every hill deserves a cavalry charge. Discernment is knowing which battles merit the horse and which merely startled it.",
    },
    bridge: "The Knight of Swords is air already galloping without brakes — a mind confusing speed with certainty.",
  },
  "swords-queen": {
    name: "Queen of Swords",
    keywords: ["sharp clarity", "independence", "unadorned truth", "firm boundaries"],
    essence:
      "She has seen every trick and heard every excuse, and she's done pretending otherwise — that's what the raised blade means. The Queen of Swords loves precisely: no flattery, no fog. People call it coldness right up until the day they need someone who will simply tell them the truth.",
    upright: {
      love: "Name what you need without wrapping it in apology. Coming from you, plain speech is a form of respect.",
      work: "You've read the situation correctly and the reading is unpopular. Deliver it anyway — the clarity is what they'll thank you for later.",
      path: "Thinking for yourself was never the opposite of feeling deeply. You've simply refused to let either one blur the other.",
    },
    reversed: {
      love: "Somewhere along the way the scalpel became a saber. Truth loses no precision by being warmed first — it only gains reception.",
      work: "When every observation arrives as a correction, people stop hearing any of them. Save the blade for cuts that matter.",
      path: "The intellect makes a fine tower and a lonely home. Precision was meant to serve connection, not to replace it.",
    },
    bridge: "The Queen of Swords is air made mature presence — a mind that cuts with precision without losing its own center.",
  },
  "swords-king": {
    name: "King of Swords",
    keywords: ["intellectual authority", "fair judgment", "objectivity", "truth with power"],
    essence:
      "The sword points straight up: no angle, no agenda. The King of Swords rules by a standard he applies to himself first, and his authority holds because neither charm nor fear has ever moved his verdict an inch.",
    upright: {
      love: "You can name the hard thing without staging a scene around it. That steadiness is what makes the difficult conversations possible at all.",
      work: "Set the noise of the moment aside and rule on the facts. The team follows your judgment because it's earned, not asserted.",
      path: "Authority built on rigor needs no enforcement. That's the quiet difference between being obeyed and being trusted.",
    },
    reversed: {
      love: "You can win every argument and still lose the person. The bond needs your warmth on the bench, not just your logic.",
      work: "The gavel has started serving the chair instead of the court. Ask again whom your authority was meant to protect.",
      path: "A brilliant mind with a closed heart governs a shrinking kingdom. Mastery matures the day it remembers mercy.",
    },
    bridge: "The King of Swords is air at full mastery — a mind that governs with objectivity and never needs to raise its voice.",
  },

  "pentacles-01": {
    name: "Ace of Pentacles",
    keywords: ["opportunity", "material seed", "new resource", "concrete possibility"],
    essence:
      "Every fortune there has ever been started the way this card starts: one coin, one patch of good soil, one hand willing to plant instead of pocket. The Ace of Pentacles doesn't promise the harvest — it promises the ground is real.",
    upright: {
      love: "There's suddenly room to build here — the kind of bond that could hold a home, a plan, a future with actual walls. Take the first brick seriously.",
      work: "An offer with real substance just landed in your palm. Treat it like seed, not like winnings — planted things grow; clutched things don't.",
      path: "Tending your body, your savings, your ground — none of it is beneath your spirit. Matter is where the soul does its living.",
    },
    reversed: {
      love: "The stable thing offered itself, and you stepped back. Was that discernment, or an old distrust deciding on your behalf?",
      work: "Good seed, no furrow: the opportunity is expiring in your hand while the plan stays unwritten. Prepare the ground, or pass the seed along.",
      path: "Security chased without a why only weighs. Full hands, hollow center — check which of the two you've been filling.",
    },
    bridge: "The Ace of Pentacles is earth at its rawest — real possibility before you even know what it's going to yield.",
  },
  "pentacles-02": {
    name: "Two of Pentacles",
    keywords: ["juggling", "adaptability", "priorities", "balance in motion"],
    essence:
      "Watch his feet, not the coins — he's dancing. The Two of Pentacles gave up waiting for life to hold still and learned the truer skill instead: staying upright while everything keeps moving.",
    upright: {
      love: "Love is sharing the calendar with everything else this season. Don't aim for perfect halves; aim for a rhythm you can both actually keep.",
      work: "Several plates, all spinning, none on the floor — that isn't chaos, that's competence in motion. Enjoy your own footwork.",
      path: "Balance isn't a place you arrive at someday. It's this — the constant small corrections — and you're already doing it.",
    },
    reversed: {
      love: "One of the balls you're juggling is a person, and they can tell. Set something else down first.",
      work: "Quantity has started billing quality for the difference. The bravest professional move this week is subtraction.",
      path: "A juggler who never rests drops everything eventually. The rhythm itself is asking you to simplify before it decides for you.",
    },
    bridge: "The Two of Pentacles is earth in motion — matter that holds itself up by staying balanced, not by standing still.",
  },
  "pentacles-03": {
    name: "Three of Pentacles",
    keywords: ["collaboration", "mastery", "teamwork", "craft recognized"],
    essence:
      "In the cathedral, the mason listens as much as he carves — the plans belong to many hands. The Three of Pentacles is the moment skill stops being private: real craft grows fastest where someone else can see it, question it, and add to it.",
    upright: {
      love: "A goal built shoulder to shoulder will hold this bond up better than a hundred declarations. Pick the project and start mixing mortar.",
      work: "Around the right collaborators, your work rises past your solo ceiling. That's not diluted credit — that's how mastery is architected.",
      path: "Letting other skilled hands touch your craft refines the work and you at once. Apprenticeship never fully ends — that's the sacred part.",
    },
    reversed: {
      love: "You're each building from a different blueprint and calling it teamwork. Compare drawings before the walls meet crooked.",
      work: "The group effort is fraying — credit unshared, plans unspoken. Say the unsaid thing; scaffolding always fails silently first.",
      path: "A cathedral signed by one name is a monument to something other than craft. The mature builder carves 'we' into the stone.",
    },
    bridge: "The Three of Pentacles is earth built together — matter that becomes a work of craft when several hands hold it up.",
  },
  "pentacles-04": {
    name: "Four of Pentacles",
    keywords: ["control", "material security", "attachment", "fear of loss"],
    essence:
      "Count what the posture costs him: arms pinned around one coin, feet nailed down by two more, a fourth riding his head like a crown he can't remove. Four coins owned, not one of them usable — that's what fear does to wealth.",
    upright: {
      love: "Held gently, this bond would hold itself. Gripped, it starts quietly planning its exit. Loosen by one degree and notice what relaxes.",
      work: "Guarding your resources is sense; guarding them from everyone, always, is a cage with a budget. Audit what the control itself is costing.",
      path: "Wanting solid ground is human. Bolting yourself to it means the river of good things now flows past you instead of through.",
    },
    reversed: {
      love: "You unclenched, shared the ledger, opened the door a crack — and the bond got safer, not poorer. Keep going.",
      work: "The saved-for-never fund finally moved into something living. Calculated risk is just faith with arithmetic.",
      path: "Open hands lose nothing that mattered and catch everything that does. You're learning matter's oldest law: it circulates, or it dies.",
    },
    bridge: "The Four of Pentacles is earth held too tight — matter that, gripped out of fear, stops flowing and stops giving.",
  },
  "pentacles-05": {
    name: "Five of Pentacles",
    keywords: ["scarcity", "exclusion", "material hardship", "unseen shelter nearby"],
    essence:
      "Snow, bare feet, a crutch — and stained glass glowing warm one wall away. The Five of Pentacles tells the truth about hard times twice over: once about how cold they are, and once about how hardship narrows the eyes until help turns invisible. The door was never locked. Reaching it only requires looking up.",
    upright: {
      love: "Money trouble or illness is pressing on you both. What the bond needs first isn't a solution — it's the certainty that neither of you is out in the snow alone.",
      work: "The lean season is real, and pride makes a thin coat. Let the people who would gladly help actually find out that you need them.",
      path: "Being shut out is its own kind of cold. Scan the street again, slowly — one of those windows has been lit for you this whole time.",
    },
    reversed: {
      love: "You let someone past the pride, and discovered that receiving care is also a way of giving it.",
      work: "The frost is breaking. The recovery route you couldn't see from inside the crisis is drawing itself now, step by step.",
      path: "You finally knocked — and the warmth had been waiting, never withheld. All it ever lacked was your knock.",
    },
    bridge: "The Five of Pentacles is earth in winter — matter at its scarcest, teaching the hardest material skill: letting yourself be helped.",
  },
  "pentacles-06": {
    name: "Six of Pentacles",
    keywords: ["generosity", "fair exchange", "giving and receiving", "balance of power"],
    essence:
      "One hand gives; the other holds the scale — and the card insists you notice both. The Six of Pentacles was never about charity. It's about circulation: generosity that keeps flowing because somebody bothered to keep it fair.",
    upright: {
      love: "Today the ledger of this bond balances — what you offer returns, and what you receive was offered freely. Rare enough to say thank you for, out loud.",
      work: "Sharing what you know or have doesn't shrink your position; it compounds it. Generosity, practiced deliberately, is a strategy.",
      path: "You have surplus right now — hands, money, attention. Give from the full shelf, and watch that the giving never turns into a throne.",
    },
    reversed: {
      love: "One of you has become the permanent donor. Affection with a running tab isn't generosity — read the balance aloud together.",
      work: "Help that arrives with invisible strings is a leash with good manners. Check the fine print on what you give and on what you accept.",
      path: "If being needed is the payment you're collecting, the gift was never free. Give what you'd still give with nobody watching.",
    },
    bridge: "The Six of Pentacles is earth circulating fairly — matter shared without losing its own balance.",
  },
  "pentacles-07": {
    name: "Seven of Pentacles",
    keywords: ["patience", "assessment", "long-term investment", "active waiting"],
    essence:
      "The hoe rests; the farmer doesn't leave. Between planting and picking there's a third season nobody romanticizes — standing in the field, taking honest stock, resisting the urge to tug the fruit ripe. The Seven of Pentacles lives there.",
    upright: {
      love: "This bond is mid-season: too rooted to abandon, too green to judge. Tend it, and give it the year it's asking of you.",
      work: "First fruit is showing on a long investment. Don't harvest early and don't walk away — the discipline now is simply to continue.",
      path: "Measure your growth the way orchards get measured — against last season, never against someone else's summer.",
    },
    reversed: {
      love: "You're calling it stalled because it isn't instant. Check the roots before you pull them — this may simply be growing at the speed of real things.",
      work: "Honest audit time: is the crop slow, or is the soil wrong? They look identical from a distance. Get closer before deciding.",
      path: "Quitting in month eleven of a twelve-month bloom is the oldest mistake in the garden. Frustration is loudest right before fruit.",
    },
    bridge: "The Seven of Pentacles is earth in active pause — matter growing slowly, asking for an honest look before the next move.",
  },
  "pentacles-08": {
    name: "Eight of Pentacles",
    keywords: ["mastery", "dedication", "meticulous work", "craft refinement"],
    essence:
      "Six coins hung and finished, a seventh on the bench, his eyes nowhere but the work. The Eight of Pentacles knows the secret nobody wants to hear: mastery is just repetition that refused to get bored.",
    upright: {
      love: "At this stage, love is a practice — the daily gesture made with care, again, because it matters. Craft counts as romance.",
      work: "Head down, standard up. Every repetition you polish today gets quietly welded into tomorrow's reputation.",
      path: "Devotion doesn't require incense. A task done completely, with your whole attention, prays just as well.",
    },
    reversed: {
      love: "The technique is flawless and the person is lonely. Look up from the workbench — the connection was the actual commission.",
      work: "Polishing pass number forty is hiding fear, not adding value. Ship it at excellent; perfect never clocks out.",
      path: "A rehearsal that never opens is a fear with good discipline. The work is ready enough — the missing ingredient was the world.",
    },
    bridge: "The Eight of Pentacles is earth worked with dedication — matter refined through repeated, conscious practice.",
  },
  "pentacles-09": {
    name: "Nine of Pentacles",
    keywords: ["self-sufficiency", "earned abundance", "solitary pleasure", "full independence"],
    essence:
      "The vineyard took years; the ease took longer. She walks her own rows in silk not because anyone provided, but because she planted, waited, and stayed. The falcon returns to her wrist for the same reason the abundance did: discipline, worn lightly.",
    upright: {
      love: "You're not waiting to be completed — you're whole and pleasantly busy. Whoever arrives now joins a garden, not a vacancy.",
      work: "This harvest has your name on every row. Walk it slowly — savoring what you built is part of the building.",
      path: "Earned solitude tastes nothing like loneliness; it tastes like your own grapes. Independence this deliberate is a form of peace.",
    },
    reversed: {
      love: "The garden wall has grown taller than the garden. Check whether you're protecting your peace or just rehearsing your solitude.",
      work: "A toast with no glasses raised beside it goes flat fast. Success shared loses nothing but its echo.",
      path: "Never needing anyone is its own quiet poverty. The gate can stay yours and still stand open.",
    },
    bridge: "The Nine of Pentacles is earth at full harvest — matter enjoyed by the one who cultivated it with her own hands.",
  },
  "pentacles-10": {
    name: "Ten of Pentacles",
    keywords: ["legacy", "family abundance", "lasting stability", "material culmination"],
    essence:
      "An old man, his grandchildren, dogs that trust the household — wealth so settled it has become scenery. The Ten of Pentacles is what remains once the builder stops being the point: abundance with more than one name on it.",
    upright: {
      love: "What the two of you are building has load-bearing walls — sturdy enough for others to shelter under, now and later. That's the real measure.",
      work: "This one will outlive the effort that made it. You didn't just finish a project; you planted an institution.",
      path: "Legacy is the part of your work that keeps working after you stop. Count what you're leaving open for the ones coming behind you.",
    },
    reversed: {
      love: "An old family pattern is leaning its weight on the new house. Name which inheritance you're repeating before it settles into the foundation.",
      work: "Short-term choices are quietly mortgaging a long-term structure. Refinance now, while the cracks are still hairline.",
      path: "A legacy kept in a vault stops being alive. Even permanence needs pruning — renew it, or it becomes a museum.",
    },
    bridge: "The Ten of Pentacles is earth at its generational culmination — matter that becomes legacy once it outgrows whoever planted it.",
  },
  "pentacles-page": {
    name: "Page of Pentacles",
    keywords: ["diligent student", "practical curiosity", "material messenger", "apprentice of the earth"],
    essence:
      "To anyone else it's a coin; to her it's a curriculum. The Page of Pentacles holds the gold up to the light not to spend it but to understand it — a student who already suspects that every dream comes with a syllabus, and that the first assignment is showing up.",
    upright: {
      love: "Someone's interest here is unhurried and serious — a learner's love, still early. Grade it on the commitment shown, and give it a full semester.",
      work: "New field, new notebook. Be a beginner on purpose: humility at the start is the raw material competence is made of.",
      path: "Studying the tangible — money, soil, skill — is not the lesser path. Spirit majors in matter too.",
    },
    reversed: {
      love: "A syllabus full of promises, no homework handed in. Watch what gets done by Friday, not what gets pledged on Monday.",
      work: "The idea has been 'almost started' for a while now. Theory without repetitions is a hobby — open the workbook.",
      path: "The lesson has been sitting on your desk, dated and ready. Procrastination is just fear with a planner. Do today's page today.",
    },
    bridge: "The Page of Pentacles is master number eleven turned apprentice — the material master-in-waiting, still studying how to plant her own future.",
  },
  "pentacles-knight": {
    name: "Knight of Pentacles",
    keywords: ["steadiness", "method", "sustained effort", "reliability"],
    essence:
      "No knight in the deck moves slower; none arrives more often. Horse and rider stand like a single statue over the furrows — not stuck, calibrating. The Knight of Pentacles wins by the one strategy nobody can counter: he does not stop.",
    upright: {
      love: "Your steadiness is the grand gesture. Showing up, again, on the gray days too — few loves are built from rarer material.",
      work: "The tortoise strategy is currently the winning one. Hold the pace; the flashier competitors are burning out all around you.",
      path: "A discipline kept daily is a monastery without walls. Your slow road is sacred precisely because you're still on it.",
    },
    reversed: {
      love: "Routine with the intention drained out is just repetition wearing love's uniform. Re-choose it — or change it.",
      work: "The method has become the master. When the field changes and the furrow doesn't, diligence turns into digging in.",
      path: "Ask the pace where it's going. A steady march with no destination is only discipline in costume.",
    },
    bridge: "The Knight of Pentacles is earth advancing without hurry — matter that trusts the steady step over the gallop.",
  },
  "pentacles-queen": {
    name: "Queen of Pentacles",
    keywords: ["practical care", "earthly abundance", "tangible generosity", "wisdom of the body"],
    essence:
      "Her throne sits in the garden, not above it — carved with fruit, ringed by soil that clearly knows her hands. The Queen of Pentacles keeps the realest kind of temple: soup on the stove, a bed made up, a warm coat in your size. Care you can hold.",
    upright: {
      love: "You love in the tangible tense — meals, order, a presence people can set their watch by. Don't mistake it for lesser romance; it's the kind that houses people.",
      work: "Holding the projects and the people at once is your particular genius. Administer the way you already nurture — same skill, wearing a suit.",
      path: "Your altar is the kitchen table, the tended body, the ordinary done with love. Ground-level devotion is still devotion.",
    },
    reversed: {
      love: "Everyone in your care is thriving except the caretaker. Put your own name back on the list you manage so well.",
      work: "You've become the infrastructure for everyone's everything. Delegating isn't abdication — it's how the garden survives the gardener's rest.",
      path: "Your output was never your worth. The body keeping all of this running is owed the same tenderness it distributes.",
    },
    bridge: "The Queen of Pentacles is earth made mature presence — matter that nurtures generously without neglecting its own root.",
  },
  "pentacles-king": {
    name: "King of Pentacles",
    keywords: ["prosperity", "steady leadership", "consolidated abundance", "grounded generosity"],
    essence:
      "The vines behind the throne hang heavy because he was patient decades before he was rich. The King of Pentacles never gambled his way here — he compounded: effort, seasons, judgment, repeat. And the empire's truest luxury now is how much of it he gives away.",
    upright: {
      love: "Your love shows up in load-bearing ways — security felt, promises kept, a presence that doesn't wobble. In a bond, that is wealth.",
      work: "You lead the way good soil leads: quietly, by making everything planted in you grow. Prosperity that lifts others is the only kind that compounds.",
      path: "Abundance matured into generosity in you — the surest sign it's real. What you can share without shrinking, you actually own.",
    },
    reversed: {
      love: "The portfolio is thriving and the person beside you is lonely. Some dividends only pay out in presence.",
      work: "Power that once grew things has started fencing them in. Ask what the empire is for, or it becomes only a wall.",
      path: "Read your worth off the wrong ledger and you'll be rich and hungry at once. The deepest accounts issue no statements.",
    },
    bridge: "The King of Pentacles is earth at full mastery — consolidated matter that knows how to hold and how to share.",
  },
};

// composeReadingProse's fixed EN phrases and position labels. The engine
// (composeReadingProse / composeReadingWith) lives in content-es.ts; this file
// only exports data, same direction as the rest of this module. v2 (T3): the
// EN connective text below is written with its own sentence architecture —
// different clause order and sentence counts from the ES originals — per the
// lesson from T1 (Sonnet mirrors structure when it merely translates).
const READING_POSITION_LABELS_EN: Record<string, string> = {
  day: "today",
  past: "the past",
  present: "the present",
  future: "the future",
  heart: "the heart of the matter",
  crossing: "what crosses your path",
  foundation: "the root of the situation",
  crown: "what crowns the matter",
  self: "your own view",
  environment: "your surroundings",
  "hopes-fears": "your hopes and fears",
  outcome: "the possible outcome",
};

const READING_ORDINALS_EN: readonly string[] = [
  "the first card",
  "the second card",
  "the third card",
  "the fourth card",
  "the fifth card",
  "the sixth card",
  "the seventh card",
  "the eighth card",
  "the ninth card",
  "the tenth card",
];

export const DICTS_READING_EN: ReadingComposeDicts = {
  positionLabels: READING_POSITION_LABELS_EN,
  ordinals: READING_ORDINALS_EN,
  elementLabels: { fire: "fire", water: "water", air: "air", earth: "earth" },
  t: {
    openingWithQuestion: (question) =>
      `Before we begin, hold your question lightly: "${question}". What follows won't hand you a verdict — it will show you where you already stand.`,
    openingDefault: () => "Something in you already knows why you're here. The cards simply give it a shape you can look at.",
    climate: ({ dominantElementLabel, reversedCount, total, majorsCount }) => {
      const sentences: string[] = [];
      if (dominantElementLabel) {
        sentences.push(
          `${dominantElementLabel[0]!.toUpperCase()}${dominantElementLabel.slice(1)} runs through this spread more than any other force.`,
        );
      } else if (majorsCount === total) {
        sentences.push("Major arcana carry the whole spread today.");
      } else {
        sentences.push("No single force leads here — the spread mixes its currents.");
      }
      if (reversedCount === 0) sentences.push("Not one card fell reversed.");
      else if (reversedCount === total) sentences.push("Every card fell reversed.");
      else sentences.push(`${reversedCount} of ${total} cards fell reversed.`);
      return sentences.join(" ");
    },
    sceneParagraphs: [
      (cardName, positionLabel, essence) => `Where ${positionLabel} sits, ${cardName} has settled in. ${essence}`,
      (cardName, positionLabel, essence) => `For ${positionLabel}, the deck offers ${cardName}. ${essence}`,
      (cardName, positionLabel, essence) => `${essence} That's the scene ${cardName} sets over ${positionLabel}.`,
      (cardName, positionLabel, essence) => `${positionLabel} belongs to ${cardName} right now. ${essence}`,
    ],
    ambitParagraphs: [
      (ambitText, question) => (question ? `${ambitText} Hold that next to "${question}" and see how it lands.` : ambitText),
      (ambitText, question) =>
        question ? `${ambitText} That's already an answer to "${question}", even if it isn't the one you expected.` : ambitText,
      (ambitText, question) =>
        question ? `${ambitText} If "${question}" has an answer at all, this is where it starts.` : ambitText,
    ],
    bridgeParagraphs: [
      (bridge) => `Astrology tells the same story from a different angle: ${bridge}`,
      (bridge) => `${bridge} That's what holds this card up from underneath.`,
      (bridge) => `This isn't just poetry — ${bridge}`,
      (bridge) => `And stripped of all symbolism, it comes down to this: ${bridge}`,
    ],
    jumpersIntro: () =>
      "Before the spread was even laid, a card or two jumped out of the deck on their own. Set them apart and hear them out — they came uninvited for a reason.",
    jumperParagraphs: [
      (cardName, essence, ambitText) =>
        `Of everything in the deck, it was ${cardName} that couldn't stay put. ${essence} ${ambitText}`,
      (cardName, essence, ambitText) =>
        `${cardName} came out before you ever reached for it — take that as insistence. ${essence} ${ambitText}`,
      (cardName, essence, ambitText) => `And then there's ${cardName}, arriving off-script. ${essence} ${ambitText}`,
    ],
    closingSuitRepeat: (elementLabel) =>
      `One more thing before you go: count how often ${elementLabel} appeared tonight. When a single element leans on a reading this hard, it's naming the season you're in.`,
    closingAllMajors: () =>
      "And notice what didn't appear: not one minor card. When the majors take the whole table, life isn't asking about logistics — it's asking who you're becoming.",
    closingMostlyReversed: () =>
      "With this many reversals on the table, take the message as \"slow down and look again\" — the cards aren't blocking your path, they're checking your footing before the climb.",
    closingNormal: () =>
      "Sit with all of this a moment before you act on any of it. A spread is a conversation, not a sentence handed down — the last word is still yours.",
  },
};
