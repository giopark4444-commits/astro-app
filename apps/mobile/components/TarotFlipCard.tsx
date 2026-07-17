import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, radius } from "../theme/tokens";

/**
 * Carta de tarot con flip 3D, reusable por el umbral (carta del día) y la
 * ceremonia (Task 4, paso "reveal"). Espeja apps/web/app/(app)/tarot/
 * tarot.module.css:20-39 (.flipScene/.flipCard/.face/.faceBack/.faceFront):
 * dos caras superpuestas con backfaceVisibility hidden, cada una rotada 180°
 * respecto a la otra; "voltear" anima rotateY 0↔180 con Animated (native
 * driver — rotateY sobre <View>/<Image>, a diferencia de las props de
 * react-native-svg en use-ceremony.ts, SÍ participa del native driver).
 *
 * Invertida (`reversed`) se resuelve con un `rotate: 180deg` ADICIONAL sobre
 * la cara frontal (mismo mecanismo que .reversedImg en la web) — nunca
 * afecta a la cara trasera (el dorso no tiene orientación).
 *
 * Reducir-movimiento: si el sistema lo pide, `revealed=true` salta al
 * `flip` en 1 sin animar (patrón `showInstantly` de components/use-ceremony.ts:70-76).
 * Al no re-ocultarse nunca la carta del día, no hace falta animar "de vuelta".
 */
export function TarotFlipCard({
  revealed,
  onFlip,
  frontUri,
  backUri,
  reversed = false,
  frontLabel,
  backLabel,
  width = 160,
  height = 260,
}: {
  revealed: boolean;
  onFlip?: () => void;
  frontUri: string;
  backUri: string;
  reversed?: boolean;
  frontLabel: string;
  backLabel: string;
  width?: number;
  height?: number;
}) {
  const flip = useRef(new Animated.Value(revealed ? 1 : 0)).current;
  const reduceMotionRef = useRef(false);
  // Red caída / apiUrl inalcanzable (p.ej. Expo Go sin el server Next): en vez
  // de un hueco vacío, cada cara cae a un naipe dibujado (borde + nombre) para
  // que el rito siga siendo legible. Se reintenta solo al remontar.
  const [backFailed, setBackFailed] = useState(false);
  const [frontFailed, setFrontFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) reduceMotionRef.current = v;
      })
      .catch(() => {
        /* módulo nativo ausente: se asume movimiento normal, nunca bloquea */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!revealed) return;
    if (reduceMotionRef.current) {
      flip.setValue(1);
      return;
    }
    Animated.timing(flip, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealed, flip]);

  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-180deg"] });
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "0deg"] });

  return (
    <Pressable
      onPress={revealed ? undefined : onFlip}
      disabled={revealed}
      accessibilityRole="button"
      accessibilityLabel={revealed ? frontLabel : backLabel}
      style={{ width, height }}
    >
      <Animated.View
        style={[
          styles.face,
          { width, height, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
      >
        {backFailed ? (
          <View style={[styles.fallback, { width, height, borderRadius: radius.md }]}>
            <Text style={styles.fallbackGlyph}>✶</Text>
          </View>
        ) : (
          <Image source={{ uri: backUri }} style={{ width, height, borderRadius: radius.md }} onError={() => setBackFailed(true)} />
        )}
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          {
            width,
            height,
            transform: [
              { perspective: 1000 },
              { rotateY: frontRotate },
              ...(reversed ? [{ rotate: "180deg" }] : []),
            ],
          },
        ]}
      >
        {frontFailed ? (
          <View style={[styles.fallback, { width, height, borderRadius: radius.md }]}>
            <Text style={styles.fallbackGlyph}>✶</Text>
            <Text style={styles.fallbackName} numberOfLines={3}>{frontLabel}</Text>
          </View>
        ) : (
          <Image source={{ uri: frontUri }} style={{ width, height, borderRadius: radius.md }} onError={() => setFrontFailed(true)} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
    overflow: "hidden",
  },
  /* Naipe de repuesto cuando la imagen no llega: índigo del mazo + borde
     dorado tenue — colores fijos del dorso (no del tema) para que ambas
     caras sigan siendo "el mismo naipe" en cualquier tema. */
  fallback: {
    backgroundColor: "#12142e",
    borderWidth: 1,
    borderColor: "rgba(231, 201, 134, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  fallbackGlyph: { color: "#e7c986", fontSize: 26, marginBottom: 6 },
  fallbackName: {
    color: "#e7c986",
    fontFamily: fonts.serif,
    fontSize: 15,
    textAlign: "center",
  },
});
