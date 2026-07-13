// apps/mobile/components/use-ceremony.ts
// Hook R5: fases de la ceremonia de dibujo de la rueda — 3 `Animated.Value`
// (structure/signs/bodies), leídos de `WHEEL_CEREMONY` en @aluna/core (la
// MISMA coreografía — delayMs/durationMs por fase — que anima la web con
// CSS). Móvil toca conservador: un fundido de opacidad por GRUPO, no por
// elemento (sin stagger) — ver nota de useNativeDriver más abajo. Espeja el
// idioma de reduced-motion de `FadeIn` en ui.tsx (mismo archivo, ya lo hace).
//
// DOWNGRADE (si Android hace jank, validado por Gio en Expo Go): colapsar a
// UN solo Animated.Value para la rueda entera (whole-wheel fade) — cambio
// de ~10 min contenido enteramente acá: reemplazar los 3 Animated.timing
// por uno solo (p.ej. los timings de la fase "structure") y devolver el
// mismo valor en las 3 claves, o cambiar la firma a un solo valor y que
// ChartWheel envuelva el `<Svg>` completo en un único AnimatedG.
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import { WHEEL_CEREMONY, type WheelCeremonyPhaseKey } from "@aluna/core";

const phase = (key: WheelCeremonyPhaseKey) => WHEEL_CEREMONY.find((p) => p.key === key)!;

export interface CeremonyValues {
  structure: Animated.Value;
  signs: Animated.Value;
  bodies: Animated.Value;
}

/**
 * Devuelve los 3 `Animated.Value` (0→1) de la ceremonia. Con `animated` en
 * true y sin reducir-movimiento: `Animated.parallel` de 3 `Animated.timing`
 * (una por fase), cada una con el `delayMs`/`durationMs` de su fase en
 * `WHEEL_CEREMONY` y `Easing.out(Easing.cubic)`. Con `animated` en false, O
 * el sistema tiene reducir-movimiento activo, O la consulta de accesibilidad
 * rechaza (`.catch`): los 3 valores saltan a 1 (visible) sin animar — el
 * valor inicial del ref ya arranca en 1 cuando `animated` es false, así que
 * no hay ni un frame de contenido invisible (render idéntico al estático
 * de siempre).
 */
export function useCeremony(animated: boolean): CeremonyValues {
  const structure = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const signs = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const bodies = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    let alive = true;

    const showInstantly = () => {
      structure.setValue(1);
      signs.setValue(1);
      bodies.setValue(1);
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
        const timingFor = (value: Animated.Value, key: WheelCeremonyPhaseKey) => {
          const p = phase(key);
          return Animated.timing(value, {
            toValue: 1,
            delay: p.delayMs,
            duration: p.durationMs,
            easing: Easing.out(Easing.cubic),
            // react-native-svg: los elementos <G>/opacity NO participan del
            // native driver estándar de RN — sus props no están en la lista
            // de estilos que el módulo nativo de animación intercepta (a
            // diferencia de opacity/transform en <View> normales). Confirmado
            // contra los docs v56 (apuntan al repo de software-mansion) +
            // issues abiertos ahí (p.ej. #1195 "Animating SVG's using
            // useNativeDriver: true"): con useNativeDriver:true la animación
            // de opacity en <G> no corre, o se detiene en cada re-render.
            // useNativeDriver:false es la opción correcta acá — el costo se
            // mitiga por diseño: SOLO 3 grupos animan (no por-elemento), así
            // que son 3 actualizaciones de prop por frame en el hilo JS
            // durante ~1.5s, no decenas.
            useNativeDriver: false,
          });
        };
        Animated.parallel([
          timingFor(structure, "structure"),
          timingFor(signs, "signs"),
          timingFor(bodies, "bodies"),
        ]).start();
      })
      .catch(() => {
        // Si el módulo nativo falta, la promesa rechaza — el contenido JAMÁS debe quedar invisible.
        if (alive) showInstantly();
      });

    return () => {
      alive = false;
    };
  }, [animated, structure, signs, bodies]);

  return { structure, signs, bodies };
}
