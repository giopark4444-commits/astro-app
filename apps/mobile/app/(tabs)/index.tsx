import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, type NumerologyResult } from "@aluna/core";
import { Starfield } from "../../components/Starfield";
import { Enso } from "../../components/Enso";
import { SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { colors, fonts, radius, space } from "../../theme/tokens";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Buena madrugada";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
};
const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();

  const result = useMemo<NumerologyResult | null>(() => {
    if (!profile) return null;
    try {
      return computeNumerology(profileToNumerologyInput(profile));
    } catch {
      return null;
    }
  }, [profile]);

  return (
    <View style={styles.root}>
      <View style={styles.sky} pointerEvents="none">
        <Starfield count={56} height={360} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Enso size={26} />
          <Text style={styles.brand}>Aluna</Text>
        </View>

        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name}>{profile ? firstName(profile.name) : "viajera"}</Text>

        {result && (
          <View style={styles.todayCard}>
            <View style={styles.todayLeft}>
              <Text style={styles.todayEyebrow}>Tu día personal</Text>
              <Text style={styles.todayHint}>El tono numérico de hoy. Tócalo en Números para su esencia.</Text>
            </View>
            <View style={styles.todayN}>
              <Text style={styles.todayNText}>{result.cycles.personalDay.value}</Text>
            </View>
          </View>
        )}

        {result && (
          <Pressable style={styles.lifeCard} onPress={() => router.push("/(tabs)/numeros")}>
            <Text style={styles.lifeEyebrow}>Camino de Vida</Text>
            <View style={styles.lifeRow}>
              <Text style={styles.lifeN}>{result.core.lifePath.value}</Text>
              <Text style={styles.lifeGo}>Ver mi mapa numérico  →</Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>Próximamente</Text>

        <View style={styles.soonCard}>
          <View style={styles.soonHead}>
            <Text style={styles.soonTitle}>Tu Clima</Text>
            <SoonBadge label="pronto" />
          </View>
          <Text style={styles.soonBody}>El clima energético de tus áreas de vida, día a día.</Text>
        </View>

        <View style={styles.soonCard}>
          <View style={styles.soonHead}>
            <Text style={styles.soonTitle}>Carta Astral</Text>
            <SoonBadge label="pronto" />
          </View>
          <Text style={styles.soonBody}>Tu rueda natal y sus interpretaciones, calculadas con precisión.</Text>
        </View>

        <View style={styles.soonCard}>
          <View style={styles.soonHead}>
            <Text style={styles.soonTitle}>Lecturas de Aluna</Text>
            <SoonBadge label="pronto" />
          </View>
          <Text style={styles.soonBody}>Lecturas evolutivas tejidas para ti, con la voz interior de Aluna.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  sky: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
  scroll: { paddingHorizontal: space.xl },

  brandRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xxl },
  brand: { color: colors.gold, fontSize: 20, letterSpacing: 2, fontFamily: fonts.serif },

  greeting: { color: colors.textDim, fontSize: 18, fontFamily: fonts.sans },
  name: { color: colors.text, fontSize: 36, fontFamily: fonts.serif, fontStyle: "italic", marginBottom: space.xxl },

  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.lg,
    backgroundColor: colors.panelSoft,
    padding: space.xl,
    marginBottom: space.lg,
  },
  todayLeft: { flex: 1, paddingRight: space.lg },
  todayEyebrow: { color: colors.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sans },
  todayHint: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginTop: space.sm, fontFamily: fonts.sans },
  todayN: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.goldFaint,
  },
  todayNText: { color: colors.gold, fontSize: 30, fontFamily: fonts.serif },

  lifeCard: {
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.lg,
    backgroundColor: colors.panelSoft,
    padding: space.xl,
    marginBottom: space.xxl,
  },
  lifeEyebrow: { color: colors.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sans },
  lifeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm },
  lifeN: { color: colors.text, fontSize: 44, fontFamily: fonts.serif },
  lifeGo: { color: colors.textDim, fontSize: 14, fontFamily: fonts.sans },

  sectionLabel: {
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: space.lg,
    fontFamily: fonts.sans,
  },
  soonCard: {
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.md,
    backgroundColor: "rgba(150,150,190,0.04)",
    padding: space.lg,
    marginBottom: space.md,
  },
  soonHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  soonTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.serif, fontStyle: "italic" },
  soonBody: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginTop: space.sm, fontFamily: fonts.sans },
});
