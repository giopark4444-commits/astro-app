// Umbral de tarot (T3, sexta tab): carta del día con flip + tiradas + diario.
// Paridad conceptual con apps/web/app/(app)/tarot/tarot-view.tsx — misma lógica
// "servidor-como-verdad" (portada pura a lib/tarot-daily.ts y testeada ahí),
// mismas claves de storage/strings, misma composición de prosa
// (composeReadingProse de @aluna/core). La ceremonia de "Tres cartas" es un
// placeholder (Task 4 la reemplaza por la máquina táctil completa).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  dailyCard,
  cardById,
  TAROT_CARDS_ES,
  TAROT_CARDS_EN,
  composeReadingProse,
  cardImageUrl,
  cardBackUrl,
} from "@aluna/core";
import { Enso } from "../../components/Enso";
import { BottomSheet } from "../../components/BottomSheet";
import { TarotFlipCard } from "../../components/TarotFlipCard";
import { TarotCeremony } from "../../components/tarot-ceremony";
import { TarotManualEntry } from "../../components/tarot-manual-entry";
import { Card, Chip, FadeIn, SoonBadge } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { useDeckAssets } from "../../lib/use-deck-assets";
import { getRaw, setRaw } from "../../lib/storage";
import {
  dailyRevealedKey,
  dailySavedKey,
  localDateKey,
  resolveDailyState,
} from "../../lib/tarot-daily";
import { fetchTarotDiary, saveTarotReading, type TarotReadingRow } from "../../lib/tarot-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

const DIARY_SPREAD_KEY: Record<string, string> = {
  daily: "tarot.diarySpreadDaily",
  three: "tarot.diarySpreadThree",
  "celtic-cross": "tarot.diarySpreadCeltic",
  free: "tarot.diarySpreadFree",
};

type DiaryState =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; readings: TarotReadingRow[]; total: number };

export default function TarotScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;
  const deckCtx = useDeckAssets(accessToken);

  // tz/localDate calculados al montar — mismo trade-off documentado que la
  // web (tarot-view.tsx:63-67): quedan stale si la pantalla sigue abierta
  // cruzando la medianoche, limitación aceptada a propósito.
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);
  const localDate = useMemo(() => localDateKey(tz), [tz]);

  const daily = useMemo(
    () => (userId ? dailyCard(userId, localDate, { reversals: true }) : null),
    [userId, localDate],
  );
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const dailyContent = daily ? cardsDict[daily.card.id] : undefined;

  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dailySheetOpen, setDailySheetOpen] = useState(false);
  // Ceremonia "Tres cartas" (Task 4): overlay efímero — cerrarlo lo desmonta
  // y la máquina vuelve a cero, como recargar la página en la web.
  const [ceremonyOpen, setCeremonyOpen] = useState(false);
  // Modo manual (T3): mismo criterio de overlay efímero que la ceremonia —
  // cerrarlo lo desmonta y todo vuelve a cero.
  const [manualOpen, setManualOpen] = useState(false);

  const [diary, setDiary] = useState<DiaryState>({ s: "loading" });
  const [openReadingId, setOpenReadingId] = useState<string | null>(null);

  const aliveRef = useRef(true);
  const postedDailyRef = useRef(false);

  const loadDiary = useCallback(() => {
    if (!accessToken) return;
    setDiary({ s: "loading" });
    fetchTarotDiary(accessToken)
      .then((data) => {
        if (!aliveRef.current) return;
        setDiary({ s: "ready", readings: data.readings, total: data.total });
        // Servidor-como-verdad (lib/tarot-daily.ts, portado de tarot-view.tsx):
        // si el diario ya trae el daily de hoy, gana sobre el storage local —
        // marca revelada+guardada y evita un POST duplicado.
        const state = resolveDailyState({
          diario: data.readings,
          storageFlags: { revealed: false, saved: false },
          localDate,
          tz,
        });
        if (state.revealed) {
          setRevealed(true);
          setSaved(true);
          postedDailyRef.current = true;
          if (userId) {
            void setRaw(dailyRevealedKey(userId, localDate), "1");
            void setRaw(dailySavedKey(userId, localDate), "1");
          }
        }
      })
      .catch(() => {
        if (aliveRef.current) setDiary({ s: "error" });
      });
  }, [accessToken, localDate, tz, userId]);

  useEffect(() => {
    aliveRef.current = true;
    loadDiary();
    return () => {
      aliveRef.current = false;
    };
  }, [loadDiary]);

  const postDaily = useCallback(() => {
    // Guarda el daily en el servidor; `saved` solo se marca en éxito — un
    // fallo deja la puerta abierta al reintento del próximo montaje (revelada
    // sin savedKey). Catch silencioso a propósito: el diario es un hábito, no
    // un bloqueo del rito (mismo criterio que tarot-view.tsx:140-168).
    if (postedDailyRef.current || !accessToken || !daily || !userId) return;
    postedDailyRef.current = true;
    saveTarotReading(accessToken, {
      spread: "daily",
      deck: deckCtx.activeDeck,
      cards: [{ cardId: daily.card.id, reversed: daily.reversed, position: "day" }],
    })
      .then(() => {
        setSaved(true);
        void setRaw(dailySavedKey(userId, localDate), "1");
        loadDiary();
      })
      .catch(() => {
        postedDailyRef.current = false;
      });
  }, [accessToken, daily, userId, localDate, loadDiary, deckCtx]);

  // Storage local al montar: si ya estaba revelada visualmente pero el diario
  // (arriba) no la encontró en el servidor, respeta esa revelación y, si
  // nunca se confirmó el guardado, reintenta una vez.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const [revealedRaw, savedRaw] = await Promise.all([
        getRaw(dailyRevealedKey(userId, localDate)),
        getRaw(dailySavedKey(userId, localDate)),
      ]);
      if (!alive) return;
      const state = resolveDailyState({
        diario: [],
        storageFlags: { revealed: revealedRaw === "1", saved: savedRaw === "1" },
        localDate,
        tz,
      });
      if (state.revealed) {
        setRevealed(true);
        setSaved(state.saved);
        if (state.needsRetry) postDaily();
      }
    })();
    return () => {
      alive = false;
    };
    // postDaily se omite a propósito: solo debe dispararse una vez al montar
    // (postedDailyRef ya protege el doble POST si sí cambiara).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, localDate, tz]);

  function handleFlip() {
    if (revealed || !userId || !daily) return;
    setRevealed(true);
    void setRaw(dailyRevealedKey(userId, localDate), "1");
    postDaily();
  }

  const dailyProse = useMemo(() => {
    if (!daily) return [];
    return composeReadingProse(locale === "en" ? "en" : "es", "daily", [
      { cardId: daily.card.id, reversed: daily.reversed, position: "day" },
    ]);
  }, [daily, locale]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  const openReading = diary.s === "ready" ? diary.readings.find((r) => r.id === openReadingId) ?? null : null;
  // Las lecturas guardadas (T3) pueden traer jumpers mezclados en `cards`
  // (position "jumper-N", flag jumper:true) — el composer v2 espera la
  // tirada principal en `cards` y los jumpers aparte en `opts.jumpers`
  // (sin eso, labelForPosition no reconoce "jumper-N" y los muestra crudos).
  // Espejo de apps/web/app/(app)/tarot/tarot-view.tsx:205-228.
  const openReadingMainCards = useMemo(
    () => (openReading ? openReading.cards.filter((c) => !c.jumper) : []),
    [openReading],
  );
  const openReadingJumperCards = useMemo(
    () => (openReading ? openReading.cards.filter((c) => c.jumper) : []),
    [openReading],
  );
  const openReadingProse = useMemo(() => {
    if (!openReading) return [];
    return composeReadingProse(
      locale === "en" ? "en" : "es",
      openReading.spread,
      openReadingMainCards,
      openReading.question ?? undefined,
      openReadingJumperCards.length > 0
        ? { jumpers: openReadingJumperCards.map(({ cardId, reversed }) => ({ cardId, reversed })) }
        : undefined,
    );
  }, [openReading, locale, openReadingMainCards, openReadingJumperCards]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("tarot.eyebrow")}</Text>
          <Text style={styles.h1} maxFontSizeMultiplier={1.2}>
            {t("tarot.title")}
          </Text>
        </View>

        {/* Carta del día */}
        <FadeIn delay={0} style={styles.fadeFull}>
          <Text style={styles.sectionTitle}>{t("tarot.dailyTitle")}</Text>
          <View style={styles.flipScene}>
            {daily && dailyContent ? (
              <TarotFlipCard
                revealed={revealed}
                onFlip={handleFlip}
                frontUri={cardImageUrl(daily.card.id, deckCtx)}
                backUri={cardBackUrl(deckCtx)}
                reversed={daily.reversed}
                frontLabel={dailyContent.name}
                backLabel={t("tarot.dailyFlipCta")}
              />
            ) : (
              <Enso size={48} />
            )}

            {revealed && dailyContent && (
              <View style={styles.dailyRevealBody}>
                <Text style={styles.dailyName}>{dailyContent.name}</Text>
                {daily?.reversed && (
                  <View style={styles.reversedTag}>
                    <Text style={styles.reversedTagText}>{t("tarot.reversed")}</Text>
                  </View>
                )}
                <View style={styles.dailyKeywords}>
                  {dailyContent.keywords.map((kw) => (
                    <Chip key={kw} kind="tag" label={kw} />
                  ))}
                </View>
                <Text style={styles.dailyEssence}>{dailyContent.essence}</Text>
                <Pressable style={styles.dailyRevealBtn} onPress={() => setDailySheetOpen(true)}>
                  <Text style={styles.dailyRevealBtnText}>{t("tarot.seeFullReading")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </FadeIn>

        {/* Tiradas */}
        <FadeIn delay={60} style={styles.fadeFull}>
          <Text style={styles.sectionTitle}>{t("tarot.spreadsTitle")}</Text>
          <View style={styles.spreadsGrid}>
            <Pressable
              testID="tarot-spread-three"
              style={styles.spreadCard}
              onPress={() => setCeremonyOpen(true)}
            >
              <Card style={styles.spreadCardInner}>
                <Text style={styles.spreadName}>{t("tarot.spreadThree")}</Text>
                <Text style={styles.spreadDesc}>{t("tarot.spreadThreeDesc")}</Text>
              </Card>
            </Pressable>
            <View style={styles.spreadCard}>
              <Card style={[styles.spreadCardInner, styles.spreadDisabled]}>
                <Text style={styles.spreadName}>{t("tarot.spreadCeltic")}</Text>
                <SoonBadge label={t("tarot.soonPlus")} />
              </Card>
            </View>
          </View>

          {/* Modo manual (T3): mazo físico — la persona baraja y elige ella
              misma, en vez de la ceremonia táctil digital. */}
          <Pressable testID="tarot-manual-entry-cta" onPress={() => setManualOpen(true)}>
            <Card style={styles.manualCard}>
              <Text style={styles.spreadName}>{t("tarot.manualEntry")}</Text>
              <Text style={styles.spreadDesc}>{t("tarot.manualEntryDesc")}</Text>
            </Card>
          </Pressable>
        </FadeIn>

        {/* Diario */}
        <FadeIn delay={100} style={styles.fadeFull}>
          <Text style={styles.sectionTitle}>{t("tarot.diaryTitle")}</Text>
          {diary.s === "loading" ? (
            <Card style={styles.diaryStateCard}>
              <Text style={styles.muted}>{t("tarot.diaryLoading")}</Text>
            </Card>
          ) : diary.s === "error" ? (
            <Card style={styles.diaryStateCard}>
              <Text style={styles.muted}>{t("tarot.diaryError")}</Text>
              <Pressable style={styles.dailyRevealBtn} onPress={loadDiary}>
                <Text style={styles.dailyRevealBtnText}>{t("tarot.retry")}</Text>
              </Pressable>
            </Card>
          ) : diary.readings.length === 0 ? (
            <Card style={styles.diaryStateCard}>
              <Text style={styles.muted}>{t("tarot.diaryEmpty")}</Text>
            </Card>
          ) : (
            <>
              <View style={styles.diaryList}>
                {diary.readings.map((r) => (
                  <Pressable key={r.id} onPress={() => setOpenReadingId(r.id)}>
                    <Card style={styles.diaryItem}>
                      <Text style={styles.diarySpread}>
                        {t(DIARY_SPREAD_KEY[r.spread] ?? "tarot.diarySpreadDaily")}
                      </Text>
                      <Text style={styles.diaryDate}>{dateFmt.format(new Date(r.created_at))}</Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
              {diary.total > diary.readings.length && (
                <Text style={styles.freeLimitNote}>
                  {t("tarot.freeLimitNote", { count: diary.readings.length, total: diary.total })}
                </Text>
              )}
            </>
          )}
        </FadeIn>
      </ScrollView>

      {/* Ceremonia "Tres cartas" (Task 4): overlay de pantalla completa sobre
          el umbral — el umbral queda montado debajo (conserva revealed/diario)
          y al guardar la lectura loadDiary refresca el diario de fondo. */}
      {ceremonyOpen && (
        <TarotCeremony deckCtx={deckCtx} onClose={() => setCeremonyOpen(false)} onSaved={loadDiary} />
      )}

      {/* Modo manual (T3): mismo criterio de overlay efímero de pantalla
          completa que la ceremonia digital. */}
      {manualOpen && (
        <TarotManualEntry deckCtx={deckCtx} onClose={() => setManualOpen(false)} onSaved={loadDiary} />
      )}

      <BottomSheet open={dailySheetOpen} onClose={() => setDailySheetOpen(false)} title={dailyContent?.name}>
        {dailyProse.map((p, i) => (
          <Text key={i} style={styles.sheetParagraph}>
            {p}
          </Text>
        ))}
      </BottomSheet>

      <BottomSheet
        open={openReading !== null}
        onClose={() => setOpenReadingId(null)}
        title={openReading ? t(DIARY_SPREAD_KEY[openReading.spread] ?? "tarot.diarySpreadDaily") : undefined}
      >
        {openReading && (
          <>
            {openReading.question && (
              <Text style={styles.sheetQuestion}>
                {t("tarot.yourQuestion")}: {openReading.question}
              </Text>
            )}
            <Text style={styles.cardSub}>{t("tarot.diaryCardsLabel")}</Text>
            {openReading.cards.map((c) => {
              const card = cardById(c.cardId);
              const content = card ? cardsDict[card.id] : undefined;
              return (
                <Text key={`${c.cardId}-${c.position}`} style={styles.sheetCardLine}>
                  {content?.name ?? c.cardId}
                  {c.reversed ? ` · ${t("tarot.reversed")}` : ""}
                  {c.jumper ? ` · ${t("tarot.manualJumpersReadingLabel")}` : ""}
                </Text>
              );
            })}
            {openReadingProse.map((p, i) => (
              <Text key={i} style={styles.sheetParagraph}>
                {p}
              </Text>
            ))}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    fadeFull: { width: "100%", marginBottom: space.xl },

    head: { width: "100%", gap: 2, marginBottom: space.xl },
    eyebrow: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },

    sectionTitle: {
      color: t.text,
      fontSize: typeScale.lg2,
      fontFamily: fonts.serifSemi,
      marginBottom: space.lg,
    },

    flipScene: { alignItems: "center", gap: space.lg },

    dailyRevealBody: { alignItems: "center", gap: space.sm, maxWidth: 440 },
    dailyName: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, textAlign: "center" },
    reversedTag: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: 2,
    },
    reversedTagText: { color: t.warn, fontSize: typeScale.xs, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans },
    dailyKeywords: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
    dailyEssence: { color: t.textDim, fontSize: typeScale.sm, lineHeight: 21, textAlign: "center", fontFamily: fonts.sans },
    dailyRevealBtn: {
      marginTop: space.sm,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    dailyRevealBtnText: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },

    spreadsGrid: { flexDirection: "row", gap: space.sm, width: "100%" },
    manualCard: { gap: space.xs, alignItems: "flex-start", marginTop: space.sm, width: "100%" },
    spreadCard: { flex: 1 },
    spreadCardInner: { gap: space.xs, alignItems: "flex-start" },
    spreadDisabled: { opacity: 0.6 },
    spreadName: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    spreadDesc: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans },

    cardSub: {
      color: t.textDim,
      fontSize: typeScale.sm,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: space.lg,
      marginBottom: space.md,
      fontFamily: fonts.sansSemi,
    },
    muted: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },

    diaryStateCard: { width: "100%", alignItems: "center", gap: space.md },
    diaryList: { width: "100%", gap: space.sm },
    diaryItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    diarySpread: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    diaryDate: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    freeLimitNote: { color: t.textFaint, fontSize: typeScale.xs, textAlign: "center", marginTop: space.md, fontFamily: fonts.sans },

    sheetParagraph: { color: t.text, fontSize: typeScale.sm, lineHeight: 21, marginBottom: space.md, fontFamily: fonts.sans },
    sheetQuestion: { color: t.textDim, fontSize: typeScale.sm, marginBottom: space.md, fontFamily: fonts.sans },
    sheetCardLine: { color: t.text, fontSize: typeScale.sm, marginBottom: space.xs, fontFamily: fonts.sans },
  });
}
