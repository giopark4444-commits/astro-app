import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_LABELS,
  BRANCH_LABELS,
  TEN_GODS,
  TEN_GOD_KO,
  hiddenStems,
  tenGod,
  nayin,
  lifeStage,
  TWELVE_STAGES,
  detectInteractions,
  symbolicStars,
  STARS,
  dayMasterStrength,
  favorableElements,
  luckPillars,
  annualPillars,
  WU_XING_COLORS as EL_COLOR,
  composeBaziReading,
  DAY_MASTER_VOICE,
  type Pillar,
  type PillarSet,
  type TenGod,
  type LuckSequence,
} from "@aluna/core";
import { Enso } from "../../components/Enso";
import { Meaning } from "../../components/Meaning";
import { Card, Chip, FadeIn, ToggleRow } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { baziContent, type BaziContent } from "../../content/bazi";
import { fetchBaZi, type BaZiData } from "../../lib/bazi-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;
// Orden del mockup 11 (§B.4): HORA · DÍA · MES · AÑO — invertido respecto al orden
// cronológico ["year","month","day","hour"] de antes.
const POS_KEYS = ["hour", "day", "month", "year"] as const;
type PosKey = (typeof POS_KEYS)[number];

type State = { s: "loading" } | { s: "error" } | { s: "ready"; data: BaZiData };

/** Los 8 valores derivados de la lámina Pro, memoizados juntos sobre `data` (igual
 *  que pro-lamina.tsx en la web) para que alternar `pro`/`script` no los recalcule. */
interface LaminaData {
  set: PillarSet;
  strength: ReturnType<typeof dayMasterStrength>;
  favor: ReturnType<typeof favorableElements>;
  interactions: ReturnType<typeof detectInteractions>;
  stars: ReturnType<typeof symbolicStars>;
  sequences: LuckSequence[];
  entries: Array<{ key: PosKey; pillar: Pillar }>;
}

export default function PilaresScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { t: tk, paletteMode } = useTheme();
  const colorful = paletteMode === "colorful";
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const content = baziContent(locale);

  const [pro, setPro] = useState(false);
  const [script, setScript] = useState<"hanzi" | "hangul">("hanzi");
  const [openDecade, setOpenDecade] = useState<number | null>(null);
  const [state, setState] = useState<State>({ s: "loading" });
  const cache = useRef<Map<string, BaZiData>>(new Map());

  const profileId = profile?.id ?? null;
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!profileId || !accessToken) return;
    const hit = cache.current.get(profileId);
    if (hit) {
      setState({ s: "ready", data: hit });
      return;
    }
    let alive = true;
    setState({ s: "loading" });
    fetchBaZi({ accessToken, profileId })
      .then((data) => {
        if (!alive) return;
        cache.current.set(profileId, data);
        setState({ s: "ready", data });
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [profileId, accessToken]);

  const data = state.s === "ready" ? state.data : null;

  const laminaData = useMemo<LaminaData | null>(() => {
    if (!data) return null;
    const set: PillarSet = { year: data.year, month: data.month, day: data.day, hour: data.hour };
    const strength = dayMasterStrength(set);
    const favor = favorableElements(strength.verdict, data.day.stem);
    const interactions = detectInteractions(set);
    const stars = symbolicStars(set);
    const sequences = luckPillars({
      pillars: set,
      gender: data.gender,
      birthYear: data.birthYear,
      daysToPrevJie: data.daysToPrevJie,
      daysToNextJie: data.daysToNextJie,
    });
    const entries = POS_KEYS.map((k) => ({ key: k, pillar: data[k] })).filter(
      (e): e is { key: PosKey; pillar: Pillar } => !!e.pillar,
    );
    return { set, strength, favor, interactions, stars, sequences, entries };
  }, [data]);

  const glyphStem = (i: number) => (script === "hangul" ? STEM_LABELS[i]!.hangul : HEAVENLY_STEMS[i]!.hanzi);
  const glyphBranch = (i: number) => (script === "hangul" ? BRANCH_LABELS[i]!.hangul : EARTHLY_BRANCHES[i]!.hanzi);
  const glyphGod = (g: TenGod) => (script === "hangul" ? TEN_GOD_KO[g] : TEN_GODS.find((x) => x.key === g)!.hanzi);
  const glyphPillar = (p: Pillar) => `${glyphStem(p.stem)}${glyphBranch(p.branch)}`;
  const elName = (el: string) => content.ui.element[el] ?? el;
  // "Tierra yin"/"Fuego yang" — nombre del tronco (mockup 11 §B.4: reemplaza la línea de
  // pinyin/romanización que el mockup no muestra).
  const stemName = (i: number) => {
    const s = HEAVENLY_STEMS[i]!;
    return `${elName(s.element)} ${content.ui.polarity[s.yin ? "yin" : "yang"]}`;
  };

  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (data) {
    const bump = (e: string) => {
      counts[e] = (counts[e] ?? 0) + 1;
    };
    for (const p of [data.year, data.month, data.day, data.hour]) {
      if (!p) continue;
      bump(HEAVENLY_STEMS[p.stem]!.element);
      bump(EARTHLY_BRANCHES[p.branch]!.element);
    }
  }
  const totalEls = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const nowYear = new Date().getFullYear();

  if (!profile || !profileId) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyWrap}>
          <Enso size={48} />
          <Text style={styles.emptyText}>{t("pilares.emptyMap")}</Text>
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
        {/* Cabecera del mockup 11: eyebrow + h1 apilados + control segmentado Ba Zi|Saju
            integrado debajo, SIEMPRE visible (antes vivía como 2 chips sueltos, Pro-only,
            muy abajo en la pantalla — mismo dato/estado `script`, solo reubicado y
            restilado; ver gap file §B.4 punto 2/5). Sin Enso (solo vive en Hoy). */}
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("pilares.headEyebrow")}</Text>
          <Text style={styles.h1} maxFontSizeMultiplier={1.2}>{t("pilares.headTitle")}</Text>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.seg, script === "hanzi" && styles.segOn]}
              onPress={() => setScript("hanzi")}
              accessibilityRole="button"
              accessibilityState={{ selected: script === "hanzi" }}
            >
              <Text style={[styles.segText, script === "hanzi" && styles.segTextOn]}>{t("pilares.scriptBazi")}</Text>
            </Pressable>
            <Pressable
              style={[styles.seg, script === "hangul" && styles.segOn]}
              onPress={() => setScript("hangul")}
              accessibilityRole="button"
              accessibilityState={{ selected: script === "hangul" }}
            >
              <Text style={[styles.segText, script === "hangul" && styles.segTextOn]}>{t("pilares.scriptSaju")}</Text>
            </Pressable>
          </View>
        </View>

        {state.s === "loading" && <Text style={styles.note}>{t("pilares.loading")}</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("pilares.error")}</Text>}

        {data && laminaData && (
          <>
            {/* Rejilla de los 4 pilares — cada uno es un <Card>; el pilar del DÍA se
                destaca con fondo teñido (`accent`, receta `.card--tinted` del mockup) +
                borde t.accSoft más grueso + glifos en accText (el mockup NO colorea los
                troncos/ramas por elemento Wu Xing en la rejilla compacta — ese dato ya
                lo dice la línea "nombre" en palabras, p.ej. "Tierra yin"; el color Wu
                Xing por elemento se conserva solo en Modo Pro, troncos ocultos). Altura
                uniforme (minHeight 180, no fija: Modo Pro añade contenido y necesita
                crecer). Vara: docs/redesign/movil-mockups/screens-compacta/11-pilares.html */}
            <FadeIn delay={0} style={styles.fadeFull}>
              <View style={styles.grid}>
                {POS_KEYS.map((key) => {
                  const pillar = data[key];
                  if (!pillar) {
                    return (
                      <Card key={key} style={styles.col}>
                        <Text style={styles.colLabel}>{content.ui.position[key]}</Text>
                        <Text style={styles.empty}>—</Text>
                      </Card>
                    );
                  }
                  const stem = HEAVENLY_STEMS[pillar.stem]!;
                  const branch = EARTHLY_BRANCHES[pillar.branch]!;
                  const isDay = key === "day";
                  // El tronco del pilar de DÍA es el Maestro del Día (日主): referencia
                  // de todos los Diez Dioses. Él mismo no tiene Dios (sería 比肩 trivial).
                  const dayMaster = data.day.stem;
                  return (
                    <Card key={key} accent={isDay} style={[styles.col, isDay && styles.dayCol]}>
                      {pro && (
                        <View style={[styles.godBadge, isDay && styles.godBadgeSelf]}>
                          <Text style={styles.godText}>
                            {isDay ? (
                              <Meaning k="bazi.term.daymaster">{t("pilares.dayMasterHanzi")}</Meaning>
                            ) : (
                              <Meaning k={`bazi.god.${tenGod(dayMaster, pillar.stem)}`}>
                                {content.ui.god[tenGod(dayMaster, pillar.stem)]}
                              </Meaning>
                            )}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.colLabel}>{content.ui.position[key]}</Text>
                      <Text
                        style={[
                          styles.char,
                          isDay && styles.charDay,
                          colorful && { color: EL_COLOR[stem.element] },
                        ]}
                      >
                        <Meaning k={`bazi.stem.${stem.key}`}>{glyphStem(pillar.stem)}</Meaning>
                      </Text>
                      <Text style={styles.nombre}>{stemName(pillar.stem)}</Text>
                      <View style={styles.hr} />
                      <Text
                        style={[
                          styles.char,
                          isDay && styles.charDay,
                          colorful && { color: EL_COLOR[branch.element] },
                        ]}
                      >
                        <Meaning k={`bazi.branch.${branch.key}`}>{glyphBranch(pillar.branch)}</Meaning>
                      </Text>
                      <Text style={styles.nombre}>
                        <Meaning k={`bazi.branch.${branch.key}`}>{content.ui.animal[branch.animal] ?? branch.animal}</Meaning>
                      </Text>
                      {pro && (
                        <View style={styles.hiddenWrap}>
                          <Text style={styles.hiddenLabel}>
                            <Meaning k="bazi.term.hiddenstems">{t("pilares.hiddenStems")}</Meaning>
                          </Text>
                          {hiddenStems(pillar.branch).map((hs, j) => {
                            const hidden = HEAVENLY_STEMS[hs]!;
                            return (
                              <View key={j} style={styles.hiddenRow}>
                                <Text style={[styles.hiddenChar, { color: EL_COLOR[hidden.element] }]}>
                                  <Meaning k={`bazi.stem.${hidden.key}`}>{hidden.hanzi}</Meaning>
                                </Text>
                                <Text style={styles.hiddenGod}>
                                  <Meaning k={`bazi.god.${tenGod(dayMaster, hs)}`}>{content.ui.god[tenGod(dayMaster, hs)]}</Meaning>
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            </FadeIn>

            {!data.timeKnown && <Text style={styles.note}>{t("pilares.noTime")}</Text>}

            {/* Maestro del Día — card nueva del mockup (§B.4 punto 3/6): tronco del
                pilar de DÍA + su nombre + 1 línea poética curada por combinación
                (DAY_MASTER_VOICE, content/bazi.ts). Respeta el toggle Ba Zi/Saju del
                encabezado para el glifo (hanzi↔hangul); el texto es contenido de
                locale, no cambia con el script. */}
            <FadeIn delay={60} style={styles.fadeFull}>
              <Card accent style={styles.maestro}>
                <Text style={styles.maestroNombre}>
                  <Meaning k={`bazi.stem.${HEAVENLY_STEMS[data.day.stem]!.key}`}>{glyphStem(data.day.stem)}</Meaning>{" "}
                  {stemName(data.day.stem)}
                </Text>
                <Text style={styles.maestroDesc}>
                  {DAY_MASTER_VOICE[HEAVENLY_STEMS[data.day.stem]!.key]?.[locale] ?? ""}
                </Text>
              </Card>
            </FadeIn>

            {/* Lectura de tus pilares — esencia compuesta compartida con la web
                (composeBaziReading, @aluna/core/bazi/reading.ts): 3 párrafos deterministas
                (esencia/fuerza/favorables) tejidos desde el mismo motor que ya calcula
                dayMasterStrength y favorableElements arriba. Sin niveles IA (esos quedan
                solo en web, ver informe). */}
            {laminaData && (
              <FadeIn delay={90} style={styles.fadeFull}>
                <View style={styles.readingSec}>
                  <Text style={styles.cardH}>{t("pilares.readingTitle")}</Text>
                  <Card style={styles.readingCard}>
                    {(() => {
                      const reading = composeBaziReading(laminaData.set, locale);
                      return (
                        <>
                          <Text style={styles.readingP}>{reading.essence}</Text>
                          <Text style={styles.readingP}>{reading.strength}</Text>
                          <Text style={styles.readingP}>{reading.favorable}</Text>
                        </>
                      );
                    })()}
                  </Card>
                </View>
              </FadeIn>
            )}

            {/* Balance de elementos — eyebrow FUERA de la card (receta `.balance` del
                mockup, igual patrón que "POSICIONES" en carta.tsx), no el título-dentro
                de <SectionCard> que usa el resto de Modo Pro. Relleno de barra uniforme
                acc (el mockup usa el mismo gradiente acc-soft→acc en las 5 filas, sin
                colorear por elemento Wu Xing — antes cada barra tomaba EL_COLOR[el]). */}
            <FadeIn delay={120} style={styles.fadeFull}>
              <View style={styles.balanceSec}>
                <Text style={styles.cardH}>{t("pilares.balance")}</Text>
                <Card style={styles.balCard}>
                  {ELEMENTS.map((el) => {
                    const n = counts[el] ?? 0;
                    const empty = n === 0;
                    return (
                      <View key={el} style={styles.balRow}>
                        <Text style={styles.balLabel}><Meaning k={`bazi.element.${el}`}>{elName(el)}</Meaning></Text>
                        <View style={[styles.balTrack, empty && styles.balTrackEmpty]}>
                          {!empty && (
                            <View
                              style={[
                                styles.balFill,
                                colorful && { backgroundColor: EL_COLOR[el] },
                                { width: `${(n / totalEls) * 100}%` },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={styles.balN}>{n}</Text>
                      </View>
                    );
                  })}
                </Card>
              </View>
            </FadeIn>

            {/* Modo Pro — sin referencia visual en el mockup compacto (E.16); se
                conserva al final del contenido siempre-visible, mismo patrón que
                carta.tsx/numeros.tsx (T4/T5). */}
            <ToggleRow
              label={t("pilares.modePro")}
              on={pro}
              onPress={() => setPro(!pro)}
              style={{ marginTop: space.lg, alignSelf: "center" }}
            />
            {pro && <Text style={styles.proHint}>{t("pilares.modeProHint")}</Text>}

            {/* Lámina Pro: las 8 secciones */}
            {pro && (
              <View style={styles.proBody}>
                {!data.timeKnown && <Text style={styles.note}>{t("pilares.threePillarsNote")}</Text>}

                <NayinSection styles={styles} content={content} t={t} entries={laminaData.entries} glyphPillar={glyphPillar} />

                <StrengthSection styles={styles} content={content} t={t} strength={laminaData.strength} />

                <FavorSection
                  styles={styles}
                  content={content}
                  t={t}
                  strength={laminaData.strength}
                  favor={laminaData.favor}
                  elName={elName}
                  tk={tk}
                />

                <LuckSection
                  styles={styles}
                  content={content}
                  t={t}
                  sequences={laminaData.sequences}
                  nowYear={nowYear}
                  glyphPillar={glyphPillar}
                  glyphGod={glyphGod}
                  gender={data.gender}
                  timeKnown={data.timeKnown}
                  natal={laminaData.set}
                  openDecade={openDecade}
                  setOpenDecade={setOpenDecade}
                />

                <StagesSection
                  styles={styles}
                  content={content}
                  t={t}
                  entries={laminaData.entries}
                  dayStem={data.day.stem}
                  glyphBranch={glyphBranch}
                  script={script}
                />

                <InteractionsSection
                  styles={styles}
                  content={content}
                  t={t}
                  interactions={laminaData.interactions}
                  elName={elName}
                />

                <StarsSection styles={styles} content={content} t={t} stars={laminaData.stars} script={script} tk={tk} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Tarjeta con título "eyebrow" (BALANCE/NAYIN/...) sobre el primitivo <Card>.
 * Renombrada de "Card" a "SectionCard" para no chocar con el primitivo importado
 * (misma convención que carta.tsx/numeros.tsx). Solo la usan las secciones de Modo
 * Pro — Balance (siempre visible) usa el patrón "eyebrow fuera de la card" del
 * mockup, ver arriba. */
function SectionCard({
  styles,
  title,
  children,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {children}
    </Card>
  );
}

function NayinSection({
  styles,
  content,
  t,
  entries,
  glyphPillar,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  entries: Array<{ key: PosKey; pillar: Pillar }>;
  glyphPillar: (p: Pillar) => string;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.nayin">{t("pilares.nayinTitle")}</Meaning>}>
      {entries.map((e, i) => {
        const n = nayin(e.pillar);
        return (
          <View key={e.key} style={[styles.row, i === entries.length - 1 && styles.rowLast]}>
            <Text style={styles.rowLabel}>{content.ui.position[e.key]}</Text>
            <Text style={styles.rowGlyph}>{glyphPillar(e.pillar)}</Text>
            <Text style={[styles.rowValue, { color: EL_COLOR[n.element] }]}>
              {n.hanzi} · {content.nayin[n.key]}
            </Text>
          </View>
        );
      })}
    </SectionCard>
  );
}

function StrengthSection({
  styles,
  content,
  t,
  strength,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  strength: ReturnType<typeof dayMasterStrength>;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.strength">{t("pilares.strengthTitle")}</Meaning>}>
      <View style={styles.meterRow}>
        {/* Verdicto en pill bordeada (receta "tag-chip" del mockup) en vez del texto
           suelto anterior — mismo `content.verdicts[strength.verdict]`, cero dato nuevo. */}
        <View style={styles.verdictTag}>
          <Text style={styles.verdictTagText}>{content.verdicts[strength.verdict]}</Text>
        </View>
        {/* El medidor usa `score` (0-100, capado); el número mostrado usa `raw` (suma
           exacta de los drivers) para no contradecir el desglose de abajo — Task 5. */}
        <Text style={styles.meterScore}>{strength.raw}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${strength.score}%` }]} />
      </View>
      {/* Etiquetas del eje (Débil/Equilibrado/Fuerte) — mismas claves i18n que ya usa
         `content.verdicts[strength.verdict]` arriba, sin contenido nuevo. */}
      <View style={styles.meterLabels}>
        <Text style={styles.meterLabelText}>{content.verdicts.weak}</Text>
        <Text style={styles.meterLabelText}>{content.verdicts.balanced}</Text>
        <Text style={styles.meterLabelText}>{content.verdicts.strong}</Text>
      </View>
      <Text style={styles.subRow}>
        {t("pilares.seasonState")}: {content.seasonStates[strength.seasonState]}
      </Text>
      <View style={styles.drivers}>
        {strength.drivers.map((d, i) => (
          <View key={i} style={styles.driver}>
            <Text style={styles.driverLabel}>
              {content.drivers[d.key]} · {content.ui.position[d.pillar]}
            </Text>
            <Text style={styles.driverPts}>+{d.points}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.method}>{t("pilares.strengthMethod")}</Text>
    </SectionCard>
  );
}

function FavorSection({
  styles,
  content,
  t,
  strength,
  favor,
  elName,
  tk,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  strength: ReturnType<typeof dayMasterStrength>;
  favor: ReturnType<typeof favorableElements>;
  elName: (el: string) => string;
  tk: ThemeTokens;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.favorable">{t("pilares.favorTitle")}</Meaning>}>
      {strength.verdict === "balanced" ? (
        <Text style={styles.note}>{t("pilares.balancedNote")}</Text>
      ) : (
        <>
          <View style={styles.chips}>
            {favor.favor.map((el) => (
              <Chip
                key={el}
                kind="tag"
                label={elName(el)}
                tint={{ bg: EL_COLOR[el], border: EL_COLOR[el], fg: "#fff" }}
                bold
              />
            ))}
          </View>
          <Text style={styles.subRow}>{t("pilares.avoidTitle")}</Text>
          <View style={styles.chips}>
            {favor.avoid.map((el) => (
              <Chip
                key={el}
                kind="tag"
                label={elName(el)}
                tint={{ bg: "transparent", border: tk.accHair, fg: tk.text }}
                dim
              />
            ))}
          </View>
        </>
      )}
    </SectionCard>
  );
}

function LuckSection({
  styles,
  content,
  t,
  sequences,
  nowYear,
  glyphPillar,
  glyphGod,
  gender,
  timeKnown,
  natal,
  openDecade,
  setOpenDecade,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string, vars?: Record<string, string | number>) => string;
  sequences: LuckSequence[];
  nowYear: number;
  glyphPillar: (p: Pillar) => string;
  glyphGod: (g: TenGod) => string;
  gender: BaZiData["gender"];
  timeKnown: boolean;
  natal: PillarSet;
  openDecade: number | null;
  setOpenDecade: (n: number | null) => void;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.luckpillars">{t("pilares.luckTitle")}</Meaning>}>
      {gender === "neutral" && <Text style={styles.note}>{t("pilares.luckNeutralNote")}</Text>}
      {!timeKnown && <Text style={styles.note}>{t("pilares.luckNoTimeNote")}</Text>}
      {sequences.map((seq) => (
        <LuckRow
          key={seq.direction}
          styles={styles}
          content={content}
          t={t}
          seq={seq}
          nowYear={nowYear}
          glyphPillar={glyphPillar}
          glyphGod={glyphGod}
          natal={natal}
          openDecade={openDecade}
          setOpenDecade={setOpenDecade}
        />
      ))}
    </SectionCard>
  );
}

function LuckRow({
  styles,
  content,
  t,
  seq,
  nowYear,
  glyphPillar,
  glyphGod,
  natal,
  openDecade,
  setOpenDecade,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string, vars?: Record<string, string | number>) => string;
  seq: LuckSequence;
  nowYear: number;
  glyphPillar: (p: Pillar) => string;
  glyphGod: (g: TenGod) => string;
  natal: PillarSet;
  openDecade: number | null;
  setOpenDecade: (n: number | null) => void;
}) {
  return (
    <View style={styles.luckBlock}>
      <Text style={styles.subRow}>
        {t(seq.direction === "forward" ? "pilares.luckForward" : "pilares.luckBackward")} —{" "}
        {t("pilares.luckStart", { years: seq.startAgeYears, months: seq.startAgeMonths })}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.luckScroll}>
        {seq.pillars.map((p, i) => {
          const current = nowYear >= p.startYear && nowYear < p.startYear + 10;
          const id = seq.direction === "forward" ? i : 100 + i;
          const open = openDecade === id;
          return (
            <Card
              key={i}
              onPress={() => setOpenDecade(open ? null : id)}
              style={[styles.luckCol, current && styles.luckNow, open && styles.luckOpen]}
            >
              <Text style={styles.luckAge}>
                {p.startAge} {t("pilares.age")}
              </Text>
              <Text style={styles.luckGlyph}>{glyphPillar(p.pillar)}</Text>
              <Text style={styles.luckGod}>
                {glyphGod(p.tenGod)} {content.ui.god[p.tenGod]}
              </Text>
              <Text style={styles.luckNayin}>{content.nayin[p.nayin.key]}</Text>
              {current && <Text style={styles.luckTag}>{t("pilares.currentDecade")}</Text>}
            </Card>
          );
        })}
      </ScrollView>
      {seq.pillars.map((p, i) => {
        const id = seq.direction === "forward" ? i : 100 + i;
        if (openDecade !== id) return null;
        const rows = annualPillars(natal, p.startYear, 10);
        return (
          <View key={`fy-${i}`} style={styles.annual}>
            <Text style={styles.subRow}>
              {t("pilares.annualTitle")} · {t("pilares.annualJanFebNote")}
            </Text>
            {rows.map((r, j) => (
              <View key={r.year} style={[styles.row, j === rows.length - 1 && styles.rowLast]}>
                <Text style={styles.rowLabel}>{r.year}</Text>
                <Text style={styles.rowGlyph}>{glyphPillar(r.pillar)}</Text>
                <Text style={styles.rowValue}>
                  <Meaning k={`bazi.god.${r.tenGod}`}>{content.ui.god[r.tenGod]}</Meaning>
                  {r.marks.map((m, k) => (
                    <Text key={k} style={styles.mark}>
                      {" "}
                      {content.interactions[m.type]}·{content.ui.position[m.vs]}
                    </Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function StagesSection({
  styles,
  content,
  t,
  entries,
  dayStem,
  glyphBranch,
  script,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  entries: Array<{ key: PosKey; pillar: Pillar }>;
  dayStem: number;
  glyphBranch: (i: number) => string;
  script: "hanzi" | "hangul";
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.twelvestages">{t("pilares.stagesTitle")}</Meaning>}>
      {entries.map((e, i) => {
        const st = lifeStage(dayStem, e.pillar.branch);
        const def = TWELVE_STAGES.find((x) => x.key === st)!;
        return (
          <View key={e.key} style={[styles.row, i === entries.length - 1 && styles.rowLast]}>
            <Text style={styles.rowLabel}>{content.ui.position[e.key]}</Text>
            <Text style={styles.rowGlyph}>{glyphBranch(e.pillar.branch)}</Text>
            <Text style={styles.rowValue}>
              {script === "hangul" ? def.hangul : def.hanzi} · {content.stages[st]}
            </Text>
          </View>
        );
      })}
    </SectionCard>
  );
}

function InteractionsSection({
  styles,
  content,
  t,
  interactions,
  elName,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  interactions: ReturnType<typeof detectInteractions>;
  elName: (el: string) => string;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.interactions">{t("pilares.interactionsTitle")}</Meaning>}>
      {interactions.length === 0 ? (
        <Text style={styles.note}>{t("pilares.interactionsEmpty")}</Text>
      ) : (
        interactions.map((x, i) => (
          <View key={i} style={[styles.row, i === interactions.length - 1 && styles.rowLast]}>
            <Text style={styles.rowLabel}>{x.positions.map((p) => content.ui.position[p]).join(" · ")}</Text>
            <Text style={styles.rowValue}>
              {content.interactions[x.type]}
              {x.element ? <> → <Meaning k={`bazi.element.${x.element}`}>{elName(x.element)}</Meaning></> : ""}
            </Text>
          </View>
        ))
      )}
    </SectionCard>
  );
}

function StarsSection({
  styles,
  content,
  t,
  stars,
  script,
  tk,
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  stars: ReturnType<typeof symbolicStars>;
  script: "hanzi" | "hangul";
  tk: ThemeTokens;
}) {
  return (
    <SectionCard styles={styles} title={<Meaning k="bazi.term.symbolicstars">{t("pilares.starsTitle")}</Meaning>}>
      {stars.length === 0 ? (
        <Text style={styles.note}>—</Text>
      ) : (
        <View style={styles.chips}>
          {stars.map((h, i) => {
            const def = STARS.find((s) => s.key === h.star)!;
            return (
              <Chip
                key={i}
                kind="tag"
                label={`${script === "hangul" ? def.hangul : def.hanzi} ${content.stars[h.star]} · ${content.ui.position[h.pillar]}`}
                tint={{ bg: "transparent", border: tk.accHair, fg: tk.text }}
              />
            );
          })}
        </View>
      )}
    </SectionCard>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
    emptyText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },

    // Cabecera del mockup 11: eyebrow + h1 apilados + segmentado Ba Zi|Saju debajo,
    // a todo el ancho (a diferencia de carta.tsx, donde el segmentado va al costado
    // del eyebrow+h1 — acá el mockup lo apila, ver `.head{flex-direction:column}`).
    head: { width: "100%", gap: space.xs, marginBottom: space.xl },
    eyebrow: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },

    // Control segmentado Ba Zi|Saju (`.seg`/`.seg-opt` del mockup): a diferencia del de
    // carta.tsx, acá cada opción reparte el ancho total a partes iguales (flex:1).
    segmented: {
      flexDirection: "row", width: "100%", marginTop: space.xs, padding: 3, gap: 2, borderRadius: radius.pill,
      borderWidth: 1, borderColor: t.accHair, backgroundColor: t.panelSoft,
    },
    seg: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 38, borderRadius: radius.pill },
    segOn: { backgroundColor: t.acc },
    segText: { color: t.textFaint, fontSize: typeScale.sm, letterSpacing: 0.3, fontFamily: fonts.sansSemi },
    segTextOn: { color: t.onAcc },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.md, lineHeight: 19 },

    // <FadeIn> envuelve secciones que ya declaran width:"100%" (necesario porque `scroll`
    // centra sus hijos con alignItems — mismo motivo que carta.tsx/numeros.tsx).
    fadeFull: { width: "100%" },

    // Rejilla de los 4 pilares — cada columna es un <Card>.
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%", marginBottom: space.lg },
    // Alto uniforme ~180 (mockup), padding/gap ajustados a la receta `.pilar` (10px/4px/
    // 9px, gap 3) — minHeight, no height fija: Modo Pro añade contenido (badge de Dios,
    // troncos ocultos) que necesita poder crecer más allá del baseline compacto.
    col: {
      flexBasis: "22%", flexGrow: 1, minWidth: 72, minHeight: 180, alignItems: "center", gap: 3,
      paddingTop: 10, paddingBottom: 9, paddingHorizontal: space.xs,
    },
    // Pilar del DÍA: fondo teñido (`accent` en el <Card>, aproxima `.card--tinted`) +
    // borde más grueso en el acento del tema (mismo mecanismo que antes, el mockup solo
    // pide el color; el grosor 1.5 es una licencia ya sancionada por el gap file).
    dayCol: { borderColor: t.accSoft, borderWidth: 1.5 },
    // El eyebrow de posición usa accText SIEMPRE (los 4 pilares, no solo el del día) —
    // así lo define `.eyebrow` global del mockup; `.pilar.dia .eyebrow` solo repite el
    // mismo color, no lo cambia.
    colLabel: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    // Hanzi/hangul grandes de la rejilla: 34px literal (hero-exento, lo dicta el
    // mockup — no es parte de la escala {13,15,19,24}). Color plano `text` por defecto;
    // el pilar del DÍA lo tiñe a `accText` (`charDay`) — el mockup NO colorea por
    // elemento Wu Xing en esta rejilla compacta (ver comentario en el JSX).
    char: { fontSize: 34, fontFamily: fonts.serifSemi, color: t.text, marginTop: 2 },
    charDay: { color: t.accText },
    // "nombre" — reemplaza la línea de pinyin/romanización que el mockup no muestra:
    // para el tronco es elemento+polaridad ("Tierra yin"), para la rama es el animal
    // ("Cerdo") — mismo estilo para ambas, como en el mockup (una sola clase `.nombre`).
    nombre: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sansMedium, lineHeight: 16, textAlign: "center" },
    // Separador entre el bloque del tronco y el de la rama (`.hr` del mockup).
    hr: { width: "60%", height: 1, backgroundColor: t.accHair, marginVertical: 6 },
    // Guion de pilar ausente (sin hora de nacimiento): a la misma escala que los hanzi
    // de sus hermanos para no desentonar en la fila.
    empty: { color: t.textFaint, fontSize: 34, opacity: 0.5, marginTop: space.md },

    godBadge: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
      minHeight: 22, alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    godBadgeSelf: { borderColor: "transparent", backgroundColor: t.accFaint },
    godText: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sansBold, letterSpacing: 0.3, textTransform: "uppercase", textAlign: "center" },

    hiddenWrap: {
      width: "100%", marginTop: 4, paddingTop: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.accHair, gap: 4, alignItems: "center",
    },
    hiddenLabel: { color: t.textFaint, fontSize: typeScale.sm, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: fonts.sansBold, textAlign: "center", opacity: 0.85 },
    hiddenRow: { alignItems: "center", gap: 1 },
    hiddenChar: { fontSize: typeScale.sm, fontFamily: fonts.serifSemi },
    hiddenGod: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },

    proHint: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, textAlign: "center", marginTop: space.sm },

    // Card "Maestro del Día" (mockup §B.4 punto 3) — tronco+nombre en serifSemi accText,
    // línea poética debajo en sans medium text-dim. `accent` aproxima `.card--tinted`.
    maestro: { width: "100%", minHeight: 72, paddingVertical: space.md, paddingHorizontal: space.lg, justifyContent: "center", gap: 3 },
    maestroNombre: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serifSemi },
    maestroDesc: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sansMedium, lineHeight: 20, marginTop: 2 },

    // "BALANCE DE ELEMENTOS" — eyebrow FUERA de la card (mismo patrón que `posSec` en
    // carta.tsx: la card no lleva título dentro, a diferencia de <SectionCard>).
    readingSec: { width: "100%", marginTop: space.xl, gap: space.sm },
    readingCard: { width: "100%", gap: space.sm, paddingVertical: 14, paddingHorizontal: space.lg },
    readingP: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans, lineHeight: 20 },
    balanceSec: { width: "100%", marginTop: space.xl, gap: space.sm },
    balCard: { width: "100%", gap: space.sm, paddingVertical: 14, paddingHorizontal: space.lg },
    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 16 },
    balLabel: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sansSemi, width: 58 },
    balTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: t.accHair, overflow: "hidden" },
    // Elemento ausente (count 0): pista vacía con borde punteado, sin relleno — igual
    // que `.bal-track.empty` del mockup (la barra de Agua "visiblemente vacía").
    balTrackEmpty: { borderStyle: "dashed", backgroundColor: "transparent" },
    // Relleno UNIFORME acc (el mockup usa el mismo gradiente acc-soft→acc en las 5
    // filas — no colorea por elemento Wu Xing, a diferencia de antes).
    balFill: { height: "100%", borderRadius: 3, backgroundColor: t.acc },
    balN: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.serifSemi, width: 16, textAlign: "right" },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio/padding ahora los da <Card>; queda solo el ancho.
    card: { width: "100%" },
    cardH: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },

    row: {
      flexDirection: "row", alignItems: "baseline", gap: space.md, paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, width: 64 },
    rowGlyph: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.serif },
    rowValue: { flex: 1, color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    subRow: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.md, marginBottom: space.xs },
    method: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.serifItalic, marginTop: space.md },

    meterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
    // Verdicto en pill bordeada (receta "tag-chip" del mockup) en vez del texto suelto
    // grande anterior — mismo dato (`content.verdicts[strength.verdict]`).
    verdictTag: {
      borderWidth: 1, borderColor: t.accHair, backgroundColor: t.accFaint, borderRadius: radius.pill,
      paddingHorizontal: space.md, paddingVertical: 4,
    },
    verdictTagText: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sansSemi, letterSpacing: 0.3 },
    meterTrack: { height: 6, borderRadius: 3, backgroundColor: t.accHair, overflow: "hidden" },
    meterFill: { height: "100%", backgroundColor: t.acc, borderRadius: 3 },
    meterScore: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, minWidth: 24, textAlign: "right" },
    // Etiquetas del eje del medidor (Débil/Equilibrado/Fuerte) — mismas claves i18n que
    // ya consume `content.verdicts[strength.verdict]` arriba: cero contenido nuevo.
    meterLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
    meterLabelText: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 },

    drivers: { marginTop: space.md, gap: 4 },
    driver: { flexDirection: "row", justifyContent: "space-between" },
    driverLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, flexShrink: 1, paddingRight: space.sm },
    driverPts: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    // Chips de Favor/Evitar y de Estrellas: gap cerrado en R3/Task 11 — ahora son
    // <Chip kind="tag" tint={...}> (pill bordeada/rellena, color dinámico Wu Xing
    // vía `tint`). Las locales `chip`/`chipDim`/`chipText`/`chipTextOn` de arriba
    // quedaron obsoletas y se borraron.
    mark: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans },

    luckBlock: { marginTop: space.sm },
    luckScroll: { marginTop: space.sm },
    // luckCol ahora es un <Card onPress> (R3/Task 11): borderWidth/borderColor
    // base y borderRadius (radius.lg, antes radius.md — cambio menor sancionado
    // por el brief) los da <Card>. El padding SÍ sigue explícito acá — más
    // ajustado que el default xl de <Card> —, mismo mecanismo que `col` (rejilla
    // de 4 pilares) más arriba en este archivo.
    luckCol: {
      // transparente a propósito: el tile vive DENTRO del glass del SectionCard;
      // sin esto heredaría el t.glass de Card y apilaría una 2ª capa (card-en-card).
      backgroundColor: "transparent",
      minWidth: 100, paddingVertical: space.md, paddingHorizontal: space.sm,
      alignItems: "center", marginRight: space.sm, gap: 4,
    },
    luckNow: { borderColor: t.acc },
    luckOpen: { backgroundColor: t.panel },
    luckAge: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    luckGlyph: { color: t.text, fontSize: typeScale.lg2, fontFamily: fonts.serif },
    luckGod: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    luckNayin: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },
    luckTag: { color: t.acc, fontSize: typeScale.sm, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans, marginTop: 2 },
    annual: { marginTop: space.md },
  });
}
