// Layout de la tab "Astros": hospeda Carta+Horóscopo como un grupo de rutas
// anidado (Propuesta A, idiomática de expo-router) en vez de un solo screen
// con `useState` — ver .superpowers/sdd/propuesta-a-astros.md. El <Tabs>
// interno da keep-alive/lazy-mount GRATIS (cache de carta.tsx, filtros de
// horoscopo.tsx sobreviven al alternar) sin código propio; su tab bar nativa
// se oculta (`tabBar={() => null}`) y se sustituye por el switch de 2 Chips
// dibujado a mano justo debajo del eyebrow.
import { Tabs, useRouter, usePathname } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../../../components/ui";
import { useTheme } from "../../../lib/theme-context";
import { useT } from "../../../lib/i18n-context";
import { fonts, space, type as typeScale, type ThemeTokens } from "../../../theme/tokens";

export default function AstrosLayout() {
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const styles = makeStyles(tk);

  // Vista activa = la URL (`usePathname()`), no un `useState` propio: la
  // fuente de verdad es la ruta, nunca se puede desincronizar de ella. Si el
  // primer render en frío no trae aún el pathname completo, cae a "carta"
  // (ruta inicial del <Tabs> anidado de abajo).
  const vista = pathname.endsWith("/horoscopo") ? "horoscopo" : "carta";

  return (
    <View style={styles.root}>
      <View style={[styles.head, { paddingTop: insets.top + space.md }]}>
        <Text style={styles.eyebrow}>{t("nav.astros")}</Text>
        <View style={styles.switchRow}>
          <Chip
            kind="control"
            label={t("carta.title")}
            selected={vista === "carta"}
            onPress={() => router.replace("/(tabs)/astros/carta")}
          />
          <Chip
            kind="control"
            label={t("horoscopo.title")}
            selected={vista === "horoscopo"}
            onPress={() => router.replace("/(tabs)/astros/horoscopo")}
          />
        </View>
      </View>

      <Tabs
        tabBar={() => null}
        initialRouteName="carta"
        screenOptions={{
          headerShown: false,
          // Mismo fix del commit 5f8b8e9 que el <Tabs> externo: sin esto, en
          // web las escenas del navigator anidado se pisan como capas (React
          // Navigation web no oculta con display:none la escena previa al
          // cambiar de tab) y en nativo el fondo estrellado compartido queda
          // tapado por el `Background` gris opaco por defecto.
          sceneStyle: { backgroundColor: Platform.OS === "web" ? tk.bg : "transparent" },
        }}
      >
        <Tabs.Screen name="carta" />
        <Tabs.Screen name="horoscopo" />
      </Tabs>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    head: {
      paddingHorizontal: space.xl,
      paddingBottom: space.md,
      alignItems: "center",
    },
    eyebrow: {
      color: t.accText,
      fontSize: typeScale.sm,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
      marginBottom: space.sm,
    },
    switchRow: { flexDirection: "row", gap: space.sm },
  });
}
