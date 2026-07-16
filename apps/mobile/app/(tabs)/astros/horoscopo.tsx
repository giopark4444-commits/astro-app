// apps/mobile/app/(tabs)/horoscopo.tsx
// Pantalla Horóscopo (occidental): signo + periodo, áreas de vida, cielo del
// periodo, lectura por niveles, hits a la carta natal y lámina Pro de
// posiciones por casa solar. Ensambla Tasks 1-4 (cliente API, AreaBars, prosa
// portada, SkyEvents+HoroscopeReading). Puerto de estructura de
// apps/web/app/(app)/horoscopo/horoscopo-view.tsx — layout de una sola
// columna (RN no tiene el grid sticky de 2 columnas de la web), MISMO orden
// de secciones y MISMA lógica de fetch (incluido el fix T8 de la web contra
// el parpadeo loading→ready→loading al resolver el signo desde null).
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLANETS, ZODIAC_SIGNS } from "@aluna/core";
import { Enso } from "../../../components/Enso";
import { AreaBars, type BarArea } from "../../../components/AreaBars";
import { SkyEvents } from "../../../components/SkyEvents";
import { HoroscopeReading } from "../../../components/HoroscopeReading";
import { Card, Chip, FadeIn, ToggleRow } from "../../../components/ui";
import { useProfile } from "../../../lib/profile-context";
import { useAuth } from "../../../lib/auth-context";
import { useTheme } from "../../../lib/theme-context";
import { useT } from "../../../lib/i18n-context";
import { astroLabels, ASPECT_GLYPHS } from "../../../content/astrology";
import { SOLAR_HOUSE_LABELS_ES, SOLAR_HOUSE_LABELS_EN, composeWesternProse } from "../../../content/horoscope";
import {
  fetchWesternHoroscope,
  type HoroscopePeriod,
  type NatalHit,
  type SolarHousePlacement,
  type WesternHoroscopePayload,
} from "../../../lib/horoscope-api";
import { fonts, space, type as typeScale, type ThemeTokens } from "../../../theme/tokens";

const TEXT_VS = "︎"; // presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const PERIODS: HoroscopePeriod[] = ["today", "week", "month", "year"];
const PERIOD_KEY: Record<HoroscopePeriod, string> = {
  today: "periodToday", week: "periodWeek", month: "periodMonth", year: "periodYear",
};
const AREA_KEY: Record<string, string> = {
  love: "areaLove", money: "areaMoney", work: "areaWork",
  health: "areaHealth", mood: "areaMood", luck: "areaLuck",
};
const TONE_KEY: Record<string, string> = { high: "toneHigh", mixed: "toneMixed", low: "toneLow" };

type Trad = "occidental" | "oriental";
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: WesternHoroscopePayload };

export default function HoroscopoScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;

  const [trad, setTrad] = useState<Trad>("occidental");
  const profileId = profile?.id ?? null;
  const accessToken = session?.access_token ?? null;
  // Sin perfil arrancamos en Aries; con perfil, el backend resuelve el Sol
  // natal en la PRIMERA carga (sign=null) y de ahí en adelante mandamos el
  // elegido — mismo arranque que horoscopo-view.tsx (web).
  const [sign, setSign] = useState<string | null>(profileId ? null : "aries");
  // Ref (no useState: no debe disparar re-render ni ser dep del efecto) para
  // detectar la transición "el signo se acaba de resolver desde null" — fix
  // de T8 en el review web: sin esto, setSign(p.sign) cambia `sign` en las
  // deps del efecto, el efecto se re-ejecuta y su primera línea vuelve a
  // poner "loading", produciendo un parpadeo loading→ready→loading→ready en
  // la primera carga de todo usuario con perfil. Puerto literal de la lógica
  // de horoscopo-view.tsx (web) — no se reinventa.
  const prevSignRef = useRef<string | null>(sign);
  const [period, setPeriod] = useState<HoroscopePeriod>("today");
  const [pro, setPro] = useState(false);
  // AreaBars es un componente CONTROLADO: el estado de expansión vive acá
  // para que sobreviva un cambio de periodo sin perderse al desmontarse.
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  useEffect(() => {
    if (trad !== "occidental" || !accessToken) return;
    let alive = true;
    // El signo se acababa de resolver desde null (perfil recién cargado): no
    // reseteamos a "loading" para no tapar el ready recién pintado con un
    // refetch rápido. Cualquier otro cambio (signo elegido a mano, periodo,
    // tz, perfil activo) sí muestra "loading" como siempre.
    const resolvingFromNull = prevSignRef.current === null && sign !== null;
    prevSignRef.current = sign;
    if (!resolvingFromNull) setState({ s: "loading" });
    fetchWesternHoroscope({ accessToken, sign, period, tz, profileId })
      .then((p) => {
        if (!alive) return;
        setSign(p.sign);
        setState({ s: "ready", p });
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
    // profileId: si cambia el perfil activo, re-resolvemos el signo.
  }, [trad, sign, period, tz, profileId, accessToken]);

  const ready = state.s === "ready" ? state.p : null;
  const prose = ready ? composeWesternProse(locale, ready) : [];
  const fmtExact = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short", timeZone: tz }),
    [locale, tz],
  );
  const areas: BarArea[] = ready
    ? ready.areas.map((a) => ({
        key: a.area,
        label: t(`hoy.${AREA_KEY[a.area] ?? a.area}`),
        score: a.score,
        tone: a.tone,
        toneLabel: t(`hoy.${TONE_KEY[a.tone] ?? a.tone}`),
        drivers: a.drivers.map((d) => ({
          glyphs: `${PLANET_GLYPH[d.body] ?? "•"} · ${t("horoscopo.houseShort", { n: d.house })}`,
          text: `${L.bodies[d.body] ?? d.body} — ${HOUSES[d.house]}`,
          favorable: d.favorable,
        })),
      }))
    : [];

  return (
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno +
    // estrellas ya viven en ThemedBackground (capa raíz) — esta pantalla
    // queda transparente, igual que carta.tsx/pilares.tsx.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: space.lg, paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("horoscopo.title")}</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1} maxFontSizeMultiplier={1.2}>{t("horoscopo.subtitle")}</Text>

        {/* Occidental/Oriental — mismo patrón de tabs de 2 opciones */}
        <View style={styles.optionsRow}>
          {(["occidental", "oriental"] as Trad[]).map((tr) => (
            <Chip
              key={tr}
              kind="control"
              label={t(tr === "occidental" ? "horoscopo.tabWestern" : "horoscopo.tabEastern")}
              selected={trad === tr}
              onPress={() => setTrad(tr)}
            />
          ))}
        </View>

        {trad === "oriental" ? (
          <Card style={styles.card}>
            <Text style={styles.note}>{t("horoscopo.easternSoon")}</Text>
          </Card>
        ) : (
          <>
            {/* Signo — 12 chips */}
            <View style={styles.optionsRow}>
              {ZODIAC_SIGNS.map((s) => (
                <Chip
                  key={s.key}
                  kind="control"
                  label={`${SIGN_GLYPH[s.key]} ${L.signs[s.key]}`}
                  selected={sign === s.key}
                  onPress={() => setSign(s.key)}
                />
              ))}
            </View>

            {/* Periodo — 4 chips */}
            <View style={styles.optionsRow}>
              {PERIODS.map((p) => (
                <Chip
                  key={p}
                  kind="control"
                  label={t(`hoy.${PERIOD_KEY[p]}`)}
                  selected={period === p}
                  onPress={() => setPeriod(p)}
                />
              ))}
            </View>

            {state.s === "loading" && <Text style={styles.note}>{t("horoscopo.loading")}</Text>}
            {state.s === "error" && <Text style={styles.note}>{t("horoscopo.error")}</Text>}

            {ready && (
              <FadeIn delay={0} style={styles.fadeFull}>
                <SectionCard styles={styles} title={t("horoscopo.areasTitle")}>
                  <AreaBars
                    areas={areas}
                    calmText={t("hoy.calm")}
                    open={openArea}
                    onToggle={(key) => setOpenArea((prev) => (prev === key ? null : key))}
                  />
                </SectionCard>

                <SectionCard styles={styles} title={t("horoscopo.skyTitle")}>
                  <SkyEvents events={ready.events} baseSign={ready.sign} tz={tz} />
                </SectionCard>

                <SectionCard styles={styles} title={t("horoscopo.proseTitle")}>
                  <HoroscopeReading sign={ready.sign} period={period} tz={tz} essence={prose} />
                </SectionCard>

                {ready.natalHits && ready.natalHits.length > 0 && (
                  <SectionCard styles={styles} title={t("horoscopo.hitsTitle")}>
                    {ready.natalHits.map((h, i) => (
                      <HitRow
                        key={i}
                        styles={styles}
                        h={h}
                        L={L}
                        t={t}
                        fmtExact={fmtExact}
                        last={i === ready.natalHits!.length - 1}
                      />
                    ))}
                  </SectionCard>
                )}

                <ToggleRow
                  label={t("horoscopo.pro")}
                  on={pro}
                  onPress={() => setPro(!pro)}
                  style={{ marginTop: space.lg, alignSelf: "center" }}
                />

                {pro && (
                  <View style={styles.proBody}>
                    <SectionCard styles={styles} title={t("horoscopo.proPositions")}>
                      {ready.houses.map((h, i) => (
                        <PosRow key={h.body} styles={styles} h={h} L={L} t={t} last={i === ready.houses.length - 1} />
                      ))}
                    </SectionCard>
                    <Text style={styles.footNote}>
                      {t("horoscopo.proMethod", { sign: L.signs[ready.sign] ?? ready.sign, tz })}
                    </Text>
                  </View>
                )}
              </FadeIn>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Tarjeta con título "eyebrow" sobre el primitivo <Card>. Misma convención
 * que carta.tsx/pilares.tsx (renombrada para no chocar con el <Card> importado). */
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

function HitRow({
  styles, h, L, t, fmtExact, last,
}: {
  styles: ReturnType<typeof makeStyles>;
  h: NatalHit;
  L: ReturnType<typeof astroLabels>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  fmtExact: Intl.DateTimeFormat;
  last: boolean;
}) {
  const color = h.harmony === "hard" ? styles.hitHard : h.harmony === "soft" ? styles.hitSoft : undefined;
  return (
    <View style={[styles.hitRow, last && styles.rowLast]}>
      <Text style={[styles.hitGlyphs, color]}>
        {PLANET_GLYPH[h.a] ?? h.a} {ASPECT_GLYPHS[h.aspect] ?? "·"} {PLANET_GLYPH[h.b] ?? h.b}
      </Text>
      <Text style={styles.hitText}>
        {L.bodies[h.a] ?? h.a} {L.aspects[h.aspect] ?? h.aspect} {L.bodies[h.b] ?? h.b}
        {h.exactIso ? ` · ${t("horoscopo.exactOn", { date: fmtExact.format(new Date(h.exactIso)) })}` : ""}
      </Text>
    </View>
  );
}

function PosRow({
  styles, h, L, t, last,
}: {
  styles: ReturnType<typeof makeStyles>;
  h: SolarHousePlacement;
  L: ReturnType<typeof astroLabels>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  last: boolean;
}) {
  return (
    <View style={[styles.posRow, last && styles.rowLast]}>
      <Text style={styles.posGlyph}>{PLANET_GLYPH[h.body] ?? "•"}</Text>
      <View style={styles.posMain}>
        <Text style={styles.posName}>{L.bodies[h.body] ?? h.body}</Text>
        <Text style={styles.posDetail}>
          {SIGN_GLYPH[h.sign]} {L.signs[h.sign]} · {t("horoscopo.houseShort", { n: h.house })}
        </Text>
      </View>
      {h.retrograde && <Text style={styles.tagWarn}>℞</Text>}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.displaySm, fontFamily: fonts.serifSemi, textAlign: "center", marginBottom: space.xl },

    // Contenedor de cualquier fila de chips (tradición / signo / periodo): los
    // chips en sí son <Chip kind="control">, este solo los reparte en fila.
    optionsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%", marginBottom: space.lg },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.xxl },

    // <FadeIn> envuelve secciones que ya declaran width:"100%" (necesario
    // porque `scroll` centra sus hijos con alignItems — mismo motivo que
    // carta.tsx/pilares.tsx).
    fadeFull: { width: "100%" },

    card: { width: "100%", marginBottom: space.lg },
    cardH: { color: t.acc, fontSize: typeScale.sm, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },

    posRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    posGlyph: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.serif, width: 22 },
    posMain: { flex: 1 },
    posName: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    posDetail: { color: t.textFaint, fontSize: typeScale.xs2, marginTop: 1, fontFamily: fonts.sans },
    tagWarn: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans },

    hitRow: {
      flexDirection: "row", alignItems: "baseline", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    hitGlyphs: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.serif },
    hitHard: { color: t.warn },
    hitSoft: { color: t.acc },
    hitText: { flex: 1, color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans },

    footNote: { color: t.textFaint, fontSize: typeScale.xs2, textAlign: "center", marginTop: space.sm, fontFamily: fonts.sans },
  });
}
