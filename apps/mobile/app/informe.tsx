import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, FadeIn } from "../components/ui";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useProfile } from "../lib/profile-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fetchReport, generateReport, regenerateReport, ReportsApiError, type ReportKind, type ReportStatusResponse } from "../lib/reports-api";
import { fonts, space, radius, type as typeScale, type ThemeTokens } from "../theme/tokens";

type CardState =
  | { s: "loading" }
  | { s: "none" }
  | { s: "generating" }
  | { s: "error" }
  | { s: "dormant" }
  | { s: "ready"; content: unknown; model: string | null };

const CURRENT_YEAR = new Date().getFullYear();

function toCardState(res: ReportStatusResponse): CardState {
  if ("available" in res) return { s: "dormant" };
  if (res.status === "none") return { s: "none" };
  if (res.status === "generating") return { s: "generating" };
  if (res.status === "error") return { s: "error" };
  if (res.status === "ready") return { s: "ready", content: res.content, model: res.model_used };
  return { s: "error" };
}

export default function InformeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [gate, setGate] = useState<"loading" | "plusRequired" | "ok">("loading");
  const [natal, setNatal] = useState<CardState>({ s: "loading" });
  const [solar, setSolar] = useState<CardState>({ s: "loading" });

  const accessToken = session?.access_token;
  const profileId = profile?.id;

  async function loadNatal() {
    if (!accessToken) return;
    try {
      const res = await fetchReport({ accessToken, kind: "natal", locale, year: null });
      setGate("ok");
      setNatal(toCardState(res));
    } catch (e) {
      if (e instanceof ReportsApiError && e.status === 403) {
        setGate("plusRequired");
        return;
      }
      setNatal({ s: "error" });
    }
  }

  async function loadSolar() {
    if (!accessToken) return;
    try {
      const res = await fetchReport({ accessToken, kind: "solar_return", locale, year: CURRENT_YEAR });
      setSolar(toCardState(res));
    } catch (e) {
      if (!(e instanceof ReportsApiError && e.status === 403)) setSolar({ s: "error" });
    }
  }

  useEffect(() => {
    loadNatal();
    loadSolar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, locale]);

  async function onGenerate(kind: ReportKind) {
    if (!accessToken || !profileId) return;
    const setState = kind === "natal" ? setNatal : setSolar;
    setState({ s: "generating" });
    try {
      const res = await generateReport({ accessToken, profileId, kind, locale, year: kind === "solar_return" ? CURRENT_YEAR : null });
      setState(toCardState(res));
    } catch {
      setState({ s: "error" });
    }
  }

  async function onRegenerate(kind: ReportKind) {
    if (!accessToken || !profileId) return;
    const setState = kind === "natal" ? setNatal : setSolar;
    setState({ s: "generating" });
    try {
      const res = await regenerateReport({ accessToken, profileId, kind, locale, year: kind === "solar_return" ? CURRENT_YEAR : null });
      setState(toCardState(res));
    } catch {
      setState({ s: "error" });
    }
  }

  function onRefresh(kind: ReportKind) {
    if (kind === "natal") loadNatal();
    else loadSolar();
  }

  const back = () => router.back();

  if (!profileId) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <View style={styles.emptyWrap}>
          <Enso size={44} />
          <Text style={styles.emptyTitle}>{t("informe.needProfileTitle")}</Text>
          <Text style={styles.emptyBody}>{t("informe.needProfileBody")}</Text>
        </View>
      </View>
    );
  }

  if (gate === "plusRequired") {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
          <Card>
            <Text style={styles.paywallTitle}>
              {t("informe.paywallTitle")} <Text style={styles.paywallBrand}>{t("informe.paywallBrand")}</Text>
            </Text>
            <Text style={styles.paywallBody}>{t("informe.paywallBody")}</Text>
            <Pressable style={styles.cta} accessibilityRole="button">
              <Text style={styles.ctaText}>{t("informe.paywallCta")}</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header t={t} styles={styles} onBack={back} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>{t("informe.title")}</Text>
          <Text style={styles.subtitle}>{t("informe.subtitle")}</Text>
        </FadeIn>

        <FadeIn delay={60} style={styles.cardGap}>
          <ReportCard
            kind="natal"
            state={natal}
            eyebrow={t("informe.natalEyebrow")}
            title={t("informe.natalTitle")}
            t={t}
            styles={styles}
            onGenerate={() => onGenerate("natal")}
            onRegenerate={() => onRegenerate("natal")}
            onRefresh={() => onRefresh("natal")}
            onRead={() => router.push({ pathname: "/informe-lectura", params: { kind: "natal" } })}
          />
        </FadeIn>

        <FadeIn delay={120} style={styles.cardGap}>
          <ReportCard
            kind="solar_return"
            state={solar}
            eyebrow={t("informe.solarEyebrow").replace("{year}", String(CURRENT_YEAR))}
            title={t("informe.solarTitle")}
            t={t}
            styles={styles}
            onGenerate={() => onGenerate("solar_return")}
            onRegenerate={() => onRegenerate("solar_return")}
            onRefresh={() => onRefresh("solar_return")}
            onRead={() => router.push({ pathname: "/informe-lectura", params: { kind: "solar_return", year: String(CURRENT_YEAR) } })}
          />
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function Header({ t, styles, onBack }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles>; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{t("universo.informesTitle")}</Text>
    </View>
  );
}

function ReportCard({
  kind,
  state,
  eyebrow,
  title,
  t,
  styles,
  onGenerate,
  onRegenerate,
  onRefresh,
  onRead,
}: {
  kind: ReportKind;
  state: CardState;
  eyebrow: string;
  title: string;
  t: (k: string) => string;
  styles: ReturnType<typeof makeStyles>;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRefresh: () => void;
  onRead: () => void;
}) {
  return (
    <Card accent={state.s === "ready"}>
      <Text style={styles.cardEyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {state.s === "loading" && <Text style={styles.note}>…</Text>}
      {state.s === "none" && (
        <>
          <Text style={styles.note}>{t("informe.none")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onGenerate} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.generate")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "generating" && (
        <>
          <Text style={styles.note}>{t("informe.generating")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onRefresh} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.update")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "error" && (
        <>
          <Text style={styles.note}>{t("informe.error")}</Text>
          <Pressable style={styles.ctaGhost} onPress={onRegenerate} accessibilityRole="button">
            <Text style={styles.ctaGhostText}>{t("informe.retry")}</Text>
          </Pressable>
        </>
      )}
      {state.s === "dormant" && (
        <>
          <Text style={styles.cardEyebrow}>{t("informe.dormantTitle")}</Text>
          <Text style={styles.note}>{t("informe.dormantBody")}</Text>
        </>
      )}
      {state.s === "ready" && (
        <>
          <View style={styles.rowGap}>
            <Pressable style={[styles.cta, styles.ctaFlex]} onPress={onRead} accessibilityRole="button">
              <Text style={styles.ctaText}>{t("informe.read")}</Text>
            </Pressable>
            <Pressable style={styles.ctaGhost} onPress={onRegenerate} accessibilityRole="button">
              <Text style={styles.ctaGhostText}>{t("informe.regenerate")}</Text>
            </Pressable>
          </View>
          {state.model && <Text style={styles.meta}>{t("informe.generatedWith").replace("{model}", state.model)}</Text>}
        </>
      )}
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg, gap: space.sm },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    title: { color: t.text, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi, marginTop: space.lg },
    subtitle: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, marginTop: space.sm },
    cardGap: { marginTop: space.xl },
    cardEyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    cardTitle: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, marginTop: space.xs },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.md },
    rowGap: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
    cta: { backgroundColor: t.acc, borderRadius: radius.pill, paddingVertical: space.md, alignItems: "center", paddingHorizontal: space.xl },
    ctaFlex: { flex: 1 },
    ctaText: { color: t.onAcc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    ctaGhost: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingVertical: space.md, alignItems: "center", marginTop: space.lg },
    ctaGhostText: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    meta: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, marginTop: space.sm },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl },
    emptyTitle: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi, textAlign: "center" },
    emptyBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", lineHeight: 20 },
    paywallTitle: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifItalic, marginTop: space.md },
    paywallBrand: { color: t.acc, fontFamily: fonts.serifSemi },
    paywallBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, marginTop: space.md, lineHeight: 20 },
  });
}
