"use client";
// Renderizador ÚNICO de interpretación del maestro-detalle de Horóscopo: recibe
// una HoroscopoSelection y la lee. Lo consumen el panel derecho (desktop) y el
// bottom-sheet (móvil) — Task H4 los cablea. No inventa prosa: todo sale de
// composeWesternProse/composeEasternProse, <HoroscopeReading> (unifica los dos
// sistemas de profundidad tras Modo Pro) y el glosario de @aluna/core. Molde:
// pilares/interpretation-content.tsx (mismo patrón interpBlock/interpHead/
// interpGlyph/interpName/interpSub/interpBody + selectionTitle de 3 args).
import { useLocale, useTranslations } from "next-intl";
import { glossaryEntry } from "@aluna/core";
import type { WesternPayload } from "@/lib/horoscope/western";
import type { EasternPayload } from "@/lib/horoscope/eastern";
import { composeWesternProse, composeEasternProse } from "@/lib/content/horoscope-es";
import { HoroscopeReading } from "./horoscope-reading";
import { AREA_KEY, TONE_KEY } from "./horoscopo-shared";
import type { HoroscopoSelection } from "./selection";
import styles from "./horoscopo.module.css";

export function HoroscopoInterpretation({
  selected, pro, trad, western, eastern, profileName,
}: {
  selected: HoroscopoSelection;
  pro: boolean;
  trad: "occidental" | "oriental";
  western: WesternPayload | null;
  eastern: EasternPayload | null;
  profileName: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const loc = locale === "en" ? "en" : "es";
  // `profileName` se conserva en la firma por paridad de contrato con los
  // demás paneles de la serie (carta/pilares/numeros, que sí personalizan su
  // lectura Pro con el nombre): a diferencia de BodyReadingView/BaziReadingView,
  // <HoroscopeReading> no lo consume hoy — su fetch a /api/horoscope-reading
  // solo viaja sign/period/tz/locale/length (ver horoscope-reading.tsx).
  void profileName;

  switch (selected.kind) {
    case "reading": {
      if (trad === "oriental") {
        if (!eastern) return <p className={styles.interpHintLine}>{t("horoscopo.interpHint")}</p>;
        const essence = composeEasternProse(loc, eastern);
        return (
          <div className={styles.interpBlock}>
            {pro ? (
              <HoroscopeReading sign={eastern.animal} period={eastern.period} tz={eastern.tz} essence={essence} />
            ) : (
              <>
                {essence.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)}
                <p className={styles.interpHintLine}>{t("horoscopo.interpHint")}</p>
              </>
            )}
          </div>
        );
      }
      if (!western) return <p className={styles.interpHintLine}>{t("horoscopo.interpHint")}</p>;
      const essence = composeWesternProse(loc, western);
      return (
        <div className={styles.interpBlock}>
          {pro ? (
            <HoroscopeReading sign={western.sign} period={western.period} tz={western.tz} essence={essence} />
          ) : (
            <>
              {essence.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)}
              <p className={styles.interpHintLine}>{t("horoscopo.interpHint")}</p>
            </>
          )}
        </div>
      );
    }
    case "area": {
      const areaLabel = t(`hoy.${AREA_KEY[selected.area] ?? selected.area}`);
      const toneLabel = t(`hoy.${TONE_KEY[selected.level] ?? selected.level}`);
      return (
        <div className={styles.interpBlock}>
          <div className={styles.interpHead}>
            <div>
              <div className={styles.interpName}>{areaLabel}</div>
              <div className={styles.interpSub}>{toneLabel}</div>
            </div>
          </div>
          {selected.drivers.map((d, i) => {
            const entry = d.glossKey ? glossaryEntry(d.glossKey, locale) : null;
            return (
              <div key={i}>
                <p className={styles.hitRow}>
                  {d.glyph && <span className={styles.hitGlyphs}>{d.glyph}</span>}
                  {d.label}
                </p>
                {entry && <p className={styles.interpBody}>{entry.body}</p>}
              </div>
            );
          })}
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

/** Título del bottom-sheet móvil para una HoroscopoSelection. */
export function horoscopoSelectionTitle(
  selected: HoroscopoSelection,
  // Solo se llama con la clave (nunca con values) — mismo motivo que
  // pilarSelectionTitle: esta forma SÍ acepta el `t` real de useTranslations().
  t: (k: string) => string,
  locale: string,
): string {
  switch (selected.kind) {
    case "reading":
      return t("horoscopo.interpTitle");
    case "area":
      return t(`hoy.${AREA_KEY[selected.area] ?? selected.area}`);
    case "term":
      return glossaryEntry(selected.key, locale)?.title ?? "";
  }
}
