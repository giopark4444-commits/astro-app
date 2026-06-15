import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

/** Insignia "pronto" para funciones latentes (tiers de IA, otros sistemas). */
export function SoonBadge({ label = "pronto" }: { label?: string }) {
  const { t } = useTheme();
  const s = useMemo(() => makeBadge(t), [t]);
  return (
    <View style={s.wrap}>
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

function makeBadge(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: 3,
      backgroundColor: t.accFaint,
    },
    text: {
      color: t.acc,
      fontSize: 10,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
    },
  });
}

/** Encabezado de sección reutilizable: ojal (eyebrow) + título serif. */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  const { t } = useTheme();
  const s = useMemo(() => makeHeading(t), [t]);
  return (
    <View style={s.wrap}>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

function makeHeading(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { marginBottom: space.lg },
    eyebrow: {
      color: t.acc,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
      marginBottom: space.sm,
    },
    title: {
      color: t.text,
      fontSize: 28,
      fontFamily: fonts.serif,
      fontStyle: "italic",
    },
  });
}
