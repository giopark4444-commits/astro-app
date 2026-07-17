import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet } from "react-native";
import { radius } from "../theme/tokens";

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
        <Image source={{ uri: backUri }} style={{ width, height, borderRadius: radius.md }} />
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
        <Image source={{ uri: frontUri }} style={{ width, height, borderRadius: radius.md }} />
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
});
