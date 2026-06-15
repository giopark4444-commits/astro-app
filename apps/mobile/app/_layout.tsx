import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider, useProfile } from "../lib/profile-context";
import { colors } from "../theme/tokens";

/**
 * Layout raíz: provee SafeArea + perfil, fija la barra de estado clara sobre la
 * noche de Aluna y enruta entre el onboarding ceremonial y las pestañas según
 * exista (o no) un perfil activo guardado.
 */
function RootGate() {
  const { ready, profile } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!profile && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [ready, profile, segments, router]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <RootGate />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
});
