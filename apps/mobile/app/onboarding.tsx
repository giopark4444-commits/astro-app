import { useMemo, useRef, useState } from "react";
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
import { Starfield } from "../components/Starfield";
import { Enso } from "../components/Enso";
import { PlaceAutocomplete } from "../components/PlaceAutocomplete";
import { type Gender, EMPTY_PROFILE, type Profile, isProfileComplete } from "../lib/profile";
import { useProfile } from "../lib/profile-context";
import { colors, fonts, radius, space } from "../theme/tokens";

type Step = "name" | "date" | "time" | "place" | "gender";
const STEPS: Step[] = ["name", "date", "time", "place", "gender"];

const EYEBROW: Record<Step, string> = {
  name: "Empecemos",
  date: "Tu llegada",
  time: "El instante",
  place: "El cielo de ese día",
  gender: "Para hablarte bien",
};
const TITLE: Record<Step, string> = {
  name: "¿Cómo te llamas?",
  date: "¿Qué día naciste?",
  time: "¿A qué hora naciste?",
  place: "¿Dónde naciste?",
  gender: "¿Cómo te nombramos?",
};
const GENDERS: Array<{ id: Gender; label: string }> = [
  { id: "feminine", label: "Femenino" },
  { id: "masculine", label: "Masculino" },
  { id: "neutral", label: "Neutro" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${MES[(m ?? 1) - 1]} de ${y}`;
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
  const [a, setA] = useState<Profile>(EMPTY_PROFILE);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showDate, setShowDate] = useState(Platform.OS === "ios");
  const [showTime, setShowTime] = useState(Platform.OS === "ios");

  const reveal = useRef(new Animated.Value(0)).current;
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const canNext = stepComplete(step, a);

  // Reanima el revelado al cambiar de paso.
  useMemo(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 520, delay: 60, useNativeDriver: true }).start();
  }, [i, reveal]);

  const dateValue = useMemo(() => (a.birthDate ? new Date(a.birthDate + "T12:00:00") : new Date(1995, 0, 1, 12)), [a.birthDate]);
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
    if (!isProfileComplete(a)) return;
    setBusy(true);
    await setProfile(a);
    router.replace("/(tabs)");
  }

  const fade = { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  return (
    <View style={styles.root}>
      {/* Aura estrellada de cabecera */}
      <View style={[styles.aura, { height: 220 + insets.top }]}>
        <Starfield count={40} height={220 + insets.top} />
        <View style={[styles.glyph, { top: insets.top + 28 }]}>
          <Enso size={46} />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: 150 + insets.top, paddingBottom: insets.bottom + 120 }]}
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
                  placeholder="Tu nombre completo"
                  placeholderTextColor={colors.textFaint}
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
                        {a.birthDate ? prettyDate(a.birthDate) : "Elige tu fecha"}
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
                      themeVariant="dark"
                      accentColor={colors.gold}
                    />
                  )}
                </View>
              )}

              {step === "time" && (
                <View style={styles.center}>
                  {Platform.OS === "android" && a.timeKnown && (
                    <Pressable style={styles.input} onPress={() => setShowTime(true)}>
                      <Text style={[styles.inputText, !a.birthTime && styles.placeholder]}>
                        {a.birthTime || "Elige la hora"}
                      </Text>
                    </Pressable>
                  )}
                  {showTime && a.timeKnown && (
                    <DateTimePicker
                      value={timeValue}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTime}
                      themeVariant="dark"
                      accentColor={colors.gold}
                    />
                  )}
                  <Pressable style={styles.toggleRow} onPress={() => setA({ ...a, timeKnown: !a.timeKnown })}>
                    <Switch
                      value={!a.timeKnown}
                      onValueChange={(v) => setA({ ...a, timeKnown: !v })}
                      trackColor={{ false: colors.goldHair, true: colors.goldSoft }}
                      thumbColor={colors.gold}
                    />
                    <Text style={styles.toggleLabel}>No sé mi hora</Text>
                  </Pressable>
                  <Text style={styles.hint}>La hora afina tu carta; puedes dejarla para después.</Text>
                </View>
              )}

              {step === "place" && (
                <PlaceAutocomplete picked={a.place} onPick={(p) => setA({ ...a, place: p })} placeholder="Tu ciudad de nacimiento" />
              )}

              {step === "gender" && (
                <View style={styles.center}>
                  <View style={styles.genders}>
                    {GENDERS.map((g) => {
                      const on = a.gender === g.id;
                      return (
                        <Pressable
                          key={g.id}
                          style={[styles.gender, on && styles.genderOn]}
                          onPress={() => setA({ ...a, gender: g.id })}
                        >
                          <Text style={[styles.genderText, on && styles.genderTextOn]}>{g.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>Define el género con que te hablan tus lecturas.</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pie fijo: progreso + acciones */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.dots}>
          {STEPS.map((_, k) => (
            <View key={k} style={[styles.dot, k === i && styles.dotOn, k < i && styles.dotPast]} />
          ))}
        </View>
        <View style={styles.actions}>
          {i > 0 ? (
            <Pressable style={styles.back} onPress={() => setI(i - 1)} disabled={busy}>
              <Text style={styles.backText}>Atrás</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Pressable style={[styles.cta, !canNext && styles.ctaOff]} onPress={next} disabled={!canNext || busy}>
            <Text style={styles.ctaText}>{busy ? "Tejiendo tu mapa…" : last ? "Tejer mi mapa" : "Continuar"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  aura: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  glyph: { position: "absolute", alignSelf: "center" },
  scroll: { paddingHorizontal: space.xl, alignItems: "center" },
  stage: { width: "100%", maxWidth: 460, alignItems: "center" },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: fonts.sans,
    marginBottom: space.md,
  },
  question: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 38,
    fontFamily: fonts.serif,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: space.xxl,
  },
  field: { width: "100%" },
  center: { width: "100%", alignItems: "center" },
  input: {
    width: "100%",
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 4,
    color: colors.text,
    fontSize: 19,
    fontFamily: fonts.sans,
    textAlign: "center",
  },
  inputText: { color: colors.text, fontSize: 19, textAlign: "center", fontFamily: fonts.sans },
  placeholder: { color: colors.textFaint },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xl },
  toggleLabel: { color: colors.text, fontSize: 16, fontFamily: fonts.sans },
  hint: { color: colors.textDim, fontSize: 14, textAlign: "center", marginTop: space.lg, lineHeight: 20, fontFamily: fonts.sans },
  genders: { width: "100%", gap: space.md },
  gender: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: "center",
    backgroundColor: colors.panelSoft,
  },
  genderOn: { borderColor: colors.gold, backgroundColor: colors.goldFaint },
  genderText: { color: colors.textDim, fontSize: 17, fontFamily: fonts.sans },
  genderTextOn: { color: colors.gold },
  foot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    backgroundColor: colors.night,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.goldHair,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.sm, marginBottom: space.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.goldHair },
  dotOn: { backgroundColor: colors.gold, width: 22 },
  dotPast: { backgroundColor: colors.goldSoft },
  actions: { flexDirection: "row", alignItems: "center", gap: space.md },
  back: { paddingHorizontal: space.lg, paddingVertical: space.md },
  backSpacer: { width: 1 },
  backText: { color: colors.textDim, fontSize: 16, fontFamily: fonts.sans },
  cta: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: "center",
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: colors.nightDeep, fontSize: 17, fontWeight: "600", fontFamily: fonts.sans },
});
