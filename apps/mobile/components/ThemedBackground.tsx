// Fondo radial nocturno de TODA la app (paridad con --bg de la web). Vive UNA
// sola vez en el layout raíz, detrás del Slot — nunca dentro de un ScrollView
// (el gradiente no debe recalcularse con el scroll). pointerEvents="none".
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../lib/theme-context";
import { Starfield } from "./Starfield";

export const ThemedBackground = memo(function ThemedBackground() {
  const { t } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/*
            cx 50% / cy -8% / rx 125% / ry 85%: mismo foco alto que el radial de la
            web. Sin `gradientUnits`: verificado contra RadialGradientProps en
            node_modules/.../react-native-svg/lib/typescript/elements/RadialGradient.d.ts
            — no existe tal atributo con el sufijo "_NO" del borrador; ese era un
            valor trampa a propósito y no se copió. El default real de la librería
            (y de SVG) para gradientUnits es "objectBoundingBox" (confirmado en
            src/lib/extract/extractGradient.ts: gradientUnits final = 0 =
            objectBoundingBox cuando se omite el prop), así que los porcentajes de
            cx/cy/rx/ry se resuelven contra la caja del propio <Rect> (100%x100% =
            toda la pantalla) — es exactamente el comportamiento del
            radial-gradient() de CSS en la web. Fijar aquí "userSpaceOnUse" habría
            anclado los porcentajes al viewport del <Svg> en vez de al Rect (hoy
            coinciden en tamaño porque el Rect cubre el 100%, pero sería el ancla
            semánticamente incorrecta y frágil si el Rect cambiara).
          */}
          <RadialGradient id="alunaBg" cx="50%" cy="-8%" rx="125%" ry="85%">
            <Stop offset="0" stopColor={t.bgGlow} />
            <Stop offset="0.46" stopColor={t.sky} />
            <Stop offset="1" stopColor={t.bg} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#alunaBg)" />
      </Svg>
      {/* Starfield ya es absoluto internamente (StyleSheet.absoluteFill), así
          que hereda el tamaño de este contenedor sin props extra. */}
      <Starfield />
    </View>
  );
});
