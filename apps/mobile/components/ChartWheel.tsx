// apps/mobile/components/ChartWheel.tsx
// Rueda de la carta astral en react-native-svg. La GEOMETRÍA viene de
// @aluna/core (la misma que la web, validada al arcominuto): aquí solo se
// pinta. Tintes de elemento/armonía = mismas constantes rgba de la web
// (diseñadas para funcionar sobre cualquier tema); anillos y textos toman
// el tema activo.
import { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  WHEEL, pointAt, annularSector, spreadBodies,
  ZODIAC_SIGNS, PLANETS,
  type ChartResult, type BodyPosition,
} from "@aluna/core";
import { useTheme } from "../lib/theme-context";

const { CX, CY, R_SIGN_OUT, R_SIGN_IN, R_SIGN_GLYPH, R_HOUSE_IN, R_HOUSE_NUM, R_BODY, R_ASPECT } = WHEEL;

const TEXT_VS = "︎"; // U+FE0E: presentación de texto en los glifos
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

// Paridad con apps/web/app/(app)/carta/wheel-colors.ts (theme-agnostic).
const ELEMENT_FILL: Record<string, string> = {
  fire: "rgba(224,121,90,0.12)",
  earth: "rgba(127,176,105,0.12)",
  air: "rgba(122,170,224,0.12)",
  water: "rgba(150,140,214,0.12)",
};
const ELEMENT_INK: Record<string, string> = {
  fire: "#e0795a",
  earth: "#7fb069",
  air: "#7aaae0",
  water: "#9b8fd6",
};
const HARMONY_STROKE: Record<string, string> = {
  hard: "rgba(224,121,90,0.55)",
  soft: "rgba(122,170,224,0.5)",
  neutral: "rgba(231,201,134,0.4)",
};

const ANGLE_MARKS: Array<{ key: string; cusp: number }> = [
  { key: "AC", cusp: 0 },
  { key: "IC", cusp: 3 },
  { key: "DC", cusp: 6 },
  { key: "MC", cusp: 9 },
];

export function ChartWheel({
  chart,
  solar,
  onSelect,
}: {
  chart: ChartResult;
  solar: boolean;
  onSelect: (b: BodyPosition) => void;
}) {
  const { t: tk } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 420);

  const asc = chart.houses.ascendant;
  const disp = useMemo(() => spreadBodies(chart.bodies, 7), [chart]);
  const lonOf = (b: BodyPosition) => disp.get(b.body) ?? b.longitude;
  const houseOpacity = solar ? 0.28 : 1;

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg viewBox="0 0 360 360" width={size} height={size}>
        {/* anillos base */}
        <Circle cx={CX} cy={CY} r={R_SIGN_OUT} stroke={tk.accHair} strokeWidth={1} fill="none" />
        <Circle cx={CX} cy={CY} r={R_SIGN_IN} stroke={tk.accHair} strokeWidth={1} fill="none" />
        <Circle cx={CX} cy={CY} r={R_HOUSE_IN} stroke={tk.accFaint} strokeWidth={1} fill="none" />

        {/* sectores de signos, tintados por elemento */}
        {ZODIAC_SIGNS.map((s, i) => {
          const lonA = i * 30;
          const [gx, gy] = pointAt(R_SIGN_GLYPH, lonA + 15, asc);
          return (
            <G key={s.key}>
              <Path d={annularSector(R_SIGN_OUT, R_SIGN_IN, lonA, lonA + 30, asc)} fill={ELEMENT_FILL[s.element]} />
              <SvgText x={gx} y={gy} fill={ELEMENT_INK[s.element]} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                {s.glyph + TEXT_VS}
              </SvgText>
            </G>
          );
        })}
        {ZODIAC_SIGNS.map((s, i) => {
          const [xo, yo] = pointAt(R_SIGN_OUT, i * 30, asc);
          const [xi, yi] = pointAt(R_SIGN_IN, i * 30, asc);
          return <Line key={`d${i}`} x1={xo} y1={yo} x2={xi} y2={yi} stroke={tk.accHair} strokeWidth={1} />;
        })}

        {/* cúspides de casas + números + marcas de ángulos */}
        <G opacity={houseOpacity}>
          {chart.houses.cusps.map((cusp, i) => {
            const [x1, y1] = pointAt(R_HOUSE_IN, cusp, asc);
            const [x2, y2] = pointAt(R_SIGN_IN, cusp, asc);
            const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
            const next = chart.houses.cusps[(i + 1) % 12]!;
            const span = (next - cusp + 360) % 360;
            const [nx, ny] = pointAt(R_HOUSE_NUM, cusp + span / 2, asc);
            return (
              <G key={`h${i}`}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isAngle ? tk.accSoft : tk.accHair} strokeWidth={isAngle ? 1.4 : 0.7} />
                <SvgText x={nx} y={ny} fill={tk.textFaint} fontSize={8} textAnchor="middle" alignmentBaseline="central">
                  {i + 1}
                </SvgText>
              </G>
            );
          })}
          {ANGLE_MARKS.map((m) => {
            const [x, y] = pointAt(R_SIGN_OUT + 9, chart.houses.cusps[m.cusp]!, asc);
            return (
              <SvgText key={m.key} x={x} y={y} fill={tk.textDim} fontSize={9} textAnchor="middle" alignmentBaseline="central">
                {m.key}
              </SvgText>
            );
          })}
        </G>

        {/* líneas de aspecto */}
        <G>
          {chart.aspects.map((asp, i) => {
            const a = chart.bodies.find((b) => b.body === asp.a);
            const b = chart.bodies.find((b) => b.body === asp.b);
            if (!a || !b) return null;
            const [x1, y1] = pointAt(R_ASPECT, lonOf(a), asc);
            const [x2, y2] = pointAt(R_ASPECT, lonOf(b), asc);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={HARMONY_STROKE[asp.harmony]} strokeWidth={1} />;
          })}
        </G>

        {/* cuerpos (área táctil de 32px lógicos: r=16 en viewBox de 360 sobre ~size px) */}
        {chart.bodies.map((b) => {
          const [gx, gy] = pointAt(R_BODY, lonOf(b), asc);
          const [tx, ty] = pointAt(R_BODY + 16, lonOf(b), asc);
          return (
            <G key={b.body} onPress={() => onSelect(b)}>
              <Circle cx={gx} cy={gy} r={16} fill="rgba(0,0,0,0.01)" />
              <SvgText x={gx} y={gy} fill={tk.text} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                {PLANET_GLYPH[b.body] ?? "•"}
              </SvgText>
              <SvgText x={tx} y={ty} fill={tk.textFaint} fontSize={7} textAnchor="middle" alignmentBaseline="central">
                {`${b.degree}°${b.retrograde ? "℞" : ""}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
