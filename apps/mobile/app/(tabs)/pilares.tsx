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
  type Pillar,
  type PillarSet,
  type TenGod,
  type LuckSequence,
} from "@aluna/core";
import { Enso } from "../../components/Enso";
import { Card, Chip, FadeIn } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { baziContent, type BaziContent } from "../../content/bazi";
import { fetchBaZi, type BaZiData } from "../../lib/bazi-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

// Colores fijos de los 5 elementos (Wu Xing), iguales a la web (pilares.module.css):
// identidad del elemento, no del tema — se ven igual en cualquier tema/modo de luz.
const EL_COLOR: Record<string, string> = {
  wood: "#7fb069",
  fire: "#e0795a",
  earth: "#d4a85f",
  metal: "#b8b6c8",
  water: "#7aaae0",
};
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;
const POS_KEYS = ["year", "month", "day", "hour"] as const;
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
  const { t: tk } = useTheme();
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
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("pilares.subtitle")}</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1}>{t("pilares.title")}</Text>

        {state.s === "loading" && <Text style={styles.note}>{t("pilares.loading")}</Text>}
        {state.s === "error" && <Text style={styles.note}>{t("pilares.error")}</Text>}

        {data && laminaData && (
          <>
            {/* Rejilla de los 4 pilares — cada uno es ahora un <Card>; el pilar del DÍA
                se destaca con borde t.accSoft más grueso + badge 日主 (receta visual de
                SoonBadge, texto canónico de dominio). Vara: movil-pilares-despues.html */}
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
                    <Card key={key} style={[styles.col, isDay && styles.dayCol]}>
                      {isDay && (
                        <View style={styles.dayBadge}>
                          <Text style={styles.dayBadgeText}>
                            {t("pilares.dayMasterHanzi")} · {t("pilares.dayMaster")}
                          </Text>
                        </View>
                      )}
                      {pro && (
                        <View style={[styles.godBadge, isDay && styles.godBadgeSelf]}>
                          <Text style={[styles.godText, isDay && styles.godTextSelf]}>
                            {isDay ? t("pilares.dayMasterHanzi") : content.ui.god[tenGod(dayMaster, pillar.stem)]}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.colLabel}>{content.ui.position[key]}</Text>
                      <Text style={[styles.char, { color: EL_COLOR[stem.element] }]}>
                        {script === "hangul" ? STEM_LABELS[pillar.stem]!.hangul : stem.hanzi}
                      </Text>
                      <Text style={styles.roman}>
                        {script === "hangul"
                          ? STEM_LABELS[pillar.stem]!.romanKo
                          : STEM_LABELS[pillar.stem]!.pinyin}
                      </Text>
                      <Text style={[styles.char, { color: EL_COLOR[branch.element] }]}>
                        {script === "hangul" ? BRANCH_LABELS[pillar.branch]!.hangul : branch.hanzi}
                      </Text>
                      <Text style={styles.roman}>
                        {script === "hangul"
                          ? BRANCH_LABELS[pillar.branch]!.romanKo
                          : BRANCH_LABELS[pillar.branch]!.pinyin}
                      </Text>
                      <Text style={styles.animal}>{content.ui.animal[branch.animal] ?? branch.animal}</Text>
                      {pro && (
                        <View style={styles.hiddenWrap}>
                          <Text style={styles.hiddenLabel}>{t("pilares.hiddenStems")}</Text>
                          {hiddenStems(pillar.branch).map((hs, j) => {
                            const hidden = HEAVENLY_STEMS[hs]!;
                            return (
                              <View key={j} style={styles.hiddenRow}>
                                <Text style={[styles.hiddenChar, { color: EL_COLOR[hidden.element] }]}>
                                  {hidden.hanzi}
                                </Text>
                                <Text style={styles.hiddenGod}>{content.ui.god[tenGod(dayMaster, hs)]}</Text>
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

            {/* Modo Pro */}
            <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
              <View style={[styles.proDot, pro && styles.proDotOn]} />
              <Text style={styles.proText}>{t("pilares.modePro")}</Text>
            </Pressable>
            {pro && <Text style={styles.proHint}>{t("pilares.modeProHint")}</Text>}

            {/* Conmutador de escritura (漢字 ↔ 한글) — chips canónicos del rediseño */}
            {pro && (
              <View style={styles.scriptRow}>
                {(["hanzi", "hangul"] as const).map((s) => {
                  const on = script === s;
                  return (
                    <Chip
                      key={s}
                      kind="control"
                      label={t(s === "hanzi" ? "pilares.scriptBazi" : "pilares.scriptSaju")}
                      selected={on}
                      onPress={() => setScript(s)}
                    />
                  );
                })}
              </View>
            )}

            {!data.timeKnown && <Text style={styles.note}>{t("pilares.noTime")}</Text>}

            {/* Balance de elementos */}
            <FadeIn delay={60} style={styles.fadeFull}>
              <SectionCard styles={styles} title={t("pilares.balance")}>
                {ELEMENTS.map((el) => {
                  const n = counts[el] ?? 0;
                  const empty = n === 0;
                  return (
                    <View key={el} style={styles.balRow}>
                      <Text style={styles.balLabel}>{elName(el)}</Text>
                      <View style={[styles.balTrack, empty && styles.balTrackEmpty]}>
                        {!empty && (
                          <View
                            style={[
                              styles.balFill,
                              { width: `${(n / totalEls) * 100}%`, backgroundColor: EL_COLOR[el] },
                            ]}
                          />
                        )}
                      </View>
                      <Text style={styles.balN}>{n}</Text>
                    </View>
                  );
                })}
              </SectionCard>
            </FadeIn>

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

                <StarsSection styles={styles} content={content} t={t} stars={laminaData.stars} script={script} />
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
 * (misma convención que carta.tsx/numeros.tsx). */
function SectionCard({
  styles,
  title,
  children,
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
    <SectionCard styles={styles} title={t("pilares.nayinTitle")}>
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
    <SectionCard styles={styles} title={t("pilares.strengthTitle")}>
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
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  strength: ReturnType<typeof dayMasterStrength>;
  favor: ReturnType<typeof favorableElements>;
  elName: (el: string) => string;
}) {
  return (
    <SectionCard styles={styles} title={t("pilares.favorTitle")}>
      {strength.verdict === "balanced" ? (
        <Text style={styles.note}>{t("pilares.balancedNote")}</Text>
      ) : (
        <>
          <View style={styles.chips}>
            {favor.favor.map((el) => (
              <View key={el} style={[styles.chip, { backgroundColor: EL_COLOR[el], borderColor: EL_COLOR[el] }]}>
                <Text style={styles.chipTextOn}>{elName(el)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.subRow}>{t("pilares.avoidTitle")}</Text>
          <View style={styles.chips}>
            {favor.avoid.map((el) => (
              <View key={el} style={[styles.chip, styles.chipDim]}>
                <Text style={styles.chipText}>{elName(el)}</Text>
              </View>
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
    <SectionCard styles={styles} title={t("pilares.luckTitle")}>
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
            <Pressable
              key={i}
              style={[styles.luckCol, current && styles.luckNow, open && styles.luckOpen]}
              onPress={() => setOpenDecade(open ? null : id)}
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
            </Pressable>
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
                  {content.ui.god[r.tenGod]}
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
    <SectionCard styles={styles} title={t("pilares.stagesTitle")}>
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
    <SectionCard styles={styles} title={t("pilares.interactionsTitle")}>
      {interactions.length === 0 ? (
        <Text style={styles.note}>{t("pilares.interactionsEmpty")}</Text>
      ) : (
        interactions.map((x, i) => (
          <View key={i} style={[styles.row, i === interactions.length - 1 && styles.rowLast]}>
            <Text style={styles.rowLabel}>{x.positions.map((p) => content.ui.position[p]).join(" · ")}</Text>
            <Text style={styles.rowValue}>
              {content.interactions[x.type]}
              {x.element ? ` → ${elName(x.element)}` : ""}
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
}: {
  styles: ReturnType<typeof makeStyles>;
  content: BaziContent;
  t: (key: string) => string;
  stars: ReturnType<typeof symbolicStars>;
  script: "hanzi" | "hangul";
}) {
  return (
    <SectionCard styles={styles} title={t("pilares.starsTitle")}>
      {stars.length === 0 ? (
        <Text style={styles.note}>—</Text>
      ) : (
        <View style={styles.chips}>
          {stars.map((h, i) => {
            const def = STARS.find((s) => s.key === h.star)!;
            return (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>
                  {script === "hangul" ? def.hangul : def.hanzi} {content.stars[h.star]} · {content.ui.position[h.pillar]}
                </Text>
              </View>
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

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
    eyebrow: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.displaySm, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center", marginBottom: space.xl },

    note: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.md, lineHeight: 19 },

    // <FadeIn> envuelve secciones que ya declaran width:"100%" (necesario porque `scroll`
    // centra sus hijos con alignItems — mismo motivo que carta.tsx/numeros.tsx).
    fadeFull: { width: "100%" },

    // Rejilla de los 4 pilares — cada columna es ahora un <Card>.
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%", marginBottom: space.lg },
    // Ancho/alineación del ítem de grilla; borde/fondo/radio los da <Card>. El padding
    // vertical/horizontal más ajustado que el de <Card> (space.xl) SÍ pisa el default:
    // mismo mecanismo que `cell` en numeros.tsx — paddingVertical/Horizontal explícitos
    // ganan sobre el `padding` general de la tarjeta en la resolución de bordes de Yoga.
    col: {
      flexBasis: "22%", flexGrow: 1, minWidth: 72, alignItems: "center", gap: 4,
      paddingVertical: space.md, paddingHorizontal: space.xs,
    },
    // Pilar del DÍA destacado (日主): SOLO cambia el borde (más grueso, en el acento del
    // tema) — mismo fondo que sus hermanos, igual que `.pillar.day` en el mockup.
    dayCol: { borderColor: t.accSoft, borderWidth: 1.5 },
    colLabel: { color: t.textDim, fontSize: typeScale.xs2, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sansBold },
    // Hanzi grandes de la rejilla: fonts.serifSemi a type.xl3 (política de esta tarea).
    char: { fontSize: typeScale.xl3, fontFamily: fonts.serifSemi, marginTop: 2 },
    // Pinyin/romanización: type.xs fonts.sans (política de esta tarea).
    roman: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, marginTop: -2 },
    animal: { color: t.textDim, fontSize: typeScale.xs2, fontFamily: fonts.sans, marginTop: 2 },
    // Guion de pilar ausente (sin hora de nacimiento): a la misma escala que los hanzi
    // de sus hermanos para no desentonar en la fila.
    empty: { color: t.textFaint, fontSize: typeScale.xl3, opacity: 0.5, marginTop: space.md },

    // Badge 日主 del pilar del día — receta visual de SoonBadge (pill bordeada, texto
    // pequeño) con texto canónico de dominio (dayMasterHanzi + dayMaster, ambas claves
    // i18n ya existentes — cero contenido nuevo). Reemplaza al antiguo `dayTag` suelto.
    dayBadge: {
      alignSelf: "center", borderWidth: 1, borderColor: t.accSoft, borderRadius: radius.pill,
      backgroundColor: t.accFaint, paddingHorizontal: space.sm, paddingVertical: 3, marginBottom: space.xs,
    },
    dayBadgeText: { color: t.acc, fontSize: typeScale.xs2, fontFamily: fonts.sansBold, letterSpacing: 0.3 },

    godBadge: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
      minHeight: 22, alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    godBadgeSelf: { borderColor: "transparent", backgroundColor: t.accFaint },
    godText: { color: t.acc, fontSize: typeScale.xs2, fontFamily: fonts.sansBold, letterSpacing: 0.3, textTransform: "uppercase", textAlign: "center" },
    godTextSelf: { fontSize: typeScale.xs },

    hiddenWrap: {
      width: "100%", marginTop: 4, paddingTop: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.accHair, gap: 4, alignItems: "center",
    },
    hiddenLabel: { color: t.textFaint, fontSize: typeScale.xs2, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: fonts.sansBold, textAlign: "center", opacity: 0.85 },
    hiddenRow: { alignItems: "center", gap: 1 },
    hiddenChar: { fontSize: typeScale.sm, fontFamily: fonts.serifSemi },
    hiddenGod: { color: t.textDim, fontSize: typeScale.xs2, fontFamily: fonts.sans, textAlign: "center" },

    proToggle: {
      flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg, alignSelf: "center",
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md,
    },
    proDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
    proDotOn: { backgroundColor: t.acc },
    proText: { color: t.text, fontSize: typeScale.md, letterSpacing: 1, fontFamily: fonts.sans },
    proHint: { color: t.textDim, fontSize: typeScale.xs, fontStyle: "italic", fontFamily: fonts.serif, textAlign: "center", marginTop: space.sm },

    // Conmutador 漢字/한글 — ahora <Chip kind="control"> (patrón de carta.tsx); esta fila
    // solo reparte los chips, ya no lleva estilos propios de chip.
    scriptRow: { flexDirection: "row", justifyContent: "center", gap: space.sm, marginTop: space.md },

    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xs },
    balLabel: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans, width: 64 },
    balTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: t.accHair, overflow: "hidden" },
    // Elemento ausente (count 0): pista vacía con borde punteado, sin relleno — igual
    // que `.bal-track.empty` del mockup (la barra de Agua "visiblemente vacía").
    balTrackEmpty: { borderStyle: "dashed", backgroundColor: "transparent" },
    balFill: { height: "100%", borderRadius: 4 },
    balN: { color: t.textFaint, fontSize: typeScale.xs, fontFamily: fonts.sans, width: 18, textAlign: "right" },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio/padding ahora los da <Card>; queda solo el ancho (mismo motivo
    // que carta.tsx/numeros.tsx SectionCard).
    card: { width: "100%" },
    cardH: { color: t.acc, fontSize: typeScale.sm, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sansSemi },

    row: {
      flexDirection: "row", alignItems: "baseline", gap: space.md, paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, width: 64 },
    rowGlyph: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serif },
    rowValue: { flex: 1, color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    subRow: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.md, marginBottom: space.xs },
    method: { color: t.textFaint, fontSize: typeScale.xs, fontStyle: "italic", fontFamily: fonts.serif, marginTop: space.md },

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
    meterLabelText: { color: t.textFaint, fontSize: typeScale.xs2, fontFamily: fonts.sans, textTransform: "uppercase", letterSpacing: 0.5 },

    drivers: { marginTop: space.md, gap: 4 },
    driver: { flexDirection: "row", justifyContent: "space-between" },
    driverLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, flexShrink: 1, paddingRight: space.sm },
    driverPts: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    // Chips de Favor/Evitar y de Estrellas: NO migrados al primitivo <Chip> — codifican
    // un color dinámico por elemento (EL_COLOR) o llevan borde de pill que el primitivo
    // compartido no ofrece en su variante "tag" (gap conocido de ui.tsx, ver informe).
    // Migrarlos perdería el color-coding Wu Xing (regla dura de esta tarea) o rompería
    // la consistencia visual entre ambas secciones — quedan como locales legítimos.
    chip: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
      paddingHorizontal: space.md, paddingVertical: space.xs + 2,
    },
    chipDim: { opacity: 0.6 },
    chipText: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    chipTextOn: { color: "#fff", fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    mark: { color: t.acc, fontSize: typeScale.xs, fontFamily: fonts.sans },

    luckBlock: { marginTop: space.sm },
    luckScroll: { marginTop: space.sm },
    luckCol: {
      minWidth: 100, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md,
      paddingVertical: space.md, paddingHorizontal: space.sm, alignItems: "center", marginRight: space.sm, gap: 4,
    },
    luckNow: { borderColor: t.acc },
    luckOpen: { backgroundColor: t.panel },
    luckAge: { color: t.textDim, fontSize: typeScale.xs2, fontFamily: fonts.sans },
    luckGlyph: { color: t.text, fontSize: typeScale.xl, fontFamily: fonts.serif },
    luckGod: { color: t.text, fontSize: typeScale.xs2, fontFamily: fonts.sans },
    luckNayin: { color: t.textFaint, fontSize: typeScale.xs2, fontFamily: fonts.sans },
    luckTag: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans, marginTop: 2 },
    annual: { marginTop: space.md },
  });
}
