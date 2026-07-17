// La ceremonia táctil de tres cartas (Task 4): question → shuffle → cut →
// fan → reveal → reading. Paridad con apps/web/app/(app)/tarot/ceremony.tsx,
// con la máquina extraída PURA a lib/tarot-ceremony-machine.ts (testeada en
// vitest, incluido el abort del hold que la web dejó como deuda).
//
// Se monta como overlay de pantalla completa SOBRE el umbral (el umbral queda
// montado debajo y conserva su estado): la ceremonia es un rito efímero de
// una sola sesión — cerrarla la desmonta y todo vuelve al inicio, igual que
// recargar la página en la web.
//
// Coreografía ("el alma es lenta y suave"): todo con Animated core y
// useNativeDriver:true — acá las cartas son <View>/<Image> (opacity/transform
// sí participan del native driver, a diferencia de react-native-svg en
// use-ceremony.ts:100-113). Reduce-motion: cada paso ofrece su resultado
// inmediato (patrón .catch de use-ceremony.ts:134-137 — si la consulta de
// accesibilidad falla, se asume movimiento normal y nada queda bloqueado).
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAROT_CARDS_ES, TAROT_CARDS_EN, composeReadingProse } from "@aluna/core";
import { TarotFlipCard } from "./TarotFlipCard";
import { ReadingChat } from "./ReadingChat";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { apiUrl } from "../lib/config";
import { gestureRng } from "../lib/tarot-rng";
import {
  CEREMONY_SPREAD,
  DECK_SIZE,
  INITIAL_CEREMONY_STATE,
  SPREAD_ID,
  ceremonyAllFlipped,
  ceremonyReducer,
} from "../lib/tarot-ceremony-machine";
import { TarotApiError, saveTarotReading } from "../lib/tarot-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

const POSITION_KEY: Record<string, string> = {
  past: "tarot.positionPast",
  present: "tarot.positionPresent",
  future: "tarot.positionFuture",
};

// Tamaños de carta por paso (proporción del mazo RWS ~ 1:1.63).
const DECK_W = 132;
const DECK_H = 215;
const PILE_W = 84;
const PILE_H = 137;
const FAN_W = 46;
const FAN_H = 75;
const SLOT_W = 64;
const SLOT_H = 104;
const REVEAL_W = 96;
const REVEAL_H = 156;
const READING_W = 72;
const READING_H = 117;

const GHOSTS = 6;

/**
 * Carta fantasma que orbita el mazo mientras el dedo lo sostiene. Un solo
 * Animated.Value 0→1 en Animated.loop con easing LINEAL — el valor en t=0 y
 * t=1 cae en el mismo punto de la órbita (coseno/seno completan la vuelta),
 * así el reinicio del loop es invisible. La órbita se aproxima con 5 puntos
 * de interpolación (cos/sin evaluados en 0, ¼, ½, ¾, 1 de vuelta): entre
 * puntos Animated interpola linealmente y a esta velocidad (2.6–3.5s por
 * vuelta, "lenta y suave") el polígono no se percibe. Delays desfasados por
 * índice (starter con setTimeout) + duración distinta por fantasma para que
 * nunca sincronicen. Native driver true (solo transform; opacity estática).
 */
function GhostOrbit({ index, uri, tint }: { index: number; uri: string; tint: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const geo = useMemo(() => {
    const phase = (index * Math.PI * 2) / GHOSTS;
    const r = 58 + (index % 3) * 16;
    const steps = [0, 0.25, 0.5, 0.75, 1];
    return {
      input: steps,
      xs: steps.map((s) => Math.cos(phase + s * Math.PI * 2) * r),
      // Órbita elíptica (y aplastada al 55%): alrededor del mazo, no encima.
      ys: steps.map((s) => Math.sin(phase + s * Math.PI * 2) * r * 0.55),
    };
  }, [index]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 2600 + index * 180,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const starter = setTimeout(() => loop.start(), index * 90);
    return () => {
      clearTimeout(starter);
      loop.stop();
    };
  }, [v, index]);

  const translateX = v.interpolate({ inputRange: geo.input, outputRange: geo.xs });
  const translateY = v.interpolate({ inputRange: geo.input, outputRange: geo.ys });
  // Balanceo suave (no vuelta completa: una carta girando en cartwheel no es
  // "lenta y suave"); valores iguales en 0 y 1 → seamless con el loop.
  const rotate = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [`${-7 + index * 2}deg`, `${7 - index * 2}deg`, `${-7 + index * 2}deg`],
  });
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1, 0.92] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        opacity: 0.4 - index * 0.03,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    >
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{
          width: FAN_W,
          height: FAN_H,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: tint,
        }}
      />
    </Animated.View>
  );
}

/** Montón del corte: entra con fundido+subida escalonada (ritual de des-apilar). */
function CutPile({
  index,
  uri,
  reduced,
  label,
  onPress,
  borderColor,
}: {
  index: number;
  uri: string;
  reduced: boolean;
  label: string;
  onPress: () => void;
  borderColor: string;
}) {
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 520,
      delay: index * 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index, reduced]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY }, { rotate: `${(index - 1) * 3}deg` }],
      }}
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID="cut-pile">
        <Image
          source={{ uri }}
      resizeMode="contain"
          style={{
            width: PILE_W,
            height: PILE_H,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor,
          }}
        />
      </Pressable>
    </Animated.View>
  );
}

/** Aparición de una carta en su slot: fundido+subida al montarse. */
function SlotAppear({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, reduced]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}

/**
 * Arco del abanico: RN no tiene transform-origin, así que el arco se aproxima
 * con rotate (origen centro) + translateY calculados por índice — la carta
 * central queda recta y alta, las de los bordes se inclinan hasta ±9° y bajan
 * hasta 20px (curva cuadrática: el descenso se acelera hacia los extremos,
 * que es como se ve un abanico real sostenido desde abajo).
 */
function fanTransform(i: number): { rotate: string; translateY: number } {
  const center = (DECK_SIZE - 1) / 2;
  const d = (i - center) / center; // -1..1
  return { rotate: `${(d * 9).toFixed(2)}deg`, translateY: d * d * 20 };
}

export function TarotCeremony({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const accessToken = session?.access_token ?? null;
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const rwsBase = `${apiUrl()}/tarot/rws`;
  const backUri = `${rwsBase}/back.webp`;

  const [state, dispatch] = useReducer(ceremonyReducer, INITIAL_CEREMONY_STATE);
  const [questionDraft, setQuestionDraft] = useState("");

  // Reduce-motion: se consulta una vez al montar (la ceremonia es corta y
  // cambiarlo a mitad del rito no amerita re-suscripción — mismo trade-off
  // que la web, ceremony.tsx:97-103). El .catch deja false: nunca bloquea.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReducedMotion(v);
      })
      .catch(() => {
        /* módulo nativo ausente: se asume movimiento normal */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Escala del mazo mientras se sostiene: la única respuesta visual además de
  // los fantasmas — el mazo "respira" hacia adentro bajo el dedo.
  const deckScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(deckScale, {
      toValue: state.holding ? 0.96 : 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [state.holding, deckScale]);

  /** Sella el orden: la semilla mezcla entropía con el instante exacto del gesto. */
  function sealTimestamp() {
    return Date.now() + performance.now();
  }

  // fan → reveal: cuando la última elegida terminó de aparecer en su slot.
  // Con reduce-motion el paso es inmediato; si no, se le da aire (900ms, como
  // la web). El guard del reducer (fanDone exige fan + 3 elegidas) protege de
  // timers tardíos.
  const fanComplete = state.step === "fan" && state.picked.length === CEREMONY_SPREAD.cardCount;
  useEffect(() => {
    if (!fanComplete) return;
    if (reducedMotion) {
      dispatch({ type: "fanDone" });
      return;
    }
    const id = setTimeout(() => dispatch({ type: "fanDone" }), 900);
    return () => clearTimeout(id);
  }, [fanComplete, reducedMotion]);

  const readingCards = useMemo(
    () =>
      state.drawn.map((d, i) => ({
        cardId: d.card.id,
        reversed: d.reversed,
        position: CEREMONY_SPREAD.positions[i]!.key,
      })),
    [state.drawn],
  );

  const prose = useMemo(
    () =>
      state.step === "reading"
        ? composeReadingProse(locale === "en" ? "en" : "es", SPREAD_ID, readingCards, state.question)
        : [],
    [state.step, locale, readingCards, state.question],
  );

  function saveReading() {
    if (!accessToken || state.save === "saving" || state.save === "saved") return;
    dispatch({ type: "save", status: "saving" });
    saveTarotReading(accessToken, {
      spread: SPREAD_ID,
      deck: "rws",
      ...(state.question !== undefined ? { question: state.question } : {}),
      cards: readingCards,
    })
      .then(() => {
        dispatch({ type: "save", status: "saved" });
        onSaved(); // el diario del umbral (montado debajo) se refresca ya
      })
      .catch((e) => {
        // Mismo criterio que la web (ceremony.tsx): el 403 free_limit se
        // distingue por el body (.code), no por asumir que todo 403 lo es.
        const status = e instanceof TarotApiError && e.code === "free_limit" ? "free_limit" : "error";
        dispatch({ type: "save", status });
      });
  }

  const allFlipped = ceremonyAllFlipped(state);

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]} testID="tarot-ceremony">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={styles.closeBtnText}>← {t("tarot.backToThreshold")}</Text>
        </Pressable>

        {state.step === "question" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.questionTitle")}
            </Text>
            <TextInput
              style={styles.questionInput}
              placeholder={t("tarot.questionPlaceholder")}
              placeholderTextColor={tk.textFaint}
              maxLength={280}
              value={questionDraft}
              onChangeText={setQuestionDraft}
              onSubmitEditing={() => {
                const q = questionDraft.trim();
                dispatch({ type: "ask", ...(q ? { question: q } : {}) });
              }}
              returnKeyType="done"
            />
            <View style={styles.stepActions}>
              <Pressable style={styles.ghostBtn} onPress={() => dispatch({ type: "ask" })}>
                <Text style={styles.ghostBtnText}>{t("tarot.silent")}</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  const q = questionDraft.trim();
                  dispatch({ type: "ask", ...(q ? { question: q } : {}) });
                }}
              >
                <Text style={styles.primaryBtnText}>{t("tarot.continue")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {state.step === "shuffle" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.shuffleTitle")}
            </Text>
            {!reducedMotion && (
              <>
                <View style={styles.shuffleStage}>
                  {/* Fantasmas: solo danzan mientras el dedo sostiene el mazo. */}
                  {state.holding &&
                    Array.from({ length: GHOSTS }, (_, g) => (
                      <GhostOrbit key={g} index={g} uri={backUri} tint={tk.accHair} />
                    ))}
                  {/* Gesture responder directo (no Pressable): Pressable no
                      distingue soltar de cancelar — su onPressOut dispara en
                      AMBOS casos (Pressability deactiva igual en RELEASE y
                      TERMINATED) y no expone onPressCancel. El responder sí:
                      onResponderRelease = soltar a voluntad → SELLA con el
                      timestamp del gesto; onResponderTerminate = el sistema
                      robó el touch (scroll, llamada) → ABORT sin sellar
                      (guard testeado en tarot-ceremony-machine). RN-web
                      implementa el mismo responder, así que el press-hold con
                      mouse funciona en Expo web. */}
                  <Animated.View
                    testID="shuffle-deck"
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={t("tarot.shuffleHold")}
                    style={{ transform: [{ scale: deckScale }] }}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={() => dispatch({ type: "holdStart" })}
                    onResponderRelease={() =>
                      dispatch({ type: "holdRelease", rng: gestureRng(sealTimestamp()) })
                    }
                    onResponderTerminate={() => dispatch({ type: "holdAbort" })}
                  >
                    <Image source={{ uri: backUri }} resizeMode="contain" style={styles.deckImg} />
                  </Animated.View>
                </View>
                <Text style={styles.stepHint}>{t("tarot.shuffleHint")}</Text>
              </>
            )}
            <Pressable
              style={styles.ghostBtn}
              onPress={() => dispatch({ type: "shuffleForMe", rng: gestureRng(sealTimestamp()) })}
            >
              <Text style={styles.ghostBtnText}>{t("tarot.shuffleForMe")}</Text>
            </Pressable>
          </View>
        )}

        {state.step === "cut" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.cutTitle")}
            </Text>
            <View style={styles.cutRow}>
              {[0, 1, 2].map((p) => (
                <CutPile
                  key={p}
                  index={p}
                  uri={backUri}
                  reduced={reducedMotion}
                  label={t("tarot.cutPileLabel", { n: p + 1 })}
                  onPress={() => dispatch({ type: "cut" })}
                  borderColor={tk.accHair}
                />
              ))}
            </View>
            <Text style={styles.stepHint}>{t("tarot.cutHint")}</Text>
          </View>
        )}

        {state.step === "fan" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.fanTitle")}
            </Text>
            <Text style={styles.stepHint}>{t("tarot.fanHint")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fanScroll}
              contentContainerStyle={styles.fanArc}
            >
              {Array.from({ length: DECK_SIZE }, (_, i) => {
                const picked = state.picked.includes(i);
                const geo = fanTransform(i);
                return (
                  <Pressable
                    key={i}
                    testID="fan-card"
                    accessibilityRole="button"
                    accessibilityLabel={t("tarot.fanCardLabel", { n: i + 1 })}
                    accessibilityState={{ selected: picked }}
                    onPress={() => dispatch({ type: "pick", fanIndex: i })}
                    style={[
                      styles.fanCard,
                      i > 0 && styles.fanCardOverlap,
                      {
                        transform: [
                          { translateY: geo.translateY + (picked ? -14 : 0) },
                          { rotate: geo.rotate },
                        ],
                      },
                      picked && styles.fanCardPicked,
                    ]}
                  >
                    <Image
                      source={{ uri: backUri }}
                      resizeMode="contain"
                      style={[styles.fanImg, picked && styles.fanImgPicked]}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.fanCount}>
              {t("tarot.fanCount", { n: state.picked.length, total: CEREMONY_SPREAD.cardCount })}
            </Text>
            <View style={styles.slotRow}>
              {CEREMONY_SPREAD.positions.map((pos, i) => (
                <View key={pos.key} style={styles.slot}>
                  <View style={[styles.slotBox, i < state.picked.length && styles.slotBoxFilled]}>
                    {i < state.picked.length && (
                      <SlotAppear reduced={reducedMotion}>
                        <Image source={{ uri: backUri }} resizeMode="contain" style={styles.slotImg} />
                      </SlotAppear>
                    )}
                  </View>
                  <Text style={styles.slotLabel}>{t(POSITION_KEY[pos.key] ?? "tarot.positionPast")}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {state.step === "reveal" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.revealTitle")}
            </Text>
            <Text style={styles.stepHint}>{t("tarot.revealHint")}</Text>
            <View style={styles.revealRow}>
              {state.drawn.map((d, i) => {
                const content = cardsDict[d.card.id]!;
                const flipped = state.flipped[i]!;
                return (
                  <View key={d.card.id} style={styles.slot}>
                    {/* Flip 3D: TarotFlipCard reusado del umbral (Task 3) —
                        mismo rotateY interpolado, invertida = rotate 180 en la
                        cara frontal, reduce-motion resuelto adentro. */}
                    <TarotFlipCard
                      revealed={flipped}
                      onFlip={() => dispatch({ type: "flip", slot: i })}
                      frontUri={`${rwsBase}/${d.card.id}.webp`}
                      backUri={backUri}
                      reversed={d.reversed}
                      frontLabel={content.name}
                      backLabel={t("tarot.revealHint")}
                      width={REVEAL_W}
                      height={REVEAL_H}
                    />
                    <Text style={styles.slotLabel}>
                      {t(POSITION_KEY[CEREMONY_SPREAD.positions[i]!.key] ?? "tarot.positionPast")}
                    </Text>
                    {flipped && (
                      <View style={styles.revealBody}>
                        <Text style={styles.revealName} maxFontSizeMultiplier={1.2}>
                          {content.name}
                        </Text>
                        {d.reversed && (
                          <View style={styles.reversedTag}>
                            <Text style={styles.reversedTagText}>{t("tarot.reversed")}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            {allFlipped && (
              <Pressable style={styles.primaryBtn} onPress={() => dispatch({ type: "read" })}>
                <Text style={styles.primaryBtnText}>{t("tarot.read")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {state.step === "reading" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.readingTitle")}
            </Text>
            {state.question && (
              <Text style={styles.readingQuestion}>
                {t("tarot.yourQuestion")}: {state.question}
              </Text>
            )}
            <View style={styles.readingCards}>
              {state.drawn.map((d, i) => {
                const content = cardsDict[d.card.id]!;
                const ambit = d.reversed ? content.reversed.path : content.upright.path;
                return (
                  <View key={d.card.id} style={styles.readingCard}>
                    <Image
                      source={{ uri: `${rwsBase}/${d.card.id}.webp` }}
                      resizeMode="contain"
                      style={[
                        styles.readingImg,
                        d.reversed && { transform: [{ rotate: "180deg" }] },
                      ]}
                    />
                    <View style={styles.readingCardBody}>
                      <Text style={styles.readingPosition}>
                        {t(POSITION_KEY[CEREMONY_SPREAD.positions[i]!.key] ?? "tarot.positionPast")}
                      </Text>
                      <Text style={styles.readingName} maxFontSizeMultiplier={1.2}>
                        {content.name}
                        {d.reversed ? ` · ${t("tarot.reversed")}` : ""}
                      </Text>
                      <Text style={styles.readingAmbit}>{ambit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.readingProse}>
              {prose.map((p, i) => (
                <Text key={i} style={styles.proseParagraph}>
                  {p}
                </Text>
              ))}
            </View>

            {/* Chat inline "Conversa esta tirada" (T3): montado al final de
                CADA lectura, digital y manual — mismo componente en ambas. */}
            <ReadingChat
              spreadId={SPREAD_ID}
              cards={readingCards}
              {...(state.question ? { question: state.question } : {})}
            />

            {state.save === "free_limit" ? (
              // Nota suave, sin modal: el límite free no interrumpe el rito
              // (la CTA a Plus vive en la web; el móvil no tiene esa pantalla).
              <Text style={styles.freeLimitNote}>{t("tarot.freeLimit")}</Text>
            ) : state.save === "saved" ? (
              <Text style={styles.savedOk}>{t("tarot.saved")}</Text>
            ) : (
              <>
                {state.save === "error" && <Text style={styles.saveError}>{t("tarot.saveError")}</Text>}
                <Pressable
                  style={[styles.primaryBtn, state.save === "saving" && styles.btnDisabled]}
                  onPress={saveReading}
                  disabled={state.save === "saving"}
                >
                  <Text style={styles.primaryBtnText}>{t("tarot.save")}</Text>
                </Pressable>
              </>
            )}
            <Pressable style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>{t("tarot.backToThreshold")}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.bg,
      zIndex: 20,
    },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    closeBtn: { alignSelf: "flex-start", paddingVertical: space.sm, marginBottom: space.md },
    closeBtnText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },

    stepPane: { width: "100%", alignItems: "center", gap: space.lg },
    stepTitle: {
      color: t.text,
      fontSize: typeScale.xl2,
      fontFamily: fonts.serifSemi,
      textAlign: "center",
    },
    stepHint: {
      color: t.textDim,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      textAlign: "center",
    },

    questionInput: {
      width: "100%",
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      color: t.text,
      fontSize: typeScale.md,
      fontFamily: fonts.sans,
      backgroundColor: t.bgDeep,
    },
    stepActions: { flexDirection: "row", gap: space.md, alignItems: "center" },

    primaryBtn: {
      borderRadius: radius.pill,
      paddingHorizontal: space.xl,
      paddingVertical: space.md,
      backgroundColor: t.accText,
    },
    primaryBtnText: { color: t.bg, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    btnDisabled: { opacity: 0.6 },
    ghostBtn: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    ghostBtnText: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },

    shuffleStage: {
      width: "100%",
      height: DECK_H + space.xxl * 2,
      alignItems: "center",
      justifyContent: "center",
    },
    deckImg: {
      width: DECK_W,
      height: DECK_H,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.accHair,
    },

    cutRow: {
      flexDirection: "row",
      gap: space.md,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: space.lg,
    },

    fanScroll: { width: "100%", flexGrow: 0 },
    fanArc: {
      paddingHorizontal: space.xl,
      paddingTop: space.lg,
      paddingBottom: space.xl + 20, // aire para el descenso del arco (translateY máx 20)
      alignItems: "flex-start",
    },
    fanCard: { width: FAN_W, height: FAN_H },
    fanCardOverlap: { marginLeft: -(FAN_W - 18) }, // solapadas: 18px visibles por carta
    fanCardPicked: { zIndex: 2 },
    fanImg: {
      width: FAN_W,
      height: FAN_H,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: t.accHair,
    },
    fanImgPicked: { opacity: 0.35, borderColor: t.accText },
    fanCount: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },

    slotRow: {
      flexDirection: "row",
      gap: space.lg,
      justifyContent: "center",
      width: "100%",
    },
    slot: { alignItems: "center", gap: space.sm },
    slotBox: {
      width: SLOT_W,
      height: SLOT_H,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: t.accHair,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    slotBoxFilled: { borderStyle: "solid" },
    slotImg: { width: SLOT_W - 8, height: SLOT_H - 8, borderRadius: radius.sm - 2 },
    slotLabel: {
      color: t.textDim,
      fontSize: typeScale.xs,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },

    revealRow: {
      flexDirection: "row",
      flexWrap: "wrap", // pantallas angostas (<340): la 3ª carta baja de fila
      gap: space.md,
      justifyContent: "center",
      alignItems: "flex-start",
      width: "100%",
    },
    revealBody: { alignItems: "center", gap: space.xs, maxWidth: REVEAL_W + space.md },
    revealName: {
      color: t.text,
      fontSize: typeScale.sm,
      fontFamily: fonts.serifSemi,
      textAlign: "center",
    },
    reversedTag: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: 2,
    },
    reversedTagText: {
      color: t.warn,
      fontSize: typeScale.xs2,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
    },

    readingQuestion: {
      color: t.textDim,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      textAlign: "center",
    },
    readingCards: { width: "100%", gap: space.md },
    readingCard: {
      flexDirection: "row",
      gap: space.lg,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      padding: space.lg,
      backgroundColor: t.bgDeep,
    },
    readingImg: { width: READING_W, height: READING_H, borderRadius: radius.sm },
    readingCardBody: { flex: 1, gap: space.xs, justifyContent: "center" },
    readingPosition: {
      color: t.accText,
      fontSize: typeScale.xs,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontFamily: fonts.sansSemi,
    },
    readingName: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi },
    readingAmbit: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, lineHeight: 20 },
    readingProse: { width: "100%" },
    proseParagraph: {
      color: t.text,
      fontSize: typeScale.sm,
      lineHeight: 21,
      marginBottom: space.md,
      fontFamily: fonts.sans,
    },

    freeLimitNote: {
      color: t.textDim,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      textAlign: "center",
    },
    savedOk: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    saveError: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },
  });
}
