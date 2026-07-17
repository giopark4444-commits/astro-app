// apps/mobile/app/(tabs)/index.tsx
// Hoy = hub de clima astrológico (mockup docs/redesign/movil-mockups/screens-compacta/01-hoy-hub.html,
// R4/Task 3b). Reconstrucción completa: el hub numerológico anterior (día
// personal + camino de vida + teasers Carta/Pilares + "Próximamente") sale de
// Hoy por completo — así lo manda el mockup (la numerología vive en Números).
// Solo "TU UNIVERSO" se conserva, restilada al mockup.
//
// Data-flow (3 fetches independientes, cada uno degrada su PROPIA sección sin
// tumbar el resto — brief T3b):
//   1) fetchChart(transits) → signo lunar + signo solar. Los bodies YA traen
//      `.sign` calculado server-side (mismo dato que usa carta.tsx vía
//      `byKey.get("sun").sign` / `.get("moon").sign`) — no hace falta
//      recomputar con signOfLongitude()/moonPhase() para este mockup (que solo
//      pinta signo, nunca fase lunar actual; a diferencia del header de Hoy en
//      la web, que sí compone "Luna {fase} en {signo}" — otro mockup, otro texto).
//   2) fetchScores(profileId, "today") → 6 áreas; se usan 4 (amor/trabajo/salud/suerte).
//   3) fetchWesternHoroscope(signoSolar, "month") → SOLO para `events`, filtrando
//      la primera lunación ≥ hoy (depende del resultado de 1).
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { BodyPosition } from "@aluna/core";
import { LIFE_AREA_COLORS } from "@aluna/core";
import { Enso } from "../../components/Enso";
import { Card, FadeIn } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { astroLabels } from "../../content/astrology";
import { DAY_VOICE, MOON_ENERGY } from "../../content/day-voice";
import { fetchChart } from "../../lib/chart-api";
import { fetchScores, type ScoreAreaResult } from "../../lib/scores-api";
import { fetchWesternHoroscope, type SkyEventJson } from "../../lib/horoscope-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

type ChartState =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; moonSign: string; sunSign: string };

type ScoresState = { s: "loading" } | { s: "error" } | { s: "ready"; areas: ScoreAreaResult[] };

type LunationEvent = Extract<SkyEventJson, { kind: "lunation" }>;
type EventState = { s: "loading" } | { s: "error" } | { s: "ready"; event: LunationEvent | null };

const ENERGY_AREAS: Array<{ key: "love" | "work" | "health" | "luck"; labelKey: "areaLove" | "areaWork" | "areaHealth" | "areaLuck" }> = [
  { key: "love", labelKey: "areaLove" },
  { key: "work", labelKey: "areaWork" },
  { key: "health", labelKey: "areaHealth" },
  { key: "luck", labelKey: "areaLuck" },
];

/** "Domingo 13 de julio" (es) / "Sunday, July 13" (en) — cálculo local, sin API
 *  (gap-analysis §B.1: "dato: se computa client-side con Date+locale"). */
function formatDateLine(locale: string): string {
  const now = new Date();
  const intlLocale = locale === "en" ? "en-US" : "es-ES";
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(now);
  const month = new Intl.DateTimeFormat(intlLocale, { month: "long" }).format(now);
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  if (locale === "en") {
    return `${capWeekday}, ${month.charAt(0).toUpperCase() + month.slice(1)} ${now.getDate()}`;
  }
  return `${capWeekday} ${now.getDate()} de ${month}`;
}

/** Días de calendario (no horas) entre hoy y `iso`, en la tz dada — evita que un
 *  evento "esta noche" a horas distintas de la actual cuente como "mañana" por
 *  un redondeo de 24h. Trick en-CA: formatea a "YYYY-MM-DD" directo. */
function daysUntil(iso: string, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const toUtcMidnight = (d: Date) => new Date(`${fmt.format(d)}T00:00:00Z`).getTime();
  return Math.round((toUtcMidnight(new Date(iso)) - toUtcMidnight(new Date())) / 86_400_000);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { t: tk, paletteMode } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);

  const profileId = profile?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  const [chartState, setChartState] = useState<ChartState>({ s: "loading" });
  const [scoresState, setScoresState] = useState<ScoresState>({ s: "loading" });
  const [eventState, setEventState] = useState<EventState>({ s: "loading" });

  // 1) Tránsitos de hoy → signo lunar + signo solar. Mismo cliente que carta.tsx
  // (fetchChart), que no expone AbortSignal — el guard `alive` (sin
  // AbortController real) es el mismo patrón ya establecido ahí y en
  // horoscopo.tsx para esta misma familia de llamadas.
  useEffect(() => {
    if (!profileId || !accessToken) {
      setChartState({ s: "error" });
      return;
    }
    let alive = true;
    setChartState({ s: "loading" });
    fetchChart({ accessToken, profileId, kind: "transits" })
      .then((res) => {
        if (!alive) return;
        const byKey = new Map<string, BodyPosition>(res.chart.bodies.map((b) => [b.body, b]));
        const sun = byKey.get("sun");
        const moon = byKey.get("moon");
        if (!sun || !moon) {
          setChartState({ s: "error" });
          return;
        }
        setChartState({ s: "ready", moonSign: moon.sign, sunSign: sun.sign });
      })
      .catch(() => {
        if (alive) setChartState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [profileId, accessToken]);

  // 2) "Tu energía de hoy" — independiente del chart, mismo profileId/token.
  useEffect(() => {
    if (!profileId || !accessToken) {
      setScoresState({ s: "error" });
      return;
    }
    let alive = true;
    setScoresState({ s: "loading" });
    fetchScores({ accessToken, profileId, period: "today" })
      .then((res) => {
        if (alive) setScoresState({ s: "ready", areas: res.areas });
      })
      .catch(() => {
        if (alive) setScoresState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [profileId, accessToken]);

  // 3) Próximo evento lunar — depende del signo solar resuelto en (1); solo se
  // usa `events` de la respuesta (áreas/casas del payload no aplican en Hoy).
  const sunSign = chartState.s === "ready" ? chartState.sunSign : null;
  const chartErrored = chartState.s === "error";
  useEffect(() => {
    if (chartErrored) {
      setEventState({ s: "error" });
      return;
    }
    if (!sunSign || !accessToken) return; // el chart sigue cargando: se queda en "loading"
    let alive = true;
    setEventState({ s: "loading" });
    fetchWesternHoroscope({ accessToken, sign: sunSign, period: "month", tz })
      .then((res) => {
        if (!alive) return;
        const next = res.events
          .filter((e): e is LunationEvent => e.kind === "lunation" && daysUntil(e.atIso, tz) >= 0)
          .sort((a, b) => a.atIso.localeCompare(b.atIso))[0];
        setEventState({ s: "ready", event: next ?? null });
      })
      .catch(() => {
        if (alive) setEventState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [sunSign, chartErrored, accessToken, tz]);

  const dateLine = useMemo(() => formatDateLine(locale), [locale]);
  const displayName = profile ? firstName(profile.name) : t("hoy.traveler");

  const moonSign = chartState.s === "ready" ? chartState.moonSign : null;
  const voiceLine = moonSign ? (DAY_VOICE[moonSign]?.[locale] ?? null) : null;
  const energyWord = moonSign ? (MOON_ENERGY[moonSign]?.[locale] ?? null) : null;

  const scoreByArea = useMemo(() => {
    const m = new Map<string, ScoreAreaResult>();
    if (scoresState.s === "ready") for (const a of scoresState.areas) m.set(a.area, a);
    return m;
  }, [scoresState]);
  const loveScore = scoreByArea.get("love")?.score;
  const workScore = scoreByArea.get("work")?.score;

  return (
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno + estrellas
    // ya viven en ThemedBackground (capa raíz, Task 2) — esta pantalla queda transparente.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Text style={styles.brandEyebrow}>{t("app.name")}</Text>
          <Enso size={20} />
        </View>

        <View style={styles.greet}>
          <Text style={styles.dateLine}>{dateLine}</Text>
          <Text style={styles.h1} maxFontSizeMultiplier={1.2}>
            {t("hoy.title", { name: displayName })}
          </Text>
          {chartState.s === "loading" ? (
            <Skeleton width="82%" height={19} />
          ) : voiceLine ? (
            <Text style={styles.voice} numberOfLines={1}>
              {voiceLine}
            </Text>
          ) : (
            <Text style={styles.note}>{t("hoy.voiceUnavailable")}</Text>
          )}
        </View>

        <FadeIn delay={40}>
          <Card style={styles.cardMini}>
            {chartState.s === "loading" ? (
              <Skeleton width="70%" height={13} />
            ) : moonSign && energyWord ? (
              <Text style={styles.roman} numberOfLines={2}>
                {t("hoy.moonRoman", {
                  sign: (L.signs[moonSign] ?? moonSign).toUpperCase(),
                  energy: energyWord.toUpperCase(),
                })}
              </Text>
            ) : (
              <Text style={styles.note}>{t("hoy.moonUnavailable")}</Text>
            )}
            {scoresState.s === "ready" && loveScore != null && workScore != null && (
              <View style={styles.miniChips}>
                <MiniChip styles={styles} label={t("hoy.areaLove")} value={loveScore} />
                <MiniChip styles={styles} label={t("hoy.areaWork")} value={workScore} />
              </View>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={80} style={styles.energySec}>
          <Text style={styles.eyebrow}>{t("hoy.energyEyebrow")}</Text>
          <Card style={styles.energyCard}>
            {scoresState.s === "loading" ? (
              <View style={styles.energySkeletonStack}>
                {ENERGY_AREAS.map((a) => (
                  <Skeleton key={a.key} width="100%" height={17} />
                ))}
              </View>
            ) : scoresState.s === "error" ? (
              <Text style={styles.note}>{t("hoy.energyUnavailable")}</Text>
            ) : (
              ENERGY_AREAS.map((a) => {
                const score = scoreByArea.get(a.key)?.score ?? 0;
                const domainColor = paletteMode === "colorful" ? LIFE_AREA_COLORS[a.key] : null;
                return (
                  <EnergyRow
                    key={a.key}
                    styles={styles}
                    label={t(`hoy.${a.labelKey}`)}
                    score={score}
                    domainColor={domainColor}
                  />
                );
              })
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <Card accent style={styles.cardEvent}>
            {eventState.s === "loading" ? (
              <Skeleton width="80%" height={13} />
            ) : eventState.s === "error" ? (
              <Text style={styles.eventNote}>{t("hoy.eventUnavailable")}</Text>
            ) : eventState.event == null ? (
              <Text style={styles.eventNote}>{t("hoy.eventNone")}</Text>
            ) : (
              <LunarEventLine styles={styles} t={t} tz={tz} event={eventState.event} />
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={160} style={styles.universo}>
          <Text style={styles.eyebrow}>{t("universo.eyebrow")}</Text>
          <View style={styles.uniList}>
            <UniRow
              styles={styles}
              variant="ask"
              icon={<AskIcon size={28} color={tk.accText} />}
              title={t("universo.preguntarTitle")}
              body={t("universo.preguntarBody")}
              onPress={() => router.push("/preguntar")}
            />
            <UniRow
              styles={styles}
              variant="entry"
              icon={<CompatIcon size={24} color={tk.accText} />}
              title={t("universo.compatTitle")}
              body={t("universo.compatBody")}
              onPress={() => router.push("/compatibilidad")}
            />
            <UniRow
              styles={styles}
              variant="entry"
              icon={<InformesIcon size={24} color={tk.accText} />}
              title={t("universo.informesTitle")}
              body={t("universo.informesBody")}
              onPress={() => router.push("/informe")}
            />
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

function Skeleton({ width, height }: { width: number | `${number}%`; height: number }) {
  const { t } = useTheme();
  return <View style={{ width, height, borderRadius: radius.sm, backgroundColor: t.panelSoft }} />;
}

function MiniChip({ styles, label, value }: { styles: ReturnType<typeof makeStyles>; label: string; value: number }) {
  return (
    <View style={styles.miniChip}>
      <Text style={styles.miniChipText}>
        {label} <Text style={styles.miniChipNum}>{value}</Text>
      </Text>
    </View>
  );
}

function EnergyRow({
  styles,
  label,
  score,
  domainColor,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  score: number;
  /** Modo Colorido: color de dominio del área (LIFE_AREA_COLORS) — null en gold. */
  domainColor?: string | null;
}) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <View style={styles.energyRow}>
      <Text style={styles.energyLabel}>{label}</Text>
      <View style={styles.energyTrack}>
        <View style={[styles.energyFill, domainColor && { backgroundColor: domainColor }, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.energyNum, domainColor && { color: domainColor }]}>{score}</Text>
    </View>
  );
}

function LunarEventLine({
  styles,
  t,
  tz,
  event,
}: {
  styles: ReturnType<typeof makeStyles>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tz: string;
  event: LunationEvent;
}) {
  const days = daysUntil(event.atIso, tz);
  const when = days <= 0 ? t("hoy.whenToday") : days === 1 ? t("hoy.whenTomorrow") : t("hoy.whenInDays", { n: days });
  const lead = t(event.phase === "full" ? "hoy.moonEventFullLead" : "hoy.moonEventNewLead", { when });
  const tail = t(event.phase === "full" ? "hoy.moonEventFullTail" : "hoy.moonEventNewTail");
  return (
    <>
      <Text style={styles.eventGlyph}>☽</Text>
      <Text style={styles.eventTxt}>
        <Text style={styles.eventTxtBold}>{lead}</Text> · {tail}
      </Text>
    </>
  );
}

function AskIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 8a11 11 0 1 0 0 18 8.5 8.5 0 0 1 0-18z" />
      <Path d="M27 6l.9 2.1L30 9l-2.1.9L27 12l-.9-2.1L24 9l2.1-.9z" />
      <Path d="M9 20l.6 1.4L11 22l-1.4.6L9 24l-.6-1.4L7 22l1.4-.6z" />
    </Svg>
  );
}

function CompatIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <Circle cx={6} cy={18} r={2.4} />
      <Circle cx={20} cy={8} r={2.4} />
      <Path d="M8 16.5C11 11 15 9 18.5 9.3" />
    </Svg>
  );
}

function InformesIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 3.5h12l4 4v15H5z" />
      <Path d="M17 3.5v4h4" />
      <Path d="M15 12v9l-2.5-1.8L10 21v-9" />
    </Svg>
  );
}

/** Halo respirando detrás del ícono de "Pregúntale a Aluna" (`.halo::after` del
 *  mockup: radial que pulsa .55↔1 cada 6s). Respeta "reducir movimiento" —
 *  mismo guard que <FadeIn> en components/ui.tsx. */
function AskHalo({ size }: { size: number }) {
  const { t } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!alive) return;
        if (reduced) {
          progress.setValue(0.7);
          return;
        }
        Animated.loop(
          Animated.sequence([
            Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(progress, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ).start();
      })
      .catch(() => {
        if (alive) progress.setValue(0.7);
      });
    return () => {
      alive = false;
    };
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.accFaint,
        opacity,
      }}
    />
  );
}

function UniRow({
  styles,
  variant,
  icon,
  title,
  body,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  variant: "ask" | "entry";
  icon: React.ReactNode;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const haloSize = variant === "ask" ? 38 : 0;
  return (
    <Card
      accent={variant === "ask"}
      onPress={onPress}
      style={[styles.uniRow, variant === "ask" ? styles.uniRowAsk : styles.uniRowEntry]}
    >
      <View style={[styles.uniIconWrap, { width: variant === "ask" ? 28 : 24, height: variant === "ask" ? 28 : 24 }]}>
        {variant === "ask" && <AskHalo size={haloSize} />}
        {icon}
      </View>
      <View style={styles.uniStack}>
        <Text style={[styles.uniTitle, variant === "ask" && styles.uniTitleAsk]}>{title}</Text>
        <Text style={styles.uniSub}>{body}</Text>
      </View>
      <Text style={styles.uniChev}>›</Text>
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, gap: space.md },

    brandRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    brandEyebrow: {
      color: t.accText,
      fontSize: typeScale.sm,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },

    greet: { gap: 2 },
    dateLine: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sansMedium },
    h1: { color: t.text, fontSize: typeScale.xl2, lineHeight: 28, fontFamily: fonts.serifSemi },
    voice: { color: t.textDim, fontSize: typeScale.lg2, lineHeight: 25, fontFamily: fonts.serifItalic },
    note: { color: t.textFaint, fontSize: typeScale.sm, lineHeight: 18, fontFamily: fonts.sansMedium, fontStyle: "italic" },

    eyebrow: {
      color: t.accText,
      fontSize: typeScale.sm,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
      marginBottom: space.sm,
    },

    // Mini-card de contexto lunar.
    cardMini: {
      paddingVertical: space.md,
      paddingHorizontal: space.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm + 2,
    },
    roman: { flex: 1, color: t.accText, fontSize: typeScale.sm, letterSpacing: 1.5, fontFamily: fonts.sansSemi },
    miniChips: { flexDirection: "row", gap: space.xs + 2, flexShrink: 0 },
    miniChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.accHair,
      backgroundColor: t.panelSoft,
    },
    miniChipText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    miniChipNum: { color: t.accText, fontFamily: fonts.sansBold },

    // "Tu energía de hoy".
    energySec: { gap: space.sm },
    energyCard: { paddingVertical: space.md, paddingHorizontal: space.lg, gap: space.sm - 2 },
    energySkeletonStack: { gap: space.sm },
    energyRow: { flexDirection: "row", alignItems: "center", gap: space.sm + 2, minHeight: 17 },
    energyLabel: {
      width: 66,
      flexShrink: 0,
      color: t.textFaint,
      fontSize: typeScale.sm,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },
    energyTrack: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: t.accHair, overflow: "hidden" },
    energyFill: { height: "100%", borderRadius: radius.pill, backgroundColor: t.acc },
    energyNum: { width: 28, textAlign: "right", color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serifSemi },

    // Card de evento lunar.
    cardEvent: {
      minHeight: 48,
      paddingVertical: 0,
      paddingHorizontal: space.lg - 2,
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm - 1,
    },
    eventGlyph: { color: t.accText, fontSize: typeScale.md, lineHeight: typeScale.md },
    eventTxt: { flex: 1, color: t.textDim, fontSize: typeScale.sm, lineHeight: 18, fontFamily: fonts.sansMedium },
    eventTxtBold: { color: t.text, fontFamily: fonts.sansSemi },
    eventNote: { color: t.textFaint, fontSize: typeScale.sm, lineHeight: 18, fontFamily: fonts.sansMedium, fontStyle: "italic" },

    // "Tu universo".
    universo: { gap: space.sm + 2 },
    uniList: { gap: space.sm + 1 },
    uniRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      paddingVertical: 0,
      paddingHorizontal: space.md + 2,
      borderRadius: radius.md,
    },
    uniRowAsk: { minHeight: 72 },
    uniRowEntry: { minHeight: 60 },
    uniIconWrap: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
    uniStack: { flex: 1, gap: 1 },
    uniTitle: { color: t.text, fontSize: typeScale.md, lineHeight: 19, fontFamily: fonts.serifSemi },
    uniTitleAsk: { fontSize: typeScale.lg2, lineHeight: 22 },
    uniSub: { color: t.textFaint, fontSize: typeScale.sm, lineHeight: 17, fontFamily: fonts.sansMedium },
    uniChev: { color: t.accText, fontSize: typeScale.lg2, fontFamily: fonts.serifSemi, opacity: 0.85, flexShrink: 0 },
  });
}
