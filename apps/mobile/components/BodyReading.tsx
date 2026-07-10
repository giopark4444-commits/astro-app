// apps/mobile/components/BodyReading.tsx
// Lectura interpretativa de una posición (planeta-signo-casa-dignidad) para la
// hoja inferior. "Esencia" = lectura compuesta local (instantánea, del corpus
// espejado); "Profunda"/"Completa" = tiers IA vía /api/chart-reading (dormidos
// sin llave → nota cálida). Paridad con body-reading.tsx web, sin streaming.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { BodyPosition } from "@aluna/core";
import { composeBodyReading as composeEs, type BodyReading } from "../content/astrology-readings-es";
import { composeBodyReading as composeEn } from "../content/astrology-readings-en";
import { astroLabels } from "../content/astrology";
import { fetchChartReading } from "../lib/chart-reading-api";
import { useAuth } from "../lib/auth-context";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

const TIERS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIERS)[number];

type St =
  | { s: "base" }
  | { s: "loading" }
  | { s: "ready"; r: BodyReading }
  | { s: "unavailable" }
  | { s: "error" };

export function BodyReadingReader({ body, profileName }: { body: BodyPosition; profileName: string }) {
  const { session } = useAuth();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);

  const [tier, setTier] = useState<Tier>("esencia");
  const [st, setSt] = useState<St>({ s: "base" });
  const cache = useRef<Map<string, BodyReading>>(new Map());

  const compose = locale === "en" ? composeEn : composeEs;
  const base = compose(body.body, body.sign, body.house, body.dignity);

  // Nueva posición tocada: reinicia el selector a "Esencia" (evita mostrar una
  // lectura profunda que ya no corresponde al planeta abierto).
  useEffect(() => {
    setTier("esencia");
    setSt({ s: "base" });
  }, [body.body, body.sign, body.house]);

  useEffect(() => {
    if (tier === "esencia") {
      setSt({ s: "base" });
      return;
    }
    const key = `${locale}:${body.body}:${body.sign}:${body.house}:${tier}`;
    const hit = cache.current.get(key);
    if (hit) {
      setSt({ s: "ready", r: hit });
      return;
    }
    if (!session) {
      setSt({ s: "unavailable" });
      return;
    }
    let alive = true;
    setSt({ s: "loading" });
    fetchChartReading({
      accessToken: session.access_token,
      body: body.body, sign: body.sign, house: body.house, dignity: body.dignity,
      length: tier === "profunda" ? "profunda" : "completa",
      locale: locale === "en" ? "en" : "es",
      profileName,
    })
      .then((res) => {
        if (!alive) return;
        if (!res.available) {
          setSt({ s: "unavailable" });
          return;
        }
        cache.current.set(key, res.reading);
        setSt({ s: "ready", r: res.reading });
      })
      .catch(() => {
        if (alive) setSt({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [tier, body, locale, session, profileName]);

  const shown: BodyReading | null =
    st.s === "ready" ? st.r : st.s === "base" || st.s === "unavailable" ? base : null;

  return (
    <View>
      <Text style={styles.place}>
        {L.bodies[body.body] ?? body.body} · {L.signs[body.sign] ?? body.sign} · {body.house}
        {body.dignity ? ` · ${L.dignities[body.dignity]}` : ""}
      </Text>

      {/* selector de profundidad */}
      <View style={styles.tiers}>
        {TIERS.map((id) => {
          const on = tier === id;
          const label =
            id === "esencia" ? t("carta.readingEssence") : id === "profunda" ? t("carta.readingDeep") : t("carta.readingComplete");
          return (
            <Pressable key={id} style={[styles.tier, on && styles.tierOn]} onPress={() => setTier(id)}>
              <Text style={[styles.tierText, on && styles.tierTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {st.s === "loading" && (
        <View style={styles.loading}>
          <ActivityIndicator color={tk.acc} />
          <Text style={styles.note}>{t("carta.readingWeaving")}</Text>
        </View>
      )}
      {st.s === "error" && <Text style={styles.note}>{t("carta.readingError")}</Text>}
      {st.s === "unavailable" && <Text style={styles.note}>{t("carta.readingGated")}</Text>}

      {shown && (
        <View style={styles.blocks}>
          <Text style={styles.essence}>{shown.essence}</Text>
          <Text style={styles.blockH}>{t("carta.readingFlowH")}</Text>
          <Text style={styles.blockText}>{shown.flow}</Text>
          <Text style={styles.blockH}>{t("carta.readingShadowH")}</Text>
          <Text style={styles.blockText}>{shown.shadow}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    place: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans, marginBottom: space.md },
    tiers: {
      flexDirection: "row", backgroundColor: t.panel, borderRadius: radius.pill, padding: 4,
      borderWidth: 1, borderColor: t.accHair, marginBottom: space.lg,
    },
    tier: { flex: 1, paddingVertical: space.sm + 2, alignItems: "center", borderRadius: radius.pill },
    tierOn: { backgroundColor: t.accFaint },
    tierText: { color: t.textDim, fontSize: 13, fontFamily: fonts.sans },
    tierTextOn: { color: t.acc, fontFamily: fonts.sansSemi },
    loading: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.md },
    note: { color: t.textDim, fontSize: 13, fontFamily: fonts.serifItalic, marginBottom: space.md, lineHeight: 19 },
    blocks: { gap: space.sm },
    essence: { color: t.text, fontSize: 15, lineHeight: 23, fontFamily: fonts.serif },
    blockH: { color: t.acc, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: fonts.sans, marginTop: space.md },
    blockText: { color: t.textDim, fontSize: 14, lineHeight: 21, fontFamily: fonts.sans },
  });
}
