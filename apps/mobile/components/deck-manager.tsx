// Sección "Tu mazo" en Ajustes (Tarot T4, Task 6). Espejo móvil de
// apps/web/app/(app)/ajustes/deck-manager.tsx (Task 5): carga el manifiesto,
// maneja el estado LATENTE sin Supabase Storage (nota + todo deshabilitado —
// mismo trato que /api/avatar), toggle "usar mi mazo", grid de las 78
// cartas con miniatura RWS + subir/quitar (image picker de Expo), y la
// entrada al editor de reverso. Miniaturas siempre RWS por ahora
// (cardImageUrl resuelve el slot custom cuando el mazo esté activo — Task 7
// cablea las lecturas).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { TAROT_DECK, cardImageUrl, rwsCtx, TAROT_CARDS_ES, TAROT_CARDS_EN } from "@aluna/core";
import { Chip } from "./ui";
import { BackEditor } from "./back-editor";
import { useAuth } from "../lib/auth-context";
import { useT, type Locale } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { apiUrl } from "../lib/config";
import {
  getDeckManifest,
  setDeckActive,
  uploadDeckCard,
  deleteDeckCard,
  type DeckManifest,
  type DeckImageFile,
} from "../lib/tarot-deck-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

function cardsDictFor(locale: Locale) {
  return locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
}

/** Pide permiso de galería y devuelve el archivo elegido, o null si canceló
 *  o no hubo permiso (el llamador ya muestra la alerta correspondiente). */
async function pickImage(): Promise<DeckImageFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `deck-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  };
}

export function DeckManager() {
  const { session } = useAuth();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const s = useStyles(tk);
  const cardsDict = cardsDictFor(locale);
  const accessToken = session?.access_token ?? null;
  // apiUrl() dentro del componente (no a nivel de módulo): si la config
  // faltara, no tumba TODA la pantalla de Ajustes al importar este archivo.
  const deckCtx = useMemo(() => rwsCtx(apiUrl()), []);

  const [manifest, setManifest] = useState<DeckManifest | null>(null);
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [cardError, setCardError] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const m = await getDeckManifest(accessToken);
      setManifest(m);
    } catch {
      // Fallo ajeno al gate latente (401, red caída): mismo tratamiento que
      // el 503 — la sección nunca se rompe por esto.
      setManifest({ available: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loaded = manifest !== null;
  const available = manifest?.available === true;
  const cardIds = new Set(manifest?.cardIds ?? []);
  const hasBack = (manifest?.backKind ?? "none") !== "none";
  const hasContent = cardIds.size > 0 || hasBack;

  async function handleUpload(cardId: string) {
    if (!accessToken) return;
    const file = await pickImage();
    if (!file) return;
    setBusyCardId(cardId);
    setCardError(false);
    try {
      await uploadDeckCard(accessToken, cardId, file);
      await refresh();
    } catch {
      setCardError(true);
    } finally {
      setBusyCardId(null);
    }
  }

  async function handleRemove(cardId: string) {
    if (!accessToken) return;
    setBusyCardId(cardId);
    setCardError(false);
    try {
      await deleteDeckCard(accessToken, cardId);
      await refresh();
    } catch {
      setCardError(true);
    } finally {
      setBusyCardId(null);
    }
  }

  async function handleToggleActive(next: boolean) {
    if (!accessToken) return;
    setToggling(true);
    try {
      await setDeckActive(accessToken, next);
      await refresh();
    } catch {
      // Fire-and-forget: el toggle simplemente no cambia si falla — el
      // manifiesto recargado (o no) sigue siendo la fuente de verdad.
    } finally {
      setToggling(false);
    }
  }

  async function onPressUpload(cardId: string) {
    try {
      await handleUpload(cardId);
    } catch {
      Alert.alert(t("settings.deckPickerError"));
    }
  }

  return (
    <View>
      {loaded && !available && <Text style={s.latentNote}>{t("settings.deckLatentNote")}</Text>}

      <View style={s.toggleRow}>
        <Text style={s.toggleLabel}>{t("settings.deckUseToggle")}</Text>
        <View style={s.chipRow}>
          <Chip
            kind="control"
            label={t("settings.intentAIOn")}
            selected={manifest?.active === true}
            disabled={!available || !hasContent || toggling}
            onPress={() => handleToggleActive(true)}
          />
          <Chip
            kind="control"
            label={t("settings.intentAIOff")}
            selected={manifest?.active === false}
            disabled={!available || !hasContent || toggling}
            onPress={() => handleToggleActive(false)}
          />
        </View>
      </View>

      <Pressable style={s.backEntryBtn} onPress={() => setShowEditor((v) => !v)} accessibilityRole="button">
        <Text style={s.backEntryLabel}>{t("settings.deckBackEditorTitle")}</Text>
        <Text style={s.rowArrow}>{showEditor ? "−" : "→"}</Text>
      </Pressable>

      {showEditor && accessToken && (
        <BackEditor
          accessToken={accessToken}
          available={available}
          backKind={manifest?.backKind ?? "none"}
          backUrl={manifest?.backUrl ?? null}
          onSaved={refresh}
        />
      )}

      {cardError && <Text style={s.error}>{t("settings.deckCardError")}</Text>}

      <View style={s.grid}>
        {TAROT_DECK.map((card) => {
          const hasCustom = cardIds.has(card.id);
          const name = cardsDict[card.id]?.name ?? card.id;
          const disabled = !available || busyCardId !== null;
          const busy = busyCardId === card.id;
          return (
            <View key={card.id} style={s.gridCard}>
              <Image source={{ uri: cardImageUrl(card.id, deckCtx) }} style={s.gridThumb} />
              <Text style={s.gridName} numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                style={[s.uploadBtn, disabled && s.btnDisabled]}
                disabled={disabled}
                onPress={() => onPressUpload(card.id)}
                accessibilityRole="button"
              >
                <Text style={s.uploadBtnText}>
                  {busy ? t("settings.deckCardBusy") : hasCustom ? t("settings.deckCardReplace") : t("settings.deckCardUpload")}
                </Text>
              </Pressable>
              {hasCustom && (
                <Pressable
                  style={[s.removeBtn, disabled && s.btnDisabled]}
                  disabled={disabled}
                  onPress={() => handleRemove(card.id)}
                  accessibilityRole="button"
                >
                  <Text style={s.removeBtnText}>{t("settings.deckCardRemove")}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function useStyles(t: ThemeTokens) {
  return makeStyles(t);
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    latentNote: {
      color: t.textFaint,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      marginBottom: space.lg,
    },
    toggleRow: {
      marginBottom: space.lg,
      gap: space.sm,
    },
    toggleLabel: {
      color: t.textDim,
      fontSize: typeScale.xs,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    backEntryBtn: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.accHair,
      marginBottom: space.md,
    },
    backEntryLabel: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sansSemi },
    rowArrow: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sans },
    error: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, marginBottom: space.md },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.md,
      marginTop: space.md,
    },
    gridCard: {
      width: "30%",
      alignItems: "center",
      gap: space.xs,
    },
    gridThumb: {
      width: "100%",
      aspectRatio: 0.58,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: t.accHair,
      backgroundColor: t.panel,
    },
    gridName: { color: t.textDim, fontSize: typeScale.xs2, fontFamily: fonts.sans, textAlign: "center" },
    uploadBtn: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: space.sm,
    },
    uploadBtnText: { color: t.acc, fontSize: typeScale.xs2, fontFamily: fonts.sans },
    removeBtn: { paddingVertical: 2 },
    removeBtnText: { color: t.warn, fontSize: typeScale.xs2, fontFamily: fonts.sans },
    btnDisabled: { opacity: 0.5 },
  });
}
