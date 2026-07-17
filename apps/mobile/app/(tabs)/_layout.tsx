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
          // §C del gap analysis: contenedor "padding: 10px 6px 4px" (arriba/lados/abajo).
          paddingTop: 10,
          paddingHorizontal: 6,
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: typeScale.sm, fontFamily: fonts.sansSemi, letterSpacing: 0.3 },
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
        name="astros"
        options={{
          title: t("nav.astros"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="astros" color={color} focused={focused} />,
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
        name="tarot"
        options={{
          title: t("nav.tarot"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="tarot" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: t("nav.ajustes"),
          tabBarIcon: ({ color, focused }) => <TabIcon name="ajustes" color={color} focused={focused} />,
        }}
      />
      {/* Rutas legacy (stubs de <Redirect>, ver app/(tabs)/carta.tsx y
          horoscopo.tsx): href:null las mantiene registradas y navegables
          (deep links viejos) SIN mostrarlas como botón en la barra. Omitir
          por completo el Tabs.Screen las re-aparecería como tab fantasma
          (verificado contra expo-router 6) — hay que declararlas ocultas,
          no dejarlas fuera. */}
      <Tabs.Screen name="carta" options={{ href: null }} />
      <Tabs.Screen name="horoscopo" options={{ href: null }} />
    </Tabs>
  );
}
