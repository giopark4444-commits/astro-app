import { Text, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { colors, fonts } from "../../theme/tokens";

/** Glifo de pestaña: símbolo simple (sin librería de iconos) en oro/lavanda. */
function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color, fontFamily: fonts.serif }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.nightDeep,
          borderTopColor: colors.goldHair,
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
          title: "Hoy",
          tabBarIcon: ({ color }) => <TabGlyph glyph="☾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="numeros"
        options={{
          title: "Números",
          tabBarIcon: ({ color }) => <TabGlyph glyph="✦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◷" color={color} />,
        }}
      />
    </Tabs>
  );
}
