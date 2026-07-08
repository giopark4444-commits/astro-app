import { Text, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { fonts } from "../../theme/tokens";

/** Glifo de pestaña: símbolo simple (sin librería de iconos) en el acento/tenue. */
function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color, fontFamily: fonts.serif }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { t: tk } = useTheme();
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tk.acc,
        tabBarInactiveTintColor: tk.textFaint,
        tabBarStyle: {
          backgroundColor: tk.bgDeep,
          borderTopColor: tk.accHair,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.5, fontFamily: fonts.sans },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.hoy"),
          tabBarIcon: ({ color }) => <TabGlyph glyph="☾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="carta"
        options={{
          title: t("nav.carta"),
          tabBarIcon: ({ color }) => <TabGlyph glyph="☉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="numeros"
        options={{
          title: t("nav.numeros"),
          tabBarIcon: ({ color }) => <TabGlyph glyph="✦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: t("nav.ajustes"),
          tabBarIcon: ({ color }) => <TabGlyph glyph="◷" color={color} />,
        }}
      />
    </Tabs>
  );
}
