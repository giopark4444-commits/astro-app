import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, type NumerologyResult, type ReductionTrace } from "@aluna/core";
import { Starfield } from "../../components/Starfield";
import { Enso } from "../../components/Enso";
import { BottomSheet } from "../../components/BottomSheet";
import { NumberReading } from "../../components/NumberReading";
import { useProfile } from "../../lib/profile-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { GLOSS, LABELS } from "../../content/numerology-es";
import { colors, fonts, radius, space } from "../../theme/tokens";

type CoreKey = "expression" | "soulUrge" | "personality" | "birthday" | "maturity";
const formatReduction = (t: Pick<ReductionTrace, "steps">) => t.steps.join("  →  ");
const ageLabel = (from: number, to: number | null) => (to === null ? `${from}+` : `${from}–${to}`);

interface SheetState {
  positionKey: string;
  trace: ReductionTrace;
}

export default function NumerosScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [pro, setPro] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const result = useMemo<NumerologyResult | null>(() => {
    if (!profile) return null;
    try {
      return computeNumerology(profileToNumerologyInput(profile));
    } catch {
      return null;
    }
  }, [profile]);

  if (!profile || !result) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyWrap}>
          <Enso size={48} />
          <Text style={styles.emptyText}>Aún no hay un mapa que leer.</Text>
        </View>
      </View>
    );
  }

  const { core, karmic, pinnacles, challenges, cycles } = result;
  const coreItems: Array<{ key: CoreKey; trace: ReductionTrace }> = [
    { key: "expression", trace: core.expression },
    { key: "soulUrge", trace: core.soulUrge },
    { key: "personality", trace: core.personality },
    { key: "birthday", trace: core.birthday },
    { key: "maturity", trace: core.maturity },
  ];
  const maxIncl = Math.max(1, ...Object.values(karmic.inclusion));

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
          <Text style={styles.eyebrow}>Numerología</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1}>Tu mapa numérico</Text>
        <Text style={styles.who}>{profile.name}</Text>

        {/* HERO — Camino de Vida */}
        <Pressable
          style={styles.hero}
          onPress={() => setSheet({ positionKey: "lifePath", trace: core.lifePath })}
        >
          <View style={styles.ringOuter}>
            <View style={styles.ring}>
              <Text style={styles.heroN}>{core.lifePath.value}</Text>
            </View>
          </View>
          {core.lifePath.isMaster && <Text style={styles.pill}>★ Número maestro</Text>}
          <Text style={styles.heroLabel}>{LABELS.lifePath}</Text>
          <Text style={styles.heroGloss}>{GLOSS.lifePath}</Text>
          <Text style={styles.calc}>{formatReduction(core.lifePath)}</Text>
        </Pressable>

        {/* Núcleo */}
        <View style={styles.grid}>
          {coreItems.map((it) => (
            <Pressable
              key={it.key}
              style={styles.cell}
              onPress={() => setSheet({ positionKey: it.key, trace: it.trace })}
            >
              <Text style={styles.cellN}>{it.trace.value}</Text>
              <Text style={styles.cellL}>{LABELS[it.key]}</Text>
              <Text style={styles.cellSub}>{GLOSS[it.key]}</Text>
            </Pressable>
          ))}
        </View>

        {/* Toggle Modo Pro */}
        <Pressable style={styles.proToggle} onPress={() => setPro(!pro)}>
          <View style={[styles.proDot, pro && styles.proDotOn]} />
          <Text style={styles.proText}>Modo Pro</Text>
        </Pressable>

        {pro && (
          <View style={styles.proBody}>
            {/* Lecciones y deudas kármicas */}
            <Card title="Lecciones kármicas">
              <View style={styles.chips}>
                {karmic.lessons.length ? (
                  karmic.lessons.map((n) => (
                    <View key={n} style={styles.chip}>
                      <Text style={styles.chipText}>{n}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>Ninguna</Text>
                )}
              </View>
              {karmic.debts.length > 0 && (
                <>
                  <Text style={styles.cardSub}>Deudas kármicas</Text>
                  <View style={styles.chips}>
                    {karmic.debts.map((n) => (
                      <View key={n} style={[styles.chip, styles.chipWarn]}>
                        <Text style={[styles.chipText, styles.chipWarnText]}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>

            {/* Tabla de inclusión */}
            <Card title="Tabla de inclusión">
              <View style={styles.incl}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                  const c = karmic.inclusion[d] ?? 0;
                  const hot = c === maxIncl && c > 0;
                  const miss = c === 0;
                  return (
                    <View key={d} style={[styles.inclCell, hot && styles.inclHot, miss && styles.inclMiss]}>
                      <Text style={[styles.inclD, hot && styles.inclDHot]}>{d}</Text>
                      <Text style={styles.inclC}>{c === 0 ? "—" : `×${c}`}</Text>
                    </View>
                  );
                })}
              </View>
              {karmic.hiddenPassion.length > 0 && (
                <Text style={styles.muted}>Pasión oculta: {karmic.hiddenPassion.join(", ")}</Text>
              )}
            </Card>

            {/* Pináculos y desafíos */}
            <Card title="Pináculos">
              <Timeline items={pinnacles.map((p) => ({ value: p.value, age: ageLabel(p.startAge, p.endAge) }))} />
              <Text style={styles.cardSub}>Desafíos</Text>
              <Timeline items={challenges.map((c) => ({ value: c.value, age: ageLabel(c.startAge, c.endAge) }))} />
            </Card>

            {/* Ciclos del momento */}
            <Card title="Ciclos del momento">
              <View style={styles.cycles}>
                <Cyc value={cycles.personalYear.value} label="Año personal" />
                <Cyc value={cycles.personalMonth.value} label="Mes personal" />
                <Cyc value={cycles.personalDay.value} label="Día personal" />
              </View>
            </Card>
          </View>
        )}

        <Text style={styles.tapHint}>Toca un número para ver su esencia y cómo se calcula.</Text>
      </ScrollView>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? (LABELS[sheet.positionKey as keyof typeof LABELS] ?? "") : ""}
      >
        {sheet && <NumberReading positionKey={sheet.positionKey} trace={sheet.trace} />}
      </BottomSheet>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {children}
    </View>
  );
}

function Timeline({ items }: { items: Array<{ value: number; age: string }> }) {
  return (
    <View style={styles.timeline}>
      {items.map((it, k) => (
        <View key={k} style={styles.tcell}>
          <Text style={styles.tN}>{it.value}</Text>
          <Text style={styles.tAge}>{it.age}</Text>
        </View>
      ))}
    </View>
  );
}

function Cyc({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.cyc}>
      <Text style={styles.cycN}>{value}</Text>
      <Text style={styles.cycL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  sky: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
  scroll: { paddingHorizontal: space.xl, alignItems: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
  emptyText: { color: colors.textDim, fontSize: 16, fontFamily: fonts.sans },

  head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
  eyebrow: { color: colors.gold, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontFamily: fonts.sans },
  h1: { color: colors.text, fontSize: 30, fontFamily: fonts.serif, fontStyle: "italic", textAlign: "center" },
  who: { color: colors.textDim, fontSize: 15, marginTop: space.xs, marginBottom: space.xxl, fontFamily: fonts.serif, fontStyle: "italic" },

  hero: { alignItems: "center", marginBottom: space.xxl },
  ringOuter: {
    width: 188,
    height: 188,
    borderRadius: 94,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldFaint,
  },
  ring: {
    width: 156,
    height: 156,
    borderRadius: 78,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.goldSoft,
    backgroundColor: colors.panelSoft,
  },
  heroN: { color: colors.gold, fontSize: 76, fontFamily: fonts.serif, lineHeight: 84 },
  pill: {
    marginTop: space.lg,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    overflow: "hidden",
    fontFamily: fonts.sans,
  },
  heroLabel: { color: colors.text, fontSize: 19, marginTop: space.lg, fontFamily: fonts.serif, fontStyle: "italic" },
  heroGloss: { color: colors.textDim, fontSize: 13, marginTop: space.xs, fontFamily: fonts.sans },
  calc: { color: colors.textFaint, fontSize: 13, marginTop: space.sm, fontFamily: fonts.serif, fontStyle: "italic" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md, width: "100%" },
  cell: {
    width: "47%",
    minWidth: 150,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.md,
    backgroundColor: colors.panelSoft,
  },
  cellN: { color: colors.gold, fontSize: 34, fontFamily: fonts.serif },
  cellL: { color: colors.text, fontSize: 15, marginTop: space.xs, fontFamily: fonts.sans },
  cellSub: { color: colors.textFaint, fontSize: 11, marginTop: 2, textAlign: "center", fontFamily: fonts.sans },

  proToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.xxl,
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  proDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.goldHair },
  proDotOn: { backgroundColor: colors.gold },
  proText: { color: colors.text, fontSize: 15, letterSpacing: 1, fontFamily: fonts.sans },

  proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.lg,
    backgroundColor: colors.panelSoft,
    padding: space.xl,
  },
  cardH: { color: colors.gold, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: space.lg, fontFamily: fonts.sans },
  cardSub: { color: colors.textDim, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.md, fontFamily: fonts.sans },
  muted: { color: colors.textFaint, fontSize: 14, fontFamily: fonts.sans },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: colors.goldFaint,
  },
  chipText: { color: colors.gold, fontSize: 16, fontFamily: fonts.serif },
  chipWarn: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  chipWarnText: { color: colors.warn },

  incl: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "space-between" },
  inclCell: {
    width: "30%",
    paddingVertical: space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  inclHot: { borderColor: colors.gold, backgroundColor: colors.goldFaint },
  inclMiss: { opacity: 0.45 },
  inclD: { color: colors.text, fontSize: 18, fontFamily: fonts.serif },
  inclDHot: { color: colors.gold },
  inclC: { color: colors.textDim, fontSize: 12, marginTop: 2, fontFamily: fonts.sans },

  timeline: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  tcell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  tN: { color: colors.gold, fontSize: 22, fontFamily: fonts.serif },
  tAge: { color: colors.textFaint, fontSize: 11, marginTop: 2, fontFamily: fonts.sans },

  cycles: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  cyc: { flex: 1, alignItems: "center" },
  cycN: { color: colors.gold, fontSize: 30, fontFamily: fonts.serif },
  cycL: { color: colors.textDim, fontSize: 12, marginTop: space.xs, textAlign: "center", fontFamily: fonts.sans },

  tapHint: { color: colors.textFaint, fontSize: 13, marginTop: space.xxl, textAlign: "center", fontFamily: fonts.sans },
});
