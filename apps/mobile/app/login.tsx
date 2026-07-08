import { useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Starfield } from "../components/Starfield";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(t("auth.errAuth"));
      return;
    }
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <View style={[styles.aura, { height: 220 + insets.top }]}>
        <Starfield count={40} height={220 + insets.top} />
        <View style={[styles.glyph, { top: insets.top + 40 }]}>
          <Enso size={46} />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: 170 + insets.top, paddingBottom: insets.bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>{t("app.name")}</Text>
          <Text style={styles.tagline}>{t("app.tagline")}</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.email")}
              placeholderTextColor={tk.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.password")}
              placeholderTextColor={tk.textFaint}
              secureTextEntry
              textContentType="password"
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}

            <Pressable style={[styles.cta, busy && styles.ctaOff]} onPress={submit} disabled={busy}>
              <Text style={styles.ctaText}>{busy ? t("auth.loggingIn") : t("auth.login")}</Text>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t("auth.noAccount")}</Text>
            <Link href="/signup" style={styles.switchLink}>
              {t("auth.signup")}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    aura: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
    glyph: { position: "absolute", alignSelf: "center" },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    brand: { color: t.acc, fontSize: 32, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center" },
    tagline: { color: t.textDim, fontSize: 14, marginTop: space.sm, marginBottom: space.xxl, fontFamily: fonts.sans, textAlign: "center" },

    form: { width: "100%", maxWidth: 420, gap: space.md },
    input: {
      width: "100%",
      backgroundColor: t.panelSoft,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md + 4,
      color: t.text,
      fontSize: 16,
      fontFamily: fonts.sans,
    },
    error: { color: t.warn, fontSize: 13, fontFamily: fonts.sans, textAlign: "center" },
    notice: { color: t.acc, fontSize: 13, fontFamily: fonts.sans, textAlign: "center" },

    cta: {
      backgroundColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.sm,
    },
    ctaOff: { opacity: 0.6 },
    ctaText: { color: t.onAcc, fontSize: 17, fontWeight: "600", fontFamily: fonts.sans },

    switchRow: { flexDirection: "row", gap: space.sm, marginTop: space.xxl, alignItems: "center" },
    switchText: { color: t.textDim, fontSize: 14, fontFamily: fonts.sans },
    switchLink: { color: t.acc, fontSize: 14, fontFamily: fonts.sans, fontWeight: "600" },
  });
}
