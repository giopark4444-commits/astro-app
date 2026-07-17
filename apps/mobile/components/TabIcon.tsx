import { View, type ColorValue } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

/**
 * Iconos de línea fina para las tabs (reemplazan los glifos Unicode ☾☉八✦◷).
 * Los trazos de hoy/astros/numeros/pilares son VERBATIM del set canónico web
 * (apps/web/components/icon.tsx: sun/wheel/grid3/pillars) para mantener
 * paridad conceptual entre plataformas. "ajustes" no tiene equivalente en la
 * web: se diseñó un engrane de línea simple (más literal para "Ajustes" que
 * el enso, que ya representa la marca en otro lugar de la UI).
 * "astros" (tab que hospeda Carta+Horóscopo, T2) reusa la rueda de "carta" —
 * ya es el ícono conceptual correcto para "astros/carta astral".
 * "tarot" (T3) es VERBATIM del glifo "cards" web (apps/web/components/
 * icon.tsx:9): dos rects redondeados solapados en abanico, mismo viewBox
 * 24×24 y radios — solo cambia el idioma de trazo (stroke discreto en vez de
 * `fill:none;stroke:currentColor` inline, ya lo da el <G> compartido de abajo).
 */
type TabIconName = "hoy" | "astros" | "numeros" | "pilares" | "tarot" | "ajustes";

const STROKE_WIDTH = 1.5;

function IconSun() {
  return (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
    </>
  );
}

function IconWheel() {
  return (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={3.2} />
      <Path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" />
    </>
  );
}

function IconGrid3() {
  return (
    <>
      {[6, 12, 18].flatMap((y) =>
        [6, 12, 18].map((x) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1} />)
      )}
    </>
  );
}

function IconPillars() {
  return <Path d="M6 4v16M11 4v16M16 4v16M21 4v16" />;
}

/** Dos cartas en abanico, VERBATIM de apps/web/components/icon.tsx:9 ("cards")
 *  — mismas coordenadas/radios, rotación de la carta trasera vía `rotation`+
 *  `origin` (equivalente RN de `transform="rotate(-12 9 14.5)"`). */
function IconCards() {
  return (
    <>
      <Rect x={3.5} y={7} width={11} height={15} rx={2} rotation={-12} origin="9, 14.5" />
      <Rect x={9.5} y={5.5} width={11} height={15} rx={2} />
    </>
  );
}

/** Engrane fino de línea, diseño nuevo (sin equivalente en el set web). */
function IconGear() {
  return (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 4.2v2.1M12 17.7v2.1M19.8 12h-2.1M6.3 12H4.2M17.5 6.5l-1.5 1.5M8 14.5l-1.5 1.5M17.5 17.5 16 16M8 9.5 6.5 8" />
    </>
  );
}

const ICONS: Record<TabIconName, () => React.ReactNode> = {
  hoy: IconSun,
  astros: IconWheel,
  numeros: IconGrid3,
  pilares: IconPillars,
  tarot: IconCards,
  ajustes: IconGear,
};

export function TabIcon({
  name,
  color,
  focused,
  size = 24,
}: {
  name: TabIconName;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  const Glyph = ICONS[name];
  // Halo del activo (mockup: ::before con inset:-7px sobre la caja de 24 = Ø38).
  // FUERA del <Svg>: el Svg raíz recorta a su width×height (review T1 — un Circle
  // r=19 dentro del viewBox 24 se clipea a un cuadrado sólido, no al círculo
  // expandido). Un View absoluto hermano no sufre ese clip (overflow visible).
  const halo = size + 14;
  const overhang = -(halo - size) / 2;
  return (
    <View style={{ width: size, height: size }}>
      {focused && (
        <View
          style={{
            position: "absolute",
            top: overhang,
            left: overhang,
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: color,
            opacity: 0.12,
          }}
        />
      )}
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <G stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
          <Glyph />
        </G>
      </Svg>
    </View>
  );
}
