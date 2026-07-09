import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../lib/theme-context";
import { chipColors } from "../lib/chip-colors";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

// chipColors vive en lib/chip-colors.ts (módulo puro, sin imports de react-native) para
// que el test de lib/__tests__/ui-primitives.test.ts pueda importarlo en el entorno
// "node" de vitest. Se re-exporta acá para que siga siendo parte de la API pública de
// los primitivos, tal como pedía el brief original.
export { chipColors };

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
      {/* Título en serif de marca: limitado a 1.2x (política de font-scaling de los
          primitivos) para que un usuario con texto del sistema muy grande no rompa
          la composición del encabezado — el cuerpo sans no lleva este límite. */}
      <Text style={s.title} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
    </View>
  );
}

function makeHeading(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { marginBottom: space.lg },
    eyebrow: {
      color: t.acc,
      fontSize: typeScale.xs2,
      letterSpacing: 3,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
      marginBottom: space.sm,
    },
    title: {
      color: t.text,
      fontSize: typeScale.xl2,
      fontFamily: fonts.serifSemi,
    },
  });
}

/**
 * Tarjeta "glass" del rediseño: superficie translúcida (`t.glass`) con borde
 * hairline dorado (`t.accHair`) y un highlight superior de 1px. RN no soporta
 * `box-shadow: inset` (la receta del SPEC web) — se aproxima con una View
 * absoluta angosta pegada al borde superior, recortada por el radio de la
 * tarjeta para no asomar en las esquinas curvas. `accent` cambia el fondo a
 * `t.accFaint` (variante "balance" del SPEC).
 */
export function Card({
  children,
  accent = false,
  style,
}: {
  children: ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeCard(t), [t]);
  return (
    <View style={[s.wrap, accent && s.wrapAccent, style]}>
      <View style={s.highlight} pointerEvents="none" />
      {children}
    </View>
  );
}

function makeCard(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: t.glass,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.lg,
      // xl (24) en vez del 20 del SPEC: la escala `space` del repo no tiene ese paso y las pantallas existentes ya usan 24 en paneles.
      padding: space.xl,
    },
    wrapAccent: {
      backgroundColor: t.accFaint,
    },
    highlight: {
      position: "absolute",
      top: 0,
      left: radius.lg,
      right: radius.lg,
      height: 1,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
  });
}

/**
 * Chip del rediseño en dos variantes:
 * - "control": pill seleccionable (Pressable). El color según selección sale
 *   de `chipColors` (helper puro, testeado aparte).
 * - "tag": etiqueta estática en mayúsculas, sin fondo — no es interactiva
 *   (no recibe onPress).
 */
export function Chip({
  label,
  kind,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  kind: "control" | "tag";
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeChip(t), [t]);

  if (kind === "tag") {
    return (
      <View style={s.tag}>
        {icon}
        <Text style={s.tagText}>{label}</Text>
      </View>
    );
  }

  const c = chipColors(t, selected);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[s.control, { backgroundColor: c.bg, borderColor: c.border }, selected && s.controlGlow]}
    >
      {icon}
      <Text style={[s.controlText, { color: c.fg }, selected && s.controlTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function makeChip(t: ThemeTokens) {
  return StyleSheet.create({
    control: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: 9,
    },
    // Glow sutil del chip seleccionado — equivalente RN de --glow-soft del SPEC
    // (0 0 14px rgba(acc,0.28)); shadow* solo pinta en iOS, elevation cubre Android
    // (con un gris genérico ahí, limitación conocida de RN — no hay color en elevation).
    controlGlow: {
      shadowColor: t.acc,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 3,
    },
    controlText: {
      fontSize: typeScale.xs,
      fontFamily: fonts.sansMedium,
    },
    controlTextSelected: {
      fontFamily: fonts.sansSemi,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
    },
    tagText: {
      color: t.acc,
      fontSize: typeScale.xs2,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },
  });
}

const FADE_DURATION_MS = 550;
const FADE_TRANSLATE_Y = 8;

/**
 * Envoltorio de entrada: opacity 0→1 + translateY 8→0 en 550ms (Animated core,
 * useNativeDriver: true — válido fuera de árboles SVG, que es donde vive esto).
 * Respeta accesibilidad: consulta `AccessibilityInfo.isReduceMotionEnabled()`
 * una vez al montar; si el sistema tiene "reducir movimiento" activo, el valor
 * animado salta directo a 1 (sin transición) en vez de animar.
 */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!alive) return;
        if (v) {
          // Reducir movimiento: aparece directo, sin animación.
          progress.setValue(1);
        } else {
          Animated.timing(progress, {
            toValue: 1,
            duration: FADE_DURATION_MS,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {
        // Si el módulo nativo falta, la promesa rechaza — el contenido JAMÁS debe quedar invisible.
        if (alive) progress.setValue(1);
      });
    return () => {
      alive = false;
    };
  }, [delay, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [FADE_TRANSLATE_Y, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
