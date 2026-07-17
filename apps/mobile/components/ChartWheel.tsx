// apps/mobile/components/ChartWheel.tsx
// Rueda de la carta astral en react-native-svg. La GEOMETRÍA viene de
// @aluna/core (la misma que la web, validada al arcominuto): aquí solo se
// pinta. Tintes de elemento/armonía = mismas constantes rgba de la web
// (diseñadas para funcionar sobre cualquier tema); anillos y textos toman
// el tema activo.
import { useMemo } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  WHEEL, pointAt, annularSector, spreadBodies,
  ZODIAC_SIGNS, PLANETS,
  ELEMENT_FILL, ELEMENT_INK, ASPECT_COLORS as HARMONY_STROKE,
  type ChartResult, type BodyPosition,
} from "@aluna/core";
import { useTheme } from "../lib/theme-context";
import { fonts } from "../theme/tokens";
import { useCeremony, bloomScale } from "./use-ceremony";

// <G>/<Circle> animables por Animated (R5, ceremonia de dibujo) — fuera del
// componente para no recrear los wrappers en cada render.
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circunferencia (2πr) de un anillo — para strokeDasharray/strokeDashoffset
 * del trazo de dibujo (fase "structure"). Solo se usa cuando `animated`. */
const circumference = (r: number) => 2 * Math.PI * r;

const { CX, CY, R_SIGN_OUT, R_SIGN_IN, R_SIGN_GLYPH, R_HOUSE_IN, R_HOUSE_NUM, R_BODY, R_ASPECT } = WHEEL;

const TEXT_VS = "︎"; // U+FE0E: presentación de texto en los glifos
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

const ANGLE_MARKS: Array<{ key: string; cusp: number }> = [
  { key: "AC", cusp: 0 },
  { key: "IC", cusp: 3 },
  { key: "DC", cusp: 6 },
  { key: "MC", cusp: 9 },
];

export function ChartWheel({
  chart,
  solar,
  selected,
  onSelect,
  animated = false,
}: {
  chart: ChartResult;
  solar: boolean;
  /** Clave del cuerpo resaltado ahora mismo (p. ej. el de la hoja abierta en
   * la pantalla) — pinta un halo dorado detrás suyo. Opcional: null/undefined
   * = ningún cuerpo resaltado. */
  selected?: string | null;
  onSelect: (b: BodyPosition) => void;
  /** R5 — ceremonia de dibujo en 3 fases (estructura → signos → cuerpos) al
   * primer montaje de una carta lista. Default false = comportamiento
   * estático de siempre (los 3 grupos nacen en opacity 1, sin animar); el
   * consumidor decide CUÁNDO pasar true (gate de primer-montaje, Task 5). */
  animated?: boolean;
}) {
  const { t: tk } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 420);
  const { structureDraw, structure, signs, bodies, aspects } = useCeremony(
    animated,
    ZODIAC_SIGNS.length,
    chart.bodies.length,
  );

  const asc = chart.houses.ascendant;
  const disp = useMemo(() => spreadBodies(chart.bodies, 7), [chart]);
  const lonOf = (b: BodyPosition) => disp.get(b.body) ?? b.longitude;
  const houseOpacity = solar ? 0.28 : 1;

  // Trazo de anillos (fase "structure"): SOLO con props de dasharray/offset
  // cuando `animated` — en estático el markup es BYTE-equivalente al de
  // siempre (ni dasharray ni offset, <Circle> plano). `structureDraw` va
  // 0→1; dashoffset interpola circunferencia→0 (trazo oculto → completo).
  const ringDraw = (r: number) =>
    animated
      ? {
          strokeDasharray: circumference(r),
          strokeDashoffset: structureDraw.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference(r), 0],
          }),
        }
      : undefined;

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg viewBox="0 0 360 360" width={size} height={size}>
        {/* FASE 1/3 — estructura: anillos base (con trazo de dibujo cuando
            animated), líneas divisorias de 30° y cúspides de casas (bajo el
            fundido de grupo `structure`, sin stagger — deliberado, ver
            use-ceremony.ts). houseOpacity (dimming solar) compone
            multiplicativo dentro de este grupo, no hace falta tocarlo. */}
        <AnimatedG opacity={structure}>
          <AnimatedCircle cx={CX} cy={CY} r={R_SIGN_OUT} stroke={tk.accHair} strokeWidth={1} fill="none" {...ringDraw(R_SIGN_OUT)} />
          <AnimatedCircle cx={CX} cy={CY} r={R_SIGN_IN} stroke={tk.accHair} strokeWidth={1} fill="none" {...ringDraw(R_SIGN_IN)} />
          <AnimatedCircle cx={CX} cy={CY} r={R_HOUSE_IN} stroke={tk.accFaint} strokeWidth={1} fill="none" {...ringDraw(R_HOUSE_IN)} />

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
              // AC/MC en paridad con la web (fill: var(--acc); font-weight: 700) — IC/DC
              // quedan tenues, sin negrita, como marcas secundarias.
              const primary = m.key === "AC" || m.key === "MC";
              return (
                <SvgText
                  key={m.key}
                  x={x}
                  y={y}
                  fill={primary ? tk.acc : tk.textDim}
                  fontFamily={primary ? fonts.serifBold : undefined}
                  fontSize={9}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {m.key}
                </SvgText>
              );
            })}
          </G>
        </AnimatedG>

        {/* FASE 2/3 — signos: sectores tintados por elemento + glifos. Cada
            signo hace su propio bloom escalonado (opacity+scale) — el bloom
            de scale SOLO cuando animated (origin/scale extra ausentes en
            estático: markup byte-equivalente al de siempre). */}
        {ZODIAC_SIGNS.map((s, i) => {
          const lonA = i * 30;
          const [gx, gy] = pointAt(R_SIGN_GLYPH, lonA + 15, asc);
          const bloomProps = animated
            ? { origin: `${gx},${gy}`, scale: bloomScale(signs[i]!) }
            : undefined;
          return (
            <AnimatedG key={s.key} opacity={animated ? signs[i] : 1} {...bloomProps}>
              <Path d={annularSector(R_SIGN_OUT, R_SIGN_IN, lonA, lonA + 30, asc)} fill={ELEMENT_FILL[s.element]} />
              <SvgText x={gx} y={gy} fill={ELEMENT_INK[s.element]} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                {s.glyph + TEXT_VS}
              </SvgText>
            </AnimatedG>
          );
        })}

        {/* FASE 3/3 — cuerpos: líneas de aspecto (fundido único, sin
            escalonar — como en @aluna/core) + planetas/luminarias (bloom
            escalonado por cuerpo, ídem signos). */}
        <AnimatedG opacity={aspects}>
          {chart.aspects.map((asp, i) => {
            const a = chart.bodies.find((b) => b.body === asp.a);
            const b = chart.bodies.find((b) => b.body === asp.b);
            if (!a || !b) return null;
            const [x1, y1] = pointAt(R_ASPECT, lonOf(a), asc);
            const [x2, y2] = pointAt(R_ASPECT, lonOf(b), asc);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={HARMONY_STROKE[asp.harmony]} strokeWidth={1} />;
          })}
        </AnimatedG>

        {/* cuerpos: halo dorado del seleccionado detrás + área táctil de 44pt
            (r=23 en viewBox 360 ≈ 44pt de diámetro en un ancho de 375) ANTES
            del glifo visible, que no cambia de tamaño. */}
        {chart.bodies.map((b, i) => {
          const [gx, gy] = pointAt(R_BODY, lonOf(b), asc);
          const [tx, ty] = pointAt(R_BODY + 16, lonOf(b), asc);
          const isSelected = b.body === selected;
          const bloomProps = animated
            ? { origin: `${gx},${gy}`, scale: bloomScale(bodies[i]!) }
            : undefined;
          return (
            <AnimatedG key={b.body} opacity={animated ? bodies[i] : 1} {...bloomProps} onPress={() => onSelect(b)}>
                {isSelected && <Circle cx={gx} cy={gy} r={16} fill={tk.acc} opacity={0.12} />}
                <Circle cx={gx} cy={gy} r={23} fill="transparent" />
                <SvgText x={gx} y={gy} fill={tk.text} fontSize={13} textAnchor="middle" alignmentBaseline="central">
                  {PLANET_GLYPH[b.body] ?? "•"}
                </SvgText>
                <SvgText x={tx} y={ty} fill={tk.textFaint} fontSize={7} textAnchor="middle" alignmentBaseline="central">
                  {`${b.degree}°${b.retrograde ? "℞" : ""}`}
                </SvgText>
              </AnimatedG>
          );
        })}
      </Svg>
    </View>
  );
}
