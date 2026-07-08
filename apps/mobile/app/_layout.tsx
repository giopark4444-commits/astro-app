import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider, useProfile } from "../lib/profile-context";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import { I18nProvider } from "../lib/i18n-context";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { getSupabase } from "../lib/supabase";
import { fetchRemoteProfile } from "../lib/profile-sync";

/**
 * Layout raíz: provee SafeArea + tema + idioma + sesión + perfil. Fija la barra
 * de estado según el modo de luz del tema activo y enruta entre login,
 * onboarding y las pestañas según haya (o no) sesión y un perfil sincronizado
 * con Supabase (birth_profiles — la Carta necesita esa fila, no solo la copia
 * local en AsyncStorage).
 */
function RootGate() {
  const { ready: authReady, session } = useAuth();
  const { ready: profileReady, profile, setProfile } = useProfile();
  const { ready: themeReady, t } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const booted = authReady && profileReady && themeReady;
  const userId = session?.user.id ?? null;

  // Perfil ya sincronizado (tiene id de birth_profiles) para ESTE usuario.
  const synced = !!profile?.id;

  // Al iniciar sesión, si el perfil local no está sincronizado, busca uno
  // existente en Supabase (p. ej. creado antes desde la web con la misma
  // cuenta) antes de mandar al onboarding. Se re-ejecuta por cada userId nuevo.
  const [hydrating, setHydrating] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!booted || !userId || synced) return;
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    setHydrating(true);
    fetchRemoteProfile(getSupabase(), userId)
      .then((remote) => {
        if (remote) void setProfile(remote);
      })
      .finally(() => setHydrating(false));
  }, [booted, userId, synced, setProfile]);

  useEffect(() => {
    if (!booted || hydrating) return;
    const seg = segments[0];
    const inAuth = seg === "login" || seg === "signup";
    const inOnboarding = seg === "onboarding";

    if (!session) {
      if (!inAuth) router.replace("/login");
      return;
    }
    if (!synced) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }
    if (inAuth || inOnboarding) router.replace("/(tabs)");
  }, [booted, hydrating, session, synced, segments, router]);

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
          <AuthProvider>
            <ProfileProvider>
              <RootGate />
            </ProfileProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
