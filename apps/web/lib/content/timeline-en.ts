// EN content for the "Life Path" timeline — formulaic titles + per-KIND blurbs
// in Aluna's voice. Mirror of timeline-es.ts (same shape, natural English, not
// literal translation). Shared by the timeline UI and the chat via timelineLabel.
import type { TimelineContent } from "./timeline-es";

const EN_ORDINAL = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
};

export const TIMELINE_EN: TimelineContent = {
  titles: {
    birth: "You were born",
    saturnReturn: (ordinal) => `Saturn Return (${ordinal})`,
    jupiterReturn: "Jupiter Return",
    uranusOpposition: "Uranus Opposition — the midpoint",
    uranusReturn: "Uranus Return",
    personalYear1: "A 9-year cycle begins",
    pinnacleChange: (value) =>
      value === null ? "Your pinnacle changes" : `Your pinnacle changes (to ${value})`,
    luckPillarChange: (god) =>
      god === null ? "New luck pillar (大運)" : `New luck pillar (大運) — ${god}`,
    annualClash: "Clash year (冲) with your day",
    confluence: (signals) =>
      signals === null ? "Confluence year" : `Confluence year — ${signals}`,
  },
  blurbs: {
    birth:
      "Everything this path unfolds begins here: the sky, the numbers and the pillars of this day are the score the rest of your life plays in its own way.",
    "saturn-return":
      "The master of time returns to where it stood when you were born: what you truly built stays; what was borrowed falls away. Not punishment — foundation.",
    "jupiter-return":
      "Jupiter comes back to its birthplace and the growth cycle starts again: a door opening toward a bigger world, if you dare to walk through it.",
    "uranus-opposition":
      "Uranus stands exactly opposite where it was born with you: life asks which parts of you are still unlived. What wakes up here is uncomfortable — and freeing.",
    "uranus-return":
      "The awakener completes its full circle, something lived only once: life invites you to see the whole loop and recognize the path as your own.",
    "personal-year-1":
      "A nine-year cycle closes and another starts from seed: what you plant now — habits, bonds, projects — sets the tone for nearly a decade.",
    "pinnacle-change":
      "Your numerology moves to a new classroom: the number now in charge brings a different lesson and a different way to grow. You don't lose what you learned — you carry it with you.",
    "luck-pillar-change":
      "The long season of your BaZi turns: for about ten years, the background weather of your life blows from another element. You don't change — the ground you walk on does.",
    "annual-clash":
      "The year's branch meets your natal day branch head-on: something asks to change place, plan or pace. It unsettles precisely so it can unstick.",
    confluence:
      "Several of your cycles turn at once this year — it promises nothing, but when the clocks align, the moves you make tend to carry further.",
  },
  ordinal: EN_ORDINAL,
  // Same names as messages/en.json → pilares.god* (the /pilares UI).
  gods: {
    peer: "Friend",
    rob: "Rival",
    eating: "Output",
    hurting: "Maverick",
    wealth_indirect: "Indirect Wealth",
    wealth_direct: "Direct Wealth",
    power_indirect: "Indirect Power",
    power_direct: "Authority",
    resource_indirect: "Indirect Resource",
    resource_direct: "Direct Resource",
  },
  signals: {
    "jupiter-return": "Jupiter return",
    "personal-year-1": "personal year 1",
    "luck-pillar-change": "new luck pillar",
  },
};
