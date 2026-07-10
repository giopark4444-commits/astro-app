import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ZODIAC_SIGNS, PLANETS, signOfLongitude,
  type ChartResult, type BodyPosition, type Aspect, type HouseSystem, type Zodiac,
} from "@aluna/core";
import { Enso } from "../../components/Enso";
import { ChartWheel } from "../../components/ChartWheel";
import { BodyReadingReader } from "../../components/BodyReading";
import { BottomSheet } from "../../components/BottomSheet";
import { Card, Chip, FadeIn } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { astroLabels, ASPECT_GLYPHS } from "../../content/astrology";
import { fetchChart, type ChartKind } from "../../lib/chart-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

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
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");
  const [zodiac, setZodiac] = useState<Zodiac>("tropical");
  const [pro, setPro] = useState(false);
  const [sheet, setSheet] = useState<BodyPosition | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const cache = useRef<Map<string, { chart: ChartResult; solar: boolean; transitAspects?: Aspect[] | undefined }>>(
    new Map(),
  );

  const profileId = profile?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const cacheKey = `${kind}:${houseSystem}:${zodiac}`;

  useEffect(() => {
    if (!profileId || !accessToken) return;
    const hit = cache.current.get(cacheKey);
    if (hit) {
      setState({ s: "ready", ...hit });
      return;
    }
    let alive = true;
    setState({ s: "loading" });
    fetchChart({ accessToken, profileId, kind, houseSystem, zodiac })
      .then((res) => {
        if (!alive) return;
        cache.current.set(cacheKey, res);
        setState({ s: "ready", ...res });
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [profileId, accessToken, kind, houseSystem, zodiac]);

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
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno + estrellas
    // ya viven en ThemedBackground (capa raíz, Task 2) — esta pantalla queda transparente.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("carta.title")}</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1} maxFontSizeMultiplier={1.2}>{t("carta.subtitle")}</Text>

        {/* Tipo de carta — chips canónicos del rediseño */}
        <View style={styles.kindRow}>
          {KINDS.map((k) => {
            const on = kind === k;
            return (
              <Chip
                key={k}
                kind="control"
                label={t(`carta.kind${KIND_KEY[k]}`)}
                selected={on}
                onPress={() => setKind(k)}
              />
            );
          })}
        </View>
        <Text style={styles.kindHint}>{t(`carta.kind${KIND_KEY[kind]}Hint`)}</Text>

        {/* Sistema de casas */}
        <View style={styles.kindRow}>
          {(["placidus", "koch", "equal", "whole", "regiomontanus", "porphyry"] as HouseSystem[]).map((h) => {
            const on = houseSystem === h;
            return (
              <Chip key={h} kind="control" label={L.houses[h]} selected={on} onPress={() => setHouseSystem(h)} />
            );
          })}
        </View>

        {/* Zodiaco */}
        <View style={styles.kindRow}>
          {(["tropical", "sidereal"] as Zodiac[]).map((z) => {
            const on = zodiac === z;
            return (
              <Chip
                key={z}
                kind="control"
                label={t(z === "tropical" ? "carta.zodiacT" : "carta.zodiacS")}
                selected={on}
                onPress={() => setZodiac(z)}
              />
            );
          })}
        </View>

        {state.s === "loading" && <Text style={styles.note}>{t("carta.loadingChart")}</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("carta.errorChart")}</Text>}

        {ready && ascPos && (
          <>
            {ready.solar && <Text style={styles.solar}>☉ {t("carta.solarNotice")}</Text>}

            {/* Rueda interactiva */}
            <FadeIn delay={0}>
              <ChartWheel chart={ready.chart} solar={ready.solar} selected={sheet?.body ?? null} onSelect={setSheet} />
              <Text style={styles.kindHint}>{t("carta.tapHint")}</Text>
            </FadeIn>

            {/* Núcleo: Sol / Luna / Ascendente */}
            <FadeIn delay={60} style={styles.fadeFull}>
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
            </FadeIn>

            {/* Balance de elementos y modalidades */}
            <FadeIn delay={120} style={styles.fadeFull}>
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
            </FadeIn>

            {/* Tu Clima: aspectos tránsito-a-natal */}
            {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
              <SectionCard styles={styles} title={t("carta.weatherTitle")}>
                {ready.transitAspects.map((a, i) => (
                  <AspectRow key={i} styles={styles} a={a} L={L} t={t} last={i === ready.transitAspects!.length - 1} />
                ))}
              </SectionCard>
            )}

            {/* Modo Pro */}
            <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
              <View style={[styles.proDot, pro && styles.proDotOn]} />
              <Text style={styles.proText}>{t("carta.pro")}</Text>
            </Pressable>

            {pro && (
              <View style={styles.proBody}>
                <SectionCard styles={styles} title={t("carta.positions")}>
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
                        {b.dignity && <Chip kind="tag" label={L.dignities[b.dignity]} />}
                      </View>
                    </View>
                  ))}
                </SectionCard>

                <SectionCard styles={styles} title={t("carta.aspectsTitle")}>
                  {ready.chart.aspects.length === 0 ? (
                    <Text style={styles.muted}>—</Text>
                  ) : (
                    ready.chart.aspects.map((a, i) => (
                      <AspectRow key={i} styles={styles} a={a} L={L} t={t} last={i === ready.chart.aspects.length - 1} />
                    ))
                  )}
                </SectionCard>

                <SectionCard styles={styles} title={t("carta.patterns")}>
                  {ready.chart.patterns.length === 0 ? (
                    <Text style={styles.muted}>{t("carta.noPatterns")}</Text>
                  ) : (
                    ready.chart.patterns.map((p, i) => (
                      <Text key={i} style={styles.patternRow}>
                        {L.patterns[p.type] ?? p.type}: {p.bodies.map((b) => PLANET_GLYPH[b] ?? b).join(" ")}
                      </Text>
                    ))
                  )}
                </SectionCard>

                <Text style={styles.footNote}>
                  {t("carta.ut")} {ready.chart.meta.utcHour.toFixed(2)}h · {t("carta.julianDay")}{" "}
                  {ready.chart.meta.julianDayUt.toFixed(4)}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? (L.bodies[sheet.body] ?? sheet.body) : ""}
      >
        {sheet && <BodyReadingReader body={sheet} profileName={profile.name} />}
      </BottomSheet>
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
    <Card style={[styles.coreCard, dim && styles.coreCardDim]}>
      <Text style={styles.coreGlyph}>{glyph}</Text>
      <Text style={styles.coreName}>{name}</Text>
      <Text style={styles.coreSign}>
        {signGlyph} {sign}
      </Text>
      <Text style={styles.coreSub}>{sub}</Text>
    </Card>
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
    <Card accent style={styles.balanceCard}>
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
    </Card>
  );
}

/** Tarjeta con título "eyebrow" (BALANCE/POSICIONES/...) sobre el primitivo <Card>.
 * Renombrada de "Card" a "SectionCard" para no chocar con el primitivo importado. */
function SectionCard({
  styles, title, children,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {children}
    </Card>
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
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
    emptyText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.displaySm, fontFamily: fonts.serifSemi, textAlign: "center", marginBottom: space.xl },

    // Contenedor de cualquier fila de chips (tipo de carta / casas / zodiaco):
    // los chips en sí son <Chip kind="control">, este solo los reparte en fila.
    kindRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%" },
    kindHint: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.md, marginBottom: space.xl },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.xxl },
    solar: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginBottom: space.lg, lineHeight: 19 },

    // <FadeIn> envuelve secciones que ya declaraban width:"100%" (necesario
    // porque `scroll` centra sus hijos con alignItems — sin este ancho
    // explícito en el propio wrapper de FadeIn, el % interno no tendría contra
    // qué resolverse).
    fadeFull: { width: "100%" },

    core: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md, width: "100%", marginBottom: space.xl },
    // Ya no lleva borde/fondo propios — eso lo da <Card>; acá solo el layout
    // de mini-tarjeta (crece, encoge, centra su contenido).
    coreCard: { flexGrow: 1, minWidth: 100, alignItems: "center", paddingVertical: space.lg, paddingHorizontal: space.md },
    coreCardDim: { opacity: 0.7 },
    coreGlyph: { color: t.acc, fontSize: typeScale.xl, fontFamily: fonts.serif, marginBottom: space.xs },
    coreName: { color: t.textFaint, fontSize: typeScale.xs2, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sans },
    coreSign: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.serif, marginTop: space.xs },
    coreSub: { color: t.textDim, fontSize: typeScale.xs2, marginTop: 2, fontFamily: fonts.sans },

    // Ídem: fondo/borde ahora los da <Card accent> (variante --surface-2 del SPEC).
    balanceCard: { width: "100%", marginBottom: space.lg },
    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
    balLabel: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans, width: 88 },
    balTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: t.accHair, overflow: "hidden" },
    balFill: { height: "100%", backgroundColor: t.accSoft, borderRadius: 4 },
    balFillOn: { backgroundColor: t.acc },
    balN: { color: t.textFaint, fontSize: typeScale.xs2, fontFamily: fonts.sans, width: 18, textAlign: "right" },

    proToggle: {
      flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg,
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md,
    },
    proDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
    proDotOn: { backgroundColor: t.acc },
    proText: { color: t.text, fontSize: typeScale.md, letterSpacing: 1, fontFamily: fonts.sans },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio ahora los da <Card>; queda solo el ancho (mismo motivo que fadeFull).
    card: { width: "100%" },
    cardH: { color: t.acc, fontSize: typeScale.sm, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },
    muted: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },

    posRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    posGlyph: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.serif, width: 22 },
    posMain: { flex: 1 },
    posName: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    posDetail: { color: t.textFaint, fontSize: typeScale.xs2, marginTop: 1, fontFamily: fonts.sans },
    posTags: { flexDirection: "row", alignItems: "center", gap: space.xs },
    tagWarn: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans },

    aspRow: { paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair },
    aspGlyphs: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.serif },
    aspHard: { color: t.warn },
    aspSoft: { color: t.acc },
    aspMain: { marginTop: 2 },
    aspName: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans },
    aspSub: { color: t.textFaint, fontSize: typeScale.xs2, marginTop: 1, fontFamily: fonts.sans },

    patternRow: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.xs },

    footNote: { color: t.textFaint, fontSize: typeScale.xs2, textAlign: "center", marginTop: space.sm, fontFamily: fonts.sans },
  });
}
