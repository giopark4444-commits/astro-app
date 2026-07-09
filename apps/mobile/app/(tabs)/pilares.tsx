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
import { Starfield } from "../../components/Starfield";
import { Enso } from "../../components/Enso";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { baziContent, type BaziContent } from "../../content/bazi";
import { fetchBaZi, type BaZiData } from "../../lib/bazi-api";
import { fonts, radius, space, type ThemeTokens } from "../../theme/tokens";

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
    <View style={styles.root}>
      <View style={styles.sky} pointerEvents="none">
        <Starfield count={44} height={360} />
      </View>

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
            {/* Rejilla de los 4 pilares */}
            <View style={styles.grid}>
              {POS_KEYS.map((key) => {
                const pillar = data[key];
                if (!pillar) {
                  return (
                    <View key={key} style={styles.col}>
                      <Text style={styles.colLabel}>{content.ui.position[key]}</Text>
                      <Text style={styles.empty}>—</Text>
                    </View>
                  );
                }
                const stem = HEAVENLY_STEMS[pillar.stem]!;
                const branch = EARTHLY_BRANCHES[pillar.branch]!;
                const isDay = key === "day";
                // El tronco del pilar de DÍA es el Maestro del Día (日主): referencia
                // de todos los Diez Dioses. Él mismo no tiene Dios (sería 比肩 trivial).
                const dayMaster = data.day.stem;
                return (
                  <View key={key} style={[styles.col, isDay && styles.dayCol]}>
                    <Text style={styles.colLabel}>{content.ui.position[key]}</Text>
                    {pro && (
                      <View style={[styles.godBadge, isDay && styles.godBadgeSelf]}>
                        <Text style={[styles.godText, isDay && styles.godTextSelf]}>
                          {isDay ? t("pilares.dayMasterHanzi") : content.ui.god[tenGod(dayMaster, pillar.stem)]}
                        </Text>
                      </View>
                    )}
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
                    {isDay && <Text style={styles.dayTag}>{t("pilares.dayMaster")}</Text>}
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
                  </View>
                );
              })}
            </View>

            {/* Modo Pro */}
            <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
              <View style={[styles.proDot, pro && styles.proDotOn]} />
              <Text style={styles.proText}>{t("pilares.modePro")}</Text>
            </Pressable>
            {pro && <Text style={styles.proHint}>{t("pilares.modeProHint")}</Text>}

            {/* Conmutador de escritura (漢字 ↔ 한글) */}
            {pro && (
              <View style={styles.scriptRow}>
                {(["hanzi", "hangul"] as const).map((s) => {
                  const on = script === s;
                  return (
                    <Pressable key={s} style={[styles.kindChip, on && styles.kindChipOn]} onPress={() => setScript(s)}>
                      <Text style={[styles.kindText, on && styles.kindTextOn]}>
                        {t(s === "hanzi" ? "pilares.scriptBazi" : "pilares.scriptSaju")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!data.timeKnown && <Text style={styles.note}>{t("pilares.noTime")}</Text>}

            {/* Balance de elementos */}
            <Text style={styles.section}>{t("pilares.balance")}</Text>
            <View style={styles.balanceCard}>
              {ELEMENTS.map((el) => (
                <View key={el} style={styles.balRow}>
                  <Text style={styles.balLabel}>{elName(el)}</Text>
                  <View style={styles.balTrack}>
                    <View
                      style={[
                        styles.balFill,
                        { width: `${((counts[el] ?? 0) / totalEls) * 100}%`, backgroundColor: EL_COLOR[el] },
                      ]}
                    />
                  </View>
                  <Text style={styles.balN}>{counts[el] ?? 0}</Text>
                </View>
              ))}
            </View>

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

function Card({
  styles,
  title,
  children,
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
    <Card styles={styles} title={t("pilares.nayinTitle")}>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.strengthTitle")}>
      <View style={styles.meterRow}>
        <Text style={styles.verdict}>{content.verdicts[strength.verdict]}</Text>
        {/* El medidor usa `score` (0-100, capado); el número mostrado usa `raw` (suma
           exacta de los drivers) para no contradecir el desglose de abajo — Task 5. */}
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${strength.score}%` }]} />
        </View>
        <Text style={styles.meterScore}>{strength.raw}</Text>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.favorTitle")}>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.luckTitle")}>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.stagesTitle")}>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.interactionsTitle")}>
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
    </Card>
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
    <Card styles={styles} title={t("pilares.starsTitle")}>
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
    </Card>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    sky: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
    emptyText: { color: t.textDim, fontSize: 16, fontFamily: fonts.sans },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
    eyebrow: { color: t.acc, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sans },
    h1: { color: t.text, fontSize: 28, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center", marginBottom: space.xl },

    note: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, textAlign: "center", marginVertical: space.md, lineHeight: 19 },
    section: {
      color: t.textFaint, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sans,
      marginTop: space.xl, marginBottom: space.md, alignSelf: "flex-start",
    },

    // Rejilla de los 4 pilares
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%", marginBottom: space.lg },
    col: {
      flexBasis: "22%", flexGrow: 1, minWidth: 72, alignItems: "center", gap: 4,
      paddingVertical: space.md, paddingHorizontal: space.xs,
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md, backgroundColor: t.panelSoft,
    },
    dayCol: { borderColor: t.accSoft },
    colLabel: { color: t.textDim, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans, fontWeight: "700" },
    char: { fontSize: 26, fontFamily: fonts.serif, fontWeight: "600", marginTop: 2 },
    roman: { color: t.textFaint, fontSize: 11, fontFamily: fonts.sans, marginTop: -2 },
    animal: { color: t.textDim, fontSize: 11, fontFamily: fonts.sans, marginTop: 2 },
    empty: { color: t.textFaint, fontSize: 22, opacity: 0.5, marginTop: space.md },
    dayTag: {
      marginTop: 4, fontSize: 8.5, letterSpacing: 0.5, textTransform: "uppercase", color: t.acc,
      borderWidth: 1, borderColor: t.accSoft, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
      fontFamily: fonts.sans, textAlign: "center",
    },

    godBadge: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
      minHeight: 22, alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    godBadgeSelf: { borderColor: "transparent", backgroundColor: t.accFaint },
    godText: { color: t.acc, fontSize: 8.5, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase", fontFamily: fonts.sans, textAlign: "center" },
    godTextSelf: { fontSize: 11 },

    hiddenWrap: {
      width: "100%", marginTop: 4, paddingTop: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.accHair, gap: 4, alignItems: "center",
    },
    hiddenLabel: { color: t.textFaint, fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: fonts.sans, fontWeight: "700", textAlign: "center", opacity: 0.85 },
    hiddenRow: { alignItems: "center", gap: 1 },
    hiddenChar: { fontSize: 14, fontWeight: "600", fontFamily: fonts.serif },
    hiddenGod: { color: t.textDim, fontSize: 8, fontFamily: fonts.sans, textAlign: "center" },

    proToggle: {
      flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg, alignSelf: "center",
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md,
    },
    proDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
    proDotOn: { backgroundColor: t.acc },
    proText: { color: t.text, fontSize: 15, letterSpacing: 1, fontFamily: fonts.sans },
    proHint: { color: t.textDim, fontSize: 12, fontStyle: "italic", fontFamily: fonts.serif, textAlign: "center", marginTop: space.sm },

    scriptRow: { flexDirection: "row", justifyContent: "center", gap: space.sm, marginTop: space.md },
    kindChip: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
      paddingHorizontal: space.lg, paddingVertical: space.sm + 2, backgroundColor: t.panelSoft,
    },
    kindChipOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    kindText: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans },
    kindTextOn: { color: t.acc, fontWeight: "600" },

    balanceCard: { width: "100%", gap: space.sm },
    balRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xs },
    balLabel: { color: t.textDim, fontSize: 12, fontFamily: fonts.sans, width: 64 },
    balTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: t.accHair, overflow: "hidden" },
    balFill: { height: "100%", borderRadius: 4 },
    balN: { color: t.textFaint, fontSize: 12, fontFamily: fonts.sans, width: 18, textAlign: "right" },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    card: {
      width: "100%", borderWidth: 1, borderColor: t.accHair, borderRadius: radius.lg,
      backgroundColor: t.panelSoft, padding: space.xl,
    },
    cardH: { color: t.acc, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.md, fontFamily: fonts.sans },

    row: {
      flexDirection: "row", alignItems: "baseline", gap: space.md, paddingVertical: space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, width: 64 },
    rowGlyph: { color: t.text, fontSize: 18, fontFamily: fonts.serif },
    rowValue: { flex: 1, color: t.text, fontSize: 14, fontFamily: fonts.sans },
    subRow: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, marginTop: space.md, marginBottom: space.xs },
    method: { color: t.textFaint, fontSize: 12, fontStyle: "italic", fontFamily: fonts.serif, marginTop: space.md },

    meterRow: { flexDirection: "row", alignItems: "center", gap: space.md },
    verdict: { color: t.text, fontSize: 18, fontFamily: fonts.serif, fontStyle: "italic" },
    meterTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.accHair, overflow: "hidden" },
    meterFill: { height: "100%", backgroundColor: t.acc, borderRadius: 3 },
    meterScore: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, minWidth: 24, textAlign: "right" },

    drivers: { marginTop: space.md, gap: 4 },
    driver: { flexDirection: "row", justifyContent: "space-between" },
    driverLabel: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, flexShrink: 1, paddingRight: space.sm },
    driverPts: { color: t.acc, fontSize: 13, fontFamily: fonts.sans },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    chip: {
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
      paddingHorizontal: space.md, paddingVertical: space.xs + 2,
    },
    chipDim: { opacity: 0.6 },
    chipText: { color: t.text, fontSize: 13, fontFamily: fonts.sans },
    chipTextOn: { color: "#fff", fontSize: 13, fontFamily: fonts.sans, fontWeight: "600" },
    mark: { color: t.acc, fontSize: 12, fontFamily: fonts.sans },

    luckBlock: { marginTop: space.sm },
    luckScroll: { marginTop: space.sm },
    luckCol: {
      minWidth: 100, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md,
      paddingVertical: space.md, paddingHorizontal: space.sm, alignItems: "center", marginRight: space.sm, gap: 4,
    },
    luckNow: { borderColor: t.acc },
    luckOpen: { backgroundColor: t.panel },
    luckAge: { color: t.textDim, fontSize: 11, fontFamily: fonts.sans },
    luckGlyph: { color: t.text, fontSize: 20, fontFamily: fonts.serif },
    luckGod: { color: t.text, fontSize: 11, fontFamily: fonts.sans },
    luckNayin: { color: t.textFaint, fontSize: 10, fontFamily: fonts.sans },
    luckTag: { color: t.acc, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans, marginTop: 2 },
    annual: { marginTop: space.md },
  });
}
