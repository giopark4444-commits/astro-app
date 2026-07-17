"use client";
// Aspectario técnico (columna izquierda). La fila entera selecciona el
// aspecto; el orbe/aplicativo es detalle Pro. `transit` reusa la voz del
// Clima ("tu Luna") para tránsito-a-natal.
import { useTranslations, useLocale } from "next-intl";
import type { Aspect } from "@aluna/core";
import { astroLabels, ASPECT_GLYPHS } from "@/lib/content/astrology-labels";
import { PLANET_GLYPH, TEXT_VS } from "./glyphs";
import type { Selection } from "./selection";
import styles from "./carta.module.css";

export function AspectList({ aspects, pro, onSelect, transit }: {
  aspects: Aspect[]; pro: boolean; onSelect: (s: Selection) => void; transit?: boolean;
}) {
  const t = useTranslations("carta");
  const L = astroLabels(useLocale());
  return (
    <div className={styles.aspList}>
      {aspects.map((a, i) => (
        <button key={i} type="button"
          className={`${styles.aspRow} ${styles.selRow} ${styles[`harm_${a.harmony}`] ?? ""}`}
          onClick={() => onSelect({ kind: "aspect", aspect: a })}>
          <span className={styles.aspPair}>
            {PLANET_GLYPH[a.a]} <span className={styles.aspGlyph}>{(ASPECT_GLYPHS[a.aspect] ?? "") + TEXT_VS}</span> {PLANET_GLYPH[a.b]}
          </span>
          <span className={styles.aspName}>
            {transit
              ? <>{L.bodies[a.a]} {L.aspects[a.aspect]} {t("yourPossessive")} {L.bodies[a.b]}</>
              : L.aspects[a.aspect]}
          </span>
          {pro && (
            <span className={styles.aspOrb}>
              {a.orb.toFixed(1)}° · {a.applying ? t("applying") : t("separating")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
