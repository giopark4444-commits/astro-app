import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ZODIAC_SIGNS, PLANETS, signOfLongitude,
  type ChartResult, type BodyPosition, type Aspect,
} from "@aluna/core";
import { Starfield } from "../../components/Starfield";
import { Enso } from "../../components/Enso";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { astroLabels, ASPECT_GLYPHS } from "../../content/astrology";
import { fetchChart, type ChartKind } from "../../lib/chart-api";
import { fonts, radius, space, type ThemeTokens } from "../../theme/tokens";

const TEXT_VS = "︎"; // presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const KINDS: ChartKind[] = ["natal", "transits", "solar_return", "progressed"];
const KIND_KEY: Record<ChartKind, string> = {
  natal: "Natal", transits: "Transits", solar_return: "SolarReturn", progressed: "Progressed",
};
const ELEMENTS = ["fire", "earth", "air", "water"] as const;
const MODALITIES = ["cardinal", "fixed", "mutable"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const dms = (b: BodyPosition) => `${b.degree}°${pad(b.minute)}′${pad(b.second)}″`;

type State =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; chart: ChartResult; solar: boolean; transitAspects?: Aspect[] | undefined };

export default function CartaScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);

  const [kind, setKind] = useState<ChartKind>("natal");
  const [pro, setPro] = useState(false);
  const [state, setState] = useState<State>({ s: "loading" });
  const cache = useRef<Map<ChartKind, { chart: ChartResult; solar: boolean; transitAspects?: Aspect[] | undefined }>>(
    new Map(),
  );

  const profileId = profile?.id ?? null;
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!profileId || !accessToken) return;
    const hit = cache.current.get(kind);
    if (hit) {
      setState({ s: "ready", ...hit });
      return;
    }
    let alive = true;
    setState({ s: "loading" });
    fetchChart({ accessToken, profileId, kind })
      .then((res) => {
        if (!alive) return;
        cache.current.set(kind, res);
        setState({ s: "ready", ...res });
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [profileId, accessToken, kind]);

  const ready = state.s === "ready" ? state : null;
  const ascPos = ready ? signOfLongitude(ready.chart.houses.ascendant) : null;
  const byKey = useMemo(() => {
    const m = new Map<string, BodyPosition>();
    if (ready) for (const b of ready.chart.bodies) m.set(b.body, b);
    return m;
  }, [ready]);

  if (!profile || !profileId) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyWrap}>
          <Enso size={48} />
          <Text style={styles.emptyText}>{t("carta.emptyMap")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.sky} pointerEvents="none">
        <Starfield count={44} height={420} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("carta.title")}</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1}>{t("carta.subtitle")}</Text>

        {/* Tipo de carta */}
        <View style={styles.kindRow}>
          {KINDS.map((k) => {
            const on = kind === k;
            return (
              <Pressable key={k} style={[styles.kindChip, on && styles.kindChipOn]} onPress={() => setKind(k)}>
                <Text style={[styles.kindText, on && styles.kindTextOn]}>{t(`carta.kind${KIND_KEY[k]}`)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.kindHint}>{t(`carta.kind${KIND_KEY[kind]}Hint`)}</Text>

        {state.s === "loading" && <Text style={styles.note}>{t("carta.loadingChart")}</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("carta.errorChart")}</Text>}

        {ready && ascPos && (
          <>
            {ready.solar && <Text style={styles.solar}>☉ {t("carta.solarNotice")}</Text>}

            {/* Núcleo: Sol / Luna / Ascendente */}
            <View style={styles.core}>
              {byKey.get("sun") && (
                <CoreCard
                  styles={styles}
                  glyph={PLANET_GLYPH.sun!}
                  name={L.bodies.sun!}
                  sign={L.signs[byKey.get("sun")!.sign]!}
                  signGlyph={SIGN_GLYPH[byKey.get("sun")!.sign]!}
                  sub={`${t("carta.house")} ${byKey.get("sun")!.house}`}
                />
              )}
              {byKey.get("moon") && (
                <CoreCard
                  styles={styles}
                  glyph={PLANET_GLYPH.moon!}
                  name={L.bodies.moon!}
                  sign={L.signs[byKey.get("moon")!.sign]!}
                  signGlyph={SIGN_GLYPH[byKey.get("moon")!.sign]!}
                  sub={`${t("carta.house")} ${byKey.get("moon")!.house}`}
                />
              )}
              <CoreCard
                styles={styles}
                glyph="Asc"
                name={t("carta.ascendant")}
                sign={L.signs[ascPos.sign]!}
                signGlyph={SIGN_GLYPH[ascPos.sign]!}
                sub={`${ascPos.degree}°`}
                dim={ready.solar}
              />
            </View>

            {/* Balance de elementos y modalidades */}
            <Balance
              styles={styles}
              title={t("carta.elements")}
              entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
              dominant={ready.chart.distribution.dominantElement}
              dominantLabel={t("carta.dominant")}
            />
            <Balance
              styles={styles}
              title={t("carta.modalities")}
              entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
              dominant={ready.chart.distribution.dominantModality}
              dominantLabel={t("carta.dominant")}
            />

            {/* Tu Clima: aspectos tránsito-a-natal */}
            {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
              <Card styles={styles} title={t("carta.weatherTitle")}>
                {ready.transitAspects.map((a, i) => (
                  <AspectRow key={i} styles={styles} a={a} L={L} t={t} last={i === ready.transitAspects!.length - 1} />
                ))}
              </Card>
            )}

            {/* Modo Pro */}
            <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
              <View style={[styles.proDot, pro && styles.proDotOn]} />
              <Text style={styles.proText}>{t("carta.pro")}</Text>
            </Pressable>

            {pro && (
              <View style={styles.proBody}>
                <Card styles={styles} title={t("carta.positions")}>
                  {ready.chart.bodies.map((b, i) => (
                    <View key={b.body} style={[styles.posRow, i === ready.chart.bodies.length - 1 && styles.rowLast]}>
                      <Text style={styles.posGlyph}>{PLANET_GLYPH[b.body] ?? "•"}</Text>
                      <View style={styles.posMain}>
                        <Text style={styles.posName}>{L.bodies[b.body] ?? b.body}</Text>
                        <Text style={styles.posDetail}>
                          {SIGN_GLYPH[b.sign]} {L.signs[b.sign]} {dms(b)} · {t("carta.house")} {b.house}
                        </Text>
                      </View>
                      <View style={styles.posTags}>
                        {b.retrograde && <Text style={styles.tagWarn}>℞</Text>}
                        {b.dignity && <Text style={styles.tag}>{L.dignities[b.dignity]}</Text>}
                      </View>
                    </View>
                  ))}
                </Card>

                <Card styles={styles} title={t("carta.aspectsTitle")}>
                  {ready.chart.aspects.length === 0 ? (
                    <Text style={styles.muted}>—</Text>
                  ) : (
                    ready.chart.aspects.map((a, i) => (
                      <AspectRow key={i} styles={styles} a={a} L={L} t={t} last={i === ready.chart.aspects.length - 1} />
                    ))
                  )}
                </Card>

                <Card styles={styles} title={t("carta.patterns")}>
                  {ready.chart.patterns.length === 0 ? (
                    <Text style={styles.muted}>{t("carta.noPatterns")}</Text>
                  ) : (
                    ready.chart.patterns.map((p, i) => (
                      <Text key={i} style={styles.patternRow}>
                        {L.patterns[p.type] ?? p.type}: {p.bodies.map((b) => PLANET_GLYPH[b] ?? b).join(" ")}
                      </Text>
                    ))
                  )}
                </Card>

                <Text style={styles.footNote}>
                  {t("carta.ut")} {ready.chart.meta.utcHour.toFixed(2)}h · {t("carta.julianDay")}{" "}
                  {ready.chart.meta.julianDayUt.toFixed(4)}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CoreCard({
  styles, glyph, name, sign, signGlyph, sub, dim,
}: {
  styles: ReturnType<typeof makeStyles>;
  glyph: string;
  name: string;
  sign: string;
  signGlyph: string;
  sub: string;
  dim?: boolean;
}) {
  return (
    <View style={[styles.coreCard, dim && styles.coreCardDim]}>
      <Text style={styles.coreGlyph}>{glyph}</Text>
      <Text style={styles.coreName}>{name}</Text>
      <Text style={styles.coreSign}>
        {signGlyph} {sign}
      </Text>
      <Text style={styles.coreSub}>{sub}</Text>
    </View>
  );
}

function Balance({
  styles, title, entries, dominant, dominantLabel,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  entries: Array<{ k: string; label: string; n: number }>;
  dominant: string;
  dominantLabel: string;
}) {
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <View style={styles.balanceCard}>
      <Text style={styles.cardH}>{title}</Text>
      {entries.map((e) => (
        <View key={e.k} style={styles.balRow}>
          <Text style={styles.balLabel}>
            {e.label}
            {e.k === dominant ? ` · ${dominantLabel}` : ""}
          </Text>
          <View style={styles.balTrack}>
            <View style={[styles.balFill, { width: `${(e.n / max) * 100}%` }, e.k === dominant && styles.balFillOn]} />
          </View>
          <Text style={styles.balN}>{e.n}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({
  styles, title, children,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {children}
    </View>
  );
}

function AspectRow({
  styles, a, L, t, last,
}: {
  styles: ReturnType<typeof makeStyles>;
  a: Aspect;
  L: ReturnType<typeof astroLabels>;
  t: (key: string) => string;
  last: boolean;
}) {
  const color = a.harmony === "hard" ? styles.aspHard : a.harmony === "soft" ? styles.aspSoft : undefined;
  return (
    <View style={[styles.aspRow, last && styles.rowLast]}>
      <Text style={[styles.aspGlyphs, color]}>
        {PLANET_GLYPH[a.a] ?? a.a} {ASPECT_GLYPHS[a.aspect] ?? "·"} {PLANET_GLYPH[a.b] ?? a.b}
      </Text>
      <View style={styles.aspMain}>
        <Text style={styles.aspName}>
          {L.bodies[a.a] ?? a.a} {L.aspects[a.aspect] ?? a.aspect} {L.bodies[a.b] ?? a.b}
        </Text>
        <Text style={styles.aspSub}>
          {t("carta.orb")} {a.orb.toFixed(1)}° · {a.applying ? t("carta.applying") : t("carta.separating")}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    sky: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
    emptyText: { color: t.textDim, fontSize: 16, fontFamily: fonts.sans },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
    eyebrow: { color: t.acc, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sans },
    h1: { color: t.text, fontSize: 28, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center", marginBottom: space.xl },

    kindRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%" },
    kindChip: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
      paddingHorizontal: space.lg, paddingVertical: space.sm + 2, backgroundColor: t.panelSoft,
    },
    kindChipOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    kindText: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans },
    kindTextOn: { color: t.acc, fontWeight: "600" },
    kindHint: { color: t.textFaint, fontSize: 12, fontStyle: "italic", fontFamily: fonts.serif, textAlign: "center", marginTop: space.md, marginBottom: space.xl },

    note: { color: t.textDim, fontSize: 14, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.xxl },
    solar: { color: t.acc, fontSize: 13, fontFamily: fonts.sans, textAlign: "center", marginBottom: space.lg, lineHeight: 19 },

    core: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md, width: "100%", marginBottom: space.xl },
    coreCard: {
      flexGrow: 1, minWidth: 100, alignItems: "center", paddingVertical: space.lg, paddingHorizontal: space.md,
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md, backgroundColor: t.panelSoft,
    },
    coreCardDim: { opacity: 0.7 },
    coreGlyph: { color: t.acc, fontSize: 20, fontFamily: fonts.serif, marginBottom: space.xs },
    coreName: { color: t.textFaint, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sans },
    coreSign: { color: t.text, fontSize: 16, fontFamily: fonts.serif, marginTop: space.xs },
    coreSub: { color: t.textDim, fontSize: 11, marginTop: 2, fontFamily: fonts.sans },

    balanceCard: {
      width: "100%", borderWidth: 1, borderColor: t.accHair, borderRadius: radius.lg,
      backgroundColor: t.panelSoft, padding: space.xl, marginBottom: space.lg,
    },
    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
    balLabel: { color: t.textDim, fontSize: 12, fontFamily: fonts.sans, width: 88 },
    balTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.accHair, overflow: "hidden" },
    balFill: { height: "100%", backgroundColor: t.accSoft, borderRadius: 3 },
    balFillOn: { backgroundColor: t.acc },
    balN: { color: t.textFaint, fontSize: 11, fontFamily: fonts.sans, width: 18, textAlign: "right" },

    proToggle: {
      flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg,
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md,
    },
    proDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
    proDotOn: { backgroundColor: t.acc },
    proText: { color: t.text, fontSize: 15, letterSpacing: 1, fontFamily: fonts.sans },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    card: {
      width: "100%", borderWidth: 1, borderColor: t.accHair, borderRadius: radius.lg,
      backgroundColor: t.panelSoft, padding: space.xl,
    },
    cardH: { color: t.acc, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sans },
    muted: { color: t.textFaint, fontSize: 13, fontFamily: fonts.sans },

    posRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    posGlyph: { color: t.acc, fontSize: 16, fontFamily: fonts.serif, width: 22 },
    posMain: { flex: 1 },
    posName: { color: t.text, fontSize: 14, fontFamily: fonts.sans },
    posDetail: { color: t.textFaint, fontSize: 11, marginTop: 1, fontFamily: fonts.sans },
    posTags: { flexDirection: "row", gap: space.xs },
    tag: { color: t.acc, fontSize: 10, letterSpacing: 0.5, fontFamily: fonts.sans },
    tagWarn: { color: t.warn, fontSize: 13, fontFamily: fonts.sans },

    aspRow: { paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair },
    aspGlyphs: { color: t.text, fontSize: 14, fontFamily: fonts.serif },
    aspHard: { color: t.warn },
    aspSoft: { color: t.acc },
    aspMain: { marginTop: 2 },
    aspName: { color: t.textDim, fontSize: 12, fontFamily: fonts.sans },
    aspSub: { color: t.textFaint, fontSize: 11, marginTop: 1, fontFamily: fonts.sans },

    patternRow: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, marginTop: space.xs },

    footNote: { color: t.textFaint, fontSize: 11, textAlign: "center", marginTop: space.sm, fontFamily: fonts.sans },
  });
}
