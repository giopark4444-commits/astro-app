"use client";
import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  TEN_GODS,
  TEN_GOD_KO,
  nayin,
  lifeStage,
  TWELVE_STAGES,
  detectInteractions,
  symbolicStars,
  STARS,
  dayMasterStrength,
  favorableElements,
  luckPillars,
  annualPillars,
  type Pillar,
  type PillarSet,
  type TenGod,
  type LuckSequence,
} from "@aluna/core";
import { baziLabels } from "@/lib/content/bazi-labels";
import type { BaZiData } from "./types";
import styles from "./pilares.module.css";

type Script = "hanzi" | "hangul";
const POS_KEYS = ["year", "month", "day", "hour"] as const;

/** Clave i18n del nombre de un Dios (十神): "wealth_indirect" → "godWealthIndirect". */
const godName = (t: ReturnType<typeof useTranslations>, key: TenGod) =>
  t(`pilares.god${key.split("_").map((w) => w[0]!.toUpperCase() + w.slice(1)).join("")}`);

/** Lámina Pro de Cuatro Pilares: las 8 secciones (Na Yin, fuerza del DM, 喜用神,
 *  大運/流年, 12 etapas, interacciones, estrellas) sobre los pilares ya calculados. */
export function ProLamina({ data, script }: { data: BaZiData; script: Script }) {
  const t = useTranslations();
  const locale = useLocale();
  const L = baziLabels(locale);
  const [openDecade, setOpenDecade] = useState<number | null>(null);

  // Memoizado sobre `data` para que las 4 derivaciones de abajo no recalculen en
  // cada render (evita además el warning de exhaustive-deps por un objeto literal).
  const set: PillarSet = useMemo(
    () => ({ year: data.year, month: data.month, day: data.day, hour: data.hour }),
    [data],
  );
  const glyphStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.hangul : HEAVENLY_STEMS[i]!.hanzi);
  const glyphBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.hangul : EARTHLY_BRANCHES[i]!.hanzi);
  const glyphGod = (g: TenGod) => (script === "hangul" ? TEN_GOD_KO[g] : TEN_GODS.find((x) => x.key === g)!.hanzi);
  const glyphPillar = (p: Pillar) => `${glyphStem(p.stem)}${glyphBranch(p.branch)}`;

  const strength = useMemo(() => dayMasterStrength(set), [set]);
  const favor = favorableElements(strength.verdict, data.day.stem);
  const interactions = useMemo(() => detectInteractions(set), [set]);
  const stars = useMemo(() => symbolicStars(set), [set]);
  const sequences = useMemo(
    () => luckPillars({ pillars: set, gender: data.gender, birthYear: data.birthYear, daysToPrevJie: data.daysToPrevJie, daysToNextJie: data.daysToNextJie }),
    [set, data.gender, data.birthYear, data.daysToPrevJie, data.daysToNextJie],
  );
  const nowYear = new Date().getFullYear();
  const entries = POS_KEYS.map((k) => ({ key: k, pillar: k === "hour" ? data.hour : data[k] })).filter(
    (e): e is { key: (typeof POS_KEYS)[number]; pillar: Pillar } => !!e.pillar,
  );
  const elName = (el: string) => t(`pilares.el${el[0]!.toUpperCase()}${el.slice(1)}`);

  return (
    <div className={styles.lamina}>
      {!data.timeKnown && <p className={styles.note}>{t("pilares.threePillarsNote")}</p>}

      {/* Na Yin */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.nayinTitle")}</h3>
        {entries.map((e) => {
          const n = nayin(e.pillar);
          return (
            <div key={e.key} className={styles.row}>
              <span className={styles.rowLabel}>{t(`pilares.${e.key}`)}</span>
              <span className={styles.rowGlyph}>{glyphPillar(e.pillar)}</span>
              <span className={`${styles.rowValue} ${styles[`el_${n.element}`] ?? ""}`}>
                {n.hanzi} · {L.nayin[n.key]}
              </span>
            </div>
          );
        })}
      </section>

      {/* Fuerza del DM */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.strengthTitle")}</h3>
        <div className={styles.meterRow}>
          <span className={styles.verdict}>{L.verdicts[strength.verdict]}</span>
          {/* El medidor usa `score` (0-100, capado); el número mostrado usa `raw`
             (suma exacta de los drivers) para no contradecir el desglose de abajo. */}
          <span className={styles.meterTrack}><span className={styles.meterFill} style={{ width: `${strength.score}%` }} /></span>
          <span className={styles.meterScore}>{strength.raw}</span>
        </div>
        <p className={styles.subRow}>{t("pilares.seasonState")}: {L.seasonStates[strength.seasonState]}</p>
        <div className={styles.drivers}>
          {strength.drivers.map((d, i) => (
            <div key={i} className={styles.driver}>
              <span>{L.drivers[d.key]} · {t(`pilares.${d.pillar}`)}</span>
              <span className={styles.driverPts}>+{d.points}</span>
            </div>
          ))}
        </div>
        <p className={styles.method}>{t("pilares.strengthMethod")}</p>
      </section>

      {/* Favorables */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.favorTitle")}</h3>
        {strength.verdict === "balanced" ? (
          <p className={styles.note}>{t("pilares.balancedNote")}</p>
        ) : (
          <>
            <div className={styles.chips}>
              {favor.favor.map((el) => <span key={el} className={`${styles.chip} ${styles[`elBg_${el}`] ?? ""}`}>{elName(el)}</span>)}
            </div>
            <p className={styles.subRow}>{t("pilares.avoidTitle")}</p>
            <div className={styles.chips}>
              {favor.avoid.map((el) => <span key={el} className={`${styles.chip} ${styles.chipDim}`}>{elName(el)}</span>)}
            </div>
          </>
        )}
      </section>

      {/* 大運 */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.luckTitle")}</h3>
        {data.gender === "neutral" && <p className={styles.note}>{t("pilares.luckNeutralNote")}</p>}
        {!data.timeKnown && <p className={styles.note}>{t("pilares.luckNoTimeNote")}</p>}
        {sequences.map((seq) => (
          <LuckRow key={seq.direction} seq={seq} nowYear={nowYear} glyphPillar={glyphPillar}
            godName={(g) => godName(t, g)} glyphGod={glyphGod} L={L} t={t}
            open={openDecade} setOpen={setOpenDecade} natal={set} />
        ))}
      </section>

      {/* 12 etapas */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.stagesTitle")}</h3>
        {entries.map((e) => {
          const st = lifeStage(data.day.stem, e.pillar.branch);
          const def = TWELVE_STAGES.find((x) => x.key === st)!;
          return (
            <div key={e.key} className={styles.row}>
              <span className={styles.rowLabel}>{t(`pilares.${e.key}`)}</span>
              <span className={styles.rowGlyph}>{glyphBranch(e.pillar.branch)}</span>
              <span className={styles.rowValue}>{script === "hangul" ? def.hangul : def.hanzi} · {L.stages[st]}</span>
            </div>
          );
        })}
      </section>

      {/* Interacciones */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.interactionsTitle")}</h3>
        {interactions.length === 0 ? (
          <p className={styles.note}>{t("pilares.interactionsEmpty")}</p>
        ) : (
          interactions.map((x, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.rowLabel}>{x.positions.map((p) => t(`pilares.${p}`)).join(" · ")}</span>
              <span className={styles.rowValue}>
                {L.interactions[x.type]}{x.element ? ` → ${elName(x.element)}` : ""}
              </span>
            </div>
          ))
        )}
      </section>

      {/* Estrellas */}
      <section className={styles.card}>
        <h3 className={styles.cardH}>{t("pilares.starsTitle")}</h3>
        {stars.length === 0 ? (
          <p className={styles.note}>—</p>
        ) : (
          <div className={styles.chips}>
            {stars.map((h, i) => {
              const def = STARS.find((s) => s.key === h.star)!;
              return (
                <span key={i} className={styles.chip}>
                  {script === "hangul" ? def.hangul : def.hanzi} {L.stars[h.star]} · {t(`pilares.${h.pillar}`)}
                </span>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function LuckRow({ seq, nowYear, glyphPillar, godName, glyphGod, L, t, open, setOpen, natal }: {
  seq: LuckSequence; nowYear: number;
  glyphPillar: (p: Pillar) => string; godName: (g: TenGod) => string; glyphGod: (g: TenGod) => string;
  L: ReturnType<typeof baziLabels>; t: ReturnType<typeof useTranslations>;
  open: number | null; setOpen: (n: number | null) => void; natal: PillarSet;
}) {
  return (
    <div className={styles.luckBlock}>
      <p className={styles.subRow}>
        {t(seq.direction === "forward" ? "pilares.luckForward" : "pilares.luckBackward")} — {" "}
        {t("pilares.luckStart", { years: seq.startAgeYears, months: seq.startAgeMonths })}
      </p>
      <div className={styles.luckScroll}>
        {seq.pillars.map((p, i) => {
          const current = nowYear >= p.startYear && nowYear < p.startYear + 10;
          const id = seq.direction === "forward" ? i : 100 + i;
          return (
            <button key={i} type="button"
              className={`${styles.luckCol} ${current ? styles.luckNow : ""} ${open === id ? styles.luckOpen : ""}`}
              onClick={() => setOpen(open === id ? null : id)}>
              <span className={styles.luckAge}>{p.startAge} {t("pilares.age")}</span>
              <span className={styles.luckGlyph}>{glyphPillar(p.pillar)}</span>
              <span className={styles.luckGod}>{glyphGod(p.tenGod)} {godName(p.tenGod)}</span>
              <span className={styles.luckNayin}>{L.nayin[p.nayin.key]}</span>
              {current && <span className={styles.luckTag}>{t("pilares.currentDecade")}</span>}
            </button>
          );
        })}
      </div>
      {seq.pillars.map((p, i) => {
        const id = seq.direction === "forward" ? i : 100 + i;
        if (open !== id) return null;
        const rows = annualPillars(natal, p.startYear, 10);
        return (
          <div key={`fy-${i}`} className={styles.annual}>
            <p className={styles.subRow}>{t("pilares.annualTitle")} · {t("pilares.annualJanFebNote")}</p>
            {rows.map((r) => (
              <div key={r.year} className={styles.row}>
                <span className={styles.rowLabel}>{r.year}</span>
                <span className={styles.rowGlyph}>{glyphPillar(r.pillar)}</span>
                <span className={styles.rowValue}>
                  {godName(r.tenGod)}
                  {r.marks.map((m, j) => (
                    <em key={j} className={styles.mark}> {L.interactions[m.type]}·{t(`pilares.${m.vs}`)}</em>
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
