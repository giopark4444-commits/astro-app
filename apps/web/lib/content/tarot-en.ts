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
};
