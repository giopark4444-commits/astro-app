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
import {
  ELEMENT_INK, PLANETS, ZODIAC_SIGNS, planetMeaningKey,
  EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_LABELS, BRANCH_LABELS, interactionKey,
} from "@aluna/core";
import { AreaBars, type BarArea } from "../../../components/AreaBars";
import { SkyEvents } from "../../../components/SkyEvents";
import { HoroscopeReading } from "../../../components/HoroscopeReading";
import { Meaning } from "../../../components/Meaning";
import { Card, Chip, FadeIn, ToggleRow } from "../../../components/ui";
import { useProfile } from "../../../lib/profile-context";
import { useAuth } from "../../../lib/auth-context";
import { useTheme } from "../../../lib/theme-context";
import { useT } from "../../../lib/i18n-context";
import { astroLabels, ASPECT_GLYPHS } from "../../../content/astrology";
import { baziContent } from "../../../content/bazi";
import {
  SOLAR_HOUSE_LABELS_ES, SOLAR_HOUSE_LABELS_EN, composeWesternProse, composeEasternProse,
} from "../../../content/horoscope";
import {
  fetchWesternHoroscope,
  type HoroscopePeriod,
  type NatalHit,
  type SolarHousePlacement,
  type WesternHoroscopePayload,
} from "../../../lib/horoscope-api";
import {
  fetchEasternHoroscope,
  EASTERN_ANIMALS,
  type EasternAnimal,
  type EasternPayload,
  type EasternPillarKey,
  type EasternInteractionType,
  type EasternNatalHit,
} from "../../../lib/eastern-api";
import { fonts, space, type as typeScale, type ThemeTokens } from "../../../theme/tokens";

const TEXT_VS = "︎"; // presentación de texto (no emoji) en los glifos
const SIGN_GLYPH = Object.fromEntries(ZODIAC_SIGNS.map((s) => [s.key, s.glyph + TEXT_VS]));
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));
const PERIODS: HoroscopePeriod[] = ["yesterday", "today", "tomorrow", "week", "month", "year"];
const PERIOD_KEY: Record<HoroscopePeriod, string> = {
  yesterday: "periodYesterday", today: "periodToday", tomorrow: "periodTomorrow",
  week: "periodWeek", month: "periodMonth", year: "periodYear",
};
const AREA_KEY: Record<string, string> = {
  love: "areaLove", money: "areaMoney", work: "areaWork",
  health: "areaHealth", mood: "areaMood", luck: "areaLuck",
};
const TONE_KEY: Record<string, string> = { high: "toneHigh", mixed: "toneMixed", low: "toneLow" };
const PILLAR_KEYS: EasternPillarKey[] = ["year", "month", "day"];
// Glifo de interacción (universal, no traducido) — espejo de INTERACTION_GLYPH
// en eastern-sky.tsx (web).
const INTERACTION_GLYPH: Record<EasternInteractionType, string> = {
  six_combo: "合", clash: "冲", harm: "害", punishment: "刑",
  self_punishment: "自刑", po: "破", stem_combo: "", trine: "", half_trine: "",
};
const TAI_SUI_KEY: Record<string, string> = {
  zhi: "taiSuiZhi", chong: "taiSuiChong", hai: "taiSuiHai", zixing: "taiSuiZixing", po: "taiSuiPo",
};
// Frase por relación Wu Xing (acción del elemento del periodo SOBRE el del
// animal, como la define el motor) — espejo de WU_XING_KEY en eastern-sky.tsx (web).
const WU_XING_KEY: Record<string, string> = {
  same: "wuXingSame", generates: "wuXingGenerates", controls: "wuXingControls",
  controlled_by: "wuXingControlledBy", generated_by: "wuXingGeneratedBy",
};

type Trad = "occidental" | "oriental";
type State = { s: "loading" } | { s: "error" } | { s: "ready"; p: WesternHoroscopePayload };
type EasternState = { s: "loading" } | { s: "error" } | { s: "ready"; p: EasternPayload };

export default function HoroscopoScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { t: tk, paletteMode } = useTheme();
  const colorful = paletteMode === "colorful";
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

  // Oriental — mismo patrón que occidental (state machine, ref anti-parpadeo,
  // resolución del animal desde el perfil en la 1ª carga). `period` y `pro` se
  // COMPARTEN con la occidental — cambiar de pestaña no reinicia ni el periodo
  // elegido ni el modo Pro, mismo comportamiento que horoscopo-view.tsx (web).
  const [animal, setAnimal] = useState<EasternAnimal | null>(profileId ? null : "rat");
  const prevAnimalRef = useRef<EasternAnimal | null>(animal);
  const [easternState, setEasternState] = useState<EasternState>({ s: "loading" });
  const [openAreaEastern, setOpenAreaEastern] = useState<string | null>(null);
  // Toggle Ba Zi ↔ Saju de los pilares (espejo del switch de pilares.tsx/web).
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");

  useEffect(() => {
    if (trad !== "oriental" || !accessToken) return;
    let alive = true;
    const resolvingFromNull = prevAnimalRef.current === null && animal !== null;
    prevAnimalRef.current = animal;
    if (!resolvingFromNull) setEasternState({ s: "loading" });
    fetchEasternHoroscope({ accessToken, animal, period, tz, profileId })
      .then((p) => {
        if (!alive) return;
        setAnimal(p.animal);
        setEasternState({ s: "ready", p });
      })
      .catch(() => {
        if (alive) setEasternState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [trad, animal, period, tz, profileId, accessToken]);

  const readyEastern = easternState.s === "ready" ? easternState.p : null;
  const baziL = baziContent(locale);
  const interactionLabel = (type: EasternInteractionType) =>
    type === "po" ? t("horoscopo.interactionPo") : baziL.interactions[type as keyof typeof baziL.interactions] ?? type;
  const proseEastern = readyEastern ? composeEasternProse(locale, readyEastern) : [];
  // Rama del animal consultado (constante en todos los hits del payload) — la
  // tabla Pro y los drivers de las barras SIEMPRE la usan como un lado fijo
  // del par (nunca la rama del pilar del periodo, que varía por hit).
  const animalBranch = readyEastern ? EASTERN_ANIMALS.indexOf(readyEastern.animal) : -1;
  const animalHanzi = animalBranch >= 0 ? EARTHLY_BRANCHES[animalBranch]!.hanzi : "";
  const fmtMonthChange = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz,
    }),
    [locale, tz],
  );
  const easternAreas: BarArea[] = readyEastern
    ? readyEastern.areas.map((a) => ({
        key: a.area,
        label: t(`hoy.${AREA_KEY[a.area] ?? a.area}`),
        score: a.score,
        tone: a.tone,
        toneLabel: t(`hoy.${TONE_KEY[a.tone] ?? a.tone}`),
        drivers: a.drivers.map((d) => ({
          glyphs: `${animalHanzi} ${INTERACTION_GLYPH[d.type]} ${EARTHLY_BRANCHES[d.withBranch]!.hanzi}`,
          text: `${interactionLabel(d.type)} · ${baziL.ui.position[d.pillar]} — ${baziL.ui.animal[d.withAnimal]}`,
          favorable: d.favorable,
        })),
      }))
    : [];

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
          glyphs: (
            <>
              <Meaning k={planetMeaningKey(d.body)}>{PLANET_GLYPH[d.body] ?? "•"}</Meaning>{" · "}
              <Meaning k={`house.${d.house}`}>{t("horoscopo.houseShort", { n: d.house })}</Meaning>
            </>
          ),
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
        {/* Cabecera: eyebrow + h1 apilados, mismo patrón que carta.tsx/numeros.tsx/
            pilares.tsx (T4-T6) — escala 13/24, sin Enso (solo vive en Hoy). El
            eyebrow/h1 de arriba (chip "Horóscopo" del switch de Astros) ya da el
            contexto "Astros > Horóscopo", así que el copy interno usa strings
            propios (headEyebrow/headTitle) en vez de repetir horoscopo.title. */}
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("horoscopo.headEyebrow")}</Text>
          <Text style={styles.h1} maxFontSizeMultiplier={1.2}>
            {t(trad === "oriental" ? "horoscopo.headTitleEastern" : "horoscopo.headTitle")}
          </Text>
        </View>

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
          <>
            {/* Animal — 12 chips (hanzi + nombre), afijo ⓘ aparte (mismo motivo
                que el picker de signo: no anidar el <Text onPress> de <Meaning>
                dentro del <Pressable> del chip). */}
            <View style={styles.optionsRow}>
              {EASTERN_ANIMALS.map((a, i) => {
                const branch = EARTHLY_BRANCHES[i]!;
                const selected = animal === a;
                return (
                  <View key={a} style={styles.chipWithInfo}>
                    <Chip
                      kind="control"
                      label={`${branch.hanzi}${TEXT_VS} ${baziL.ui.animal[a]}`}
                      selected={selected}
                      onPress={() => setAnimal(a)}
                    />
                    <Meaning k={`bazi.branch.${branch.key}`}>
                      <Text style={styles.infoAffix}>ⓘ</Text>
                    </Meaning>
                  </View>
                );
              })}
            </View>

            {/* Periodo — mismos 4 chips (estado compartido con occidental) */}
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

            {easternState.s === "loading" && <Text style={styles.note}>{t("horoscopo.loading")}</Text>}
            {easternState.s === "error" && <Text style={styles.note}>{t("horoscopo.error")}</Text>}

            {readyEastern && (
              <FadeIn delay={0} style={styles.fadeFull}>
                <SectionCard styles={styles} title={t("horoscopo.areasTitle")}>
                  <AreaBars
                    areas={easternAreas}
                    calmText={t("hoy.calm")}
                    open={openAreaEastern}
                    onToggle={(key) => setOpenAreaEastern((prev) => (prev === key ? null : key))}
                  />
                </SectionCard>

                <SectionCard styles={styles} title={t("horoscopo.pillarsTitle")}>
                  {/* Pilares presentes según el periodo (día solo en today, mes
                      null en la vista año — ver EasternPeriodPillars del motor). */}
                  <View style={styles.pillarsRow}>
                    {PILLAR_KEYS.filter((key) => readyEastern.pillars[key] !== null).map((key) => (
                      <EasternPillarCol
                        key={key}
                        styles={styles}
                        pillarKey={key}
                        pillar={readyEastern.pillars[key]!}
                        script={script}
                        baziL={baziL}
                      />
                    ))}
                  </View>

                  <Text style={styles.hitText}>
                    <Meaning k="bazi.term.wuxing"><Text style={styles.hitGlyphs}>五行</Text>{" "}{t("horoscopo.wuXingTitle")}</Meaning>
                    {": "}
                    {t(`horoscopo.${WU_XING_KEY[readyEastern.wuXing.relation]}`, {
                      period: baziL.ui.element[readyEastern.wuXing.periodElement],
                      animal: baziL.ui.element[readyEastern.wuXing.animalElement],
                    })}
                  </Text>

                  {(() => {
                    const dayHits = readyEastern.interactions.filter((h) => h.pillar === "day");
                    const dayClash = dayHits.find((h) => h.type === "clash") ?? null;
                    const dayHarmonies = dayHits.filter((h) => h.type === "six_combo");
                    if (!dayClash && dayHarmonies.length === 0) return null;
                    return (
                      <>
                        {dayClash && (
                          <View style={styles.hitRow}>
                            <Text style={[styles.hitGlyphs, styles.hitHard]}>
                              <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[animalBranch]!.key}`}>{animalHanzi}</Meaning>{" "}
                              <Meaning k={interactionKey("clash")}>冲</Meaning>{" "}
                              <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[dayClash.withBranch]!.key}`}>{EARTHLY_BRANCHES[dayClash.withBranch]!.hanzi}</Meaning>
                            </Text>
                            <Text style={styles.hitText}>
                              <Meaning k={interactionKey("clash")}>{t("horoscopo.clashDay")}</Meaning>: {baziL.ui.animal[dayClash.withAnimal]}
                            </Text>
                          </View>
                        )}
                        {dayHarmonies.map((h, i) => (
                          <View key={i} style={styles.hitRow}>
                            <Text style={[styles.hitGlyphs, styles.hitSoft]}>
                              <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[animalBranch]!.key}`}>{animalHanzi}</Meaning>{" "}
                              <Meaning k={interactionKey("six_combo")}>合</Meaning>{" "}
                              <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.withBranch]!.key}`}>{EARTHLY_BRANCHES[h.withBranch]!.hanzi}</Meaning>
                            </Text>
                            <Text style={styles.hitText}>
                              <Meaning k={interactionKey("six_combo")}>{t("horoscopo.harmonyDay")}</Meaning>: {baziL.ui.animal[h.withAnimal]}
                            </Text>
                          </View>
                        ))}
                      </>
                    );
                  })()}

                  {readyEastern.taiSui && readyEastern.taiSui.length > 0 && (
                    <View style={{ marginTop: space.md }}>
                      <Text style={styles.cardH}>{t("horoscopo.taiSuiTitle")}</Text>
                      {readyEastern.taiSui.map((hit, i) => (
                        <Text key={i} style={[styles.hitText, hit.kind === "zhi" ? styles.hitSoft : styles.hitHard]}>
                          {t(`horoscopo.${TAI_SUI_KEY[hit.kind]}`)}
                        </Text>
                      ))}
                    </View>
                  )}

                  {readyEastern.period === "year" && <Text style={styles.note}>{t("horoscopo.lichunYearNote")}</Text>}

                  {readyEastern.jieDates.length > 0 && (
                    <View style={{ marginTop: space.md }}>
                      <Text style={styles.footNote}>{t("horoscopo.jieNote")}</Text>
                      {readyEastern.jieDates.map((j, i) => (
                        <Text key={i} style={styles.footNote}>節 {fmtMonthChange.format(new Date(j.atIso))}</Text>
                      ))}
                    </View>
                  )}
                </SectionCard>

                <SectionCard styles={styles} title={t("horoscopo.proseTitle")}>
                  {proseEastern.map((p, i) => <Text key={i} style={styles.proseP}>{p}</Text>)}
                </SectionCard>

                {readyEastern.natalHits && readyEastern.natalHits.length > 0 && (
                  <SectionCard styles={styles} title={t("horoscopo.natalHitsTitle")}>
                    {readyEastern.natalHits.map((h, i) => (
                      <EasternNatalHitRow
                        key={i}
                        styles={styles}
                        h={h}
                        baziL={baziL}
                        t={t}
                        interactionLabel={interactionLabel}
                        last={i === readyEastern.natalHits!.length - 1}
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
                    {/* Toggle de escritura Ba Zi ↔ Saju — mismo par de chips que pilares.tsx */}
                    <View style={styles.optionsRow}>
                      {(["hanzi", "hangul"] as const).map((s) => (
                        <Chip
                          key={s}
                          kind="control"
                          label={t(`pilares.${s === "hanzi" ? "scriptBazi" : "scriptSaju"}`)}
                          selected={script === s}
                          onPress={() => setScript(s)}
                        />
                      ))}
                    </View>

                    <SectionCard styles={styles} title={t("horoscopo.proInteractions")}>
                      {readyEastern.interactions.map((h, i) => (
                        <EasternProRow
                          key={i}
                          styles={styles}
                          h={h}
                          animalHanzi={animalHanzi}
                          baziL={baziL}
                          interactionLabel={interactionLabel}
                          last={i === readyEastern.interactions.length - 1}
                        />
                      ))}
                    </SectionCard>

                    {readyEastern.harmonies.length > 0 && (
                      <SectionCard styles={styles} title={t("horoscopo.proHarmonies")}>
                        <Text style={styles.footNote}>{t("horoscopo.proHarmoniesHint")}</Text>
                        <Text style={styles.hitText}>
                          {readyEastern.harmonies.map((a, i) => {
                            const idx = EASTERN_ANIMALS.indexOf(a);
                            const b = EARTHLY_BRANCHES[idx]!;
                            return (
                              <Text key={a}>
                                <Meaning k={`bazi.branch.${b.key}`}>{b.hanzi} {baziL.ui.animal[a]}</Meaning>
                                {i < readyEastern.harmonies.length - 1 ? " · " : ""}
                              </Text>
                            );
                          })}
                        </Text>
                      </SectionCard>
                    )}

                    {readyEastern.monthChange && (
                      <SectionCard styles={styles} title={t("horoscopo.proMonthChange")}>
                        <Text style={styles.footNote}>{t("horoscopo.proMonthChangeHint")}</Text>
                        <Text style={styles.hitText}>節 {fmtMonthChange.format(new Date(readyEastern.monthChange.atIso))}</Text>
                      </SectionCard>
                    )}

                    <Text style={styles.footNote}>
                      {t("horoscopo.proMethodEastern", { tz })} {t("horoscopo.lateZiNote")}
                    </Text>
                  </View>
                )}
              </FadeIn>
            )}
          </>
        ) : (
          <>
            {/* Signo — 12 chips */}
            <View style={styles.optionsRow}>
              {ZODIAC_SIGNS.map((s) => {
                const selected = sign === s.key;
                // Colorido: solo el glifo de los chips INACTIVOS se tiñe por
                // elemento (ELEMENT_INK) — el chip activo conserva el dorado
                // de siempre (legibilidad), mismo label combinado que antes.
                const tintGlyph = colorful && !selected;
                return (
                  <Chip
                    key={s.key}
                    kind="control"
                    label={tintGlyph ? L.signs[s.key] : `${SIGN_GLYPH[s.key]} ${L.signs[s.key]}`}
                    icon={
                      tintGlyph ? (
                        <Text style={[styles.signGlyphTint, { color: ELEMENT_INK[s.element] }]}>
                          {SIGN_GLYPH[s.key]}
                        </Text>
                      ) : undefined
                    }
                    selected={selected}
                    onPress={() => setSign(s.key)}
                  />
                );
              })}
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
        <Meaning k={planetMeaningKey(h.a)}>{PLANET_GLYPH[h.a] ?? h.a}</Meaning>{" "}
        {ASPECT_GLYPHS[h.aspect] ?? "·"}{" "}
        <Meaning k={planetMeaningKey(h.b)}>{PLANET_GLYPH[h.b] ?? h.b}</Meaning>
      </Text>
      <Text style={styles.hitText}>
        {L.bodies[h.a] ?? h.a} <Meaning k={`aspect.${h.aspect}`}>{L.aspects[h.aspect] ?? h.aspect}</Meaning> {L.bodies[h.b] ?? h.b}
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
      <Text style={styles.posGlyph}>
        <Meaning k={planetMeaningKey(h.body)}>{PLANET_GLYPH[h.body] ?? "•"}</Meaning>
      </Text>
      {/* Combinado en una sola línea a 15px — mismo patrón que el previewRow
          "POSICIONES" de carta.tsx (T4), en vez del posName/posDetail de dos
          líneas a 13/11 de antes (§D). */}
      <Text style={styles.posTxt} numberOfLines={1}>
        <Text style={styles.posName}>{L.bodies[h.body] ?? h.body}</Text>
        {" — "}
        <Meaning k={`sign.${h.sign}`}>{SIGN_GLYPH[h.sign]} {L.signs[h.sign]}</Meaning>{" "}
        <Text style={styles.posFaint}>
          · <Meaning k={`house.${h.house}`}>{t("horoscopo.houseShort", { n: h.house })}</Meaning>
        </Text>
      </Text>
      {h.retrograde && <Text style={styles.tagWarn}><Meaning k="term.retrograde">℞</Meaning></Text>}
    </View>
  );
}

/** Columna de un pilar del periodo (año/mes/día): tronco+rama en hanzi/hangul
 *  tocables, pinyin/romanización y animal. Espejo de pillarCell en
 *  eastern-sky.tsx (web), sin la lámina completa (acá vive inline). */
function EasternPillarCol({
  styles, pillarKey, pillar, script, baziL,
}: {
  styles: ReturnType<typeof makeStyles>;
  pillarKey: EasternPillarKey;
  pillar: EasternPayload["pillars"]["year"];
  script: "hanzi" | "hangul";
  baziL: ReturnType<typeof baziContent>;
}) {
  const stemKey = HEAVENLY_STEMS[pillar.stem]!.key;
  const branchKey = EARTHLY_BRANCHES[pillar.branch]!.key;
  return (
    <View style={styles.pillarCell}>
      <Text style={styles.pillarLabel}>{baziL.ui.position[pillarKey]}</Text>
      <Text style={styles.pillarChar}>
        <Meaning k={`bazi.stem.${stemKey}`}>
          {script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : pillar.stemHanzi}
        </Meaning>
        <Meaning k={`bazi.branch.${branchKey}`}>
          {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.hangul : pillar.branchHanzi}
        </Meaning>
      </Text>
      <Text style={styles.pillarSub}>
        {script === "hangul"
          ? `${STEM_LABELS[pillar.stem]!.romanKo} ${BRANCH_LABELS[pillar.branch]!.romanKo}`
          : `${STEM_LABELS[pillar.stem]!.pinyin} ${BRANCH_LABELS[pillar.branch]!.pinyin}`}
      </Text>
      <Text style={styles.pillarAnimal}>{baziL.ui.animal[pillar.animal]}</Text>
    </View>
  );
}

/** Fila de cruce personal (pilares natales vs pilares del periodo) — espejo
 *  del bloque natalHits de horoscopo-view.tsx (web). */
function EasternNatalHitRow({
  styles, h, baziL, t, interactionLabel, last,
}: {
  styles: ReturnType<typeof makeStyles>;
  h: EasternNatalHit;
  baziL: ReturnType<typeof baziContent>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  interactionLabel: (type: EasternInteractionType) => string;
  last: boolean;
}) {
  const color = h.favorable ? styles.hitSoft : styles.hitHard;
  return (
    <View style={[styles.hitRow, last && styles.rowLast]}>
      <Text style={[styles.hitGlyphs, color]}>
        <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.natalBranch]!.key}`}>{EARTHLY_BRANCHES[h.natalBranch]!.hanzi}</Meaning>{" "}
        <Meaning k={interactionKey(h.type)}>{INTERACTION_GLYPH[h.type]}</Meaning>{" "}
        <Meaning k={`bazi.branch.${EARTHLY_BRANCHES[h.withBranch]!.key}`}>{EARTHLY_BRANCHES[h.withBranch]!.hanzi}</Meaning>
      </Text>
      <Text style={styles.hitText}>
        <Meaning k={interactionKey(h.type)}>{interactionLabel(h.type)}</Meaning>
        {" · "}
        {t("horoscopo.natalVsPeriod", { natal: baziL.ui.position[h.natalPillar], period: baziL.ui.position[h.periodPillar] })}
      </Text>
    </View>
  );
}

/** Fila de la tabla Pro "Interacciones completas" — espejo del <tr> de
 *  horoscopo-view.tsx (web), aplanado a una fila glifo+texto. */
function EasternProRow({
  styles, h, animalHanzi, baziL, interactionLabel, last,
}: {
  styles: ReturnType<typeof makeStyles>;
  h: EasternPayload["interactions"][number];
  animalHanzi: string;
  baziL: ReturnType<typeof baziContent>;
  interactionLabel: (type: EasternInteractionType) => string;
  last: boolean;
}) {
  return (
    <View style={[styles.hitRow, last && styles.rowLast]}>
      <Text style={[styles.hitGlyphs, h.favorable ? styles.hitSoft : styles.hitHard]}>
        {animalHanzi} {INTERACTION_GLYPH[h.type]} {EARTHLY_BRANCHES[h.withBranch]!.hanzi}
      </Text>
      <Text style={styles.hitText}>
        {baziL.ui.position[h.pillar]} · {interactionLabel(h.type)} · {baziL.ui.animal[h.withAnimal]}
      </Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    // Cabecera: eyebrow + h1, apilados a la izquierda — receta "eyebrow"+"h-serif"
    // idéntica a la de carta.tsx/numeros.tsx/pilares.tsx (T4-T6).
    head: { width: "100%", gap: 2, marginBottom: space.xl },
    eyebrow: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },

    // Contenedor de cualquier fila de chips (tradición / signo / periodo): los
    // chips en sí son <Chip kind="control">, este solo los reparte en fila.
    optionsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%", marginBottom: space.lg },
    // Glifo del signo teñido por elemento (modo Colorido, chips inactivos) — mismo
    // tamaño que el label del chip (`controlText`/typeScale.md en components/ui.tsx)
    // para no desalinear la fila cuando reemplaza al glifo embebido en el label.
    signGlyphTint: { fontSize: typeScale.md, fontFamily: fonts.sansMedium },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.xxl },

    // <FadeIn> envuelve secciones que ya declaran width:"100%" (necesario
    // porque `scroll` centra sus hijos con alignItems — mismo motivo que
    // carta.tsx/pilares.tsx).
    fadeFull: { width: "100%" },

    card: { width: "100%", marginBottom: space.lg },
    cardH: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },

    // Fila de posición combinada en una sola línea a 15px (glifo + nombre en
    // negrita + signo · casa en tenue) — mismo patrón que el previewRow
    // "POSICIONES" de carta.tsx (T4), reemplaza el posName/posDetail de dos
    // líneas de antes (§D).
    posRow: {
      flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44, paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    posGlyph: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serif, width: 18, textAlign: "center" },
    posTxt: { flex: 1, color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansMedium },
    posName: { fontFamily: fonts.sansBold },
    posFaint: { color: t.textFaint },
    tagWarn: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans },

    hitRow: {
      flexDirection: "row", alignItems: "baseline", gap: space.md, paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    hitGlyphs: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.serif },
    hitHard: { color: t.warn },
    hitSoft: { color: t.accText },
    hitText: { flex: 1, color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },

    footNote: { color: t.textFaint, fontSize: typeScale.sm, textAlign: "center", marginTop: space.sm, fontFamily: fonts.sans },

    // Chip + afijo ⓘ envuelto aparte (picker de animal) — mismo motivo que el
    // role="radio"+span del web: <Meaning> es un <Text onPress>, no puede
    // anidarse dentro del <Pressable> del chip.
    chipWithInfo: { flexDirection: "row", alignItems: "center", gap: 2 },
    infoAffix: { color: t.textDim, fontSize: typeScale.sm },

    proseP: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans, lineHeight: 22, marginBottom: space.md },

    // Pilares del periodo (año/mes/día) — espejo de .pillarsRow/.pillarCell
    // de horoscopo.module.css (web).
    pillarsRow: { flexDirection: "row", justifyContent: "center", gap: space.xl, marginBottom: space.lg, width: "100%" },
    pillarCell: { alignItems: "center", gap: 2 },
    pillarLabel: { color: t.textDim, fontSize: typeScale.sm, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: fonts.sansSemi },
    pillarChar: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },
    pillarSub: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },
    pillarAnimal: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
  });
}
