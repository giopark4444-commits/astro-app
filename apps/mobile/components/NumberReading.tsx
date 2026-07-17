import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { numberColor, type ReductionTrace } from "@aluna/core";
import { numerologyContent } from "../content/numerology";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { SoonBadge } from "./ui";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

const formatReduction = (tr: Pick<ReductionTrace, "steps">) => tr.steps.join("  →  ");

/**
 * Cuerpo de la hoja al tocar un número. Muestra el valor, "tu cálculo", la lente
 * de la posición y la lectura "Esencia" (voz escrita de Aluna). Los niveles
 * Profunda/Completa (IA) se anuncian como "pronto". Tema e idioma activos.
 */
export function NumberReading({ positionKey, trace }: { positionKey: string; trace: ReductionTrace }) {
  const { t: tk, paletteMode } = useTheme();
  const colorful = paletteMode === "colorful";
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const content = numerologyContent(locale);

  const meaning = content.meanings[trace.value];
  const lens = content.lens[positionKey];
  const label = content.labels[positionKey] ?? positionKey;

  return (
    <View style={styles.wrap}>
      <View style={styles.bigRow}>
        <Text style={[styles.big, colorful && { color: numberColor(trace.value) }]}>{trace.value}</Text>
        {trace.isMaster && <Text style={styles.master}>{t("reading.master")}</Text>}
      </View>

      <View style={styles.calc}>
        <Text style={styles.calcLabel}>{t("reading.yourCalc")}</Text>
        <Text style={styles.calcValue}>{formatReduction(trace)}</Text>
      </View>

      {/* Selector de profundidad (Esencia activa; resto latente) */}
      <View style={styles.tiers}>
        <View style={[styles.tier, styles.tierOn]}>
          <Text style={[styles.tierText, styles.tierTextOn]}>{t("reading.tierEssence")}</Text>
        </View>
        <View style={styles.tier}>
          <Text style={styles.tierText}>{t("reading.tierDeep")}</Text>
        </View>
        <View style={styles.tier}>
          <Text style={styles.tierText}>{t("reading.tierComplete")}</Text>
        </View>
      </View>
      <View style={styles.soonRow}>
        <SoonBadge label={t("settings.soon")} />
        <Text style={styles.soonNote}>{t("reading.gatedNote")}</Text>
      </View>

      {lens && <Text style={styles.lens}>{lens}</Text>}

      {meaning ? (
        <View style={styles.reading}>
          <Text style={styles.essence}>{meaning.essence}</Text>

          <Block styles={styles} heading={t("reading.flowH")} body={meaning.flow} />
          <Block styles={styles} heading={t("reading.shadowH")} body={meaning.shadow} />
          <Block styles={styles} heading={t("reading.practiceH")} body={meaning.practice} accent />
        </View>
      ) : (
        <Text style={styles.fallback}>
          {content.gloss[positionKey] ? `${label}: ${content.gloss[positionKey]}. ` : ""}
          {t("reading.proseSoon")}
        </Text>
      )}
    </View>
  );
}

function Block({
  styles,
  heading,
  body,
  accent,
}: {
  styles: ReturnType<typeof makeStyles>;
  heading: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.block, accent && styles.blockAccent]}>
      <Text style={styles.blockH}>{heading}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { paddingBottom: space.xl },
    bigRow: { alignItems: "center", marginBottom: space.lg },
    big: { color: t.acc, fontSize: 72, fontFamily: fonts.serif, lineHeight: 80 },
    master: {
      color: t.acc,
      fontSize: 12,
      letterSpacing: 1.5,
      marginTop: space.xs,
      fontFamily: fonts.sans,
    },
    calc: { alignItems: "center", marginBottom: space.xl },
    calcLabel: {
      color: t.textFaint,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: space.xs,
      fontFamily: fonts.sans,
    },
    calcValue: { color: t.textDim, fontSize: 16, fontFamily: fonts.serifItalic },
    tiers: {
      flexDirection: "row",
      gap: space.sm,
      backgroundColor: t.panelSoft,
      borderRadius: radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: t.accHair,
    },
    tier: { flex: 1, paddingVertical: space.sm, alignItems: "center", borderRadius: radius.pill },
    tierOn: { backgroundColor: t.accFaint },
    tierText: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans },
    tierTextOn: { color: t.acc },
    soonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      marginTop: space.md,
      marginBottom: space.xl,
    },
    soonNote: { flex: 1, color: t.textFaint, fontSize: 12, lineHeight: 17, fontFamily: fonts.sans },
    lens: {
      color: t.acc,
      fontSize: 15,
      lineHeight: 23,
      fontFamily: fonts.serifItalic,
      marginBottom: space.lg,
    },
    reading: {},
    essence: { color: t.text, fontSize: 17, lineHeight: 27, marginBottom: space.xl, fontFamily: fonts.sans },
    block: { marginBottom: space.lg },
    blockAccent: {
      backgroundColor: t.accFaint,
      borderRadius: radius.md,
      padding: space.lg,
      borderWidth: 1,
      borderColor: t.accHair,
    },
    blockH: {
      color: t.acc,
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: space.sm,
      fontFamily: fonts.sans,
    },
    blockBody: { color: t.textDim, fontSize: 15, lineHeight: 24, fontFamily: fonts.sans },
    fallback: { color: t.textDim, fontSize: 15, lineHeight: 23, fontFamily: fonts.sans },
  });
}
