import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space } from "../theme/tokens";

/** Insignia "pronto" para funciones latentes (tiers de IA, otros sistemas). */
export function SoonBadge({ label = "pronto" }: { label?: string }) {
  return (
    <View style={badge.wrap}>
      <Text style={badge.text}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.goldHair,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    backgroundColor: colors.goldFaint,
  },
  text: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: fonts.sans,
  },
});

/** Encabezado de sección reutilizable: ojal (eyebrow) + título serif. */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={heading.wrap}>
      <Text style={heading.eyebrow}>{eyebrow}</Text>
      <Text style={heading.title}>{title}</Text>
    </View>
  );
}

const heading = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: fonts.sans,
    marginBottom: space.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontFamily: fonts.serif,
    fontStyle: "italic",
  },
});
