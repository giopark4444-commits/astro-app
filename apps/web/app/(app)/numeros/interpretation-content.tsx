"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle de Números: recibe
// una NumSelection y la lee. Lo consumirán el panel derecho (desktop) y el
// bottom-sheet (móvil) (Task 3). No inventa prosa: todo sale de
// NUMBER_MEANINGS_*/POSITION_LENS_* y NumberReading (tiers Esencia/Profunda/
// Completa). Cabecera (número + "tu cálculo") SIEMPRE igual, sin importar si
// hay meaning; el cuerpo varía según haya o no meaning y según Pro — mismo
// contenido que produce hoy el sheet de numerology-view.tsx (líneas 160-190).
// Espejo del patrón de /pilares (serie lentes-detalle). Ver spec 2026-07-17 /
// task-2-brief.md.
import { useLocale, useTranslations } from "next-intl";
import { formatReduction } from "@/lib/numerology";
import { NUMBER_MEANINGS_ES, POSITION_LENS_ES } from "@/lib/content/numerology-es";
import { NUMBER_MEANINGS_EN, POSITION_LENS_EN } from "@/lib/content/numerology-en";
import { NumberReading } from "./number-reading";
import type { NumSelection } from "./selection";
import styles from "./numerology-view.module.css";

export function NumerosInterpretation({
  selected,
  pro,
  profileName,
}: {
  selected: NumSelection;
  pro: boolean;
  profileName: string;
}) {
  const t = useTranslations("numerology");
  const locale = useLocale();
  const meaning = (locale === "en" ? NUMBER_MEANINGS_EN : NUMBER_MEANINGS_ES)[selected.trace.value];
  const lens = (locale === "en" ? POSITION_LENS_EN : POSITION_LENS_ES)[selected.labelKey];

  return (
    <div className={styles.sheetBody}>
      <div className={styles.sheetN}>{selected.trace.value}</div>
      <div className={styles.calcMini}>
        <span className={styles.calcLabel}>{t("yourCalc")}:</span> {formatReduction(selected.trace)}
      </div>
      {!meaning ? (
        <>
          <h4 className={styles.cardSub}>{t("archetype")}</h4>
          <p className={styles.muted}>{t(selected.glossKey)}</p>
          <p className={styles.soon}>{t("proseSoon")}</p>
        </>
      ) : pro ? (
        <NumberReading
          value={selected.trace.value}
          position={selected.labelKey}
          calc={formatReduction(selected.trace)}
          profileName={profileName}
          meaning={meaning}
          lens={lens}
        />
      ) : (
        <>
          <p className={styles.essence}>{meaning.essence}</p>
          <p className={styles.interpHintLine}>{t("tapHint")}</p>
        </>
      )}
    </div>
  );
}
