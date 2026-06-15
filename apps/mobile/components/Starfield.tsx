import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { colors } from "../theme/tokens";

/**
 * Cielo estrellado sutil, equivalente nativo del <Starfield/> de la web.
 * Estrellas deterministas (PRNG con semilla) para que no "salten" entre renders,
 * con un twinkle lento y suave. Es atmósfera: nunca debe robar atención.
 */
type Star = { x: number; y: number; r: number; o: number };

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield({ count = 48, height }: { count?: number; height?: number }) {
  const dims = useWindowDimensions();
  const w = dims.width;
  const h = height ?? dims.height;
  const twinkle = useRef(new Animated.Value(0)).current;

  const stars = useMemo<Star[]>(() => {
    const rand = mulberry32(0x5eed);
    return Array.from({ length: count }, () => ({
      x: rand() * w,
      y: rand() * h,
      r: rand() * 1.4 + 0.4,
      o: rand() * 0.5 + 0.18,
    }));
  }, [count, w, h]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle]);

  const dim = twinkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      {stars.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: s.r,
            backgroundColor: colors.text,
            opacity: i % 3 === 0 ? Animated.multiply(dim, s.o) : s.o,
          }}
        />
      ))}
    </View>
  );
}
