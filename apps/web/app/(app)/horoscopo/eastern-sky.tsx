"use client";
import { useLocale, useTranslations } from "next-intl";
import { EARTHLY_BRANCHES, STEM_LABELS, BRANCH_LABELS } from "@aluna/core";
import type { EasternPayload, EasternPillarKey } from "@/lib/horoscope/eastern";
import styles from "./horoscopo.module.css";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PILLAR_KEYS: EasternPillarKey[] = ["year", "month", "day"];
const TAI_SUI_KEY: Record<string, string> = {
  zhi: "taiSuiZhi", chong: "taiSuiChong", hai: "taiSuiHai", zixing: "taiSuiZixing", po: "taiSuiPo",
};

/** Lámina del periodo oriental: pilares año/mes/día en hanzi (con pinyin/animal),
 *  choque y armonías del día, fila Tai Sui en vista año, fechas 節 del rango.
 *  Componente local propio (no comparte código con SkyEvents, que está acoplado
 *  a signos/casas occidentales). `script` alterna hanzi ↔ hangul en los pilares
 *  (spec §5 nota c — toggle Saju, mismo contrato que pillar-column de pilares). */
export function EasternSky({ payload, tz, script = "hanzi" }: {
  payload: EasternPayload; tz: string; script?: "hanzi" | "hangul";
}) {
  const t = useTranslations("horoscopo");
  const tp = useTranslations("pilares");
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
  });

  // Rama del animal consultado (constante en todos los hits) — NO confundir
  // con la rama del pilar del periodo (withBranch), que es el otro lado del par.
  const animalBranch = EARTHLY_BRANCHES.findIndex((b) => b.animal === payload.animal);
  const animalHanzi = EARTHLY_BRANCHES[animalBranch]!.hanzi;

  const dayHits = payload.interactions.filter((h) => h.pillar === "day");
  const dayClash = dayHits.find((h) => h.type === "clash") ?? null;
  const dayHarmonies = dayHits.filter((h) => h.type === "six_combo");

  return (
    <>
      <div className={styles.pillarsRow}>
        {/* Solo los pilares PRESENTES en el periodo (day solo en today, month
            null en la vista año — ver EasternPeriodPillars en el motor). */}
        {PILLAR_KEYS.filter((key) => payload.pillars[key] !== null).map((key) => {
          const p = payload.pillars[key]!;
          return (
            <div key={key} className={styles.pillarCell}>
              <span className={styles.pillarLabel}>{tp(key)}</span>
              <span className={styles.pillarChar}>
                {script === "hangul"
                  ? `${STEM_LABELS[p.stem]!.hangul}${BRANCH_LABELS[p.branch]!.hangul}`
                  : `${p.stemHanzi}${p.branchHanzi}`}
              </span>
              <span className={styles.pillarSub}>
                {script === "hangul"
                  ? `${STEM_LABELS[p.stem]!.romanKo} ${BRANCH_LABELS[p.branch]!.romanKo}`
                  : `${STEM_LABELS[p.stem]!.pinyin} ${BRANCH_LABELS[p.branch]!.pinyin}`}
              </span>
              <span className={styles.pillarAnimal}>{tp(`animal${cap(p.animal)}`)}</span>
            </div>
          );
        })}
      </div>

      {(dayClash || dayHarmonies.length > 0) && (
        <div>
          {dayClash && (
            <p className={`${styles.hitRow} ${styles.hitHard}`}>
              <span className={styles.hitGlyphs}>
                {animalHanzi} 冲 {EARTHLY_BRANCHES[dayClash.withBranch]!.hanzi}
              </span>
              {t("clashDay")}: {tp(`animal${cap(dayClash.withAnimal)}`)}
            </p>
          )}
          {dayHarmonies.map((h, i) => (
            <p key={i} className={`${styles.hitRow} ${styles.hitSoft}`}>
              <span className={styles.hitGlyphs}>
                {animalHanzi} 合 {EARTHLY_BRANCHES[h.withBranch]!.hanzi}
              </span>
              {t("harmonyDay")}: {tp(`animal${cap(h.withAnimal)}`)}
            </p>
          ))}
        </div>
      )}

      {payload.taiSui && payload.taiSui.length > 0 && (
        <div>
          <h3 className={styles.sectionH}>{t("taiSuiTitle")}</h3>
          {payload.taiSui.map((hit, i) => (
            <p key={i} className={`${styles.hitRow} ${hit.kind === "zhi" ? styles.hitSoft : styles.hitHard}`}>
              {t(TAI_SUI_KEY[hit.kind]!)}
            </p>
          ))}
        </div>
      )}

      {payload.period === "year" && <p className={styles.note}>{t("lichunYearNote")}</p>}

      {payload.jieDates.length > 0 && (
        <div>
          <p className={styles.noEvents}>{t("jieNote")}</p>
          <ul className={styles.events}>
            {payload.jieDates.map((j, i) => (
              <li key={i} className={styles.eventRow}>
                <span className={styles.eventGlyph}>節</span>
                <span className={styles.eventDate}>{fmt.format(new Date(j.atIso))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
