// Editor de reverso (Tarot T4, Task 6). Espejo móvil de
// apps/web/app/(app)/ajustes/back-editor.tsx (Task 5): preview EN VIVO con
// buildBackSvg (@aluna/core, la misma función pura que el server usa para el
// webp final) renderizado con SvgXml de react-native-svg — el preview es
// byte-consistente con lo que el server produce, mismo SVG en ambas
// plataformas. "Subir imagen propia" es la alternativa al editor generado.
// Ambos caminos llaman uploadDeckBack (config o file) — latente sin Storage,
// controles deshabilitados mientras `available` es false.
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { buildBackSvg, type BackSymbol } from "@aluna/core";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { uploadDeckBack, type DeckImageFile } from "../lib/tarot-deck-api";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

// Índigos + dorados de la marca del mazo — mismos hex que la web
// (apps/web/app/(app)/ajustes/back-editor.tsx, scripts/tarot-make-back.mjs).
const BG_SWATCHES = ["#12142e", "#1a2150", "#0a0d24", "#2a0f4a"] as const;
const BORDER_SWATCHES = ["#c9a227", "#e7c986", "#b86bff", "#ffb86b"] as const;
const SYMBOLS: readonly BackSymbol[] = ["enso", "star", "moon"];

const SYMBOL_KEY: Record<BackSymbol, string> = {
  enso: "settings.deckBackSymbolEnso",
  star: "settings.deckBackSymbolStar",
  moon: "settings.deckBackSymbolMoon",
};

async function pickImage(): Promise<DeckImageFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `back-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  };
}

interface Props {
  accessToken: string;
  available: boolean;
  backKind: "none" | "upload" | "editor";
  backUrl: string | null;
  onSaved: () => void | Promise<void>;
}

export function BackEditor({ accessToken, available, backKind, backUrl, onSaved }: Props) {
  const { t } = useT();
  const { t: tk } = useTheme();
  const s = useMemo(() => makeStyles(tk), [tk]);

  const [bg, setBg] = useState<string>(BG_SWATCHES[0]);
  const [border, setBorder] = useState<string>(BORDER_SWATCHES[0]);
  const [symbol, setSymbol] = useState<BackSymbol>("enso");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const previewXml = useMemo(() => buildBackSvg({ bg, border, symbol }), [bg, border, symbol]);

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      await uploadDeckBack(accessToken, { config: { bg, border, symbol } });
      setStatus("saved");
      await onSaved();
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadOwn() {
    let file: DeckImageFile | null;
    try {
      file = await pickImage();
    } catch {
      Alert.alert(t("settings.deckPickerError"));
      return;
    }
    if (!file) return;
    setUploading(true);
    setStatus("idle");
    try {
      await uploadDeckBack(accessToken, { file });
      setStatus("saved");
      await onSaved();
    } catch {
      setStatus("error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={s.wrap}>
      <View style={s.previewRow}>
        <View style={s.previewBox}>
          <SvgXml xml={previewXml} width="100%" height="100%" />
        </View>
        {backKind !== "none" && backUrl && (
          <View style={s.currentBack}>
            <Text style={s.label}>{t("settings.deckBackCurrent")}</Text>
            <Image source={{ uri: backUrl }} style={s.currentBackImg} />
          </View>
        )}
      </View>

      <View style={s.controlGroup}>
        <Text style={s.label}>{t("settings.deckBackColorBg")}</Text>
        <View style={s.swatches}>
          {BG_SWATCHES.map((sw) => (
            <Pressable
              key={sw}
              style={[s.swatch, { backgroundColor: sw }, bg === sw && s.swatchOn]}
              disabled={!available}
              onPress={() => setBg(sw)}
              accessibilityRole="button"
              accessibilityState={{ selected: bg === sw, disabled: !available }}
            />
          ))}
        </View>
      </View>

      <View style={s.controlGroup}>
        <Text style={s.label}>{t("settings.deckBackColorBorder")}</Text>
        <View style={s.swatches}>
          {BORDER_SWATCHES.map((sw) => (
            <Pressable
              key={sw}
              style={[s.swatch, { backgroundColor: sw }, border === sw && s.swatchOn]}
              disabled={!available}
              onPress={() => setBorder(sw)}
              accessibilityRole="button"
              accessibilityState={{ selected: border === sw, disabled: !available }}
            />
          ))}
        </View>
      </View>

      <View style={s.controlGroup}>
        <Text style={s.label}>{t("settings.deckBackSymbol")}</Text>
        <View style={s.chipRow}>
          {SYMBOLS.map((sym) => {
            const on = symbol === sym;
            return (
              <Pressable
                key={sym}
                style={[s.symbolChip, on && s.symbolChipOn, !available && s.btnDisabled]}
                disabled={!available}
                onPress={() => setSymbol(sym)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !available }}
              >
                <Text style={[s.symbolChipText, on && s.symbolChipTextOn]}>{t(SYMBOL_KEY[sym])}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.actions}>
        <Pressable style={[s.saveBtn, (!available || saving) && s.btnDisabled]} disabled={!available || saving} onPress={handleSave} accessibilityRole="button">
          <Text style={s.saveBtnText}>{saving ? t("settings.deckBackSaving") : t("settings.deckBackSave")}</Text>
        </Pressable>

        <Pressable
          style={[s.uploadBtn, (!available || uploading) && s.btnDisabled]}
          disabled={!available || uploading}
          onPress={handleUploadOwn}
          accessibilityRole="button"
        >
          <Text style={s.uploadBtnText}>{uploading ? t("settings.deckCardBusy") : t("settings.deckBackUploadOwn")}</Text>
        </Pressable>
      </View>

      {status === "saved" && <Text style={s.savedNote}>{t("settings.deckBackSaved")}</Text>}
      {status === "error" && <Text style={s.error}>{t("settings.deckBackError")}</Text>}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { marginBottom: space.lg },
    previewRow: { flexDirection: "row", gap: space.lg, marginBottom: space.lg, alignItems: "flex-start" },
    previewBox: {
      width: 105,
      height: 180,
      borderRadius: radius.sm,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.accHair,
    },
    currentBack: { gap: space.xs, alignItems: "center" },
    currentBackImg: {
      width: 70,
      height: 120,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: t.accHair,
      backgroundColor: t.panel,
    },
    controlGroup: { marginBottom: space.lg },
    label: {
      color: t.textDim,
      fontSize: typeScale.xs,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontFamily: fonts.sans,
      marginBottom: space.sm,
    },
    swatches: { flexDirection: "row", gap: space.sm },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: "transparent",
    },
    swatchOn: { borderColor: t.acc },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    symbolChip: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
    },
    symbolChipOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    symbolChipText: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    symbolChipTextOn: { color: t.acc },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.sm },
    saveBtn: {
      backgroundColor: t.accFaint,
      borderWidth: 1,
      borderColor: t.acc,
      borderRadius: radius.pill,
      paddingVertical: space.sm,
      paddingHorizontal: space.lg,
    },
    saveBtnText: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sansSemi },
    uploadBtn: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingVertical: space.sm,
      paddingHorizontal: space.lg,
    },
    uploadBtnText: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans },
    btnDisabled: { opacity: 0.5 },
    savedNote: { color: t.acc, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.md },
    error: { color: t.warn, fontSize: typeScale.sm, fontFamily: fonts.sans, marginTop: space.md },
  });
}
