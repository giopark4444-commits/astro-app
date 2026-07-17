import { useMemo } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { glossaryEntry } from "@aluna/core";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { useMeaningSheet } from "../lib/meaning-context";
import type { ThemeTokens } from "../theme/tokens";

/**
 * Nativo del <Meaning/> web (apps/web/components/meaning.tsx): envuelve
 * cualquier glifo/nombre con "toca y entiende", misma clave y mismo contenido
 * (glossaryEntry de @aluna/core — capa de significados, contenido único).
 * Si la clave no existe, renderiza los children intactos (la capa nunca rompe
 * contenido).
 *
 * Diferencia deliberada con la web: acá NO abre su propio <BottomSheet/> —
 * RN no permite anidar un <Modal> dentro de un <Text> (a diferencia del DOM,
 * donde <button>+<div> pueden ser hermanos dentro de cualquier contenedor), y
 * <Meaning/> tiene que poder vivir DENTRO de un <Text> ya existente (glifos y
 * nombres intercalados en una misma frase, p.ej. "☉ Trino ♃"). En vez de eso,
 * el propio componente es siempre un <Text onPress> — nido válido tanto
 * suelto como anidado en otro <Text> — que solo abre el host compartido
 * (MeaningProvider, montado una vez en app/_layout.tsx).
 */
export function Meaning({
  k,
  children,
  style,
}: {
  k: string;
  children: React.ReactNode;
  /** Estilo extra para el <Text> disparador (raro: normalmente hereda del
   *  <Text> padre por el cascadeo nativo de RN). */
  style?: StyleProp<TextStyle>;
}) {
  const { locale } = useT();
  const { t } = useTheme();
  const { open } = useMeaningSheet();
  const entry = useMemo(() => glossaryEntry(k, locale), [k, locale]);
  const styles = useMemo(() => makeStyles(t), [t]);

  if (!entry) return <>{children}</>;

  return (
    <Text
      style={[styles.trigger, style]}
      onPress={() => open(entry)}
      accessibilityRole="button"
      accessibilityHint={entry.title}
      suppressHighlighting
    >
      {children}
    </Text>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    trigger: {
      textDecorationLine: "underline",
      textDecorationColor: t.accSoft,
      textDecorationStyle: "dotted",
    },
  });
}
