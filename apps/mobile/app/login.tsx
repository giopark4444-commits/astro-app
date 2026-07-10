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
import { Enso } from "../components/Enso";
import { Card, FadeIn } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

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
    // Sin backgroundColor propio ni <Starfield/> local: esta pantalla vive fuera de
    // Tabs, en el Slot raíz de app/_layout.tsx, que NO envuelve en fondo opaco — el
    // radial + estrellas de ThemedBackground (capa raíz) ya quedan visibles detrás.
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
            </Card>
          </FadeIn>

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
    root: { flex: 1 },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    brand: { color: t.acc, fontSize: typeScale.xl3, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.lg },
    tagline: { color: t.textDim, fontSize: typeScale.md, marginTop: space.sm, marginBottom: space.xxl, fontFamily: fonts.sans, textAlign: "center" },

    // Ancho del formulario — vive en el wrapper de <FadeIn> (necesario porque
    // `scroll` centra sus hijos con alignItems: sin este ancho explícito el %
    // interno de <Card style={form}> no tendría contra qué resolverse, mismo
    // mecanismo que fadeFull en carta.tsx/pilares.tsx).
    formGap: { width: "100%", maxWidth: 420 },
    // Fondo/borde/radio/padding ahora los da <Card>; queda el espaciado interno
    // entre input/input/error/CTA.
    form: { gap: space.md },
    // Receta "glass" de los inputs: borde accHair + fondo t.panel (superficie más
    // opaca que la propia <Card>, para que el campo se distinga de la tarjeta que
    // lo contiene en vez de fundirse con su translucidez).
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
    notice: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },

    cta: {
      backgroundColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.sm,
    },
    ctaOff: { opacity: 0.6 },
    // CTA en t.acc/t.onAcc con fonts.sansSemi (política de la pasada de pantalla) —
    // se quita el fontWeight numérico, ya lo da la variante de fuente.
    ctaText: { color: t.onAcc, fontSize: typeScale.lg, fontFamily: fonts.sansSemi },

    switchRow: { flexDirection: "row", gap: space.sm, marginTop: space.xxl, alignItems: "center" },
    switchText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },
    switchLink: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
  });
}
