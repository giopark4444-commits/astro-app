import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Chip, FadeIn } from "../components/ui";
import { Enso } from "../components/Enso";
import { useAuth } from "../lib/auth-context";
import { useProfile } from "../lib/profile-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { getSupabase } from "../lib/supabase";
import { fetchAllProfiles } from "../lib/profile-sync";
import { fetchSynastry, SynastryApiError, type SynastryReport, type SynastryTheme } from "../lib/synastry-api";
import type { Profile } from "../lib/profile";
import { fonts, space, radius, type as typeScale, type ThemeTokens } from "../theme/tokens";

type State =
  | { s: "picking" }
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; report: SynastryReport };

const THEME_ORDER: SynastryTheme[] = ["attraction", "communication", "harmony", "growth"];

export default function CompatibilidadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [people, setPeople] = useState<Profile[] | null>(null);
  const [idA, setIdA] = useState<string | null>(profile?.id ?? null);
  const [idB, setIdB] = useState<string | null>(null);
  const [state, setState] = useState<State>({ s: "picking" });
  const [expanded, setExpanded] = useState<SynastryTheme | null>(null);

  // Invalida cualquier fetch en vuelo: cada compare() captura el valor actual;
  // si cambia la selección (pick) o el componente se desmonta antes de que
  // resuelva, el setState de esa respuesta vieja se descarta (review Fase 5 —
  // sin esto, cambiar de persona mientras carga podía mostrar un resultado que
  // ya no correspondía a lo seleccionado en pantalla).
  const requestRef = useRef(0);

  useEffect(() => {
    if (!session?.user.id) return;
    let alive = true;
    fetchAllProfiles(getSupabase(), session.user.id).then((list) => {
      if (alive) setPeople(list);
    });
    return () => {
      alive = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    return () => {
      requestRef.current += 1; // desmontado: invalida cualquier compare() en vuelo
    };
  }, []);

  // cambiar cualquier selección invalida un resultado ya mostrado (y cualquier
  // fetch de synastry todavía en vuelo, vía requestRef).
  function pick(which: "A" | "B", id: string) {
    requestRef.current += 1;
    if (which === "A") setIdA(id === idB ? idA : id);
    else setIdB(id === idA ? idB : id);
    if (state.s !== "picking") setState({ s: "picking" });
  }

  async function compare() {
    if (!idA || !idB || !session?.access_token) {
      setState({ s: "error" });
      return;
    }
    const myRequest = ++requestRef.current;
    setState({ s: "loading" });
    try {
      const report = await fetchSynastry({ accessToken: session.access_token, profileIdA: idA, profileIdB: idB });
      if (requestRef.current === myRequest) setState({ s: "ready", report });
    } catch (e) {
      if (requestRef.current === myRequest) setState({ s: "error" });
    }
  }

  const back = () => router.back();

  if (people === null) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
      </View>
    );
  }

  if (people.length < 2) {
    return (
      <View style={styles.root}>
        <Header t={t} styles={styles} onBack={back} />
        <View style={styles.emptyWrap}>
          <Enso size={44} />
          <Text style={styles.emptyTitle}>{t("compat.needSecondTitle")}</Text>
          <Text style={styles.emptyBody}>{t("compat.needSecondBody")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header t={t} styles={styles} onBack={back} />
      <ScrollView
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: insets.bottom + space.xxxl, paddingHorizontal: space.xl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>{t("compat.title")}</Text>
          <Text style={styles.subtitle}>{t("compat.subtitle")}</Text>
        </FadeIn>

        <FadeIn delay={60} style={styles.cardGap}>
          <Picker label={t("compat.you")} people={people} selectedId={idA} otherId={idB} onPick={(id) => pick("A", id)} styles={styles} />
        </FadeIn>

        <FadeIn delay={120} style={styles.cardGap}>
          <Picker label={t("compat.withWhom")} people={people} selectedId={idB} otherId={idA} onPick={(id) => pick("B", id)} styles={styles} />
        </FadeIn>

        {state.s === "ready" && (
          <FadeIn delay={0} style={styles.cardGap}>
            <ResultCard report={state.report} t={t} styles={styles} tk={tk} expanded={expanded} setExpanded={setExpanded} />
          </FadeIn>
        )}

        {state.s === "error" && <Text style={styles.note}>{t("compat.error")}</Text>}

        <Pressable
          onPress={compare}
          disabled={!idA || !idB || !session?.access_token || state.s === "loading"}
          style={[styles.cta, (!idA || !idB || !session?.access_token || state.s === "loading") && styles.ctaDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{state.s === "loading" ? t("compat.loading") : t("compat.cta")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Header({ t, styles, onBack }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles>; onBack: () => void }) {
  return (
    <View style={[styles.header]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} style={styles.backBtn}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{t("compat.eyebrow")}</Text>
    </View>
  );
}

function Picker({
  label,
  people,
  selectedId,
  otherId,
  onPick,
  styles,
}: {
  label: string;
  people: Profile[];
  selectedId: string | null;
  otherId: string | null;
  onPick: (id: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerRow}>
        {people.map((p) => {
          if (!p.id) return null;
          const disabled = p.id === otherId;
          return (
            <Chip
              key={p.id}
              label={p.name}
              kind="control"
              selected={p.id === selectedId}
              disabled={disabled}
              onPress={disabled ? undefined : () => onPick(p.id!)}
            />
          );
        })}
      </View>
    </View>
  );
}

function ResultCard({
  report,
  t,
  styles,
  tk,
  expanded,
  setExpanded,
}: {
  report: SynastryReport;
  t: (k: string) => string;
  styles: ReturnType<typeof makeStyles>;
  tk: ThemeTokens;
  expanded: SynastryTheme | null;
  setExpanded: (v: SynastryTheme | null) => void;
}) {
  const themeLabel: Record<SynastryTheme, string> = {
    attraction: t("compat.themeAttraction"),
    communication: t("compat.themeCommunication"),
    harmony: t("compat.themeHarmony"),
    growth: t("compat.themeGrowth"),
  };
  return (
    <Card accent>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreNum} maxFontSizeMultiplier={1.2}>{report.overall}</Text>
        <Text style={styles.scoreOf}>{t("compat.of100")}</Text>
      </View>
      {THEME_ORDER.map((key) => {
        const theme = report.themes.find((th) => th.key === key);
        if (!theme) return null;
        const isOpen = expanded === key;
        return (
          <Pressable key={key} onPress={() => setExpanded(isOpen ? null : key)} style={styles.themeRow}>
            <View style={styles.themeHead}>
              <Text style={styles.themeName}>
                {themeLabel[key]}
                {key === "growth" && <Text style={styles.themeHint}>  {t("compat.growthHint")}</Text>}
              </Text>
              <Text style={styles.themeScore}>{theme.score}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${theme.score}%`, backgroundColor: tk.acc }]} />
            </View>
            {isOpen && (
              <Text style={styles.driversText}>
                {theme.drivers.length > 0
                  ? theme.drivers.map((d) => `${d.a} ${d.aspect} ${d.b}`).join(" · ")
                  : t("compat.noDrivers")}
              </Text>
            )}
          </Pressable>
        );
      })}
      <Text style={styles.framing}>{t("compat.framing")}</Text>
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
    subtitle: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, marginTop: space.sm },
    cardGap: { marginTop: space.xl },
    pickerLabel: { color: t.textFaint, fontSize: typeScale.xs2, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi, marginBottom: space.sm },
    pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl },
    emptyTitle: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi, textAlign: "center" },
    emptyBody: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", lineHeight: 20 },
    note: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans, textAlign: "center", marginTop: space.lg },
    cta: { marginTop: space.xxl, backgroundColor: t.acc, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: "center" },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: t.onAcc, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    scoreRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space.xs, marginBottom: space.lg },
    scoreNum: { color: t.acc, fontSize: typeScale.display, fontFamily: fonts.serifSemi },
    scoreOf: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans },
    themeRow: { marginTop: space.md },
    themeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    themeName: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    themeHint: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans },
    themeScore: { color: t.acc, fontSize: typeScale.lg, fontFamily: fonts.serif },
    track: { height: 5, borderRadius: radius.pill, backgroundColor: t.accHair, marginTop: space.xs, overflow: "hidden" },
    fill: { height: "100%", borderRadius: radius.pill },
    driversText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.sm },
    framing: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, textAlign: "center", marginTop: space.xl, lineHeight: 18 },
  });
}
