import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../../components/Enso";
import { SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useTheme, type ModePref } from "../../lib/theme-context";
import { useT, type Locale } from "../../lib/i18n-context";
import { formatPlace } from "../../lib/geocode";
import { THEMES, THEME_LABELS, fonts, radius, space, type ThemeName, type ThemeTokens } from "../../theme/tokens";

const prettyDate = (iso: string, locale: Locale) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const MES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return locale === "en" ? `${MON_EN[m - 1]} ${d}, ${y}` : `${d} de ${MES_ES[m - 1]} de ${y}`;
};

export default function AjustesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, reset } = useProfile();
  const { t: tk, theme, modePref, setTheme, setModePref } = useTheme();
  const { t, locale, setLocale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const genderLabel = (g: string) => {
    if (g === "feminine") return t("gender.feminine");
    if (g === "masculine") return t("gender.masculine");
    if (g === "neutral") return t("gender.neutral");
    return g;
  };

  function confirmReset() {
    Alert.alert(t("settings.resetConfirmTitle"), t("settings.resetConfirmBody"), [
      { text: t("settings.resetCancel"), style: "cancel" },
      {
        text: t("settings.resetConfirm"),
        style: "destructive",
        onPress: async () => {
          await reset();
          router.replace("/onboarding");
        },
      },
    ]);
  }

  const modeOptions: Array<{ id: ModePref; label: string }> = [
    { id: "light", label: t("settings.light") },
    { id: "dark", label: t("settings.dark") },
    { id: "auto", label: t("settings.auto") },
  ];
  const localeOptions: Array<{ id: Locale; label: string }> = [
    { id: "es", label: "Español" },
    { id: "en", label: "English" },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Enso size={24} />
          <Text style={styles.title}>{t("settings.title")}</Text>
        </View>

        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>{t("settings.profile")}</Text>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Row styles={styles} label={t("settings.birth")} value={prettyDate(profile.birthDate, locale)} />
            <Row
              styles={styles}
              label={t("settings.time")}
              value={profile.timeKnown && profile.birthTime ? profile.birthTime : t("settings.timeUnset")}
            />
            <Row styles={styles} label={t("settings.place")} value={profile.place ? formatPlace(profile.place) : "—"} />
            <Row styles={styles} label={t("settings.gender")} value={profile.gender ? genderLabel(profile.gender) : "—"} last />
          </View>
        )}

        {/* Apariencia: tema · modo de luz */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>{t("settings.appearance")}</Text>

          <Text style={styles.fieldLabel}>{t("settings.theme")}</Text>
          <View style={styles.themeRow}>
            {THEMES.map((th: ThemeName) => {
              const on = theme === th;
              return (
                <Pressable
                  key={th}
                  style={[styles.themeChip, on && styles.themeChipOn]}
                  onPress={() => setTheme(th)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.swatch, { backgroundColor: SWATCH[th] }]} />
                  <Text style={[styles.themeChipText, on && styles.themeChipTextOn]}>
                    {THEME_LABELS[locale][th]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>{t("settings.lightMode")}</Text>
          <Segmented
            styles={styles}
            options={modeOptions}
            value={modePref}
            onChange={(v) => setModePref(v as ModePref)}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>{t("settings.language")}</Text>
          <Segmented
            styles={styles}
            options={localeOptions}
            value={locale}
            onChange={(v) => setLocale(v as Locale)}
          />
        </View>

        {/* Sistemas */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>{t("settings.systems")}</Text>
          <SystemRow styles={styles} name={t("settings.sysNumerology")} status={t("settings.available")} on />
          <SystemRow styles={styles} name={t("settings.sysCarta")} status={t("settings.soon")} />
          <SystemRow styles={styles} name={t("settings.sysBazi")} status={t("settings.soon")} />
          <SystemRow styles={styles} name={t("settings.sysReadings")} status={t("settings.soon")} last />
        </View>

        <Pressable style={styles.reset} onPress={confirmReset}>
          <Text style={styles.resetText}>{t("settings.reset")}</Text>
        </Pressable>

        <Text style={styles.footNote}>{t("settings.footNote")}</Text>
        <Text style={styles.version}>{t("settings.offline")}</Text>
      </ScrollView>
    </View>
  );
}

/** Muestra del color de acento de cada tema en su chip (modo oscuro). */
const SWATCH: Record<ThemeName, string> = {
  observatory: "#e7c986",
  aurora: "#c9b8f2",
  cosmic: "#ff8ae0",
};

function Segmented<T extends string>({
  styles,
  options,
  value,
  onChange,
}: {
  styles: ReturnType<typeof makeStyles>;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            style={[styles.segOption, on && styles.segOptionOn]}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({
  styles,
  label,
  value,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SystemRow({
  styles,
  name,
  status,
  on,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  name: string;
  status: string;
  on?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[styles.rowLabel, styles.systemName]}>{name}</Text>
      {on ? <Text style={styles.systemOn}>{status}</Text> : <SoonBadge label={status} />}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    scroll: { paddingHorizontal: space.xl },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.xxl },
    title: { color: t.text, fontSize: 30, fontFamily: fonts.serif, fontStyle: "italic" },

    card: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.lg,
      backgroundColor: t.panelSoft,
      padding: space.xl,
      marginBottom: space.lg,
    },
    cardEyebrow: {
      color: t.acc,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sans,
    },
    profileName: { color: t.text, fontSize: 24, fontFamily: fonts.serif, fontStyle: "italic", marginBottom: space.lg },

    fieldLabel: {
      color: t.textDim,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sans,
    },
    fieldLabelGap: { marginTop: space.xl },

    // Selector de tema: chips con muestra de color + nombre.
    themeRow: { flexDirection: "row", gap: space.sm },
    themeChip: {
      flex: 1,
      alignItems: "center",
      gap: space.sm,
      paddingVertical: space.md,
      paddingHorizontal: space.xs,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      backgroundColor: t.panel,
    },
    themeChipOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: t.accHair },
    themeChipText: { color: t.textDim, fontSize: 12, fontFamily: fonts.sans, textAlign: "center" },
    themeChipTextOn: { color: t.acc },

    // Control segmentado (modo de luz, idioma).
    segment: {
      flexDirection: "row",
      backgroundColor: t.panel,
      borderRadius: radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: t.accHair,
    },
    segOption: { flex: 1, paddingVertical: space.sm + 2, alignItems: "center", borderRadius: radius.pill },
    segOptionOn: { backgroundColor: t.accFaint },
    segText: { color: t.textDim, fontSize: 14, fontFamily: fonts.sans },
    segTextOn: { color: t.acc, fontWeight: "600" },

    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { color: t.textDim, fontSize: 14, fontFamily: fonts.sans },
    rowValue: { color: t.text, fontSize: 14, fontFamily: fonts.sans, flexShrink: 1, textAlign: "right", marginLeft: space.lg },
    systemName: { color: t.text, fontSize: 15 },
    systemOn: { color: t.acc, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans },

    reset: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.md,
    },
    resetText: { color: t.acc, fontSize: 15, letterSpacing: 0.5, fontFamily: fonts.sans },

    footNote: { color: t.textDim, fontSize: 13, textAlign: "center", marginTop: space.xxl, fontFamily: fonts.serif, fontStyle: "italic" },
    version: { color: t.textFaint, fontSize: 12, textAlign: "center", marginTop: space.sm, lineHeight: 18, fontFamily: fonts.sans },
  });
}
