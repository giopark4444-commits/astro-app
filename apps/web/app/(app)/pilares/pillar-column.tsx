"use client";
import { useTranslations, useLocale } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  hiddenStems,
  tenGod,
  glossaryEntry,
  type Pillar,
  type TenGod,
} from "@aluna/core";
import type { PilarSelection, PillarPos } from "./selection";
import styles from "./pilares.module.css";

/** Clave i18n del nombre de cada Dios (十神) en la sección `pilares`. Exportada
 *  para que el test compute el mismo texto esperado sin duplicar el mapa. */
export const GOD_KEY: Record<TenGod, string> = {
  peer: "godPeer",
  rob: "godRob",
  eating: "godEating",
  hurting: "godHurting",
  wealth_indirect: "godWealthIndirect",
  wealth_direct: "godWealthDirect",
  power_indirect: "godPowerIndirect",
  power_direct: "godPowerDirect",
  resource_indirect: "godResourceIndirect",
  resource_direct: "godResourceDirect",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Una columna de la grilla de 4 pilares (año/mes/día/hora). Extraída de
 *  PilaresView (R4b-3, spec §4.2/§7) para que el badge de Dios y los troncos
 *  ocultos — hoy condicionados a `{pro && ...}` — migren a render-siempre +
 *  `data-pro` (mismo mecanismo que `carta.module.css` `.pro:not([data-pro])`)
 *  de forma testeable sin mockear `fetch`/`useProfiles`. */
export function PillarColumn({
  posKey,
  pillar,
  isDay,
  dayMaster,
  pro,
  script,
  index,
  onSelect,
}: {
  posKey: string;
  pillar: Pillar;
  isDay: boolean;
  dayMaster: number;
  pro: boolean;
  script: "hanzi" | "hangul";
  index: number;
  onSelect: (s: PilarSelection) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const stem = HEAVENLY_STEMS[pillar.stem]!;
  const branch = EARTHLY_BRANCHES[pillar.branch]!;
  return (
    <div
      className={`${styles.col} ${isDay ? styles.dayCol : ""} reveal`}
      data-pro={pro || undefined}
      style={{ ["--i" as string]: index }}
    >
      <button
        type="button"
        className={`${styles.colLabel} ${styles.selBtn}`}
        onClick={() => onSelect({ kind: "pillar", which: posKey as PillarPos, pillar })}
      >
        {t(`pilares.${posKey}`)}
      </button>
      <span className={`chip ${styles.god} ${isDay ? styles.godSelf : ""}`}>
        <button
          type="button"
          className={styles.chipBtn}
          onClick={() =>
            onSelect({
              kind: "term",
              key: isDay ? "bazi.term.daymaster" : `bazi.god.${tenGod(dayMaster, pillar.stem)}`,
            })
          }
        >
          {isDay ? t("pilares.dayMasterHanzi") : t(`pilares.${GOD_KEY[tenGod(dayMaster, pillar.stem)]}`)}
        </button>
      </span>
      <span
        className={`${styles.char} ${styles[`el_${stem.element}`] ?? ""} ${styles.charIgnite}`}
        style={{ ["--i" as string]: index + 4 }}
      >
        <button
          type="button"
          className={styles.selBtn}
          aria-label={glossaryEntry(`bazi.stem.${stem.key}`, locale)?.title}
          onClick={() => onSelect({ kind: "term", key: `bazi.stem.${stem.key}` })}
        >
          {script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : stem.hanzi}
        </button>
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? STEM_LABELS[pillar.stem]!.romanKo : STEM_LABELS[pillar.stem]!.pinyin}
      </span>
      <span
        className={`${styles.char} ${styles[`el_${branch.element}`] ?? ""} ${styles.charIgnite}`}
        style={{ ["--i" as string]: index + 4.35 }}
      >
        <button
          type="button"
          className={styles.selBtn}
          aria-label={glossaryEntry(`bazi.branch.${branch.key}`, locale)?.title}
          onClick={() => onSelect({ kind: "term", key: `bazi.branch.${branch.key}` })}
        >
          {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.hangul : branch.hanzi}
        </button>
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.romanKo : BRANCH_LABELS[pillar.branch]!.pinyin}
      </span>
      <button
        type="button"
        className={`${styles.animal} ${styles.selBtn}`}
        onClick={() => onSelect({ kind: "term", key: `bazi.branch.${branch.key}` })}
      >
        {t(`pilares.animal${cap(branch.animal)}`)}
      </button>
      {isDay && (
        <span className={`chip ${styles.dayTag}`}>
          <button
            type="button"
            className={styles.chipBtn}
            onClick={() => onSelect({ kind: "term", key: "bazi.term.daymaster" })}
          >
            {t("pilares.dayMaster")}
          </button>
        </span>
      )}
      <div className={styles.hidden}>
        <button
          type="button"
          className={`${styles.hiddenLabel} ${styles.selBtn}`}
          onClick={() => onSelect({ kind: "term", key: "bazi.term.hiddenstems" })}
        >
          {t("pilares.hiddenStems")}
        </button>
        {hiddenStems(pillar.branch).map((hs, j) => {
          const hidden = HEAVENLY_STEMS[hs]!;
          return (
            <span key={j} className={styles.hiddenRow}>
              <span className={`${styles.hiddenChar} ${styles[`el_${hidden.element}`] ?? ""}`}>
                <button
                  type="button"
                  className={styles.selBtn}
                  aria-label={glossaryEntry(`bazi.stem.${hidden.key}`, locale)?.title}
                  onClick={() => onSelect({ kind: "term", key: `bazi.stem.${hidden.key}` })}
                >
                  {hidden.hanzi}
                </button>
              </span>
              <span className={styles.hiddenGod}>
                <button
                  type="button"
                  className={styles.selBtn}
                  onClick={() => onSelect({ kind: "term", key: `bazi.god.${tenGod(dayMaster, hs)}` })}
                >
                  {t(`pilares.${GOD_KEY[tenGod(dayMaster, hs)]}`)}
                </button>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
