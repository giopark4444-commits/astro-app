import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, type NumerologyResult } from "@aluna/core";
import { Starfield } from "../../components/Starfield";
import { Enso } from "../../components/Enso";
import { SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { numerologyContent } from "../../content/numerology";
import { fonts, radius, space, type ThemeTokens } from "../../theme/tokens";

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return t("hoy.greetingDawn");
    if (h < 12) return t("hoy.greetingMorning");
    if (h < 20) return t("hoy.greetingAfternoon");
    return t("hoy.greetingNight");
  };

  const result = useMemo<NumerologyResult | null>(() => {
    if (!profile) return null;
    try {
      return computeNumerology(profileToNumerologyInput(profile));
    } catch {
      return null;
    }
  }, [profile]);

  const dayLine = result ? numerologyContent(locale).personalDay[result.cycles.personalDay.value] : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.sky} pointerEvents="none">
        <Starfield count={56} height={360} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Enso size={26} />
          <Text style={styles.brand}>{t("app.name")}</Text>
        </View>

        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name}>{profile ? firstName(profile.name) : t("hoy.traveler")}</Text>

        {result && (
          <Pressable
            style={styles.todayCard}
            onPress={() => router.push("/(tabs)/numeros")}
            accessibilityRole="button"
            accessibilityLabel={`${t("hoy.dayNumberTitle")} ${result.cycles.personalDay.value}`}
          >
            <View style={styles.todayTop}>
              <View style={styles.todayLeft}>
                <Text style={styles.todayEyebrow}>{t("hoy.dayNumberTitle")}</Text>
                {dayLine && <Text style={styles.todayHint}>{dayLine}</Text>}
              </View>
              <View style={styles.todayN}>
                <Text style={styles.todayNText}>{result.cycles.personalDay.value}</Text>
              </View>
            </View>

            <View style={styles.todaySats}>
              <Sat styles={styles} label={t("hoy.dayNumberMonth")} value={result.cycles.personalMonth.value} />
              <View style={styles.satDivider} />
              <Sat styles={styles} label={t("hoy.dayNumberYear")} value={result.cycles.personalYear.value} />
            </View>
          </Pressable>
        )}

        {result && (
          <Pressable style={styles.lifeCard} onPress={() => router.push("/(tabs)/numeros")}>
            <Text style={styles.lifeEyebrow}>{t("hoy.lifePathEyebrow")}</Text>
            <View style={styles.lifeRow}>
              <Text style={styles.lifeN}>{result.core.lifePath.value}</Text>
              <Text style={styles.lifeGo}>{t("hoy.lifePathGo")}</Text>
            </View>
          </Pressable>
        )}

        <Pressable style={styles.soonCard} onPress={() => router.push("/(tabs)/carta")}>
          <Text style={styles.soonTitle}>{t("hoy.cartaTitle")}</Text>
          <Text style={styles.soonBody}>{t("hoy.cartaBody")}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{t("hoy.soon")}</Text>

        <SoonCard styles={styles} title={t("hoy.climateTitle")} body={t("hoy.climateBody")} soon={t("settings.soon")} />
        <SoonCard styles={styles} title={t("hoy.readingsTitle")} body={t("hoy.readingsBody")} soon={t("settings.soon")} />
      </ScrollView>
    </View>
  );
}

function Sat({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.sat}>
      <Text style={styles.satN}>{value}</Text>
      <Text style={styles.satL}>{label}</Text>
    </View>
  );
}

function SoonCard({
  styles,
  title,
  body,
  soon,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  body: string;
  soon: string;
}) {
  return (
    <View style={styles.soonCard}>
      <View style={styles.soonHead}>
        <Text style={styles.soonTitle}>{title}</Text>
        <SoonBadge label={soon} />
      </View>
      <Text style={styles.soonBody}>{body}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    sky: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
    scroll: { paddingHorizontal: space.xl },

    brandRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xxl },
    brand: { color: t.acc, fontSize: 20, letterSpacing: 2, fontFamily: fonts.serif },

    greeting: { color: t.textDim, fontSize: 18, fontFamily: fonts.sans },
    name: {
      color: t.text,
      fontSize: 36,
      fontFamily: fonts.serif,
      fontStyle: "italic",
      marginBottom: space.xxl,
    },

    todayCard: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.lg,
      backgroundColor: t.panelSoft,
      padding: space.xl,
      marginBottom: space.lg,
    },
    todayTop: { flexDirection: "row", alignItems: "center" },
    todayLeft: { flex: 1, paddingRight: space.lg },
    todayEyebrow: {
      color: t.acc,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
    },
    todayHint: { color: t.textDim, fontSize: 13, lineHeight: 19, marginTop: space.sm, fontFamily: fonts.sans },
    todayN: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.accSoft,
      backgroundColor: t.accFaint,
    },
    todayNText: { color: t.acc, fontSize: 30, fontFamily: fonts.serif },

    todaySats: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: space.lg,
      paddingTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.accHair,
    },
    sat: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space.sm },
    satN: { color: t.acc, fontSize: 20, fontFamily: fonts.serif },
    satL: { color: t.textDim, fontSize: 12, letterSpacing: 0.5, fontFamily: fonts.sans },
    satDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: t.accHair },

    lifeCard: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.lg,
      backgroundColor: t.panelSoft,
      padding: space.xl,
      marginBottom: space.xxl,
    },
    lifeEyebrow: {
      color: t.acc,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
    },
    lifeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: space.sm,
    },
    lifeN: { color: t.text, fontSize: 44, fontFamily: fonts.serif },
    lifeGo: { color: t.textDim, fontSize: 14, fontFamily: fonts.sans },

    sectionLabel: {
      color: t.textFaint,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: space.lg,
      fontFamily: fonts.sans,
    },
    soonCard: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      backgroundColor: t.panelSoft,
      padding: space.lg,
      marginBottom: space.md,
    },
    soonHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    soonTitle: { color: t.text, fontSize: 18, fontFamily: fonts.serif, fontStyle: "italic" },
    soonBody: { color: t.textDim, fontSize: 14, lineHeight: 20, marginTop: space.sm, fontFamily: fonts.sans },
  });
}
