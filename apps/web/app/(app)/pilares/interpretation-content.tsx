"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle de Pilares: recibe
// una PilarSelection y la lee. Lo consumen el panel derecho (desktop) y el
// bottom-sheet (móvil). No inventa prosa: todo sale de composeBaziReading,
// BaziReadingView (tiers) y el glosario bazi.* de @aluna/core.
import { useLocale, useTranslations } from "next-intl";
import {
  glossaryEntry,
  composeBaziReading,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  hiddenStems,
  tenGod,
  nayin,
  lifeStage,
  type PillarSet,
} from "@aluna/core";
import { baziLabels } from "@/lib/content/bazi-labels";
import { BaziReadingView } from "./bazi-reading";
import { GOD_KEY } from "./pillar-column";
import type { PilarSelection, PillarPos } from "./selection";
import styles from "./pilares.module.css";

const POS: PillarPos[] = ["year", "month", "day", "hour"];

export function PilaresInterpretation({
  selected,
  pro,
  set,
  profileId,
  profileName,
  script,
}: {
  selected: PilarSelection;
  pro: boolean;
  set: PillarSet;
  profileId: string;
  profileName: string;
  script: "hanzi" | "hangul";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const L = baziLabels(locale);
  const glyphStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.hangul : HEAVENLY_STEMS[i]!.hanzi);
  const glyphBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.hangul : EARTHLY_BRANCHES[i]!.hanzi);
  const romStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.romanKo : STEM_LABELS[i]!.pinyin);
  const romBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.romanKo : BRANCH_LABELS[i]!.pinyin);

  switch (selected.kind) {
    case "reading": {
      const essence = composeBaziReading(set, locale === "en" ? "en" : "es").essence;
      return (
        <div className={styles.interpBlock}>
          {pro ? (
            <BaziReadingView pillars={set} profileId={profileId} profileName={profileName} />
          ) : (
            <p className={styles.interpEssence}>{essence}</p>
          )}
          {pro && (
            <div className={styles.interpTechList}>
              <span className={styles.interpTechH}>{t("pilares.interpPillarsTech")}</span>
              {POS.map((k) => {
                const p = set[k];
                if (!p) return null;
                const god =
                  k === "day" ? t("pilares.dayMasterHanzi") : t(`pilares.${GOD_KEY[tenGod(set.day.stem, p.stem)]}`);
                const n = nayin(p);
                return (
                  <span key={k}>
                    {t(`pilares.${k}`)} · {glyphStem(p.stem)}
                    {glyphBranch(p.branch)} ({romStem(p.stem)} {romBranch(p.branch)}) · {god} · {L.nayin[n.key]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    case "pillar": {
      const p = selected.pillar;
      const stem = HEAVENLY_STEMS[p.stem]!;
      const branch = EARTHLY_BRANCHES[p.branch]!;
      const stemEntry = glossaryEntry(`bazi.stem.${stem.key}`, locale);
      const branchEntry = glossaryEntry(`bazi.branch.${branch.key}`, locale);
      const god =
        selected.which === "day" ? t("pilares.dayMaster") : t(`pilares.${GOD_KEY[tenGod(set.day.stem, p.stem)]}`);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>
              {glyphStem(p.stem)}
              {glyphBranch(p.branch)}
            </span>
            <div>
              <div className={styles.interpName}>{t(`pilares.${selected.which}`)}</div>
              <div className={styles.interpSub}>{god}</div>
            </div>
          </div>
          {stemEntry && (
            <div>
              <div className={styles.interpTermH}>{stemEntry.title}</div>
              <p className={styles.interpBody}>{stemEntry.body}</p>
            </div>
          )}
          {branchEntry && (
            <div>
              <div className={styles.interpTermH}>{branchEntry.title}</div>
              <p className={styles.interpBody}>{branchEntry.body}</p>
            </div>
          )}
          {pro && (
            <div className={styles.interpTechList}>
              <span>
                {t("pilares.hiddenStems")}:{" "}
                {hiddenStems(p.branch)
                  .map((hs) => `${HEAVENLY_STEMS[hs]!.hanzi} ${t(`pilares.${GOD_KEY[tenGod(set.day.stem, hs)]}`)}`)
                  .join(" · ")}
              </span>
              <span>
                {t("pilares.nayinTitle")}: {L.nayin[nayin(p).key]}
              </span>
              <span>
                {t("pilares.stagesTitle")}: {L.stages[lifeStage(set.day.stem, p.branch)]}
              </span>
            </div>
          )}
        </div>
      );
    }
    case "element": {
      const entry = glossaryEntry(`bazi.element.${selected.element}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={`${styles.interpGlyph} ${styles[`el_${selected.element}`] ?? ""}`}>
              {entry?.glyph ?? ""}
            </span>
            <div>
              <div className={styles.interpName}>{entry?.title}</div>
              <div className={styles.interpSub}>{selected.count} / 8</div>
            </div>
          </div>
          {entry && <p className={styles.interpBody}>{entry.body}</p>}
        </div>
      );
    }
    case "decade": {
      const entry = glossaryEntry(`bazi.god.${selected.god}`, locale);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <span className={styles.interpGlyph}>{selected.glyph}</span>
            <div>
              <div className={styles.interpName}>{t("pilares.luckTitle")}</div>
              <div className={styles.interpSub}>
                {t("pilares.decadeRange", { from: selected.startAge, to: selected.startAge + 9 })} ·{" "}
                {selected.startYear}–{selected.startYear + 9}
              </div>
            </div>
          </div>
          {entry && (
            <>
              <div className={styles.interpTermH}>{entry.title}</div>
              <p className={styles.interpBody}>{entry.body}</p>
            </>
          )}
          <p className={styles.interpSub}>
            {t("pilares.nayinTitle")}: {selected.nayinLabel}
          </p>
        </div>
      );
    }
    case "term": {
      const entry = glossaryEntry(selected.key, locale);
      if (!entry) return null;
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            {entry.glyph && <span className={styles.interpGlyph}>{entry.glyph}</span>}
            <div className={styles.interpName}>{entry.title}</div>
          </div>
          <p className={styles.interpBody}>{entry.body}</p>
        </div>
      );
    }
  }
}

/** Título del bottom-sheet móvil para una PilarSelection. */
export function pilarSelectionTitle(
  selected: PilarSelection,
  t: (k: string, v?: Record<string, unknown>) => string,
  L: ReturnType<typeof baziLabels>,
  locale: string,
): string {
  switch (selected.kind) {
    case "reading":
      return t("pilares.interpTitle");
    case "pillar":
      return t(`pilares.${selected.which}`);
    case "element":
      return glossaryEntry(`bazi.element.${selected.element}`, locale)?.title ?? selected.element;
    case "decade":
      return t("pilares.luckTitle");
    case "term":
      return glossaryEntry(selected.key, locale)?.title ?? "";
  }
}
