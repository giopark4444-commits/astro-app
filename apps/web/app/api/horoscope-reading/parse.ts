import type { WesternPayload } from "@/lib/horoscope/western";
import { astroLabels } from "@/lib/content/astrology-labels";
import { SOLAR_HOUSE_LABELS_ES } from "@/lib/content/horoscope-es";
import { SOLAR_HOUSE_LABELS_EN } from "@/lib/content/horoscope-en";

export interface HoroscopeReading { reading: string; }

export function parseHoroscopeReading(text: string): HoroscopeReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.reading === "string" && o.reading.trim()) return { reading: o.reading };
  } catch { /* null */ }
  return null;
}

/** Hechos astronómicos en líneas planas: lo ÚNICO que la IA puede usar. */
export function factsBlock(locale: "es" | "en", p: WesternPayload): string {
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const retro = locale === "en" ? "retrograde" : "retrógrado";
  const houseWord = locale === "en" ? "house" : "casa";
  const inWord = locale === "en" ? "in" : "en";
  const lines: string[] = [];
  for (const h of p.houses) {
    lines.push(`- ${L.bodies[h.body] ?? h.body}: ${L.signs[h.sign] ?? h.sign}, ${houseWord} ${h.house} (${HOUSES[h.house]})${h.retrograde ? `, ${retro}` : ""}`);
  }
  for (const e of p.events) {
    if (e.kind === "lunation") lines.push(`- ${e.phase === "new" ? (locale === "en" ? "New Moon" : "Luna Nueva") : (locale === "en" ? "Full Moon" : "Luna Llena")} ${e.atIso.slice(0, 10)} ${inWord} ${L.signs[e.sign] ?? e.sign}${e.eclipse ? ` (eclipse ${e.eclipse})` : ""}`);
    if (e.kind === "station") lines.push(`- ${L.bodies[e.body] ?? e.body} ${e.direction === "retrograde" ? retro : locale === "en" ? "direct" : "directo"} ${e.atIso.slice(0, 10)}`);
    if (e.kind === "ingress") lines.push(`- ${L.bodies[e.body] ?? e.body} → ${L.signs[e.toSign] ?? e.toSign} ${e.atIso.slice(0, 10)}`);
  }
  for (const a of p.areas) {
    lines.push(`- area ${a.area}: ${a.score}/100 (${a.tone})`);
  }
  return lines.join("\n");
}
