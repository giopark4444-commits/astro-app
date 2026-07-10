import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Enso } from "../components/Enso";
import { Card } from "../components/ui";
import { PlaceAutocomplete } from "../components/PlaceAutocomplete";
import { type Gender, EMPTY_PROFILE, type Profile, isProfileComplete } from "../lib/profile";
import { useProfile } from "../lib/profile-context";
import { useAuth } from "../lib/auth-context";
import { getSupabase } from "../lib/supabase";
import { insertRemoteProfile } from "../lib/profile-sync";
import { useTheme } from "../lib/theme-context";
import { useT, type Locale } from "../lib/i18n-context";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type Step = "name" | "date" | "time" | "place" | "gender";
const STEPS: Step[] = ["name", "date", "time", "place", "gender"];
const GENDER_IDS: Gender[] = ["feminine", "masculine", "neutral"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyDate = (iso: string, locale: Locale) => {
  const [y, m, d] = iso.split("-").map(Number);
  const MES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return locale === "en" ? `${MON_EN[(m ?? 1) - 1]} ${d}, ${y}` : `${d} de ${MES_ES[(m ?? 1) - 1]} de ${y}`;
};

function stepComplete(step: Step, a: Profile): boolean {
  switch (step) {
    case "name":
      return a.name.trim().length > 0;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(a.birthDate);
    case "time":
      return !a.timeKnown || /^\d{2}:\d{2}$/.test(a.birthTime);
    case "place":
      return a.place !== null;
    case "gender":
      return a.gender !== null;
  }
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setProfile } = useProfile();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const [a, setA] = useState<Profile>(EMPTY_PROFILE);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(Platform.OS === "ios");
  const [showTime, setShowTime] = useState(Platform.OS === "ios");

  const reveal = useRef(new Animated.Value(0)).current;
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const canNext = stepComplete(step, a);

  const EYEBROW: Record<Step, string> = {
    name: t("onboarding.nameEyebrow"),
    date: t("onboarding.dateEyebrow"),
    time: t("onboarding.timeEyebrow"),
    place: t("onboarding.placeEyebrow"),
    gender: t("onboarding.genderEyebrow"),
  };
  const TITLE: Record<Step, string> = {
    name: t("onboarding.nameTitle"),
    date: t("onboarding.dateTitle"),
    time: t("onboarding.timeTitle"),
    place: t("onboarding.placeTitle"),
    gender: t("onboarding.genderTitle"),
  };

  // Reanima el revelado al cambiar de paso.
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 520, delay: 60, useNativeDriver: true }).start();
  }, [i, reveal]);

  const dateValue = useMemo(
    () => (a.birthDate ? new Date(a.birthDate + "T12:00:00") : new Date(1995, 0, 1, 12)),
    [a.birthDate],
  );
  const timeValue = useMemo(() => {
    const [h, mm] = (a.birthTime || "12:00").split(":").map(Number);
    return new Date(1995, 0, 1, h ?? 12, mm ?? 0);
  }, [a.birthTime]);

  function onDate(_e: DateTimePickerEvent, d?: Date) {
    if (Platform.OS === "android") setShowDate(false);
    if (d) setA((s) => ({ ...s, birthDate: toISO(d) }));
  }
  function onTime(_e: DateTimePickerEvent, d?: Date) {
    if (Platform.OS === "android") setShowTime(false);
    if (d) setA((s) => ({ ...s, birthTime: `${pad(d.getHours())}:${pad(d.getMinutes())}` }));
  }

  async function next() {
    if (!canNext || busy) return;
    if (!last) {
      setI(i + 1);
      return;
    }
    if (!isProfileComplete(a) || !session) return;
    setBusy(true);
    setError(null);
    try {
      const withId = await insertRemoteProfile(getSupabase(), a, session.user.id);
      await setProfile(withId);
      router.replace("/(tabs)");
    } catch {
      setBusy(false);
      setError(t("onboarding.createError"));
    }
  }

  const fade = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  return (
    // Sin backgroundColor propio ni <Starfield/> local: esta pantalla vive fuera de
    // Tabs, en el Slot raíz de app/_layout.tsx, que NO envuelve en fondo opaco — el
    // radial + estrellas de ThemedBackground (capa raíz) ya quedan visibles detrás.
    // El Enso pasa de "aura" con Starfield propia (absoluta, banda fija) a una marca
    // estática simple en el flujo normal — igual criterio que login.tsx/signup.tsx.
    // Vive FUERA del <Animated.View> del paso (no reanima con `reveal`): el flujo
    // ceremonial paso a paso no se toca, así que el glifo sigue siendo persistente
    // en vez de reaparecer en cada transición.
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
        <Enso size={40} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: space.xl, paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.stage, fade]}>
            <Text style={styles.eyebrow}>{EYEBROW[step]}</Text>
            <Text style={styles.question}>{TITLE[step]}</Text>

            <View style={styles.field}>
              {step === "name" && (
                <TextInput
                  style={styles.input}
                  value={a.name}
                  onChangeText={(v) => setA({ ...a, name: v })}
                  placeholder={t("onboarding.namePlaceholder")}
                  placeholderTextColor={tk.textFaint}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                />
              )}

              {step === "date" && (
                <View style={styles.center}>
                  {Platform.OS === "android" && (
                    <Pressable style={styles.input} onPress={() => setShowDate(true)}>
                      <Text style={[styles.inputText, !a.birthDate && styles.placeholder]}>
                        {a.birthDate ? prettyDate(a.birthDate, locale) : t("onboarding.datePick")}
                      </Text>
                    </Pressable>
                  )}
                  {showDate && (
                    <DateTimePicker
                      value={dateValue}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      onChange={onDate}
                      themeVariant={tk.isLight ? "light" : "dark"}
                      accentColor={tk.acc}
                    />
                  )}
                </View>
              )}

              {step === "time" && (
                <View style={styles.center}>
                  {Platform.OS === "android" && a.timeKnown && (
                    <Pressable style={styles.input} onPress={() => setShowTime(true)}>
                      <Text style={[styles.inputText, !a.birthTime && styles.placeholder]}>
                        {a.birthTime || t("onboarding.timePick")}
                      </Text>
                    </Pressable>
                  )}
                  {showTime && a.timeKnown && (
                    <DateTimePicker
                      value={timeValue}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTime}
                      themeVariant={tk.isLight ? "light" : "dark"}
                      accentColor={tk.acc}
                    />
                  )}
                  <Pressable style={styles.toggleRow} onPress={() => setA({ ...a, timeKnown: !a.timeKnown })}>
                    <Switch
                      value={!a.timeKnown}
                      onValueChange={(v) => setA({ ...a, timeKnown: !v })}
                      trackColor={{ false: tk.accHair, true: tk.accSoft }}
                      thumbColor={tk.acc}
                    />
                    <Text style={styles.toggleLabel}>{t("onboarding.timeUnknown")}</Text>
                  </Pressable>
                  <Text style={styles.hint}>{t("onboarding.timeHint")}</Text>
                </View>
              )}

              {step === "place" && (
                <PlaceAutocomplete
                  picked={a.place}
                  onPick={(p) => setA({ ...a, place: p })}
                  placeholder={t("onboarding.placePlaceholder")}
                />
              )}

              {step === "gender" && (
                <View style={styles.center}>
                  <View style={styles.genders}>
                    {GENDER_IDS.map((id) => {
                      const on = a.gender === id;
                      return (
                        <Pressable key={id} onPress={() => setA({ ...a, gender: id })}>
                          <Card style={[styles.gender, on && styles.genderOn]}>
                            <Text style={[styles.genderText, on && styles.genderTextOn]}>{t(`gender.${id}`)}</Text>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>{t("onboarding.genderHint")}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pie fijo: progreso + acciones */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + space.lg }]}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.dots}>
          {STEPS.map((_, k) => (
            <View key={k} style={[styles.dot, k === i && styles.dotOn, k < i && styles.dotPast]} />
          ))}
        </View>
        <View style={styles.actions}>
          {i > 0 ? (
            <Pressable style={styles.back} onPress={() => setI(i - 1)} disabled={busy}>
              <Text style={styles.backText}>{t("onboarding.back")}</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Pressable style={[styles.cta, !canNext && styles.ctaOff]} onPress={next} disabled={!canNext || busy}>
            <Text style={styles.ctaText}>
              {busy ? t("onboarding.creating") : last ? t("onboarding.create") : t("onboarding.next")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    // Marca estática (reemplaza la banda "aura" absoluta + <Starfield/> propia):
    // el Enso vive en flujo normal, no reanima con el paso — mismo criterio que
    // login.tsx/signup.tsx.
    header: { alignItems: "center" },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    stage: { width: "100%", maxWidth: 460, alignItems: "center" },
    // Eyebrow canónico (SPEC): letterSpacing 3 + Quicksand semibold + acc, igual que
    // en el resto de pasadas de pantalla — antes era fonts.sans (peso regular).
    eyebrow: {
      color: t.acc,
      fontSize: typeScale.xs2,
      letterSpacing: 3,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
      marginBottom: space.md,
    },
    question: {
      color: t.text,
      fontSize: typeScale.xl3,
      lineHeight: 40,
      fontFamily: fonts.serif,
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: space.xxl,
    },
    field: { width: "100%" },
    center: { width: "100%", alignItems: "center" },
    // Receta "glass" del campo (borde accHair) — TextInput no puede envolverse en
    // <Card> (no es una View con children); se queda como primitivo local, igual
    // criterio que login.tsx/signup.tsx para sus inputs.
    input: {
      width: "100%",
      backgroundColor: t.panelSoft,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md + 4,
      color: t.text,
      fontSize: typeScale.xl,
      fontFamily: fonts.sans,
      textAlign: "center",
    },
    inputText: { color: t.text, fontSize: typeScale.xl, textAlign: "center", fontFamily: fonts.sans },
    placeholder: { color: t.textFaint },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xl },
    toggleLabel: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans },
    hint: { color: t.textDim, fontSize: typeScale.sm, textAlign: "center", marginTop: space.lg, lineHeight: 20, fontFamily: fonts.sans },
    genders: { width: "100%", gap: space.md },
    // Fondo/borde/radio ahora los da <Card>; queda el layout (ancho, centrado,
    // padding vertical más compacto que el default xl de <Card> — mismo mecanismo
    // que coreCard en carta.tsx).
    gender: { width: "100%", alignItems: "center", paddingVertical: space.lg },
    genderOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    genderText: { color: t.textDim, fontSize: typeScale.lg, fontFamily: fonts.sans },
    genderTextOn: { color: t.acc },
    // Pie fijo con backgroundColor SÓLIDO deliberado (no transparente): es una barra
    // de navegación funcional superpuesta al scroll (progreso + CTA), igual que la
    // tabBarStyle opaca de (tabs)/_layout.tsx — no es el "fondo propio de la
    // pantalla" que pide quitar el patrón de esta tarea, es chrome fijo que necesita
    // legibilidad garantizada sobre el contenido que se desplaza detrás.
    foot: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space.xl,
      paddingTop: space.lg,
      backgroundColor: t.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.accHair,
    },
    errorText: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginBottom: space.md },
    dots: { flexDirection: "row", justifyContent: "center", gap: space.sm, marginBottom: space.lg },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.accHair },
    dotOn: { backgroundColor: t.acc, width: 22 },
    dotPast: { backgroundColor: t.accSoft },
    actions: { flexDirection: "row", alignItems: "center", gap: space.md },
    back: { paddingHorizontal: space.lg, paddingVertical: space.md },
    backSpacer: { width: 1 },
    backText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },
    cta: {
      flex: 1,
      backgroundColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
    },
    ctaOff: { opacity: 0.4 },
    // CTA en t.acc/t.onAcc con fonts.sansSemi (política de la pasada de pantalla) —
    // se quita el fontWeight numérico, ya lo da la variante de fuente.
    ctaText: { color: t.onAcc, fontSize: typeScale.lg, fontFamily: fonts.sansSemi },
  });
}
