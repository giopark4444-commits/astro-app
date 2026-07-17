"use client";
import { useLocale, useTranslations } from "next-intl";
import { EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_LABELS, BRANCH_LABELS, interactionKey } from "@aluna/core";
import type { EasternPayload, EasternPillarKey, WuXingRelation } from "@/lib/horoscope/eastern";
import { Meaning } from "@/components/meaning";
import styles from "./horoscopo.module.css";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PILLAR_KEYS: EasternPillarKey[] = ["year", "month", "day"];
const TAI_SUI_KEY: Record<string, string> = {
  zhi: "taiSuiZhi", chong: "taiSuiChong", hai: "taiSuiHai", zixing: "taiSuiZixing", po: "taiSuiPo",
};
// Frase por relación Wu Xing (acción del elemento del periodo SOBRE el del
// animal, como la define el motor): clave i18n con {period} y {animal}.
const WU_XING_KEY: Record<WuXingRelation, string> = {
  same: "wuXingSame", generates: "wuXingGenerates", controls: "wuXingControls",
  controlled_by: "wuXingControlledBy", generated_by: "wuXingGeneratedBy",
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
        {PILLAR_KEYS.filter((key) => payload.pillars[key] !== null).map((key, i) => {
          const p = payload.pillars[key]!;
          return (
            <div key={key} className={styles.pillarCell}>
              <span className={styles.pillarLabel}>{tp(key)}</span>
              <span className={`${styles.pillarChar} ignite`} style={{ ["--i" as string]: i }}>
                <Meaning k={`bazi.stem.${HEAVENLY_STEMS[p.stem]!.key}`}>
                  {script === "hangul" ? STEM_LABELS[p.stem]!.hangul : p.stemHanzi}
                </Meaning>
                <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[p.branch]!.key}`}>
                  {script === "hangul" ? BRANCH_LABELS[p.branch]!.hangul : p.branchHanzi}
                </Meaning>
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

      {/* Wu Xing del periodo (spec §5): elemento del pilar focal del periodo
          frente al elemento de la rama del animal, con la relación 生/克. */}
      <p className={`${styles.hitRow} reveal`} style={{ ["--i" as string]: 3 }}>
        <Meaning k="bazi.term.wuxing">
          <span className={styles.hitGlyphs}>五行</span>
          {t("wuXingTitle")}
        </Meaning>: {t(WU_XING_KEY[payload.wuXing.relation], {
          period: tp(`el${cap(payload.wuXing.periodElement)}`),
          animal: tp(`el${cap(payload.wuXing.animalElement)}`),
        })}
      </p>

      {(dayClash || dayHarmonies.length > 0) && (
        <div>
          {dayClash && (
            <p className={`${styles.hitRow} ${styles.hitHard} reveal`} style={{ ["--i" as string]: 4 }}>
              <span className={styles.hitGlyphs}>
                <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[animalBranch]!.key}`}>{animalHanzi}</Meaning>{" "}
                <Meaning k={interactionKey("clash")}>冲</Meaning>{" "}
                <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[dayClash.withBranch]!.key}`}>{EARTHLY_BRANCHES[dayClash.withBranch]!.hanzi}</Meaning>
              </span>
              <Meaning k={interactionKey("clash")}>{t("clashDay")}</Meaning>: {tp(`animal${cap(dayClash.withAnimal)}`)}
            </p>
          )}
          {dayHarmonies.map((h, i) => (
            <p key={i} className={`${styles.hitRow} ${styles.hitSoft} reveal`} style={{ ["--i" as string]: 5 + i }}>
              <span className={styles.hitGlyphs}>
                <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[animalBranch]!.key}`}>{animalHanzi}</Meaning>{" "}
                <Meaning k={interactionKey("six_combo")}>合</Meaning>{" "}
                <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.withBranch]!.key}`}>{EARTHLY_BRANCHES[h.withBranch]!.hanzi}</Meaning>
              </span>
              <Meaning k={interactionKey("six_combo")}>{t("harmonyDay")}</Meaning>: {tp(`animal${cap(h.withAnimal)}`)}
            </p>
          ))}
        </div>
      )}

      {payload.taiSui && payload.taiSui.length > 0 && (
        <div>
          <h3 className={styles.sectionH}>{t("taiSuiTitle")}</h3>
          {payload.taiSui.map((hit, i) => (
            <p key={i} className={`${styles.hitRow} ${hit.kind === "zhi" ? styles.hitSoft : styles.hitHard} reveal`} style={{ ["--i" as string]: 8 + i }}>
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
