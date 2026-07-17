// Modo manual (Tarot T3): espejo de apps/web/app/(app)/tarot/manual-entry.tsx
// — alguien con mazo físico baraja y escoge él mismo; le pedimos QUÉ salió y
// devolvemos la interpretación. Flujo: plantilla (three/daily) o libre
// (stepper 1-10) → selector de cartas (buscador + filtro por palo, toggle
// invertida, sin duplicados cruzando main+jumpers) → jumpers (mismo
// selector, máx 3, opcional) → lectura (composeReadingProse + jumpers) →
// chat → guardar. La lógica de dedupe/límites vive PURA en
// lib/tarot-manual-picker.ts (testeada ahí); esta pantalla es la cáscara RN.
//
// Overlay de pantalla completa igual que TarotCeremony (Task 4): rito
// efímero de una sola sesión, cerrarlo lo desmonta y todo vuelve a cero.
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAROT_DECK, TAROT_CARDS_ES, TAROT_CARDS_EN, composeReadingProse } from "@aluna/core";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { apiUrl } from "../lib/config";
import {
  FREE_MAX,
  FREE_MIN,
  MAX_JUMPERS,
  SUIT_TABS,
  addJumperCard,
  addMainCard,
  filterManualCandidates,
  positionsForTemplate,
  removeJumperCard,
  removeMainCard,
  toggleReversed,
  type ManualTemplate,
  type PickedCard,
  type SuitTab,
} from "../lib/tarot-manual-picker";
import { TarotApiError, saveTarotReading } from "../lib/tarot-api";
import { ReadingChat } from "./ReadingChat";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type Step = "template" | "select" | "jumpers" | "reading";
type SaveState = "idle" | "saving" | "saved" | "free_limit" | "error";

const SUIT_LABEL_KEY: Record<SuitTab, string> = {
  all: "tarot.manualSuitAll",
  major: "tarot.manualSuitMajor",
  wands: "tarot.manualSuitWands",
  cups: "tarot.manualSuitCups",
  swords: "tarot.manualSuitSwords",
  pentacles: "tarot.manualSuitPentacles",
};

const POSITION_KEY: Record<string, string> = {
  day: "tarot.positionDay",
  past: "tarot.positionPast",
  present: "tarot.positionPresent",
  future: "tarot.positionFuture",
};

const THUMB_W = 56;
const THUMB_H = 91;
const PICKED_THUMB_W = 44;
const PICKED_THUMB_H = 72;
const READING_W = 72;
const READING_H = 117;

export function TarotManualEntry({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t: tk } = useTheme();
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const accessToken = session?.access_token ?? null;
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const rwsBase = `${apiUrl()}/tarot/rws`;

  const [step, setStep] = useState<Step>("template");
  const [template, setTemplate] = useState<ManualTemplate>("three");
  const [freeCount, setFreeCount] = useState(3);
  const [main, setMain] = useState<PickedCard[]>([]);
  const [jumpers, setJumpers] = useState<PickedCard[]>([]);
  const [query, setQuery] = useState("");
  const [suitTab, setSuitTab] = useState<SuitTab>("all");
  const [save, setSave] = useState<SaveState>("idle");

  const positions = useMemo(() => positionsForTemplate(template, freeCount), [template, freeCount]);

  const usedIds = useMemo(
    () => new Set([...main, ...jumpers].map((c) => c.cardId)),
    [main, jumpers],
  );

  function nameOf(id: string): string {
    return cardsDict[id]?.name ?? id;
  }

  const candidates = useMemo(
    () => filterManualCandidates(TAROT_DECK, usedIds, suitTab, query, nameOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usedIds, suitTab, query, cardsDict],
  );

  function positionLabel(position: string): string {
    const known = POSITION_KEY[position];
    if (known) return t(known);
    const m = /^free-(\d+)$/.exec(position);
    if (m) return t("tarot.manualFreePositionLabel", { n: m[1]! });
    return position;
  }

  const prose = useMemo(
    () =>
      step === "reading"
        ? composeReadingProse(locale === "en" ? "en" : "es", template, main, undefined, {
            jumpers: jumpers.map(({ cardId, reversed }) => ({ cardId, reversed })),
          })
        : [],
    [step, locale, template, main, jumpers],
  );

  const chatCards = useMemo(
    () => [...main, ...jumpers.map((j) => ({ ...j, jumper: true as const }))],
    [main, jumpers],
  );

  function saveReading() {
    if (!accessToken || save === "saving" || save === "saved") return;
    setSave("saving");
    const cards = [...main, ...jumpers.map((j) => ({ ...j, jumper: true }))];
    saveTarotReading(accessToken, { spread: template, deck: "rws", cards })
      .then(() => {
        setSave("saved");
        onSaved();
      })
      .catch((e) => {
        const status = e instanceof TarotApiError && e.code === "free_limit" ? "free_limit" : "error";
        setSave(status);
      });
  }

  function renderPicker(opts: {
    picked: PickedCard[];
    limit: number;
    onPick: (id: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
  }) {
    const { picked, limit, onPick, onToggle, onRemove } = opts;
    return (
      <>
        {picked.length > 0 && (
          <View style={styles.pickedList}>
            {picked.map((c) => {
              const content = cardsDict[c.cardId];
              return (
                <View key={c.cardId} style={styles.pickedItem}>
                  <Image
                    source={{ uri: `${rwsBase}/${c.cardId}.webp` }}
                    resizeMode="contain"
                    style={[styles.pickedThumb, c.reversed && { transform: [{ rotate: "180deg" }] }]}
                  />
                  <View style={styles.pickedBody}>
                    <Text style={styles.pickedName} numberOfLines={1}>
                      {content?.name ?? c.cardId}
                    </Text>
                    <Text style={styles.pickedPosition}>{positionLabel(c.position)}</Text>
                  </View>
                  <Pressable
                    style={[styles.toggleChip, c.reversed && styles.toggleChipOn]}
                    onPress={() => onToggle(c.cardId)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: c.reversed }}
                  >
                    <Text style={[styles.toggleChipText, c.reversed && styles.toggleChipTextOn]}>
                      {t("tarot.manualToggleReversed")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => onRemove(c.cardId)}
                    accessibilityRole="button"
                    accessibilityLabel={t("tarot.manualRemove")}
                    hitSlop={8}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {picked.length < limit && (
          <>
            <TextInput
              style={styles.search}
              placeholder={t("tarot.manualSearchPlaceholder")}
              placeholderTextColor={tk.textFaint}
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suitTabsScroll}>
              <View style={styles.suitTabs}>
                {SUIT_TABS.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.suitTabBtn, suitTab === s && styles.suitTabBtnActive]}
                    onPress={() => setSuitTab(s)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: suitTab === s }}
                  >
                    <Text style={[styles.suitTabText, suitTab === s && styles.suitTabTextActive]}>
                      {t(SUIT_LABEL_KEY[s])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {candidates.length === 0 ? (
              <Text style={styles.noResults}>{t("tarot.manualNoResults")}</Text>
            ) : (
              <FlatList
                data={candidates}
                key="grid-3"
                numColumns={3}
                keyExtractor={(c) => c.id}
                scrollEnabled={false}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.grid}
                renderItem={({ item: card }) => {
                  const content = cardsDict[card.id];
                  return (
                    <Pressable
                      testID="manual-card-option"
                      style={styles.gridCard}
                      onPress={() => onPick(card.id)}
                      accessibilityRole="button"
                    >
                      <Image
                        source={{ uri: `${rwsBase}/${card.id}.webp` }}
                        resizeMode="contain"
                        style={styles.gridThumb}
                      />
                      <Text style={styles.gridName} numberOfLines={2}>
                        {content?.name ?? card.id}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </>
        )}
      </>
    );
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]} testID="tarot-manual-entry">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={styles.closeBtnText}>← {t("tarot.backToThreshold")}</Text>
        </Pressable>

        {step === "template" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.manualTemplateTitle")}
            </Text>
            <View style={styles.templateRow}>
              {(["three", "daily", "free"] as const).map((tpl) => (
                <Pressable
                  key={tpl}
                  style={[styles.templateBtn, template === tpl && styles.templateBtnActive]}
                  onPress={() => setTemplate(tpl)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: template === tpl }}
                >
                  <Text style={[styles.templateBtnText, template === tpl && styles.templateBtnTextActive]}>
                    {t(
                      tpl === "three"
                        ? "tarot.manualTemplateThree"
                        : tpl === "daily"
                          ? "tarot.manualTemplateDaily"
                          : "tarot.manualTemplateFree",
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>

            {template === "free" && (
              <View style={styles.freeStepper}>
                <Text style={styles.freeLabel}>{t("tarot.manualFreeCountLabel")}</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={[styles.stepperBtn, freeCount <= FREE_MIN && styles.btnDisabled]}
                    onPress={() => setFreeCount((n) => Math.max(FREE_MIN, n - 1))}
                    disabled={freeCount <= FREE_MIN}
                    accessibilityRole="button"
                    accessibilityLabel="-"
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{t("tarot.manualFreeCountValue", { n: freeCount })}</Text>
                  <Pressable
                    style={[styles.stepperBtn, freeCount >= FREE_MAX && styles.btnDisabled]}
                    onPress={() => setFreeCount((n) => Math.min(FREE_MAX, n + 1))}
                    disabled={freeCount >= FREE_MAX}
                    accessibilityRole="button"
                    accessibilityLabel="+"
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setMain([]);
                setJumpers([]);
                setQuery("");
                setSuitTab("all");
                setStep("select");
              }}
            >
              <Text style={styles.primaryBtnText}>{t("tarot.manualTemplateContinue")}</Text>
            </Pressable>
          </View>
        )}

        {step === "select" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.manualSelectTitle")}
            </Text>
            <Text style={styles.stepHint}>{t("tarot.manualSelectHint")}</Text>
            {renderPicker({
              picked: main,
              limit: positions.length,
              onPick: (id) => setMain((prev) => addMainCard(prev, id, positions)),
              onToggle: (id) => setMain((prev) => toggleReversed(prev, id)),
              onRemove: (id) => setMain((prev) => removeMainCard(prev, id, positions)),
            })}
            {main.length === positions.length && (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  setQuery("");
                  setSuitTab("all");
                  setStep("jumpers");
                }}
              >
                <Text style={styles.primaryBtnText}>{t("tarot.manualContinue")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {step === "jumpers" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.manualJumpersTitle")}
            </Text>
            <Text style={styles.stepHint}>{t("tarot.manualJumpersHint")}</Text>
            {renderPicker({
              picked: jumpers,
              limit: MAX_JUMPERS,
              onPick: (id) => setJumpers((prev) => addJumperCard(prev, id)),
              onToggle: (id) => setJumpers((prev) => toggleReversed(prev, id)),
              onRemove: (id) => setJumpers((prev) => removeJumperCard(prev, id)),
            })}
            {jumpers.length >= MAX_JUMPERS && (
              <Text style={styles.stepHint}>{t("tarot.manualJumpersLimit")}</Text>
            )}
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setQuery("");
                setStep("reading");
              }}
            >
              <Text style={styles.primaryBtnText}>{t("tarot.manualJumpersContinue")}</Text>
            </Pressable>
          </View>
        )}

        {step === "reading" && (
          <View style={styles.stepPane}>
            <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
              {t("tarot.readingTitle")}
            </Text>
            <View style={styles.readingCards}>
              {main.map((c) => {
                const content = cardsDict[c.cardId];
                const ambit = content ? (c.reversed ? content.reversed.path : content.upright.path) : "";
                return (
                  <View key={c.cardId} style={styles.readingCard}>
                    <Image
                      source={{ uri: `${rwsBase}/${c.cardId}.webp` }}
                      resizeMode="contain"
                      style={[styles.readingImg, c.reversed && { transform: [{ rotate: "180deg" }] }]}
                    />
                    <View style={styles.readingCardBody}>
                      <Text style={styles.readingPosition}>{positionLabel(c.position)}</Text>
                      <Text style={styles.readingName} maxFontSizeMultiplier={1.2}>
                        {content?.name ?? c.cardId}
                        {c.reversed ? ` · ${t("tarot.reversed")}` : ""}
                      </Text>
                      <Text style={styles.readingAmbit}>{ambit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {jumpers.length > 0 && (
              <View style={styles.jumpersReading}>
                <Text style={styles.jumpersLabel}>{t("tarot.manualJumpersReadingLabel")}</Text>
                <View style={styles.readingCards}>
                  {jumpers.map((c) => {
                    const content = cardsDict[c.cardId];
                    return (
                      <View key={c.cardId} style={[styles.readingCard, styles.readingCardDashed]}>
                        <Image
                          source={{ uri: `${rwsBase}/${c.cardId}.webp` }}
                          resizeMode="contain"
                          style={[styles.readingImg, c.reversed && { transform: [{ rotate: "180deg" }] }]}
                        />
                        <View style={styles.readingCardBody}>
                          <Text style={styles.readingName} maxFontSizeMultiplier={1.2}>
                            {content?.name ?? c.cardId}
                            {c.reversed ? ` · ${t("tarot.reversed")}` : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.readingProse}>
              {prose.map((p, i) => (
                <Text key={i} style={styles.proseParagraph}>
                  {p}
                </Text>
              ))}
            </View>

            <ReadingChat spreadId={template} cards={chatCards} />

            {save === "free_limit" ? (
              <Text style={styles.freeLimitNote}>{t("tarot.freeLimit")}</Text>
            ) : save === "saved" ? (
              <Text style={styles.savedOk}>{t("tarot.saved")}</Text>
            ) : (
              <>
                {save === "error" && <Text style={styles.saveError}>{t("tarot.saveError")}</Text>}
                <Pressable
                  style={[styles.primaryBtn, save === "saving" && styles.btnDisabled]}
                  onPress={saveReading}
                  disabled={save === "saving"}
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
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: t.bg, zIndex: 20 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },

    closeBtn: { alignSelf: "flex-start", paddingVertical: space.sm, marginBottom: space.md },
    closeBtnText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },

    stepPane: { width: "100%", alignItems: "center", gap: space.lg },
    stepTitle: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, textAlign: "center" },
    stepHint: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },

    templateRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", justifyContent: "center" },
    templateBtn: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    templateBtnActive: { backgroundColor: t.accFaint, borderColor: t.acc },
    templateBtnText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    templateBtnTextActive: { color: t.accText },

    freeStepper: { alignItems: "center", gap: space.sm },
    freeLabel: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    stepperRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
    stepperBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.accHair,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.sansSemi },
    stepperValue: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi, minWidth: 84, textAlign: "center" },

    primaryBtn: { borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md, backgroundColor: t.accText },
    primaryBtnText: { color: t.bg, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    btnDisabled: { opacity: 0.6 },
    ghostBtn: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
    ghostBtnText: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },

    search: {
      width: "100%",
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm + 2,
      color: t.text,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      backgroundColor: t.panelSoft,
    },
    suitTabsScroll: { width: "100%", flexGrow: 0 },
    suitTabs: { flexDirection: "row", gap: space.xs, paddingVertical: space.xs },
    suitTabBtn: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 2 },
    suitTabBtnActive: { backgroundColor: t.accFaint, borderColor: t.acc },
    suitTabText: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sansSemi, textTransform: "uppercase", letterSpacing: 1 },
    suitTabTextActive: { color: t.accText },

    noResults: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center", paddingVertical: space.lg },

    grid: { width: "100%", gap: space.sm },
    gridRow: { justifyContent: "flex-start", gap: space.sm },
    gridCard: { width: 96, alignItems: "center", gap: space.xs, paddingVertical: space.sm },
    gridThumb: { width: THUMB_W, height: THUMB_H, borderRadius: radius.sm, borderWidth: 1, borderColor: t.accHair },
    gridName: { color: t.text, fontSize: typeScale.xs, fontFamily: fonts.sans, textAlign: "center" },

    pickedList: { width: "100%", gap: space.sm },
    pickedItem: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md, padding: space.sm, backgroundColor: t.bgDeep },
    pickedThumb: { width: PICKED_THUMB_W, height: PICKED_THUMB_H, borderRadius: radius.sm },
    pickedBody: { flex: 1, gap: 2 },
    pickedName: { color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    pickedPosition: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans, textTransform: "uppercase", letterSpacing: 1 },
    toggleChip: { borderWidth: 1, borderColor: t.accHair, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4 },
    toggleChipOn: { backgroundColor: t.accFaint, borderColor: t.acc },
    toggleChipText: { color: t.textDim, fontSize: typeScale.xs2, fontFamily: fonts.sansSemi },
    toggleChipTextOn: { color: t.accText },
    removeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    removeBtnText: { color: t.textFaint, fontSize: typeScale.md },

    readingCards: { width: "100%", gap: space.md },
    readingCard: { flexDirection: "row", gap: space.lg, borderWidth: 1, borderColor: t.accHair, borderRadius: radius.md, padding: space.lg, backgroundColor: t.bgDeep },
    readingCardDashed: { borderStyle: "dashed" },
    readingImg: { width: READING_W, height: READING_H, borderRadius: radius.sm },
    readingCardBody: { flex: 1, gap: space.xs, justifyContent: "center" },
    readingPosition: { color: t.accText, fontSize: typeScale.xs, letterSpacing: 2, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    readingName: { color: t.text, fontSize: typeScale.lg, fontFamily: fonts.serifSemi },
    readingAmbit: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, lineHeight: 20 },

    jumpersReading: { width: "100%", gap: space.sm },
    jumpersLabel: { color: t.textDim, fontSize: typeScale.xs, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },

    readingProse: { width: "100%" },
    proseParagraph: { color: t.text, fontSize: typeScale.sm, lineHeight: 21, marginBottom: space.md, fontFamily: fonts.sans },

    freeLimitNote: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },
    savedOk: { color: t.accText, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    saveError: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, textAlign: "center" },
  });
}
