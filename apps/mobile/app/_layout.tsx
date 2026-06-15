import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider, useProfile } from "../lib/profile-context";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import { I18nProvider } from "../lib/i18n-context";

/**
 * Layout raíz: provee SafeArea + tema + idioma + perfil. Fija la barra de estado
 * según el modo de luz del tema activo y enruta entre el onboarding ceremonial y
 * las pestañas según exista (o no) un perfil activo guardado.
 */
function RootGate() {
  const { ready: profileReady, profile } = useProfile();
  const { ready: themeReady, t } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const booted = profileReady && themeReady;

  useEffect(() => {
    if (!booted) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!profile && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [booted, profile, segments, router]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar style={t.isLight ? "dark" : "light"} />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <ProfileProvider>
            <RootGate />
          </ProfileProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
