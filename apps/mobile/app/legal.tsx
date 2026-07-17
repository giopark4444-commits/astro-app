import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TERMS_ES,
  PRIVACY_ES,
  DISCLAIMER_ES,
  TERMS_EN,
  PRIVACY_EN,
  DISCLAIMER_EN,
  type LegalDoc,
} from "@aluna/core";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fonts, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

// Mismo mapeo slug→documento que apps/web/lib/legal/slug.ts (no se comparte
// el módulo entero porque ese vive fuera de @aluna/core y trae `notFound()`
// de next/navigation — aquí basta con el LegalDoc, ya compartido en core).
const DOCS: Record<string, Record<"es" | "en", LegalDoc>> = {
  terminos: { es: TERMS_ES, en: TERMS_EN },
  privacidad: { es: PRIVACY_ES, en: PRIVACY_EN },
  descargo: { es: DISCLAIMER_ES, en: DISCLAIMER_EN },
};

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const slug = typeof doc === "string" ? doc : undefined;
  const legalDoc = slug && slug in DOCS ? DOCS[slug][locale] : null;

  const back = () => router.back();

  if (!legalDoc) {
    // Slug desconocido (deep link roto, versión vieja de la app, etc.):
    // vuelve atrás en vez de mostrar una pantalla vacía sin salida.
    router.back();
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t("legal.back")} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{legalDoc.title}</Text>
        <Text style={styles.updated}>{t("legal.updated", { date: legalDoc.updated })}</Text>
        <Text style={styles.intro}>{legalDoc.intro}</Text>

        {legalDoc.sections.map((section) => (
          <View key={section.h} style={styles.section}>
            <Text style={styles.h2}>{section.h}</Text>
            {section.p.map((para, i) => (
              <Text key={i} style={styles.paragraph}>
                {para}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.draftNote}>{t("legal.draftNote")}</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.lg },
    backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backChevron: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    title: { color: t.text, fontSize: typeScale.xl3, fontFamily: fonts.serifItalic, marginTop: space.md },
    updated: { color: t.acc, fontSize: typeScale.xs2, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sansSemi, marginTop: space.sm },
    intro: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.serifItalic, lineHeight: 22, marginTop: space.lg },
    section: { marginTop: space.xl },
    h2: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sansSemi, letterSpacing: 0.5, marginBottom: space.sm },
    paragraph: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, lineHeight: 21, marginBottom: space.sm },
    draftNote: {
      color: t.textFaint,
      fontSize: typeScale.xs,
      fontFamily: fonts.serifItalic,
      marginTop: space.xxl,
      paddingTop: space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.accHair,
    },
  });
}
