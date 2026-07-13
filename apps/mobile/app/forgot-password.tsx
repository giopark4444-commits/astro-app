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
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../components/Enso";
import { Card, FadeIn } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    await resetPassword(email.trim());
    setBusy(false);
    // Anti-enumeración: mismo aviso siempre, exista o no la cuenta — nunca
    // revelamos si resetPassword() encontró un error o no.
    setNotice(t("auth.resetLinkSent"));
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
              <Text style={styles.title}>{t("auth.forgotTitle")}</Text>

              {notice ? (
                <Text style={styles.notice}>{notice}</Text>
              ) : (
                <>
                  <Text style={styles.intro}>{t("auth.forgotBody")}</Text>
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
                  <Pressable style={[styles.cta, busy && styles.ctaOff]} onPress={submit} disabled={busy}>
                    <Text style={styles.ctaText}>{t("auth.sendResetLink")}</Text>
                  </Pressable>
                </>
              )}
            </Card>
          </FadeIn>

          <View style={styles.switchRow}>
            <Link href="/login" style={styles.switchLink}>
              {t("auth.backToLogin")}
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

    formGap: { width: "100%", maxWidth: 420 },
    form: { gap: space.md },

    title: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, textAlign: "center" },
    intro: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center" },

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
    notice: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },

    cta: {
      backgroundColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.sm,
    },
    ctaOff: { opacity: 0.6 },
    ctaText: { color: t.onAcc, fontSize: typeScale.lg, fontFamily: fonts.sansSemi },

    switchRow: { flexDirection: "row", justifyContent: "center", gap: space.sm, marginTop: space.xxl, alignItems: "center" },
    switchLink: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
  });
}
