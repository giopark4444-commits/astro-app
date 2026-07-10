import { Tabs } from "expo-router";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { fonts, type as typeScale } from "../../theme/tokens";
import { TabIcon } from "../../components/TabIcon";

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
        tabBarLabelStyle: { fontSize: typeScale.xs2, letterSpacing: 0.5, fontFamily: fonts.sansMedium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.hoy"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="hoy" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="carta"
        options={{
          title: t("nav.carta"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="carta" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pilares"
        options={{
          title: t("nav.pilares"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="pilares" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="numeros"
        options={{
          title: t("nav.numeros"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="numeros" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: t("nav.ajustes"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="ajustes" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
