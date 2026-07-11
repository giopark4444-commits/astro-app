import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, type NumerologyResult, type ReductionTrace } from "@aluna/core";
import { Enso } from "../../components/Enso";
import { BottomSheet } from "../../components/BottomSheet";
import { NumberReading } from "../../components/NumberReading";
import { Card, Chip, FadeIn, ToggleRow } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { numerologyContent } from "../../content/numerology";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

type CoreKey = "expression" | "soulUrge" | "personality" | "birthday" | "maturity";
const formatReduction = (tr: Pick<ReductionTrace, "steps">) => tr.steps.join("  →  ");
const ageLabel = (from: number, to: number | null) => (to === null ? `${from}+` : `${from}–${to}`);

interface SheetState {
  positionKey: string;
  trace: ReductionTrace;
}

export default function NumerosScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const labels = numerologyContent(locale).labels;
  const gloss = numerologyContent(locale).gloss;
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
          <Text style={styles.emptyText}>{t("numerology.emptyMap")}</Text>
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
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno + estrellas
    // ya viven en ThemedBackground (capa raíz, Task 2) — esta pantalla queda transparente.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("numerology.title")}</Text>
          <Enso size={22} />
        </View>
        <Text style={styles.h1} maxFontSizeMultiplier={1.2}>{t("numerology.subtitle")}</Text>
        <Text style={styles.who}>{profile.name}</Text>

        {/* HERO — Camino de Vida: tarjeta acentuada (receta "hero" de Hoy), número
            libre en fonts.serifSemi a type.display, la insignia de número maestro
            ahora es el chip canónico "tag". */}
        <FadeIn delay={0} style={styles.heroGap}>
          <Pressable onPress={() => setSheet({ positionKey: "lifePath", trace: core.lifePath })}>
            <Card accent style={styles.hero}>
              <View style={styles.ringOuter}>
                <View style={styles.ring}>
                  <Text style={styles.heroN} maxFontSizeMultiplier={1.2}>
                    {core.lifePath.value}
                  </Text>
                </View>
              </View>
              {core.lifePath.isMaster && (
                <View style={styles.masterBadge}>
                  <Chip kind="tag" label={t("numerology.master")} />
                </View>
              )}
              <Text style={styles.heroLabel}>{labels.lifePath}</Text>
              <Text style={styles.heroGloss}>{gloss.lifePath}</Text>
              <Text style={styles.calc}>{formatReduction(core.lifePath)}</Text>
            </Card>
          </Pressable>
        </FadeIn>

        {/* Núcleo: los 5 números conviven en la MISMA escala (type.xl3) — antes
            tenían tamaños sueltos (34px), justo la inconsistencia que mata el rediseño. */}
        <FadeIn delay={60} style={styles.fadeFull}>
          <View style={styles.grid}>
            {coreItems.map((it) => (
              <Pressable
                key={it.key}
                style={styles.cellPress}
                onPress={() => setSheet({ positionKey: it.key, trace: it.trace })}
              >
                <Card style={styles.cell}>
                  <Text style={styles.cellN}>{it.trace.value}</Text>
                  <Text style={styles.cellL}>{labels[it.key]}</Text>
                  <Text style={styles.cellSub}>{gloss[it.key]}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </FadeIn>

        {/* Toggle Modo Pro */}
        <ToggleRow label={t("numerology.pro")} on={pro} onPress={() => setPro(!pro)} style={{ marginTop: space.xxl }} />

        {pro && (
          <View style={styles.proBody}>
            {/* Lecciones y deudas kármicas */}
            <SectionCard styles={styles} title={t("numerology.karmicLessons")}>
              <View style={styles.chips}>
                {karmic.lessons.length ? (
                  karmic.lessons.map((n) => (
                    <View key={n} style={styles.chip}>
                      <Text style={styles.chipText}>{n}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>{t("numerology.none")}</Text>
                )}
              </View>
              {karmic.debts.length > 0 && (
                <>
                  <Text style={styles.cardSub}>{t("numerology.debts")}</Text>
                  <View style={styles.chips}>
                    {karmic.debts.map((n) => (
                      <View key={n} style={[styles.chip, styles.chipWarn]}>
                        <Text style={[styles.chipText, styles.chipWarnText]}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </SectionCard>

            {/* Tabla de inclusión */}
            <SectionCard styles={styles} title={t("numerology.inclusion")}>
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
                <Text style={styles.muted}>
                  {t("numerology.hiddenPassion")}: {karmic.hiddenPassion.join(", ")}
                </Text>
              )}
            </SectionCard>

            {/* Pináculos y desafíos */}
            <SectionCard styles={styles} title={t("numerology.pinnacles")}>
              <Timeline styles={styles} items={pinnacles.map((p) => ({ value: p.value, age: ageLabel(p.startAge, p.endAge) }))} />
              <Text style={styles.cardSub}>{t("numerology.challenges")}</Text>
              <Timeline styles={styles} items={challenges.map((c) => ({ value: c.value, age: ageLabel(c.startAge, c.endAge) }))} />
            </SectionCard>

            {/* Ciclos del momento */}
            <SectionCard styles={styles} title={t("numerology.cycles")}>
              <View style={styles.cycles}>
                <Cyc styles={styles} value={cycles.personalYear.value} label={t("numerology.personalYear")} />
                <Cyc styles={styles} value={cycles.personalMonth.value} label={t("numerology.personalMonth")} />
                <Cyc styles={styles} value={cycles.personalDay.value} label={t("numerology.personalDay")} />
              </View>
            </SectionCard>
          </View>
        )}

        <Text style={styles.tapHint}>{t("numerology.tapHint")}</Text>
      </ScrollView>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? (labels[sheet.positionKey] ?? "") : ""}
      >
        {sheet && <NumberReading positionKey={sheet.positionKey} trace={sheet.trace} />}
      </BottomSheet>
    </View>
  );
}

/** Tarjeta con título "eyebrow" (LECCIONES/INCLUSIÓN/...) sobre el primitivo <Card>.
 * Renombrada de "Card" a "SectionCard" para no chocar con el primitivo importado
 * (misma convención que carta.tsx). */
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

function Timeline({
  styles,
  items,
}: {
  styles: ReturnType<typeof makeStyles>;
  items: Array<{ value: number; age: string }>;
}) {
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

function Cyc({
  styles,
  value,
  label,
}: {
  styles: ReturnType<typeof makeStyles>;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.cyc}>
      <Text style={styles.cycN}>{value}</Text>
      <Text style={styles.cycL}>{label}</Text>
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
    h1: { color: t.text, fontSize: typeScale.displaySm, fontFamily: fonts.serifSemi, textAlign: "center" },
    who: {
      color: t.textDim,
      fontSize: typeScale.md,
      marginTop: space.xs,
      marginBottom: space.xxl,
      fontFamily: fonts.serifItalic,
    },

    // FadeIn del hero: el marginBottom que antes vivía en el propio Pressable/hero
    // ahora vive en el wrapper de entrada (misma convención que Hoy/Carta).
    heroGap: { marginBottom: space.xxl },
    // Tarjeta acentuada (--surface-2 del SPEC): fondo/borde/radio/padding los da
    // <Card accent>; acá solo el centrado de los hijos.
    hero: { alignItems: "center" },
    ringOuter: {
      width: 188,
      height: 188,
      borderRadius: 94,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.accFaint,
    },
    ring: {
      width: 156,
      height: 156,
      borderRadius: 78,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: t.accSoft,
      backgroundColor: t.panelSoft,
    },
    // Número héroe: fonts.serifSemi a type.display (política de la pasada de pantalla).
    heroN: { color: t.acc, fontSize: typeScale.display, fontFamily: fonts.serifSemi, lineHeight: 64 },
    masterBadge: { marginTop: space.lg },
    // Serif semibold sin cursiva, type.xl — receta "heroLabel" del mockup web de Números.
    heroLabel: { color: t.text, fontSize: typeScale.xl, marginTop: space.lg, fontFamily: fonts.serifSemi },
    heroGloss: {
      color: t.textDim,
      fontSize: typeScale.sm,
      lineHeight: 20,
      marginTop: space.xs,
      fontFamily: fonts.sans,
    },
    calc: { color: t.textFaint, fontSize: typeScale.sm, marginTop: space.sm, fontFamily: fonts.serifItalic },

    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.md, width: "100%" },
    // Ancho de grilla en el Pressable (participa del flex-wrap 2 columnas); el resto
    // del look de la celda (borde/fondo/radio) lo da <Card>.
    cellPress: { width: "47%", minWidth: 150 },
    cell: { alignItems: "center", paddingVertical: space.lg, paddingHorizontal: space.md },
    // Serif semibold, type.xl3 — TODOS los números del núcleo a la misma escala.
    cellN: { color: t.acc, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi },
    cellL: { color: t.text, fontSize: typeScale.sm, marginTop: space.xs, fontFamily: fonts.sansMedium },
    cellSub: { color: t.textFaint, fontSize: typeScale.xs2, marginTop: 2, textAlign: "center", fontFamily: fonts.sans },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio ahora los da <Card>; queda solo el ancho.
    card: { width: "100%" },
    cardH: {
      color: t.acc,
      fontSize: typeScale.sm,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sansSemi,
    },
    cardSub: {
      color: t.textDim,
      fontSize: typeScale.xs,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: space.lg,
      marginBottom: space.md,
      fontFamily: fonts.sansSemi,
    },
    muted: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },

    // Chips de dígito kármico: badge circular fijo, no una pill de <Chip> (la data
    // solo trae dígitos sueltos, no el texto descriptivo del mockup web) — local
    // legítimo, ver informe de la tarea.
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    chip: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.accSoft,
      backgroundColor: t.accFaint,
    },
    chipText: { color: t.acc, fontSize: typeScale.lg, fontFamily: fonts.serif },
    chipWarn: { borderColor: t.warn, backgroundColor: t.warnSoft },
    chipWarnText: { color: t.warn },

    // Celdas de la tabla de inclusión: radio/fondo propios (radius.sm sobre t.panel,
    // no el patrón de <Card>) — mini-estadística, no tarjeta.
    incl: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "space-between" },
    inclCell: {
      width: "30%",
      paddingVertical: space.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.sm,
      backgroundColor: t.panel,
    },
    inclHot: { borderColor: t.acc, backgroundColor: t.accFaint },
    inclMiss: { opacity: 0.45 },
    inclD: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serif },
    inclDHot: { color: t.acc },
    inclC: { color: t.textDim, fontSize: typeScale.xs, marginTop: 2, fontFamily: fonts.sans },

    timeline: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
    tcell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: space.md,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.sm,
      backgroundColor: t.panel,
    },
    tN: { color: t.acc, fontSize: typeScale.xl, fontFamily: fonts.serif },
    tAge: { color: t.textFaint, fontSize: typeScale.xs2, marginTop: 2, fontFamily: fonts.sans },

    cycles: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
    cyc: { flex: 1, alignItems: "center" },
    cycN: { color: t.acc, fontSize: typeScale.xl3, fontFamily: fonts.serif },
    cycL: { color: t.textDim, fontSize: typeScale.xs, marginTop: space.xs, textAlign: "center", fontFamily: fonts.sans },

    // <FadeIn> envuelve la grilla del núcleo, que ya declara width:"100%" (mismo
    // motivo que carta.tsx: sin este ancho explícito en el propio wrapper de
    // FadeIn, el % interno no tendría contra qué resolverse).
    fadeFull: { width: "100%" },

    tapHint: { color: t.textFaint, fontSize: typeScale.sm, marginTop: space.xxl, textAlign: "center", fontFamily: fonts.sans },
  });
}
