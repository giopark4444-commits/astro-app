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
  onPress,
}: {
  children: ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
  /** NEW (R3/Task 11) — si se pasa, la tarjeta se vuelve interactiva (`Pressable`)
   *  en vez de una `View` estática; usado por tiles tocables como `luckCol` en
   *  pilares.tsx (大運/流年). Sin `onPress` el render es idéntico al de siempre. */
  onPress?: () => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeCard(t), [t]);
  if (onPress) {
    return (
      <Pressable style={[s.wrap, accent && s.wrapAccent, style]} onPress={onPress} accessibilityRole="button">
        <View style={s.highlight} pointerEvents="none" />
        {children}
      </Pressable>
    );
  }
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
 *   (no recibe onPress). Con `tint` (NEW, R3/Task 11) se vuelve una pill
 *   bordeada/rellena con color dinámico por instancia (p.ej. Wu Xing) — cierra
 *   el gap que documentaba pilares.tsx (chips de Favor/Evitar y Estrellas).
 *   Sin `tint` el render es idéntico al de siempre (solo texto, sin borde):
 *   los consumidores existentes (carta.tsx, numeros.tsx) no cambian.
 */
export function Chip({
  label,
  kind,
  selected = false,
  onPress,
  icon,
  tint,
  dim = false,
  bold = false,
  disabled = false,
}: {
  label: string;
  kind: "control" | "tag";
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  /** NEW — "control" únicamente: la persona ya está elegida en el OTRO picker
   *  (p.ej. compatibilidad.tsx). Atenúa (opacity 0.5) y marca
   *  accessibilityState.disabled — a diferencia de solo omitir `onPress`, que
   *  dejaba el chip con el mismo aspecto que uno interactivo. */
  disabled?: boolean;
  /** NEW — "tag" únicamente: color dinámico por instancia (Wu Xing u otro).
   *  `bg`/`border` pintan la pill, `fg` el texto. Omitido = look de siempre. */
  tint?: { bg: string; border: string; fg: string };
  /** NEW — "tag"+`tint` únicamente: atenúa la pill entera (opacity 0.6),
   *  equivalente a `.chipDim` (pilares.tsx) — p.ej. elementos a "evitar". */
  dim?: boolean;
  /** NEW — "tag"+`tint` únicamente: texto en `fonts.sansSemi` en vez de
   *  `fonts.sans` (familia preglifada distinta, no `fontWeight` — convención
   *  R1 de fuentes custom en Android). Distingue p.ej. Favor (relleno, bold)
   *  de Evitar/Estrellas (solo borde, regular). */
  bold?: boolean;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeChip(t), [t]);

  if (kind === "tag") {
    if (tint) {
      return (
        <View style={[s.tagPill, { backgroundColor: tint.bg, borderColor: tint.border }, dim && s.tagPillDim]}>
          {icon}
          <Text style={[s.tagPillText, { color: tint.fg }, bold && s.tagPillTextBold]}>{label}</Text>
        </View>
      );
    }
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
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[s.control, { backgroundColor: c.bg, borderColor: c.border }, selected && s.controlGlow, disabled && s.controlDisabled]}
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
      justifyContent: "center",
      gap: space.xs,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: 9,
      minHeight: 44,
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
    controlDisabled: {
      opacity: 0.5,
    },
    controlText: {
      fontSize: typeScale.md,
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
    // Pill bordeada/rellena de "tag"+tint — receta `.chip` de pilares.tsx portada
    // al primitivo (R3/Task 11): borde+relleno vienen del `tint` de cada instancia.
    tagPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.xs + 2,
    },
    tagPillDim: { opacity: 0.6 },
    tagPillText: { fontSize: typeScale.sm, fontFamily: fonts.sans },
    tagPillTextBold: { fontFamily: fonts.sansSemi },
  });
}

/**
 * Fila de interruptor "Modo Pro": pill bordeada + dot animable + label. Extraído de
 * 3 copias byte-idénticas (carta.tsx, numeros.tsx, pilares.tsx) — R3. `style` (mismo
 * patrón que `Card`/`FadeIn`) es del llamador: los 3 orígenes solo diferían en
 * `marginTop`/`alignSelf`, que es layout, no parte del primitivo.
 */
export function ToggleRow({
  label,
  on,
  onPress,
  style,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeToggleRow(t), [t]);
  return (
    <Pressable style={[s.wrap, style]} onPress={onPress}>
      <View style={[s.dot, on && s.dotOn]} />
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
}

function makeToggleRow(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row", alignItems: "center", gap: space.md,
      borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill,
      paddingHorizontal: space.xl, paddingVertical: space.md,
    },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: t.accHair },
    dotOn: { backgroundColor: t.acc },
    text: { color: t.text, fontSize: typeScale.md, letterSpacing: 1, fontFamily: fonts.sans },
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
