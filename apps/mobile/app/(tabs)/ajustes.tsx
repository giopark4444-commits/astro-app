import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Enso } from "../../components/Enso";
import { Card, Chip, FadeIn, SoonBadge } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useAuth } from "../../lib/auth-context";
import { useTheme, type ModePref } from "../../lib/theme-context";
import { useT, type Locale } from "../../lib/i18n-context";
import { formatPlace } from "../../lib/geocode";
import { getSupabase } from "../../lib/supabase";
import {
  SUPPORT_EMAIL,
  SOCIAL_LINKS,
  TERMS_ES,
  PRIVACY_ES,
  DISCLAIMER_ES,
  TERMS_EN,
  PRIVACY_EN,
  DISCLAIMER_EN,
  type SubscriptionStatus,
  type UserIntent,
} from "@aluna/core";
import { fetchRemoteIntent, saveRemoteIntent } from "../../lib/intent";
import { THEMES, THEME_LABELS, fonts, radius, space, type as typeScale, type ThemeName, type ThemeTokens } from "../../theme/tokens";

const VISIBLE_SOCIAL_LINKS = SOCIAL_LINKS.filter((s) => s.href);

// Labels de la sección Legal: reusan el título ya localizado de cada LegalDoc
// (mismo patrón que apps/web/app/(app)/ajustes/page.tsx, LEGAL_LINKS).
const LEGAL_LINKS = [
  { slug: "terminos", es: TERMS_ES, en: TERMS_EN },
  { slug: "privacidad", es: PRIVACY_ES, en: PRIVACY_EN },
  { slug: "descargo", es: DISCLAIMER_ES, en: DISCLAIMER_EN },
] as const;

const prettyDate = (iso: string, locale: Locale) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const MES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return locale === "en" ? `${MON_EN[m - 1]} ${d}, ${y}` : `${d} de ${MES_ES[m - 1]} de ${y}`;
};

export default function AjustesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, reset } = useProfile();
  const { session, signOut } = useAuth();
  const { t: tk, theme, modePref, paletteMode, setTheme, setModePref, setPaletteMode } = useTheme();
  const { t, locale, setLocale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);

  const [subRow, setSubRow] = useState<{ status: SubscriptionStatus; current_period_end: string | null } | null>(null);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    getSupabase()
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setSubRow(data as typeof subRow);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  // Intención del cuestionario de primera entrada (Task 13): trae el intent
  // remoto para saber si hay algo que togglear y el estado inicial de
  // useInAI. Si no respondió el cuestionario, `intent` queda null y el
  // control se muestra igual pero sin efecto (ver onToggleIntentAI).
  const [intent, setIntent] = useState<UserIntent | null>(null);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetchRemoteIntent(getSupabase(), session.user.id).then((i) => {
      if (alive) setIntent(i);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  async function onToggleIntentAI(on: boolean) {
    if (!intent || !session) return;
    const next = { ...intent, useInAI: on };
    setIntent(next);
    try {
      await saveRemoteIntent(getSupabase(), session.user.id, next);
    } catch {
      /* fire-and-forget: el toggle ya refleja la intención local del usuario */
    }
  }
  // NO uses isPlusActive aquí para decidir qué rama pintar: esa función
  // devuelve false para "past_due" a propósito (¿tiene acceso Plus AHORA?),
  // y un usuario con pago fallido SÍ debe ver la rama de gestión (con el
  // aviso de pago pendiente), no la de "hazte Plus" como si nunca se
  // hubiera suscrito. La rama se decide por presencia de fila + status.
  const hasManagedSubscription = subRow !== null && subRow.status !== "cancelled";

  // Método de acceso: Supabase Auth guarda el proveedor en app_metadata (mismo
  // campo/lógica que apps/web/app/(app)/ajustes/page.tsx).
  const provider = (session?.user.app_metadata as { provider?: string } | undefined)?.provider;
  const loginMethodLabel =
    !provider || provider === "email"
      ? t("settings.loginEmail")
      : provider.charAt(0).toUpperCase() + provider.slice(1);

  function confirmLogout() {
    Alert.alert(t("settings.logoutConfirmTitle"), t("settings.logoutConfirmBody"), [
      { text: t("settings.resetCancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          await reset();
          await signOut();
        },
      },
    ]);
  }

  const genderLabel = (g: string) => {
    if (g === "feminine") return t("gender.feminine");
    if (g === "masculine") return t("gender.masculine");
    if (g === "neutral") return t("gender.neutral");
    return g;
  };

  function confirmReset() {
    Alert.alert(t("settings.resetConfirmTitle"), t("settings.resetConfirmBody"), [
      { text: t("settings.resetCancel"), style: "cancel" },
      {
        text: t("settings.resetConfirm"),
        style: "destructive",
        onPress: async () => {
          await reset();
          router.replace("/onboarding");
        },
      },
    ]);
  }

  const modeOptions: Array<{ id: ModePref; label: string }> = [
    { id: "light", label: t("settings.light") },
    { id: "dark", label: t("settings.dark") },
    { id: "auto", label: t("settings.auto") },
  ];
  const localeOptions: Array<{ id: Locale; label: string }> = [
    { id: "es", label: "Español" },
    { id: "en", label: "English" },
  ];

  return (
    // Sin backgroundColor propio: Ajustes vive en Tabs, cuya escena ya es transparente
    // (sceneStyle en (tabs)/_layout.tsx) — el radial + estrellas de ThemedBackground
    // (capa raíz) quedan visibles detrás. Nunca tuvo <Starfield/> local que quitar.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Enso size={24} />
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>{t("settings.title")}</Text>
        </View>

        {profile && (
          <FadeIn delay={0} style={styles.cardGap}>
            <Card>
              <Text style={styles.cardEyebrow}>{t("settings.profile")}</Text>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Row styles={styles} label={t("settings.birth")} value={prettyDate(profile.birthDate, locale)} />
              <Row
                styles={styles}
                label={t("settings.time")}
                value={profile.timeKnown && profile.birthTime ? profile.birthTime : t("settings.timeUnset")}
              />
              <Row styles={styles} label={t("settings.place")} value={profile.place ? formatPlace(profile.place) : "—"} />
              <Row styles={styles} label={t("settings.gender")} value={profile.gender ? genderLabel(profile.gender) : "—"} last />
            </Card>
          </FadeIn>
        )}

        {/* Apariencia: tema · modo de luz */}
        <FadeIn delay={60} style={styles.cardGap}>
          <Card>
            <Text style={styles.cardEyebrow}>{t("settings.appearance")}</Text>

            <Text style={styles.fieldLabel}>{t("settings.theme")}</Text>
            {/* Selector de tema: investigado en R3/Task 11 — el prop `icon` de
               <Chip kind="control"> es estructuralmente compatible con el swatch (icon
               inline antes del label), pero esa variante es una pill radius.pill de
               ancho automático con layout en fila, mientras este selector es una tarjeta
               radius.md de ancho IGUAL (flex:1, 3 iguales) con el swatch ARRIBA de la
               etiqueta (layout columna) — migrar cambiaría la forma de la tira de temas
               (tarjeta→pill), no solo "¿existe el prop?". Se deja local a propósito. */}
            <View style={styles.themeRow}>
              {THEMES.map((th: ThemeName) => {
                const on = theme === th;
                return (
                  <Pressable
                    key={th}
                    style={[styles.themeChip, on && styles.themeChipOn]}
                    onPress={() => setTheme(th)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={[styles.swatch, { backgroundColor: SWATCH[th] }]} />
                    <Text style={[styles.themeChipText, on && styles.themeChipTextOn]}>
                      {THEME_LABELS[locale][th]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* El Segmented local migra a fila de <Chip kind="control"> (patrón del
               rediseño) para modo de luz e idioma — mismos options/handlers de antes. */}
            <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>{t("settings.lightMode")}</Text>
            <View style={styles.chipRow}>
              {modeOptions.map((o) => (
                <Chip
                  key={o.id}
                  kind="control"
                  label={o.label}
                  selected={modePref === o.id}
                  onPress={() => setModePref(o.id)}
                />
              ))}
            </View>

            <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>{t("settings.palette")}</Text>
            <View style={styles.chipRow}>
              <Chip
                kind="control"
                label={t("settings.paletteGold")}
                selected={paletteMode === "gold"}
                onPress={() => setPaletteMode("gold")}
              />
              <Chip
                kind="control"
                label={t("settings.paletteColorful")}
                selected={paletteMode === "colorful"}
                onPress={() => setPaletteMode("colorful")}
              />
            </View>

            <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>{t("settings.language")}</Text>
            <View style={styles.chipRow}>
              {localeOptions.map((o) => (
                <Chip
                  key={o.id}
                  kind="control"
                  label={o.label}
                  selected={locale === o.id}
                  onPress={() => setLocale(o.id)}
                />
              ))}
            </View>
          </Card>
        </FadeIn>

        {/* Aluna te conoce (Task 13): toggle de si la intención del cuestionario
           se usa como contexto en el chat/informes de IA. Se muestra siempre
           (aunque no haya intent) — sin intent el toggle no tiene efecto real,
           ver onToggleIntentAI. */}
        <FadeIn delay={90} style={styles.cardGap}>
          <Card>
            <Text style={styles.cardEyebrow}>{t("settings.intentAI")}</Text>
            <Text style={styles.muted}>{t("settings.intentAIHint")}</Text>
            <View style={[styles.chipRow, styles.fieldLabelGap]}>
              <Chip
                kind="control"
                label={t("settings.intentAIOn")}
                selected={!!intent?.useInAI}
                onPress={() => onToggleIntentAI(true)}
              />
              <Chip
                kind="control"
                label={t("settings.intentAIOff")}
                selected={!intent?.useInAI}
                onPress={() => onToggleIntentAI(false)}
              />
            </View>
          </Card>
        </FadeIn>

        {/* Tu plan: solo lectura — el móvil nunca vende, suscribirse es solo en aluna.app.
           Misma lógica/strings de siempre, solo el envoltorio pasa a <Card>. */}
        <FadeIn delay={120} style={styles.cardGap}>
          <Card>
            <Text style={styles.cardEyebrow}>{t("billing.title")}</Text>
            {hasManagedSubscription ? (
              <>
                <Text style={styles.profileName}>
                  {t(subRow!.status === "trialing" ? "billing.planTrialing" : subRow!.status === "past_due" ? "billing.planPastDue" : "billing.planActive")}
                </Text>
                {subRow!.current_period_end && (
                  <Text style={styles.muted}>
                    {t(subRow!.status === "trialing" ? "billing.trialEndsOn" : "billing.renewsOn", {
                      date: prettyDate(subRow!.current_period_end.slice(0, 10), locale),
                    })}
                  </Text>
                )}
                <Text style={[styles.muted, { marginTop: space.sm }]}>{t("billing.manageNote")}</Text>
              </>
            ) : (
              <>
                <Text style={styles.rowLabel}>{t("billing.freeBody")}</Text>
                <Text style={[styles.muted, { marginTop: space.sm }]}>{t("settings.planWebNote")}</Text>
              </>
            )}
          </Card>
        </FadeIn>

        {/* Cuenta: correo, ID de usuario y método de acceso (brief ajustes-movil T2) —
           sin botón "Copiar": ni expo-clipboard ni el Clipboard viejo de react-native
           están instalados en este repo (grep en package.json), y el brief prohíbe
           sumar dependencias nuevas. Se omite el botón (ver reporte). */}
        {session && (
          <FadeIn delay={150} style={styles.cardGap}>
            <Card>
              <Text style={styles.cardEyebrow}>{t("settings.account")}</Text>
              <Row styles={styles} label={t("settings.email")} value={session.user.email ?? "—"} />
              <Row styles={styles} label={t("settings.userId")} value={session.user.id} valueStyle={styles.mono} />
              <Row styles={styles} label={t("settings.loginMethod")} value={loginMethodLabel} last />
            </Card>
          </FadeIn>
        )}

        {/* Ayuda y soporte */}
        <FadeIn delay={180} style={styles.cardGap}>
          <Card>
            <Text style={styles.cardEyebrow}>{t("settings.help")}</Text>
            <LinkRow
              styles={styles}
              label={SUPPORT_EMAIL}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            />
            <LinkRow
              styles={styles}
              label={t("settings.askAluna")}
              onPress={() => router.push("/preguntar")}
              last
            />
          </Card>
        </FadeIn>

        {/* Síguenos: igual que la web — solo aparece si al menos un link tiene href. */}
        {VISIBLE_SOCIAL_LINKS.length > 0 && (
          <FadeIn delay={210} style={styles.cardGap}>
            <Card>
              <Text style={styles.cardEyebrow}>{t("settings.followUs")}</Text>
              {VISIBLE_SOCIAL_LINKS.map((s, i) => (
                <LinkRow
                  key={s.key}
                  styles={styles}
                  label={s.label}
                  onPress={() => Linking.openURL(s.href)}
                  last={i === VISIBLE_SOCIAL_LINKS.length - 1}
                />
              ))}
            </Card>
          </FadeIn>
        )}

        {/* Legal: cada fila usa el título ya localizado del LegalDoc de @aluna/core
           (mismo patrón que la web — LEGAL_LINKS en ajustes/page.tsx), no una
           traducción propia duplicada. */}
        <FadeIn delay={240} style={styles.cardGap}>
          <Card>
            <Text style={styles.cardEyebrow}>{t("settings.legal")}</Text>
            {LEGAL_LINKS.map((l, i) => (
              <LinkRow
                key={l.slug}
                styles={styles}
                label={locale === "en" ? l.en.title : l.es.title}
                onPress={() => router.push({ pathname: "/legal", params: { doc: l.slug } })}
                last={i === LEGAL_LINKS.length - 1}
              />
            ))}
          </Card>
        </FadeIn>

        {/* Sistemas */}
        <Card style={styles.cardGap}>
          <Text style={styles.cardEyebrow}>{t("settings.systems")}</Text>
          <SystemRow styles={styles} name={t("settings.sysNumerology")} status={t("settings.available")} on />
          <SystemRow styles={styles} name={t("settings.sysCarta")} status={t("settings.available")} on />
          <SystemRow styles={styles} name={t("settings.sysBazi")} status={t("settings.available")} on />
          <SystemRow styles={styles} name={t("settings.sysReadings")} status={t("settings.soon")} last />
        </Card>

        <Pressable style={styles.reset} onPress={confirmReset}>
          <Text style={styles.resetText}>{t("settings.reset")}</Text>
        </Pressable>

        <Pressable style={[styles.reset, styles.logout]} onPress={confirmLogout}>
          <Text style={[styles.resetText, styles.logoutText]}>{t("auth.logout")}</Text>
        </Pressable>

        <Text style={styles.footNote}>{t("settings.footNote")}</Text>
        <Text style={styles.version}>{t("settings.offline")}</Text>
      </ScrollView>
    </View>
  );
}

/** Muestra del color de acento de cada tema en su chip (modo oscuro). */
const SWATCH: Record<ThemeName, string> = {
  observatory: "#e7c986",
  aurora: "#c9b8f2",
  cosmic: "#ff8ae0",
};

function Row({
  styles,
  label,
  value,
  valueStyle,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Fila tocable (mailto, chat, redes, legal) — arrow a la derecha, mismo
 * espíritu que `.rowLink` de la web (ajustes.module.css). */
function LinkRow({
  styles,
  label,
  onPress,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowArrow}>→</Text>
    </Pressable>
  );
}

function SystemRow({
  styles,
  name,
  status,
  on,
  last,
}: {
  styles: ReturnType<typeof makeStyles>;
  name: string;
  status: string;
  on?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[styles.rowLabel, styles.systemName]}>{name}</Text>
      {on ? <Text style={styles.systemOn}>{status}</Text> : <SoonBadge label={status} />}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl },

    head: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.xxl },
    title: { color: t.text, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi },

    // Espaciado entre tarjetas — antes vivía dentro de `card` (marginBottom); ahora
    // el fondo/borde/radio/padding los da <Card>, esto solo separa una de la próxima
    // (mismo mecanismo que cardGapLg/cardGapMd en index.tsx).
    cardGap: { marginBottom: space.lg },
    // Eyebrow canónico (SPEC), byte-idéntico al de index.tsx/carta.tsx/pilares.tsx:
    // 11px / letterSpacing 3 / uppercase / Quicksand semibold / acc. Estas tarjetas
    // no llevan título serif debajo (son eyebrow suelto), así que no encajan en
    // <SectionHeading> — se queda como Text local con la receta canónica.
    cardEyebrow: {
      color: t.acc,
      fontSize: typeScale.xs2,
      letterSpacing: 3,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sansSemi,
    },
    profileName: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifItalic, marginBottom: space.lg },
    muted: { color: t.textFaint, fontSize: typeScale.sm, fontFamily: fonts.sans },

    fieldLabel: {
      color: t.textDim,
      fontSize: typeScale.xs,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sans,
    },
    fieldLabelGap: { marginTop: space.xl },

    // Selector de tema: investigado en R3/Task 11 (ver comentario junto al JSX) —
    // el prop `icon` de <Chip> es compatible en el papel, pero su forma (pill de
    // ancho automático, layout en fila) no matchea esta tira de tarjetas iguales
    // de ancho fijo con el swatch arriba del label; queda local a propósito.
    themeRow: { flexDirection: "row", gap: space.sm },
    themeChip: {
      flex: 1,
      alignItems: "center",
      gap: space.sm,
      paddingVertical: space.md,
      paddingHorizontal: space.xs,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      backgroundColor: t.panel,
    },
    themeChipOn: { borderColor: t.acc, backgroundColor: t.accFaint },
    swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: t.accHair },
    themeChipText: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans, textAlign: "center" },
    themeChipTextOn: { color: t.acc },

    // Fila de chips del primitivo (modo de luz, idioma) — reemplaza al Segmented local.
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },

    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },
    rowValue: { color: t.text, fontSize: typeScale.md, fontFamily: fonts.sans, flexShrink: 1, textAlign: "right", marginLeft: space.lg },
    // ID de usuario: sin `fonts.mono` (no existe en la escala del móvil — grep
    // en theme/tokens.ts), aproximado con letterSpacing sobre la sans normal
    // (brief ajustes-movil T2, fallback explícito si no hay fuente mono).
    mono: { fontSize: typeScale.sm, letterSpacing: 0.5 },
    rowArrow: { color: t.acc, fontSize: typeScale.md, fontFamily: fonts.sans },
    systemName: { color: t.text, fontSize: typeScale.md },
    systemOn: { color: t.acc, fontSize: typeScale.xs, letterSpacing: 1, textTransform: "uppercase", fontFamily: fonts.sans },

    reset: {
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.pill,
      paddingVertical: space.lg,
      alignItems: "center",
      marginTop: space.md,
    },
    resetText: { color: t.acc, fontSize: typeScale.md, letterSpacing: 0.5, fontFamily: fonts.sans },
    logout: { marginTop: space.md, borderColor: t.warnSoft },
    logoutText: { color: t.warn },

    footNote: { color: t.textDim, fontSize: typeScale.sm, textAlign: "center", marginTop: space.xxl, fontFamily: fonts.serifItalic },
    version: { color: t.textFaint, fontSize: typeScale.xs, textAlign: "center", marginTop: space.sm, lineHeight: 18, fontFamily: fonts.sans },
  });
}
