// Core reading (EN): weaves Sun + Moon + Ascendant into one paragraph with
// bold spans (mockup 06 §4.4 "Core reading"). Same warm, evolutionary-yogic,
// second-person voice as astrology-readings-es.ts's EN counterpart — focused
// on how the sign colors the light of each body (doesn't repeat the
// planet+house content already told in the detail sheet when tapping a body).
import { astroLabels } from "./astrology-labels";
import type { Dignity } from "@aluna/core";

const L = astroLabels("en");

export interface CoreSegment {
  b?: string; // bold fragment (planet + sign)
  t: string; // plain text
}

export interface CoreBodyInput {
  sign: string;
  house: number;
  dignity?: Dignity | undefined;
}

/** What shines in each sign when the Sun lives there. */
export const SUN_FRAGMENT: Record<string, string> = {
  aries: "you shine when you dare first, without asking permission",
  taurus: "you shine when you build something lasting and savor it slowly",
  gemini: "you shine when you connect ideas and people no one else had linked",
  cancer: "you shine when you care for others and build a home where they can be vulnerable",
  leo: "you shine simply by existing with an open heart",
  virgo: "you shine when you perfect something useful with your own hands",
  libra: "you shine when you bring harmony to what was in tension",
  scorpio: "you shine when you dare to name what no one else wants to look at",
  sagittarius: "you shine when you chase a horizon wider than yesterday's",
  capricorn: "you shine when you patiently hold up what others abandon",
  aquarius: "you shine when the tribe needs you different",
  pisces: "you shine when you dissolve into something bigger than yourself",
};

/** How the Moon feels in each sign. */
export const MOON_FRAGMENT: Record<string, string> = {
  aries: "you feel with your body first, and act before you think it through",
  taurus: "you need calm and the tangible to feel safe",
  gemini: "you process what you feel by talking it out loud",
  cancer: "you feel with your whole memory, as if nothing were ever forgotten",
  leo: "you need to be seen feeling, not just heard",
  virgo: "you care by tidying up — a useful gesture says more than words",
  libra: "you feel in relationship; your peace depends on the bond you're holding",
  scorpio: "you feel deeply what others barely brush against",
  sagittarius: "you need room to feel, and what encloses you suffocates you",
  capricorn: "you keep what you feel and hold it with quiet discipline",
  aquarius: "you feel from just the right distance, watching before you name it",
  pisces: "you feel without borders, and blur your emotion with someone else's",
};

/** Why the world knows you first, by ascendant sign. */
export const ASC_FRAGMENT: Record<string, string> = {
  aries: "the world knows you first by your drive, by the way you arrive head-on",
  taurus: "the world knows you first by your calm, by how you inhabit space unhurried",
  gemini: "the world knows you first by your quick word and restless curiosity",
  cancer: "the world knows you first by your tenderness, even when it's hard to show",
  leo: "the world knows you first by your glow, by how you walk into a room",
  virgo: "the world knows you first by your attention to detail and your quiet discretion",
  libra: "the world knows you first by your charm and your gift for mediating",
  scorpio: "the world knows you first by your intensity, by a gaze that avoids nothing",
  sagittarius: "the world knows you first by your enthusiasm and your thirst for horizon",
  capricorn: "the world knows you first by your seriousness, though underneath you're softer",
  aquarius: "the world knows you first by your originality, by not quite fitting in",
  pisces: "the world knows you first by your tide",
};

const DIGNITY_NOTE: Record<string, string> = {
  domicile: "in domicile",
  exaltation: "in exaltation",
  exile: "in detriment",
  fall: "in fall",
};

/** Weaves sun+moon+ascendant into a paragraph with bold spans (planet+sign), no dangerouslySetInnerHTML. */
export function composeCoreReading({ sun, moon, ascSign }: {
  sun: CoreBodyInput;
  moon: CoreBodyInput;
  ascSign: string;
}): CoreSegment[] {
  const sunSign = L.signs[sun.sign] ?? sun.sign;
  const moonSign = L.signs[moon.sign] ?? moon.sign;
  const ascSignLabel = L.signs[ascSign] ?? ascSign;
  const sunFrag = SUN_FRAGMENT[sun.sign] ?? "";
  const moonFrag = MOON_FRAGMENT[moon.sign] ?? "";
  const ascFrag = ASC_FRAGMENT[ascSign] ?? "";
  const sunDignity = sun.dignity ? DIGNITY_NOTE[sun.dignity] : null;
  const moonDignity = moon.dignity ? DIGNITY_NOTE[moon.dignity] : null;

  return [
    { t: "Your " },
    { t: "", b: `Sun in ${sunSign}` },
    { t: ` lives in house ${sun.house}${sunDignity ? `, ${sunDignity}` : ""}: ${sunFrag}. Your ` },
    { t: "", b: `Moon in ${moonSign}` },
    { t: `, house ${moon.house}${moonDignity ? `, ${moonDignity}` : ""}, ${moonFrag}. And with ` },
    { t: "", b: `Ascendant ${ascSignLabel}` },
    { t: `, ${ascFrag}.` },
  ];
}
