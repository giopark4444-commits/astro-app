import { View } from "react-native";
import { useTheme } from "../lib/theme-context";

/**
 * Enso minimal (el círculo zen abierto de la marca), dibujado con vistas para
 * evitar una dependencia de SVG. Un anillo del acento del tema con una abertura.
 * Sin color explícito, toma el acento activo.
 */
export function Enso({ size = 28, color }: { size?: number; color?: string }) {
  const { t } = useTheme();
  const stroke = color ?? t.acc;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(1, size * 0.06),
          borderColor: stroke,
          borderRightColor: "transparent",
          transform: [{ rotate: "38deg" }],
          opacity: 0.92,
        }}
      />
    </View>
  );
}
