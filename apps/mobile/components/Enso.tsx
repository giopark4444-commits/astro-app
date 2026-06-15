import { View } from "react-native";
import { colors } from "../theme/tokens";

/**
 * Enso minimal (el círculo zen abierto de la marca), dibujado con vistas para
 * evitar una dependencia de SVG. Un anillo dorado con una pequeña abertura.
 */
export function Enso({ size = 28, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(1, size * 0.06),
          borderColor: color,
          borderRightColor: "transparent",
          transform: [{ rotate: "38deg" }],
          opacity: 0.92,
        }}
      />
    </View>
  );
}
