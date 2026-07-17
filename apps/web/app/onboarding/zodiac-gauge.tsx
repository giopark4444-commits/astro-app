"use client";
// Gauge zodiacal vivo (semicírculo, 12 sectores) para el paso de fecha del
// onboarding web: feedback inmediato del signo solar aproximado mientras el
// usuario elige su fecha de nacimiento. Gemelo en SVG del
// apps/mobile/components/ZodiacGauge.tsx (Task 7) — misma geometría
// (viewBox 0 0 200 110, arco r=88 centrado en (100,104), 12 sectores de 15°).
import { useTranslations } from "next-intl";
import { ZODIAC_SIGNS, sunSignFromDate } from "@aluna/core";
import { astroLabels } from "@/lib/content/astrology-labels";
import styles from "./onboarding.module.css";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto (no emoji) en los glifos

const CX = 100;
const CY = 104;
const R = 88;
const R_GLYPH = 68;
const STEP = 15; // 180° / 12 signos

function ptAt(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

/** Cuña de sector (pie slice) del centro al arco exterior y de vuelta. */
function sectorPath(angleStart: number, angleEnd: number): string {
  const [x1, y1] = ptAt(R, angleStart);
  const [x2, y2] = ptAt(R, angleEnd);
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

export function ZodiacGauge({ date, locale }: { date: string; locale: string }) {
  const t = useTranslations("onboarding");
  const active = sunSignFromDate(date);
  const labels = astroLabels(locale);
  const signName = active ? (labels.signs[active.key] ?? active.key) : null;

  return (
    <div className={styles.gauge}>
      <svg
        viewBox="0 0 200 110"
        width={200}
        height={110}
        role="img"
        aria-label={signName ?? ""}
      >
        <path
          d={`M ${ptAt(R, 180).join(" ")} A ${R} ${R} 0 0 1 ${ptAt(R, 0).join(" ")}`}
          className={styles.gaugeArc}
          fill="none"
        />
        {ZODIAC_SIGNS.map((s, i) => {
          const angleStart = 180 - i * STEP;
          const angleEnd = 180 - (i + 1) * STEP;
          const [gx, gy] = ptAt(R_GLYPH, (angleStart + angleEnd) / 2);
          const isActive = active?.index === i;
          return (
            <g key={s.key}>
              <path
                d={sectorPath(angleStart, angleEnd)}
                fill={isActive ? "rgba(var(--acc-rgb), .12)" : "transparent"}
              />
              <text
                x={gx}
                y={gy}
                className={isActive ? styles.gaugeGlyphOn : styles.gaugeGlyph}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {s.glyph + TEXT_VS}
              </text>
            </g>
          );
        })}
      </svg>
      {signName && (
        <p className={styles.gaugeSignName}>
          {signName}
          {active?.cusp ? " ≈" : ""}
        </p>
      )}
      {active?.cusp && <p className={styles.gaugeCuspHint}>{t("cuspHint")}</p>}
    </div>
  );
}
