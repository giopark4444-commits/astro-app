import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, type NumerologyResult } from "@aluna/core";
import { Enso } from "../../components/Enso";
import { Card, FadeIn, SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { numerologyContent } from "../../content/numerology";
import { fonts, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

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
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno + estrellas
    // ya viven en ThemedBackground (capa raíz, Task 2) — esta pantalla queda transparente.
    <View style={styles.root}>
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
        <Text style={styles.name} maxFontSizeMultiplier={1.2}>{profile ? firstName(profile.name) : t("hoy.traveler")}</Text>

        {result && (
          // "Numerología de hoy" — mismo card que el hero acentuado del mockup (num-row):
          // eyebrow + hero number en fonts.serifSemi/type.displaySm, sin badge circular.
          <FadeIn delay={0} style={styles.cardGapLg}>
            <Pressable
              onPress={() => router.push("/(tabs)/numeros")}
              accessibilityRole="button"
              accessibilityLabel={`${t("hoy.dayNumberTitle")} ${result.cycles.personalDay.value}`}
            >
              <Card accent>
                <View style={styles.todayTop}>
                  <View style={styles.todayLeft}>
                    <Text style={styles.eyebrow}>{t("hoy.dayNumberTitle")}</Text>
                    {dayLine && <Text style={styles.todayHint}>{dayLine}</Text>}
                  </View>
                  <Text style={styles.heroNumber} maxFontSizeMultiplier={1.2}>
                    {result.cycles.personalDay.value}
                  </Text>
                </View>

                <View style={styles.todaySats}>
                  <Sat styles={styles} label={t("hoy.dayNumberMonth")} value={result.cycles.personalMonth.value} />
                  <View style={styles.satDivider} />
                  <Sat styles={styles} label={t("hoy.dayNumberYear")} value={result.cycles.personalYear.value} />
                </View>
              </Card>
            </Pressable>
          </FadeIn>
        )}

        {result && (
          <FadeIn delay={60} style={styles.cardGapXxl}>
            <Pressable onPress={() => router.push("/(tabs)/numeros")}>
              <Card>
                <Text style={styles.eyebrow}>{t("hoy.lifePathEyebrow")}</Text>
                <View style={styles.lifeRow}>
                  <Text style={styles.heroNumber} maxFontSizeMultiplier={1.2}>
                    {result.core.lifePath.value}
                  </Text>
                  <Text style={styles.lifeGo}>{t("hoy.lifePathGo")}</Text>
                </View>
              </Card>
            </Pressable>
          </FadeIn>
        )}

        <FadeIn delay={120} style={styles.cardGapMd}>
          <Pressable onPress={() => router.push("/(tabs)/carta")}>
            <Card>
              <Text style={styles.soonTitle}>{t("hoy.cartaTitle")}</Text>
              <Text style={styles.soonBody}>{t("hoy.cartaBody")}</Text>
            </Card>
          </Pressable>
        </FadeIn>

        <Pressable style={styles.cardGapMd} onPress={() => router.push("/(tabs)/pilares")}>
          <Card>
            <Text style={styles.soonTitle}>{t("hoy.pilaresTitle")}</Text>
            <Text style={styles.soonBody}>{t("hoy.pilaresBody")}</Text>
          </Card>
        </Pressable>

        <FadeIn delay={150} style={styles.cardGapMd}>
          <Text style={styles.sectionLabel}>{t("universo.eyebrow")}</Text>
          <Pressable onPress={() => router.push("/compatibilidad")} style={styles.cardGapMd}>
            <Card accent>
              <Text style={styles.soonTitle}>{t("universo.compatTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.compatBody")}</Text>
            </Card>
          </Pressable>
          <View style={styles.cardGapMd}>
            <Card>
              <Text style={styles.soonTitle}>{t("universo.informesTitle")}</Text>
              <Text style={styles.soonBody}>{t("universo.informesBody")}</Text>
              <SoonBadge label={t("settings.soon")} />
            </Card>
          </View>
          <Card>
            <Text style={styles.soonTitle}>{t("universo.preguntarTitle")}</Text>
            <Text style={styles.soonBody}>{t("universo.preguntarBody")}</Text>
            <SoonBadge label={t("settings.soon")} />
          </Card>
        </FadeIn>

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
    <Card style={styles.cardGapMd}>
      <View style={styles.soonHead}>
        <Text style={styles.soonTitle}>{title}</Text>
        <SoonBadge label={soon} />
      </View>
      <Text style={styles.soonBody}>{body}</Text>
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl },

    brandRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xxl },
    brand: { color: t.acc, fontSize: typeScale.xl, letterSpacing: 2, fontFamily: fonts.serif },

    greeting: { color: t.textDim, fontSize: typeScale.lg, fontFamily: fonts.sans },
    name: {
      color: t.text,
      fontSize: typeScale.xl3,
      fontFamily: fonts.serifSemi,
      marginBottom: space.xxl,
    },

    // Espaciados entre cards — reemplazan el marginBottom que antes vivía dentro de
    // cada estilo de tarjeta local (ahora la tarjeta es <Card>, sin margen propio).
    cardGapLg: { marginBottom: space.lg },
    cardGapXxl: { marginBottom: space.xxl },
    cardGapMd: { marginBottom: space.md },

    // Eyebrow canónico (SPEC): 11px / letterSpacing 3 / uppercase / Quicksand semibold / acc.
    // Compartido por el eyebrow del día personal y el del camino de vida — ninguno de los
    // dos trae un título serif debajo, así que no encajan en <SectionHeading>.
    eyebrow: {
      color: t.acc,
      fontSize: typeScale.xs2,
      letterSpacing: 3,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },

    todayTop: { flexDirection: "row", alignItems: "center" },
    todayLeft: { flex: 1, paddingRight: space.lg },
    todayHint: { color: t.textDim, fontSize: typeScale.sm, lineHeight: 19, marginTop: space.sm, fontFamily: fonts.sans },
    // Número héroe: fonts.serifSemi a type.displaySm (política de la pasada de pantalla).
    // El día personal ya no vive en un badge circular — es un número libre, igual que el
    // camino de vida, por consistencia con la receta "num-hero" del mockup.
    heroNumber: { color: t.acc, fontSize: typeScale.displaySm, fontFamily: fonts.serifSemi },

    todaySats: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: space.lg,
      paddingTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.accHair,
    },
    sat: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space.sm },
    satN: { color: t.acc, fontSize: typeScale.xl, fontFamily: fonts.serif },
    satL: { color: t.textDim, fontSize: typeScale.xs, letterSpacing: 0.5, fontFamily: fonts.sans },
    satDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: t.accHair },

    lifeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm },
    lifeGo: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },

    sectionLabel: {
      color: t.textFaint,
      fontSize: typeScale.xs2,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: space.lg,
      fontFamily: fonts.sansSemi,
    },
    soonHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    soonTitle: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifItalic },
    soonBody: { color: t.textDim, fontSize: typeScale.md, lineHeight: 20, marginTop: space.sm, fontFamily: fonts.sans },
  });
}
