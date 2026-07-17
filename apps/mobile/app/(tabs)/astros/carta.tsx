import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ZODIAC_SIGNS, PLANETS, signOfLongitude,
  planetMeaningKey, dignityMeaningKey, patternMeaningKey, houseSystemMeaningKey,
  type ChartResult, type BodyPosition, type Aspect, type HouseSystem, type Zodiac,
} from "@aluna/core";
import { Enso } from "../../../components/Enso";
import { ChartWheel } from "../../../components/ChartWheel";
import { BodyReadingReader } from "../../../components/BodyReading";
import { BottomSheet } from "../../../components/BottomSheet";
import { Meaning } from "../../../components/Meaning";
import { Card, Chip, FadeIn, ToggleRow } from "../../../components/ui";
import { useProfile } from "../../../lib/profile-context";
import { useAuth } from "../../../lib/auth-context";
import { useTheme } from "../../../lib/theme-context";
import { useT } from "../../../lib/i18n-context";
import { astroLabels, ASPECT_GLYPHS } from "../../../content/astrology";
import { fetchChart, type ChartKind } from "../../../lib/chart-api";
import { hasCeremonyPlayed, markCeremonyPlayed } from "../../../lib/ceremony-gate";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../../theme/tokens";

const TEXT_VS = "︎"; // presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
// El mockup 09 solo expone Natal/Tránsitos como control primario (segmentado, en la
// cabecera). Rev. Solar y Progresiones no tienen lugar visible ahí — se conservan
// alcanzables desde Modo Pro (decisión del implementador, el gap file la deja abierta;
// ver report de Task 4) para no perder alcance funcional silenciosamente.
const EXTRA_KINDS: ChartKind[] = ["solar_return", "progressed"];
const KIND_KEY: Record<ChartKind, string> = {
  natal: "Natal", transits: "Transits", solar_return: "SolarReturn", progressed: "Progressed",
};
const ELEMENTS = ["fire", "earth", "air", "water"] as const;
const MODALITIES = ["cardinal", "fixed", "mutable"] as const;
// Preview "POSICIONES" siempre visible bajo la rueda (mockup 09 §3): 4 filas fijas.
const PREVIEW_BODIES = ["sun", "moon", "mercury", "venus"] as const;

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
  // Ceremonia de dibujo (R5): solo en el PRIMER chart listo de toda la SESIÓN
  // de app (gate a nivel de módulo en lib/ceremony-gate.ts, Task 3) — togglear
  // casas/zodiaco/kind, o salir y volver a re-entrar a esta pantalla, re-
  // renderiza la misma rueda pero no la re-dibuja. Espejo del web.
  const playCeremony = ready !== null && !hasCeremonyPlayed();
  const ascPos = ready ? signOfLongitude(ready.chart.houses.ascendant) : null;
  const byKey = useMemo(() => {
    const m = new Map<string, BodyPosition>();
    if (ready) for (const b of ready.chart.bodies) m.set(b.body, b);
    return m;
  }, [ready]);
  const previewBodies = useMemo(
    () => PREVIEW_BODIES.map((k) => byKey.get(k)).filter((b): b is BodyPosition => !!b),
    [byKey],
  );
  useEffect(() => {
    if (ready !== null) markCeremonyPlayed();
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
        contentContainerStyle={[styles.scroll, { paddingTop: space.lg, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera del mockup 09: stack{eyebrow + h1} a la izquierda, control
            segmentado Natal|Tránsitos a la derecha. Sin Enso (solo vive en Hoy). */}
        <View style={styles.headRow}>
          <View style={styles.headStack}>
            <Text style={styles.eyebrow}>{t("carta.headEyebrow")}</Text>
            <Text style={styles.h1} maxFontSizeMultiplier={1.2}>{t("carta.headTitle")}</Text>
          </View>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.seg, kind === "natal" && styles.segOn]}
              onPress={() => setKind("natal")}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === "natal" }}
            >
              <Text style={[styles.segText, kind === "natal" && styles.segTextOn]}>{t("carta.segNatal")}</Text>
            </Pressable>
            <Pressable
              style={[styles.seg, kind === "transits" && styles.segOn]}
              onPress={() => setKind("transits")}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === "transits" }}
            >
              <Text style={[styles.segText, kind === "transits" && styles.segTextOn]}>{t("carta.segTransits")}</Text>
            </Pressable>
          </View>
        </View>

        {state.s === "loading" && <Text style={styles.note}>{t("carta.loadingChart")}</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("carta.errorChart")}</Text>}

        {ready && ascPos && (
          <>
            {ready.solar && <Text style={styles.solar}>☉ {t("carta.solarNotice")}</Text>}

            {/* Rueda interactiva + chips de posiciones clave (mockup §2) */}
            <FadeIn delay={0} style={styles.fadeFull}>
              <View style={styles.wheelWrap}>
                <ChartWheel chart={ready.chart} solar={ready.solar} selected={sheet?.body ?? null} onSelect={setSheet} animated={playCeremony} />
                <View style={styles.dataChipsRow}>
                  {byKey.get("sun") && (
                    <DataChip
                      styles={styles}
                      glyph={PLANET_GLYPH.sun!}
                      glyphKey={planetMeaningKey("sun")}
                      text={`${L.signs[byKey.get("sun")!.sign]} · ${t("carta.house")} ${byKey.get("sun")!.house}`}
                    />
                  )}
                  {byKey.get("moon") && (
                    <DataChip
                      styles={styles}
                      glyph={PLANET_GLYPH.moon!}
                      glyphKey={planetMeaningKey("moon")}
                      text={`${L.signs[byKey.get("moon")!.sign]} · ${t("carta.house")} ${byKey.get("moon")!.house}`}
                    />
                  )}
                  <DataChip styles={styles} glyph="ASC" glyphKey="point.ascendant" text={L.signs[ascPos.sign]!} />
                </View>
              </View>
            </FadeIn>

            {/* POSICIONES — preview de 4 filas SIEMPRE visible (mockup §3), fuera de Modo Pro */}
            {previewBodies.length > 0 && (
              <FadeIn delay={60} style={styles.fadeFull}>
                <View style={styles.posSec}>
                  <Text style={styles.cardH}>{t("carta.positions")}</Text>
                  <Card style={styles.previewCard}>
                    {previewBodies.map((b, i) => (
                      <Pressable
                        key={b.body}
                        style={[styles.previewRow, i === previewBodies.length - 1 && styles.rowLast]}
                        onPress={() => setSheet(b)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.previewGlyph}>{PLANET_GLYPH[b.body] ?? "•"}</Text>
                        <Text style={styles.previewTxt} numberOfLines={1}>
                          <Text style={styles.previewName}>{L.bodies[b.body] ?? b.body}</Text>
                          {` — ${L.signs[b.sign]} ${b.degree}° `}
                          <Text style={styles.previewFaint}>{`· ${t("carta.house")} ${b.house}`}</Text>
                        </Text>
                        <Text style={styles.previewChev}>›</Text>
                      </Pressable>
                    ))}
                  </Card>
                </View>
              </FadeIn>
            )}

            {/* Tu Clima: aspectos tránsito-a-natal — funcionalidad central de "Tránsitos",
                no está detrás de Modo Pro (sin referencia visual propia en el mockup). */}
            {kind === "transits" && ready.transitAspects && ready.transitAspects.length > 0 && (
              <FadeIn delay={100} style={styles.fadeFull}>
                <SectionCard styles={styles} title={t("carta.weatherTitle")}>
                  {ready.transitAspects.map((a, i) => (
                    <AspectRow key={i} styles={styles} a={a} L={L} t={t} last={i === ready.transitAspects!.length - 1} />
                  ))}
                </SectionCard>
              </FadeIn>
            )}

            {/* Modo Pro. Al APAGARLO con un kind avanzado activo (Rev. Solar /
                Progresiones — solo seleccionables dentro de Pro), volvemos a Natal:
                sin esto la pantalla queda mostrando datos avanzados bajo el header
                "Carta natal" y con el segmentado sin selección (review T4). */}
            <ToggleRow
              label={t("carta.pro")}
              on={pro}
              onPress={() => {
                if (pro && kind !== "natal" && kind !== "transits") setKind("natal");
                setPro(!pro);
              }}
              style={{ marginTop: space.lg }}
            />

            {pro && (
              <View style={styles.proBody}>
                {/* Opciones avanzadas: sin lugar visible en el mockup compacto — se
                    conservan aquí, alcanzables, en vez de perder su funcionalidad. */}
                <View style={styles.advancedGroup}>
                  <Text style={styles.cardH}>{t("carta.moreCharts")}</Text>
                  <View style={styles.kindRow}>
                    {EXTRA_KINDS.map((k) => {
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
                  {(kind === "solar_return" || kind === "progressed") && (
                    <Text style={styles.kindHint}>{t(`carta.kind${KIND_KEY[kind]}Hint`)}</Text>
                  )}
                </View>

                <View style={styles.advancedGroup}>
                  <Text style={styles.cardH}>{t("carta.houses")}</Text>
                  <View style={styles.kindRow}>
                    {(["placidus", "koch", "equal", "whole", "regiomontanus", "porphyry"] as HouseSystem[]).map((h) => {
                      const on = houseSystem === h;
                      return (
                        <View key={h} style={styles.chipWithInfo}>
                          <Chip kind="control" label={L.houses[h]!} selected={on} onPress={() => setHouseSystem(h)} />
                          <Meaning k={houseSystemMeaningKey(h)} style={styles.chipInfo}>ⓘ</Meaning>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.advancedGroup}>
                  <Text style={styles.cardH}>{t("carta.zodiac")}</Text>
                  <View style={styles.kindRow}>
                    {(["tropical", "sidereal"] as Zodiac[]).map((z) => {
                      const on = zodiac === z;
                      return (
                        <View key={z} style={styles.chipWithInfo}>
                          <Chip
                            kind="control"
                            label={t(z === "tropical" ? "carta.zodiacT" : "carta.zodiacS")}
                            selected={on}
                            onPress={() => setZodiac(z)}
                          />
                          <Meaning k={`zodiac.${z}`} style={styles.chipInfo}>ⓘ</Meaning>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Balance de elementos y modalidades — sin lugar en el mockup compacto */}
                <Balance
                  styles={styles}
                  title={t("carta.elements")}
                  kind="element"
                  entries={ELEMENTS.map((k) => ({ k, label: L.elements[k]!, n: ready.chart.distribution.elements[k] }))}
                  dominant={ready.chart.distribution.dominantElement}
                  dominantLabel={t("carta.dominant")}
                />
                <Balance
                  styles={styles}
                  title={t("carta.modalities")}
                  kind="modality"
                  entries={MODALITIES.map((k) => ({ k, label: L.modalities[k]!, n: ready.chart.distribution.modalities[k] }))}
                  dominant={ready.chart.distribution.dominantModality}
                  dominantLabel={t("carta.dominant")}
                />

                <SectionCard styles={styles} title={t("carta.positions")}>
                  {ready.chart.bodies.map((b, i) => (
                    <View key={b.body} style={[styles.posRow, i === ready.chart.bodies.length - 1 && styles.rowLast]}>
                      <Text style={styles.posGlyph}>
                        <Meaning k={planetMeaningKey(b.body)}>{PLANET_GLYPH[b.body] ?? "•"}</Meaning>
                      </Text>
                      <View style={styles.posMain}>
                        <Text style={styles.posName}>{L.bodies[b.body] ?? b.body}</Text>
                        <Text style={styles.posDetail}>
                          <Meaning k={`sign.${b.sign}`}>{SIGN_GLYPH[b.sign]} {L.signs[b.sign]}</Meaning> {dms(b)} ·{" "}
                          <Meaning k={`house.${b.house}`}>{t("carta.house")} {b.house}</Meaning>
                        </Text>
                      </View>
                      <View style={styles.posTags}>
                        {/* Chip de dignidad NO envuelto (gap, ver report): es un
                            <Chip> (View), y RN no permite anidar un View dentro
                            del <Text> que <Meaning/> necesita ser. */}
                        {b.retrograde && <Text style={styles.tagWarn}><Meaning k="term.retrograde">℞</Meaning></Text>}
                        {b.dignity && <Chip kind="tag" label={L.dignities[b.dignity]!} />}
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
                        <Meaning k={patternMeaningKey(p.type)}>{L.patterns[p.type] ?? p.type}</Meaning>:{" "}
                        {p.bodies.map((b, j) => (
                          <Text key={b}>
                            {j > 0 ? " " : ""}
                            <Meaning k={planetMeaningKey(b)}>{PLANET_GLYPH[b] ?? b}</Meaning>
                          </Text>
                        ))}
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

/** Data-chip compacto del mockup §2 (glifo + texto combinado, p.ej. "☉ Acuario · Casa 11"). */
function DataChip({
  styles, glyph, glyphKey, text,
}: {
  styles: ReturnType<typeof makeStyles>; glyph: string; glyphKey?: string; text: string;
}) {
  return (
    <View style={styles.dataChip}>
      <Text style={styles.dataChipGlyph}>
        {glyphKey ? <Meaning k={glyphKey}>{glyph}</Meaning> : glyph}
      </Text>
      <Text style={styles.dataChipText}>{text}</Text>
    </View>
  );
}

function Balance({
  styles, title, kind, entries, dominant, dominantLabel,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  kind: "element" | "modality";
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
            <Meaning k={`${kind}.${e.k}`}>{e.label}</Meaning>
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
        <Meaning k={planetMeaningKey(a.a)}>{PLANET_GLYPH[a.a] ?? a.a}</Meaning>{" "}
        <Meaning k={`aspect.${a.aspect}`}>{ASPECT_GLYPHS[a.aspect] ?? "·"}</Meaning>{" "}
        <Meaning k={planetMeaningKey(a.b)}>{PLANET_GLYPH[a.b] ?? a.b}</Meaning>
      </Text>
      <View style={styles.aspMain}>
        <Text style={styles.aspName}>
          {L.bodies[a.a] ?? a.a} <Meaning k={`aspect.${a.aspect}`}>{L.aspects[a.aspect] ?? a.aspect}</Meaning> {L.bodies[a.b] ?? a.b}
        </Text>
        <Text style={styles.aspSub}>
          <Meaning k="term.orb">{t("carta.orb")}</Meaning> {a.orb.toFixed(1)}° ·{" "}
          <Meaning k={a.applying ? "term.applying" : "term.separating"}>
            {a.applying ? t("carta.applying") : t("carta.separating")}
          </Meaning>
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

    // Cabecera del mockup: stack{eyebrow+h1} a la izquierda, segmentado a la derecha.
    headRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md, width: "100%", marginBottom: space.xl },
    headStack: { flexDirection: "column", gap: 2, flexShrink: 1 },
    eyebrow: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },

    // Control segmentado Natal|Tránsitos (`.segmented`/`.seg` del mockup). RN no anima
    // gradientes sin librería: el estado "on" usa `acc` sólido (misma convención que
    // el resto del repo para aproximar el gradiente acc→acc-soft del SPEC web).
    segmented: {
      flexDirection: "row", flexShrink: 0, padding: 3, gap: 2, borderRadius: radius.pill,
      borderWidth: 1, borderColor: t.accHair, backgroundColor: t.panelSoft,
    },
    seg: { alignItems: "center", justifyContent: "center", minHeight: 38, paddingHorizontal: space.md, borderRadius: radius.pill },
    segOn: { backgroundColor: t.acc },
    segText: { color: t.textFaint, fontSize: typeScale.sm, letterSpacing: 0.3, fontFamily: fonts.sansSemi },
    segTextOn: { color: t.onAcc },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.xxl },
    solar: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginBottom: space.lg, lineHeight: 19 },

    // <FadeIn> envuelve secciones que ya declaraban width:"100%" (necesario
    // porque `scroll` centra sus hijos con alignItems — sin este ancho
    // explícito en el propio wrapper de FadeIn, el % interno no tendría contra
    // qué resolverse).
    fadeFull: { width: "100%" },

    wheelWrap: { alignItems: "center", gap: space.sm, width: "100%" },

    // `.chips-row` de 3 data-chips (Sol/Luna/ASC) bajo la rueda — reemplaza al
    // bloque CoreCard pesado de antes de este repintado.
    dataChipsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%" },
    dataChip: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      minHeight: 34, paddingHorizontal: space.lg, paddingVertical: 7,
      borderRadius: radius.pill, borderWidth: 1, borderColor: t.accHair, backgroundColor: t.panelSoft,
    },
    dataChipGlyph: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serif },
    dataChipText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sansSemi },

    // "POSICIONES" preview siempre-visible (mockup §3) — card sin padding propio,
    // cada fila trae su propio padding horizontal + alto mínimo.
    posSec: { width: "100%", marginTop: space.xl, gap: space.sm },
    previewCard: { width: "100%", padding: 0 },
    previewRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44, paddingHorizontal: space.lg,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    previewGlyph: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serif, width: 18, textAlign: "center" },
    previewTxt: { flex: 1, color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansMedium },
    previewName: { fontFamily: fonts.sansBold },
    previewFaint: { color: t.textFaint },
    previewChev: { color: t.accText, opacity: 0.85, fontSize: typeScale.md, fontFamily: fonts.serifSemi },

    // Grupo de controles avanzados dentro de Modo Pro (kind extra / casas / zodiaco):
    // sin lugar visible en el mockup compacto — se conservan aquí para no perder
    // alcance funcional.
    advancedGroup: { width: "100%", marginBottom: space.lg },
    // Contenedor de cualquier fila de chips (tipo de carta extra / casas / zodiaco):
    // los chips en sí son <Chip kind="control">, este solo los reparte en fila.
    kindRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, width: "100%" },
    kindHint: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, marginTop: space.sm },
    // Afijo ⓘ junto a cada chip de casas/zodiaco (paridad con el web
    // chart-controls.tsx): el Chip es un View, no puede ir dentro del <Text>
    // que <Meaning/> necesita ser — se coloca aparte, al lado.
    chipWithInfo: { flexDirection: "row", alignItems: "center", gap: 3 },
    chipInfo: { color: t.textFaint, fontSize: typeScale.sm, opacity: 0.7 },

    // Ídem: fondo/borde ahora los da <Card accent> (variante --surface-2 del SPEC).
    balanceCard: { width: "100%", marginBottom: space.lg },
    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
    balLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, width: 88 },
    balTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: t.accHair, overflow: "hidden" },
    balFill: { height: "100%", backgroundColor: t.accSoft, borderRadius: 4 },
    balFillOn: { backgroundColor: t.acc },
    balN: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans, width: 18, textAlign: "right" },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio ahora los da <Card>; queda solo el ancho (mismo motivo que fadeFull).
    card: { width: "100%" },
    cardH: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },
    muted: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },

    posRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    posGlyph: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serif, width: 22 },
    posMain: { flex: 1 },
    posName: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    posDetail: { color: t.textFaint, fontSize: typeScale.sm, marginTop: 1, fontFamily: fonts.sans },
    posTags: { flexDirection: "row", alignItems: "center", gap: space.xs },
    tagWarn: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans },

    aspRow: { paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair },
    aspGlyphs: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.serif },
    aspHard: { color: t.warn },
    aspSoft: { color: t.accText },
    aspMain: { marginTop: 2 },
    aspName: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    aspSub: { color: t.textFaint, fontSize: typeScale.sm, marginTop: 1, fontFamily: fonts.sans },

    patternRow: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.xs },

    footNote: { color: t.textFaint, fontSize: typeScale.sm, textAlign: "center", marginTop: space.sm, fontFamily: fonts.sans },
  });
}
