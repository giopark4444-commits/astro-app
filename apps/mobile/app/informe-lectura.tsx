import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fetchReport, type NatalReport, type SolarReport, type ReportKind } from "../lib/reports-api";
import { fonts, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type State = { s: "loading" } | { s: "error" } | { s: "ready"; natal: NatalReport } | { s: "readySolar"; solar: SolarReport };

export default function InformeLecturaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: string; year?: string }>();
  const kind = (params.kind === "solar_return" ? "solar_return" : "natal") as ReportKind;
  const year = params.year ? Number(params.year) : null;
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [state, setState] = useState<State>({ s: "loading" });

  useEffect(() => {
    if (!session?.access_token) return;
    let alive = true;
    // Fase 5 (review Fable 5): sin `locale` real, un usuario en inglés generaba
    // la fila con locale="en" pero la lectura pedía "es" — 0 filas → error
    // siempre. Debe usar el MISMO locale con que se generó/consultó la portada.
    fetchReport({ accessToken: session.access_token, kind, locale, year })
      .then((res) => {
        if (!alive) return;
        if ("status" in res && res.status === "ready") {
          if (kind === "natal") setState({ s: "ready", natal: res.content as NatalReport });
          else setState({ s: "readySolar", solar: res.content as SolarReport });
        } else {
          setState({ s: "error" });
        }
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [session?.access_token, kind, year, locale]);

  const back = () => router.back();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {state.s === "loading" && <Text style={styles.note}>…</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("informe.error")}</Text>}

        {state.s === "ready" && (
          <>
            <Text style={styles.sectionTitle}>{t("informe.sectionIntro")}</Text>
            <Text style={styles.body}>{state.natal.intro}</Text>
            {state.natal.sections.map((sec) => (
              <View key={sec.key} style={styles.sectionGap}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                <Text style={styles.body}>{sec.body}</Text>
              </View>
            ))}
            <View style={styles.sectionGap}>
              <Text style={styles.sectionTitle}>{t("informe.sectionOutro")}</Text>
              <Text style={styles.body}>{state.natal.outro}</Text>
            </View>
          </>
        )}

        {state.s === "readySolar" && (
          <>
            <Text style={styles.sectionTitle}>{t("informe.solarEssay")}</Text>
            <Text style={styles.body}>{state.solar.essay}</Text>
            {state.solar.themes.map((theme, i) => (
              <View key={i} style={styles.sectionGap}>
                <Text style={styles.sectionTitle}>{`${i + 1}. ${theme.title}`}</Text>
                <Text style={styles.body}>{`${t("informe.solarWhy")}: ${theme.why}`}</Text>
                <Text style={styles.body}>{`${t("informe.solarInvitation")}: ${theme.invitation}`}</Text>
              </View>
            ))}
            <View style={styles.sectionGap}>
              <Text style={styles.mantra}>{state.solar.mantra}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.xxl, textAlign: "center" },
    sectionTitle: { color: t.acc, fontSize: typeScale.xl, fontFamily: fonts.serifSemi, marginTop: space.xl },
    sectionGap: { marginTop: space.xl },
    body: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serif, lineHeight: 24, marginTop: space.sm },
    mantra: { color: t.text, fontSize: typeScale.xl, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.xxl },
  });
}
