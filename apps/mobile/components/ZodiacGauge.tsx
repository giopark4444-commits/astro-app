// apps/mobile/components/ZodiacGauge.tsx
// Gauge zodiacal vivo (semicírculo, 12 sectores) para el paso de fecha del
// onboarding: feedback inmediato del signo solar aproximado mientras el
// usuario elige su fecha de nacimiento. Geometría propia (no la de
// ChartWheel.tsx, que es una rueda de 360° con ascendente) pero mismo
// ESTILO: react-native-svg + tokens del tema activo.
import { View, Text, StyleSheet } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { ZODIAC_SIGNS, sunSignFromDate } from "@aluna/core";
import { useTheme } from "../lib/theme-context";
import { useT, type Locale } from "../lib/i18n-context";
import { astroLabels } from "../content/astrology";
import { fonts, type as typeScale, space } from "../theme/tokens";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto en los glifos

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
  // angleStart > angleEnd siempre aquí (barrido de izquierda a derecha,
  // horario en pantalla) → sweep-flag 1, ver ChartWheel/wheel-geometry.ts.
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

export function ZodiacGauge({ date, locale }: { date: string; locale: Locale }) {
  const { t: tk } = useTheme();
  const { t } = useT();
  const active = sunSignFromDate(date);
  const labels = astroLabels(locale);

  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 200 110" width={200} height={110}>
        {/* arco base */}
        <Path
          d={`M ${ptAt(R, 180).join(" ")} A ${R} ${R} 0 0 1 ${ptAt(R, 0).join(" ")}`}
          stroke={tk.accHair}
          strokeWidth={1}
          fill="none"
        />
        {ZODIAC_SIGNS.map((s, i) => {
          const angleStart = 180 - i * STEP;
          const angleEnd = 180 - (i + 1) * STEP;
          const [gx, gy] = ptAt(R_GLYPH, (angleStart + angleEnd) / 2);
          const isActive = active?.index === i;
          return (
            <G key={s.key}>
              <Path d={sectorPath(angleStart, angleEnd)} fill={isActive ? tk.accFaint : "transparent"} />
              <SvgText
                x={gx}
                y={gy}
                fill={isActive ? tk.acc : tk.textFaint}
                fontSize={13}
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {s.glyph + TEXT_VS}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {active && (
        <Text style={[styles.signName, { color: tk.text }]}>{(labels.signs[active.key] ?? active.key) + (active.cusp ? " ≈" : "")}</Text>
      )}
      {active?.cusp && (
        <Text style={[styles.cuspHint, { color: tk.textDim }]}>{t("onboarding.intentCuspHint")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: space.md },
  signName: {
    marginTop: space.xs,
    fontSize: typeScale.md,
    fontFamily: fonts.sans,
  },
  cuspHint: {
    marginTop: 2,
    fontSize: typeScale.sm,
    fontFamily: fonts.sans,
  },
});
