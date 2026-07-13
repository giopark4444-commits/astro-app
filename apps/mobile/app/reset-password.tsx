import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../components/Enso";
import { Card, FadeIn } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { getSupabase } from "../lib/supabase";
import { parseRecoveryLink } from "../lib/recovery-link";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type Status = "checking" | "ready" | "invalid";

// Pantalla que abre el deep link aluna://reset-password. IMPORTANTE — ver
// lib/recovery-link.ts: en RN no hay auto-detección de sesión desde la URL
// (eso es web-only en @supabase/auth-js), así que esta pantalla lee la URL
// cruda del deep link a mano, extrae los tokens del fragmento y llama
// supabase.auth.setSession() ella misma. Esto NUNCA dispara el evento
// 'PASSWORD_RECOVERY' (solo 'SIGNED_IN'/'TOKEN_REFRESHED') — el estado local
// `status` es la señal real de "hay sesión de recovery lista", no el listener
// global de auth-context.
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updatePassword, ready: authReady, session } = useAuth();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const linkUrl = Linking.useLinkingURL();
  const [status, setStatus] = useState<Status>("checking");
  const processedRef = useRef(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processedRef.current) return;

    const result = parseRecoveryLink(linkUrl);
    if (result.status === "tokens") {
      processedRef.current = true;
      getSupabase()
        .auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken })
        .then(({ error: err }) => setStatus(err ? "invalid" : "ready"));
      return;
    }
    if (result.status === "error") {
      processedRef.current = true;
      setStatus("invalid");
      return;
    }
    // Sin tokens ni error en la URL todavía (o nunca). Esperamos a que
    // auth-context termine de resolver la sesión persistida: si ya hay una
    // sesión viva la dejamos pasar (defensivo), si no, no hay nada que hacer.
    if (authReady) {
      setStatus(session ? "ready" : "invalid");
    }
  }, [linkUrl, authReady, session]);

  async function submit() {
    if (busy) return;
    setError(null);

    if (newPassword.length < 8) {
      setError(t("auth.errPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.errPasswordMatch"));
      return;
    }

    setBusy(true);
    const { error: err } = await updatePassword(newPassword);
    setBusy(false);
    if (err) {
      setError(t("auth.errResetLink"));
      return;
    }
    router.replace("/");
  }

  return (
    // Sin backgroundColor propio ni <Starfield/> local — mismo motivo que login/signup.
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Enso size={40} />
          <Text style={styles.brand}>{t("app.name")}</Text>
          <Text style={styles.tagline}>{t("app.tagline")}</Text>

          <FadeIn delay={0} style={styles.formGap}>
            <Card style={styles.form}>
              <Text style={styles.title}>{t("auth.resetTitle")}</Text>

              {status === "invalid" && (
                <>
                  <Text style={styles.error}>{t("auth.errResetLink")}</Text>
                  <Link href="/forgot-password" style={styles.switchLink}>
                    {t("auth.forgotPassword")}
                  </Link>
                </>
              )}

              {status === "ready" && (
                <>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t("auth.newPassword")}
                    placeholderTextColor={tk.textFaint}
                    secureTextEntry
                    textContentType="newPassword"
                  />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("auth.confirmPassword")}
                    placeholderTextColor={tk.textFaint}
                    secureTextEntry
                    textContentType="newPassword"
                  />

                  {error && <Text style={styles.error}>{error}</Text>}

                  <Pressable style={[styles.cta, busy && styles.ctaOff]} onPress={submit} disabled={busy}>
                    <Text style={styles.ctaText}>{t("auth.updatePassword")}</Text>
                  </Pressable>
                </>
              )}
            </Card>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    brand: { color: t.acc, fontSize: typeScale.xl3, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.lg },
    tagline: { color: t.textDim, fontSize: typeScale.md, marginTop: space.sm, marginBottom: space.xxl, fontFamily: fonts.sans, textAlign: "center" },

    formGap: { width: "100%", maxWidth: 420 },
    form: { gap: space.md },

    title: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, textAlign: "center" },

    // Receta "glass" de los inputs: borde accHair + fondo t.panel — igual que login/signup.
    input: {
      width: "100%",
      backgroundColor: t.panel,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md + 4,
      color: t.text,
      fontSize: typeScale.lg,
      fontFamily: fonts.sans,
    },
    error: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },

    cta: {
      backgroundColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.sm,
    },
    ctaOff: { opacity: 0.6 },
    ctaText: { color: t.onAcc, fontSize: typeScale.lg, fontFamily: fonts.sansSemi },

    switchLink: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sansSemi, textAlign: "center" },
  });
}
