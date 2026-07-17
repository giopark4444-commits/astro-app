// apps/mobile/components/use-ceremony.ts
// Hook R5: coreografía COMPLETA de la ceremonia de dibujo de la rueda, leída
// de `WHEEL_CEREMONY`/`WHEEL_CEREMONY_ASPECTS` en @aluna/core (la MISMA
// coreografía — delayMs/durationMs/staggerMs por fase — que anima la web con
// CSS). A diferencia de la versión anterior (3 fundidos por GRUPO, sin
// stagger), esto anima POR ELEMENTO: cada signo y cada cuerpo tiene su propio
// `Animated.Value` con delay escalonado (fase.delayMs + i*fase.staggerMs),
// igual que `animation-delay: calc(var(--x-delay) + var(--i) * var(--x-stagger))`
// en carta.module.css. Espeja el idioma de reduced-motion de `FadeIn` en
// ui.tsx (mismo archivo, ya lo hace).
//
// DOWNGRADE (si Android hace jank, validado por Gio en Expo Go): colapsar a
// UN solo Animated.Value para la rueda entera (whole-wheel fade) — cambio
// contenido enteramente acá: reemplazar todos los timings por uno solo
// (p.ej. los timings de la fase "structure") y devolver ese mismo valor en
// todas las claves (structureDraw/structure/cada signs[i]/cada bodies[i]/
// aspects), o cambiar la firma a un solo valor y que ChartWheel envuelva el
// `<Svg>` completo en un único AnimatedG.
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { WHEEL_CEREMONY, WHEEL_CEREMONY_ASPECTS, type WheelCeremonyPhaseKey } from "@aluna/core";

const phase = (key: WheelCeremonyPhaseKey) => WHEEL_CEREMONY.find((p) => p.key === key)!;

export interface CeremonyValues {
  /** Fase structure, dedicado al trazo de los anillos (strokeDashoffset). */
  structureDraw: Animated.Value;
  /** Fase structure, fundido del grupo (líneas divisorias/casas/marcas), como antes. */
  structure: Animated.Value;
  /** Un valor por signo (12): opacity+scale de bloom, delay escalonado. */
  signs: Animated.Value[];
  /** Un valor por cuerpo (bodyCount): ídem, orden estable de chart.bodies. */
  bodies: Animated.Value[];
  /** Fundido de las líneas de aspecto, sincronizado con "bodies" (sin escalonar). */
  aspects: Animated.Value;
}

const mkValues = (n: number, initial: number) =>
  Array.from({ length: n }, () => new Animated.Value(initial));

/**
 * Devuelve la coreografía completa (0→1 cada valor) de la ceremonia. Con
 * `animated` en true y sin reducir-movimiento: un solo `Animated.parallel`
 * con un `Animated.timing` por valor — `structureDraw`/`structure` con el
 * timing de la fase "structure"; cada `signs[i]`/`bodies[i]` con
 * delay = fase.delayMs + i*fase.staggerMs y duración = fase.durationMs;
 * `aspects` con `WHEEL_CEREMONY_ASPECTS`. Con `animated` en false, O el
 * sistema tiene reducir-movimiento activo, O la consulta de accesibilidad
 * rechaza (`.catch`): TODOS los valores saltan a 1 (visible) sin animar — el
 * valor inicial de los refs ya arranca en 1 cuando `animated` es false, así
 * que no hay ni un frame de contenido invisible (render idéntico al estático
 * de siempre).
 *
 * `signCount`/`bodyCount` fijan el TAMAÑO de los arrays en el primer render
 * (useRef) — @aluna/core siempre entrega un set fijo de 14 cuerpos para
 * cualquier tipo de carta (natal/tránsitos/rev. solar/progresiones), así que
 * no hace falta reaccionar a cambios de tamaño entre renders.
 */
export function useCeremony(animated: boolean, signCount = 12, bodyCount = 0): CeremonyValues {
  const initial = animated ? 0 : 1;
  const structureDraw = useRef(new Animated.Value(initial)).current;
  const structure = useRef(new Animated.Value(initial)).current;
  const signs = useRef(mkValues(signCount, initial)).current;
  const bodies = useRef(mkValues(bodyCount, initial)).current;
  const aspects = useRef(new Animated.Value(initial)).current;

  useEffect(() => {
    let alive = true;

    const showInstantly = () => {
      structureDraw.setValue(1);
      structure.setValue(1);
      signs.forEach((v) => v.setValue(1));
      bodies.forEach((v) => v.setValue(1));
      aspects.setValue(1);
    };

    if (!animated) {
      showInstantly();
      return () => {
        alive = false;
      };
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!alive) return;
        if (reduced) {
          // Reducir movimiento: aparece directo, sin animación.
          showInstantly();
          return;
        }

        const easing = Easing.out(Easing.cubic);
        const timing = (value: Animated.Value, delayMs: number, durationMs: number) =>
          Animated.timing(value, {
            toValue: 1,
            delay: delayMs,
            duration: durationMs,
            easing,
            // react-native-svg: los elementos <G>/<Circle>/opacity/strokeDashoffset
            // NO participan del native driver estándar de RN — sus props no están
            // en la lista de estilos que el módulo nativo de animación intercepta
            // (a diferencia de opacity/transform en <View> normales). Confirmado
            // contra los docs v56 (apuntan al repo de software-mansion) + issues
            // abiertos ahí (p.ej. #1195 "Animating SVG's using useNativeDriver:
            // true"): con useNativeDriver:true la animación no corre, o se
            // detiene en cada re-render. useNativeDriver:false es la opción
            // correcta acá para TODOS los valores (structureDraw/structure/
            // signs[]/bodies[]/aspects) — el costo se paga en el hilo JS durante
            // ~1.7s en el primer montaje de la sesión (gate de Task 3), no en
            // cada re-render posterior.
            useNativeDriver: false,
          });

        const structurePhase = phase("structure");
        const signsPhase = phase("signs");
        const bodiesPhase = phase("bodies");

        const animations = [
          timing(structureDraw, structurePhase.delayMs, structurePhase.durationMs),
          timing(structure, structurePhase.delayMs, structurePhase.durationMs),
          ...signs.map((v, i) =>
            timing(v, signsPhase.delayMs + i * signsPhase.staggerMs, signsPhase.durationMs),
          ),
          ...bodies.map((v, i) =>
            timing(v, bodiesPhase.delayMs + i * bodiesPhase.staggerMs, bodiesPhase.durationMs),
          ),
          timing(aspects, WHEEL_CEREMONY_ASPECTS.delayMs, WHEEL_CEREMONY_ASPECTS.durationMs),
        ];

        Animated.parallel(animations).start();
      })
      .catch(() => {
        // Si el módulo nativo falta, la promesa rechaza — el contenido JAMÁS debe quedar invisible.
        if (alive) showInstantly();
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signs/bodies son arrays estables (useRef, tamaño fijo)
  }, [animated, structureDraw, structure, aspects]);

  return { structureDraw, structure, signs, bodies, aspects };
}

/**
 * Interpolación de bloom para el SCALE de un elemento (signo/cuerpo): 0.92→1
 * — 0.92 (no 0.9 como la web) porque a los tamaños típicos de glifo en móvil
 * (viewBox 360, ~13px de fuente) un scale de 0.9 se sentía demasiado
 * perceptible/tembloroso en pruebas de escritorio; 0.92 da el mismo "bloom"
 * con menos desplazamiento de borde. Easing propio (`Easing.out(Easing.back
 * (1.2))`, un overshoot suave tipo resorte) aplicado SOLO acá vía el
 * `easing` de `interpolate` — no en el `Animated.timing` que mueve el valor
 * base 0→1 (ese sigue en `Easing.out(Easing.cubic)`, ver arriba), así el
 * `opacity` (que lee el mismo valor 0→1 directo, sin interpolar) nunca
 * rebasa 1. Refleja `@keyframes wheelBloom` de carta.module.css (ease-spring)
 * sin acoplar la curva de opacity a la de scale.
 */
export function bloomScale(value: Animated.Value) {
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
    easing: Easing.out(Easing.back(1.2)),
  });
}
