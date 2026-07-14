import { Tabs } from "expo-router";
import { Platform } from "react-native";
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
        // Sin esto, cada escena se envuelve en el `Background` de react-navigation
        // (colors.background del DefaultTheme = rgb(242,242,242) gris opaco), que
        // tapa el gradiente radial + Starfield de ThemedBackground en _layout.tsx raíz.
        // SOLO en web: react-navigation-web no oculta (display:none) la escena
        // anterior al cambiar de tab (sí lo hace en iOS/Android) — con fondo
        // transparente ahí, el contenido de la pestaña previa queda visible detrás
        // de la nueva ("doble exposición"). Fondo sólido en web evita ese sangrado;
        // nativo sigue transparente para que el Starfield compartido se vea a través.
        sceneStyle: { backgroundColor: Platform.OS === "web" ? tk.bg : "transparent" },
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
        name="horoscopo"
        options={{
          title: t("nav.horoscopo"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="horoscopo" color={color} focused={focused} />,
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
        name="pilares"
        options={{
          title: t("nav.pilares"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="pilares" color={color} focused={focused} />,
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
