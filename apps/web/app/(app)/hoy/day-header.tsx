"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { moonPhase, personalCycles, signOfLongitude, type MoonPhase } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import { parseBirth, todayCivil } from "@/lib/hoy/today-birth";
import styles from "./hub.module.css";

const PHASE_KEY: Record<MoonPhase, string> = {
  new: "moonNew",
  waxingCrescent: "moonWaxingCrescent",
  firstQuarter: "moonFirstQuarter",
  waxingGibbous: "moonWaxingGibbous",
  full: "moonFull",
  waningGibbous: "moonWaningGibbous",
  lastQuarter: "moonLastQuarter",
  waningCrescent: "moonWaningCrescent",
};

/** Fecha de hoy + fase lunar actual (con signo) + día personal — el encabezado
 *  de Hoy (mockup 06, esquina superior derecha en desktop; apilado en móvil).
 *  La posición lunar viene de /api/chart kind=transits (la misma carta que ya
 *  usa "Tu clima de hoy"), pedida aparte para no acoplar este componente al
 *  estado del panel de clima. Degrada con gracia si el fetch falla. */
export function DayHeader({ profileId, birthDate }: { profileId: string; birthDate: string }) {
  const t = useTranslations("hoy");
  const locale = useLocale();
  const L = astroLabels(locale);
  const [moon, setMoon] = useState<{ phase: MoonPhase; sign: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/chart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId, kind: "transits" }),
        });
        const data = (await res.json()) as { chart?: { bodies?: Array<{ body: string; longitude: number }> } };
        const bodies = data.chart?.bodies ?? [];
        const sun = bodies.find((b) => b.body === "sun");
        const moonBody = bodies.find((b) => b.body === "moon");
        if (alive && sun && moonBody) {
          setMoon({
            phase: moonPhase(sun.longitude, moonBody.longitude),
            sign: signOfLongitude(moonBody.longitude).sign,
          });
        }
      } catch {
        /* degrada: sin línea lunar, la fecha y el día personal se ven igual */
      }
    })();
    return () => {
      alive = false;
    };
  }, [profileId]);

  const day = useMemo(() => {
    const birth = parseBirth(birthDate);
    if (!birth) return null;
    return personalCycles(birth, todayCivil()).personalDay.value;
  }, [birthDate]);

  const dateLabel = useMemo(() => {
    const raw = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [locale]);

  return (
    <div className={styles.dateMeta}>
      <p className={styles.dateLine}>{dateLabel}</p>
      {(moon || day != null) && (
        <p className={styles.moonLine}>
          {moon && (
            <span className={styles.moonGlyph} aria-hidden="true">
              {"☾︎ "}
            </span>
          )}
          {moon && t("moonInSign", { phase: t(PHASE_KEY[moon.phase]), sign: L.signs[moon.sign] ?? moon.sign })}
          {moon && day != null && " · "}
          {day != null && t("headerPersonalDay", { n: day })}
        </p>
      )}
    </div>
  );
}
