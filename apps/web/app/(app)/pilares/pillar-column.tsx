"use client";
import { useTranslations } from "next-intl";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  hiddenStems,
  tenGod,
  type Pillar,
  type TenGod,
} from "@aluna/core";
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
}: {
  posKey: string;
  pillar: Pillar;
  isDay: boolean;
  dayMaster: number;
  pro: boolean;
  script: "hanzi" | "hangul";
  index: number;
}) {
  const t = useTranslations();
  const stem = HEAVENLY_STEMS[pillar.stem]!;
  const branch = EARTHLY_BRANCHES[pillar.branch]!;
  return (
    <div
      className={`${styles.col} ${isDay ? styles.dayCol : ""} reveal`}
      data-pro={pro || undefined}
      style={{ ["--i" as string]: index }}
    >
      <span className={styles.colLabel}>{t(`pilares.${posKey}`)}</span>
      <span className={`chip ${styles.god} ${isDay ? styles.godSelf : ""}`}>
        {isDay
          ? t("pilares.dayMasterHanzi")
          : t(`pilares.${GOD_KEY[tenGod(dayMaster, pillar.stem)]}`)}
      </span>
      <span className={`${styles.char} ${styles[`el_${stem.element}`] ?? ""}`}>
        {script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : stem.hanzi}
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? STEM_LABELS[pillar.stem]!.romanKo : STEM_LABELS[pillar.stem]!.pinyin}
      </span>
      <span className={`${styles.char} ${styles[`el_${branch.element}`] ?? ""}`}>
        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.hangul : branch.hanzi}
      </span>
      <span className={styles.roman}>
        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.romanKo : BRANCH_LABELS[pillar.branch]!.pinyin}
      </span>
      <span className={styles.animal}>{t(`pilares.animal${cap(branch.animal)}`)}</span>
      {isDay && <span className={`chip ${styles.dayTag}`}>{t("pilares.dayMaster")}</span>}
      <div className={styles.hidden}>
        <span className={styles.hiddenLabel}>{t("pilares.hiddenStems")}</span>
        {hiddenStems(pillar.branch).map((hs, j) => {
          const hidden = HEAVENLY_STEMS[hs]!;
          return (
            <span key={j} className={styles.hiddenRow}>
              <span className={`${styles.hiddenChar} ${styles[`el_${hidden.element}`] ?? ""}`}>
                {hidden.hanzi}
              </span>
              <span className={styles.hiddenGod}>
                {t(`pilares.${GOD_KEY[tenGod(dayMaster, hs)]}`)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
