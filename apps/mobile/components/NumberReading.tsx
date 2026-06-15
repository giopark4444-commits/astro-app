import { StyleSheet, Text, View } from "react-native";
import type { ReductionTrace } from "@aluna/core";
import { GLOSS, LABELS, NUMBER_MEANINGS_ES, POSITION_LENS_ES } from "../content/numerology-es";
import { SoonBadge } from "./ui";
import { colors, fonts, radius, space } from "../theme/tokens";

const formatReduction = (t: Pick<ReductionTrace, "steps">) => t.steps.join("  →  ");

/**
 * Cuerpo de la hoja al tocar un número. Muestra el valor, "tu cálculo", la lente
 * de la posición y la lectura "Esencia" (voz escrita de Aluna). Los niveles
 * Profunda/Completa (IA) se anuncian como "pronto".
 */
export function NumberReading({ positionKey, trace }: { positionKey: string; trace: ReductionTrace }) {
  const meaning = NUMBER_MEANINGS_ES[trace.value];
  const lens = POSITION_LENS_ES[positionKey];
  const label = LABELS[positionKey as keyof typeof LABELS] ?? positionKey;

  return (
    <View style={styles.wrap}>
      <View style={styles.bigRow}>
        <Text style={styles.big}>{trace.value}</Text>
        {trace.isMaster && <Text style={styles.master}>★ Número maestro</Text>}
      </View>

      <View style={styles.calc}>
        <Text style={styles.calcLabel}>Tu cálculo</Text>
        <Text style={styles.calcValue}>{formatReduction(trace)}</Text>
      </View>

      {/* Selector de profundidad (Esencia activa; resto latente) */}
      <View style={styles.tiers}>
        <View style={[styles.tier, styles.tierOn]}>
          <Text style={[styles.tierText, styles.tierTextOn]}>Esencia</Text>
        </View>
        <View style={styles.tier}>
          <Text style={styles.tierText}>Profunda</Text>
        </View>
        <View style={styles.tier}>
          <Text style={styles.tierText}>Completa</Text>
        </View>
      </View>
      <View style={styles.soonRow}>
        <SoonBadge label="pronto" />
        <Text style={styles.soonNote}>Las lecturas más extensas las teje Aluna cuando despierte su voz interior.</Text>
      </View>

      {lens && <Text style={styles.lens}>{lens}</Text>}

      {meaning ? (
        <View style={styles.reading}>
          <Text style={styles.essence}>{meaning.essence}</Text>

          <Block heading="✦  Energía fluida" body={meaning.flow} />
          <Block heading="◐  Energía no fluida" body={meaning.shadow} />
          <Block heading="☾  Tu práctica" body={meaning.practice} accent />
        </View>
      ) : (
        <Text style={styles.fallback}>
          {GLOSS[positionKey] ? `${label}: ${GLOSS[positionKey]}.` : ""} La lectura evolutiva de este número llega pronto.
        </Text>
      )}
    </View>
  );
}

function Block({ heading, body, accent }: { heading: string; body: string; accent?: boolean }) {
  return (
    <View style={[styles.block, accent && styles.blockAccent]}>
      <Text style={styles.blockH}>{heading}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.xl },
  bigRow: { alignItems: "center", marginBottom: space.lg },
  big: { color: colors.gold, fontSize: 72, fontFamily: fonts.serif, lineHeight: 80 },
  master: {
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: space.xs,
    fontFamily: fonts.sans,
  },
  calc: { alignItems: "center", marginBottom: space.xl },
  calcLabel: {
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: space.xs,
    fontFamily: fonts.sans,
  },
  calcValue: { color: colors.textDim, fontSize: 16, fontFamily: fonts.serif, fontStyle: "italic" },
  tiers: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.goldHair,
  },
  tier: { flex: 1, paddingVertical: space.sm, alignItems: "center", borderRadius: radius.pill },
  tierOn: { backgroundColor: colors.goldFaint },
  tierText: { color: colors.textDim, fontSize: 13, fontFamily: fonts.sans },
  tierTextOn: { color: colors.gold },
  soonRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md, marginBottom: space.xl },
  soonNote: { flex: 1, color: colors.textFaint, fontSize: 12, lineHeight: 17, fontFamily: fonts.sans },
  lens: {
    color: colors.gold,
    fontSize: 15,
    lineHeight: 23,
    fontStyle: "italic",
    fontFamily: fonts.serif,
    marginBottom: space.lg,
  },
  reading: {},
  essence: { color: colors.text, fontSize: 17, lineHeight: 27, marginBottom: space.xl, fontFamily: fonts.sans },
  block: { marginBottom: space.lg },
  blockAccent: {
    backgroundColor: colors.goldFaint,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.goldHair,
  },
  blockH: {
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: space.sm,
    fontFamily: fonts.sans,
  },
  blockBody: { color: colors.textDim, fontSize: 15, lineHeight: 24, fontFamily: fonts.sans },
  fallback: { color: colors.textDim, fontSize: 15, lineHeight: 23, fontFamily: fonts.sans },
});
