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
      "You reach the cliff's edge with almost nothing in your pack. The Fool doesn't deny the drop below — he simply trusts the road more than the map. This is the energy of starting without guarantees, seeing everything with fresh eyes.",
    upright: {
      love: "Something new is asking for room: a person, a stage, a way of loving with no script yet written. Say yes before you have every answer.",
      work: "The project that makes your stomach flip a little is the one that will teach you the most. Start small, but start.",
      path: "Your soul is craving a first time — ground with no map on it. The innocence here isn't naivety, it's a deliberate kind of openness.",
    },
    reversed: {
      love: "Check whether the leap is faith or flight: spontaneity that answers to no one leaves other people to fall.",
      work: "Slowing down isn't failing. A minimal plan is what turns raw impulse into real direction.",
      path: "That vertigo is data, not weakness — something here is asking for preparation before it asks for courage.",
    },
    bridge: "The Fool breathes the air of Uranus: the freedom that interrupts anything too predictable.",
  },
  magician: {
    name: "The Magician",
    keywords: ["will", "resourcefulness", "creation", "focus"],
    essence:
      "Everything you need is already on the table. The Magician doesn't wait for better tools — he channels the ones already in his hands with a clear intention, and turns them into a result.",
    upright: {
      love: "You have exactly what it takes to say what you want out loud, without hedging and without needing proof first.",
      work: "Less preparing, more doing: the idea can become a real thing today if you actually put your hands on it.",
      path: "You're a channel, not a bystander — focused will is your version of prayer.",
    },
    reversed: {
      love: "Watch for shaping the outcome instead of showing your real intention; magic without ethics turns into a trick.",
      work: "Scattered focus drains the power out of the work — pick one target before you move another piece.",
      path: "Talent without direction stays a rehearsal. Ask what it's for, not just how to do it.",
    },
    bridge: "The Magician carries Mercury's signature: the mind that turns thought into speech and speech into deed.",
  },
  "high-priestess": {
    name: "The High Priestess",
    keywords: ["intuition", "mystery", "stillness", "inner knowing"],
    essence:
      "Between the two pillars hangs a veil that won't part by force. The High Priestess holds a kind of knowing that isn't explained, it's listened to — the quiet voice that already knows before the mind catches up.",
    upright: {
      love: "Trust what you feel before you can put it into words yet; the body already has the answer.",
      work: "Not everything gets solved with more research. There's an answer you already hold in the quiet — let yourself hear it.",
      path: "Your temple is on the inside. Stillness isn't emptiness, it's where your truest knowing actually lives.",
    },
    reversed: {
      love: "The secret you're keeping out of fear is starting to weigh more than the truth it's avoiding; something wants a name.",
      work: "Cut off from your own instinct, you're circling the same data without deciding — go back inward for a moment.",
      path: "Mystery becomes avoidance when silence is used to hide from yourself. Today the silence is for listening, not for cover.",
    },
    bridge: "The High Priestess carries the Moon's silver light: the inner tide that refuses to be rushed.",
  },
  empress: {
    name: "The Empress",
    keywords: ["abundance", "creation", "the body", "nurture"],
    essence:
      "The garden grows because someone waters it without demanding it hurry. The Empress is abundance born from inhabiting the body and tending what's alive, not from forcing anything to bloom faster.",
    upright: {
      love: "Simple pleasure — a long hug, a shared plate — matters just as much as the deep conversation.",
      work: "Let the project have its own gestation. Not everything blooms at the pace you'd like it to.",
      path: "Your body is sacred ground, not an obstacle. Nourishing it is a spiritual act too.",
    },
    reversed: {
      love: "The care you pour into others can't leave you empty; check how much of your own garden you have left for yourself.",
      work: "Creativity suffocates if everything is measured by output alone — go back to the pleasure of making, not just delivering.",
      path: "Mistaking abundance for accumulation pulls you away from what actually nourishes. Less, chosen better.",
    },
    bridge: "The Empress carries Venus's grace: beauty that also knows how to hold things and help them grow.",
  },
  emperor: {
    name: "The Emperor",
    keywords: ["structure", "authority", "discipline", "protection"],
    essence:
      "Someone has to hold up the roof so the house doesn't cave in. The Emperor is the structure that protects, the discipline that lets everything else flourish safely inside it.",
    upright: {
      love: "Setting a clear boundary doesn't cool the bond, it makes it livable — say what you need without apologizing for it.",
      work: "The order you build today is what will carry you when the storm comes. Build the structure first.",
      path: "Your fire needs a shape, not a cage — being firm with yourself is an act of love, not control.",
    },
    reversed: {
      love: "Authority that hardens into rigidity chokes the very thing it meant to protect; ask before deciding for someone else.",
      work: "Over-controlling the people you lead stalls them out — loosen the reins a little and trust the process.",
      path: "Structure without a purpose becomes your own prison. Check what you're building for, not just how.",
    },
    bridge: "The Emperor carries Aries's fire: the will that opens the road, then stands guard over it.",
  },
  hierophant: {
    name: "The Hierophant",
    keywords: ["tradition", "learning", "community", "values"],
    essence:
      "Others walked this path before you. The Hierophant is the bridge between what you learned from them and what you'll pass on yourself — he doesn't reinvent the wheel, he honors it and makes it his own.",
    upright: {
      love: "A bond built on shared values — family, community, ritual — gives you roots, not chains.",
      work: "Finding a mentor or a proven method saves you roads that others already walked. Learn before you reinvent.",
      path: "Belonging to a tradition doesn't make you less yourself; it gives language to what you already felt.",
    },
    reversed: {
      love: "Following the rule just because it's the rule — check if it truly represents you, or if it's an inherited script you never questioned.",
      work: "The structure you copied no longer fits; you have permission to adapt the rule to what's true right now.",
      path: "Dogma without a question stalls your growth. Honor the teaching, but dare to ask it something back.",
    },
    bridge: "The Hierophant carries Taurus's fertile ground: tradition that, well planted, still bears fruit.",
  },
  lovers: {
    name: "The Lovers",
    keywords: ["choice", "union", "values", "alignment"],
    essence:
      "This isn't only a romance card: The Lovers speak of the choice that reveals who you are when you have to pick between two paths that each want you.",
    upright: {
      love: "The connection you feel is real when it also helps you choose yourself more clearly.",
      work: "The decision in front of you asks you to check your values, not just the immediate convenience.",
      path: "Every choice is a mirror — it tells you who you want to be, not just what you want to have.",
    },
    reversed: {
      love: "Misaligned values don't get fixed with more passion; they need an honest conversation.",
      work: "Choosing out of fear of disappointing others pulls you away from the decision that's actually yours.",
      path: "Prolonged indecision is also a choice — ask what you're avoiding looking at directly.",
    },
    bridge: "The Lovers carry Gemini's curious air: the conversation that makes a conscious choice possible.",
  },
  chariot: {
    name: "The Chariot",
    keywords: ["will", "direction", "inner discipline", "momentum"],
    essence:
      "Two forces pull in opposite directions and the chariot still moves forward. The Chariot is the will that unifies conflicting impulses and gets them pulling the same way.",
    upright: {
      love: "Holding the bond steady takes shared direction, not just intensity — agree on where you're both headed.",
      work: "Progress is possible once you stop fighting yourself; align head and desire before you hit the gas.",
      path: "Your victory isn't against anyone else — it's against the inner scattering that's been slowing you down.",
    },
    reversed: {
      love: "When each side pulls its own way, the bond stalls out; it takes an honest conversation to reset the course.",
      work: "Moving without a clear direction burns energy with nothing to show for it — pause before you push again.",
      path: "Forced will without self-control ends in collision; real momentum starts from calm, not from force.",
    },
    bridge: "The Chariot carries Cancer's protective water: the will that also knows how to shelter what it loves.",
  },
  strength: {
    name: "Strength",
    keywords: ["gentle courage", "patience", "compassion", "self-mastery"],
    essence:
      "She doesn't tame the lion by force, she calms it with an open hand. Strength is the courage that never needs to dominate — power exercised with tenderness and endless patience.",
    upright: {
      love: "Softness isn't weakness — holding someone through a hard patch with patience is a real form of strength.",
      work: "The challenge gets solved by calm persistence, not a battle of wills. Breathe before you react.",
      path: "Your wildest instinct doesn't need suppressing, it needs company — held with compassion until it becomes an ally.",
    },
    reversed: {
      love: "Doubting yourself makes you give up ground you had every right to hold; remember your own quiet power.",
      work: "Pushing the situation with more pressure only hardens it further — return to calm before you insist again.",
      path: "Suppressing what you feel isn't mastery, it's denial. Real strength embraces even what frightens it.",
    },
    bridge: "Strength carries Leo's sun: the courage that shines without ever needing to roar.",
  },
  hermit: {
    name: "The Hermit",
    keywords: ["retreat", "introspection", "inner guide", "chosen solitude"],
    essence:
      "He climbs the mountain alone, not to escape the world, but to see it more clearly. The Hermit lights his own lamp when everything outside is dim.",
    upright: {
      love: "Some distance won't break the bond, it might actually settle it — you need to find yourself before you find each other.",
      work: "The answer you're looking for isn't in another meeting, it's in the silence that lets you actually think.",
      path: "Withdrawing isn't abandoning — it's tuning your ear toward your own voice under all the outside noise.",
    },
    reversed: {
      love: "Prolonged isolation is starting to hurt more than it protects; someone is waiting for you to open the door.",
      work: "Overthinking an idea without ever sharing it leaves it stuck — step out of the retreat and put your light to use.",
      path: "Solitude that turns into a lockdown stops being wise. Your lamp is also meant to guide someone else.",
    },
    bridge: "The Hermit carries Virgo's meticulous earth: analysis that becomes wisdom once it's done in quiet.",
  },
  "wheel-of-fortune": {
    name: "The Wheel of Fortune",
    keywords: ["cycles", "change", "fate", "movement"],
    essence:
      "The wheel keeps turning, and no one stays on top or on the bottom forever. It's the reminder that you're inside a cycle bigger than you, and that the movement itself is the lesson.",
    upright: {
      love: "An unexpected turn opens a door you hadn't considered — let yourself be surprised by the moment.",
      work: "The opportunity arrives on its own schedule, not yours; get ready to recognize it when it does.",
      path: "Trusting the cycle isn't passivity — it's knowing that even the hard climbs lead to a different view.",
    },
    reversed: {
      love: "Resisting change in the bond only stretches out the discomfort; ask which cycle has already run its course.",
      work: "A setback isn't the end of the story, it's just another turn of the wheel — adjust the plan, not the hope.",
      path: "Blaming fate disconnects you from your active part in the cycle; there's a choice of yours waiting to be made.",
    },
    bridge: "The Wheel carries Jupiter's expansion: the turn that, sooner or later, brings more luck than the one that left.",
  },
  justice: {
    name: "Justice",
    keywords: ["balance", "truth", "accountability", "consequence"],
    essence:
      "The scale doesn't judge cruelly, it weighs honestly. Justice asks you to see things as they actually are, and to accept your exact share in what happened.",
    upright: {
      love: "Complete honesty — not editing out the uncomfortable parts — is what the bond needs to truly balance out.",
      work: "A decision asks you to measure everyone by the same standard, including yourself. Be fair before you're comfortable.",
      path: "Owning your part in what happened, without guilt or denial, is the shortest road to your own peace.",
    },
    reversed: {
      love: "Avoiding the hard conversation out of fear of conflict unbalances things more than it protects them.",
      work: "An injustice that's been tolerated too long is asking to be named, not quieted a bit longer.",
      path: "Denying your role in what happened stalls the lesson; the truth, however uncomfortable, sets you free.",
    },
    bridge: "Justice carries Libra's balanced air: the scale that seeks real harmony, not just easy peace.",
  },
  "hanged-man": {
    name: "The Hanged Man",
    keywords: ["pause", "surrender", "new perspective", "conscious sacrifice"],
    essence:
      "Hanging upside down, he sees the world flipped and notices something he missed standing up. The Hanged Man teaches that surrendering to the pause, without fighting it, opens a perspective that rushing never could.",
    upright: {
      love: "Let go of needing to solve it right now; sometimes love means waiting without rushing time along.",
      work: "A stalled project isn't a failure, it's an invitation to look at it from an angle you hadn't tried yet.",
      path: "Surrendering to what you can't control isn't weakness — it's the only road toward a different kind of wisdom.",
    },
    reversed: {
      love: "Over-sacrificing without anyone asking you to leaves you hollowed out; check if your giving is a choice or a habit.",
      work: "Staying stuck out of fear of deciding costs more than being wrong would; it's time to move again.",
      path: "A pause that turns into paralysis stops teaching anything. You already saw what you needed to see — come down from the tree.",
    },
    bridge: "The Hanged Man carries Neptune's dissolution: the surrender that, by letting go of control, becomes vision.",
  },
  death: {
    name: "Death",
    keywords: ["transformation", "closure", "rebirth", "truth"],
    essence:
      "This isn't the ending that scares people, it's the closure that makes what's next possible. Death prunes precisely what has already run its course, so something more alive can take its place. There is no real transformation without something ending first.",
    upright: {
      love: "One way of being together is coming to a close; letting it go honestly makes room for something truer.",
      work: "What used to work doesn't work the same way anymore; instead of resisting, ask what version of you is asking to be born.",
      path: "The identity you've been holding is shedding itself; it's uncomfortable, but it's exactly what's needed.",
    },
    reversed: {
      love: "Clinging to what's already over just stretches out the pain without changing the outcome; an honest ending hurts less than denial does.",
      work: "Resisting a necessary change only prolongs the discomfort; the cycle closes either way, with or without your permission.",
      path: "Denying the transformation doesn't stop it, it just makes it rougher. Let go before you're forced to.",
    },
    bridge: "Death carries Scorpio's intensity: the transformation that demands a small death before a truer rebirth.",
  },
  temperance: {
    name: "Temperance",
    keywords: ["balance", "patience", "integration", "flow"],
    essence:
      "She pours water from one cup to another without spilling a drop. Temperance is the art of blending opposites — haste and calm, desire and discipline — until you find the exact right measure.",
    upright: {
      love: "The bond asks for patience and constant fine-tuning, not instant perfection; you both calibrate over time.",
      work: "Blend what's new with what's already proven instead of picking one extreme; the balanced mix is the one that pays off.",
      path: "Integrating your contradictions — instead of picking a single side of yourself — is your most honest way to heal.",
    },
    reversed: {
      love: "Leaning too far one way, all-in or all-distant, breaks the balance the bond actually needed.",
      work: "Impatience for instant results ruins a process that needed time and gradual adjustment.",
      path: "Living at the extremes wears you down; return to the middle before the imbalance becomes a habit.",
    },
    bridge: "Temperance carries Sagittarius's expansive fire: faith that knows how to mix meaning with patience.",
  },
  devil: {
    name: "The Devil",
    keywords: ["attachment", "shadow", "desire", "possible freedom"],
    essence:
      "The chains in the image are loose, they can be slipped off. The Devil isn't a sentence, it's a mirror of what binds you out of habit, fear, or pleasure — and proof that the way out was always within reach.",
    upright: {
      love: "There's a pattern — jealousy, dependence, control — you've been mistaking for passion; name it without judging yourself so you can loosen it.",
      work: "A routine that drains you is held in place more by fear of the unknown than by real necessity. You can choose something else.",
      path: "Your shadow isn't your enemy — it's the part of you asking to be looked at directly, not repressed in secret.",
    },
    reversed: {
      love: "You're starting to see the chains clearly; that seeing is already the first real move toward slipping them off.",
      work: "You recognize the pattern that's limiting you, and that's already more than half the work of changing it.",
      path: "The attachment that used to dominate is loosening its grip; give yourself permission to walk toward the freedom you already sense.",
    },
    bridge: "The Devil carries Capricorn's dense earth: structure that, without awareness, becomes its own cage.",
  },
  tower: {
    name: "The Tower",
    keywords: ["collapse", "revelation", "sudden truth", "rebuilding"],
    essence:
      "The lightning doesn't strike at random — it brings down what was built on a false foundation. The Tower hurts because it reveals, all at once, a truth that had been avoided, and inside that break is a relief that hasn't announced itself yet.",
    upright: {
      love: "An uncomfortable truth comes to light; what's falling apart was never the love, it was the illusion covering it.",
      work: "A sudden change reshuffles the whole plan; what seemed stable wasn't quite as solid as you thought.",
      path: "The break doesn't destroy you, it wakes you up. What collapses leaves room for something built on truth.",
    },
    reversed: {
      love: "Putting off the conversation you know is needed just makes the fall bigger when it finally comes.",
      work: "Avoiding the crack in the structure doesn't fix it, it only delays the inevitable — better to face it now, on your own terms.",
      path: "Fear of collapse keeps you in a false calm; sometimes something has to fall so you can rebuild for real.",
    },
    bridge: "The Tower carries Mars's impulse: the sudden rupture that, however uncomfortable, clears a path with truth.",
  },
  star: {
    name: "The Star",
    keywords: ["hope", "healing", "trust", "renewal"],
    essence:
      "After the storm, she pours water onto the ground without fear of running out. The Star is the hope that doesn't deny what hurt, but trusts there's more water where that came from.",
    upright: {
      love: "You're letting yourself believe again, with no guarantees, because trust rebuilds slowly and you've already started.",
      work: "A project born from a loss is starting to show its own light; keep watering what you're planting.",
      path: "Your faith doesn't need proof to hold you up; it's the quiet certainty that the worst has already passed.",
    },
    reversed: {
      love: "Discouragement is clouding what's actually improving; let yourself notice the small light that already came back.",
      work: "Losing faith right before something is about to bloom is the biggest risk right now; hold on a little longer.",
      path: "Feeling disconnected from your own hope doesn't mean it's gone, it just means you need to look up at the sky again.",
    },
    bridge: "The Star carries Aquarius's visionary air: the collective hope that dares to imagine a different future.",
  },
  moon: {
    name: "The Moon",
    keywords: ["intuition", "shadow", "dreams", "the unspoken"],
    essence:
      "The path looks blurry under moonlight, and you still have to walk it. The Moon speaks of what reason can't fully explain — old fears, dreams, half-revealed truths — and asks you to trust instinct more than certainty.",
    upright: {
      love: "Something unspoken is floating between you; not everything needs explaining right away, but honesty will eventually matter.",
      work: "The situation isn't fully clear yet; move slowly and trust your gut more than the incomplete data.",
      path: "Your dreams and your fears are speaking the same language right now; listen to them without needing to translate everything at once.",
    },
    reversed: {
      love: "The confusion is starting to lift; what looked like illusion is revealing itself more clearly now.",
      work: "A deception or misunderstanding comes to light; something you took for granted deserves a second, more awake look.",
      path: "The fear that paralyzed you loses its grip once you finally name it; the fog is starting to lift.",
    },
    bridge: "The Moon carries Pisces's dreamlike water: the dissolving of borders between the conscious and what's still asleep.",
  },
  sun: {
    name: "The Sun",
    keywords: ["joy", "vitality", "clarity", "genuine success"],
    essence:
      "There's no shadow to argue with here: The Sun is the simple clarity of being alive, of something going right, and being able to enjoy it without suspecting the joy itself.",
    upright: {
      love: "The bond is in a bright season; celebrate what's good without hunting for a flaw it doesn't have yet.",
      work: "The recognition you're getting is earned; let yourself be seen without the discomfort of downplaying it.",
      path: "Your natural vitality is shining again; today you don't need to understand everything, just enjoy being alive.",
    },
    reversed: {
      love: "Pretending everything's fine when something's weighing on you dims a brightness that's actually available; be honest first.",
      work: "A partial win feels like not enough when measured against an impossible ideal; celebrate what you actually achieved.",
      path: "Forced cheerfulness is more tiring than honest sadness; give yourself permission to feel what you truly feel today.",
    },
    bridge: "The Sun carries the central fire of the star itself: vitality that shines without needing to hide anything.",
  },
  judgement: {
    name: "Judgement",
    keywords: ["calling", "rebirth", "honest reckoning", "awakening"],
    essence:
      "The trumpet sounds and something in you rises from where it had been sleeping. Judgement is the call to look at your whole story with honesty, and to decide, from there, who you want to be from now on.",
    upright: {
      love: "A past or present bond is asking for an honest look, without idealizing or condemning it — just to understand what you learned.",
      work: "You feel called toward something bigger than the daily task; listen to it, even if it means changing course.",
      path: "This is a real moment of waking up: you can't keep pretending you didn't see what you already saw about yourself.",
    },
    reversed: {
      love: "Fear of judging yourself too harshly makes you avoid looking at a pattern that keeps repeating; honesty doesn't have to be punishment.",
      work: "Putting off an honest look at your path doesn't make it unnecessary, it just delays the awakening that's already showing up.",
      path: "Over-criticizing yourself isn't the same as clarity; release the harsh judgment so you can actually hear the real call.",
    },
    bridge: "Judgement carries Pluto's deep transformation: the symbolic death that comes before a real awakening.",
  },
  world: {
    name: "The World",
    keywords: ["wholeness", "completion", "integration", "achievement"],
    essence:
      "The circle closes, not because everything is perfect, but because every piece finally found its place. The World is the wholeness of having walked the whole cycle and being able to see it, complete, from the outside.",
    upright: {
      love: "The bond reaches a maturity that feels whole on its own terms, needing nothing extra to feel right.",
      work: "A long project reaches its natural close; give yourself the full credit before you jump to the next thing.",
      path: "You've integrated parts of yourself that used to live apart; this achievement is as much yours as it is quiet.",
    },
    reversed: {
      love: "It feels like one last step is missing to close the cycle; name exactly what that missing piece is.",
      work: "A nearly finished project stalls right before the finish line; find the pending detail and close it out.",
      path: "That sense of incompleteness is pointing at a piece that still doesn't fit — not a failure, just one final adjustment.",
    },
    bridge: "The World carries Saturn's structure: discipline that, once its time is served, crowns itself in real achievement.",
  },
};
