import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { computeNumerology, numberColor, type NumerologyResult, type ReductionTrace } from "@aluna/core";
import { Enso } from "../../components/Enso";
import { BottomSheet } from "../../components/BottomSheet";
import { NumberReading } from "../../components/NumberReading";
import { Card, Chip, FadeIn, ToggleRow } from "../../components/ui";
import { useProfile } from "../../lib/profile-context";
import { useTheme } from "../../lib/theme-context";
import { useT } from "../../lib/i18n-context";
import { profileToNumerologyInput } from "../../lib/profile";
import { numerologyContent } from "../../content/numerology";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../../theme/tokens";

// Solo los 4 números de "núcleo" del mockup 10 (Expresión/Alma/Personalidad/
// Madurez). "birthday" (Día de Nacimiento) no tiene celda en el grid compacto
// — se reubica dentro de Modo Pro (ver abajo) en vez de perderse (mismo
// principio que T4 en carta.tsx: no borrar funcionalidad visible, reubicarla).
type CoreKey = "expression" | "soulUrge" | "personality" | "maturity";
const ageLabel = (from: number, to: number | null) => (to === null ? `${from}+` : `${from}–${to}`);

interface SheetState {
  positionKey: string;
  trace: ReductionTrace;
}

export default function NumerosScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { t: tk, paletteMode } = useTheme();
  const colorful = paletteMode === "colorful";
  const { t, locale } = useT();
  const styles = useMemo(() => makeStyles(tk), [tk]);
  const content = numerologyContent(locale);
  const { labels, gloss, lens, nicknames, personalYear: personalYearVoice } = content;
  const [pro, setPro] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  // Año civil actual — el mismo "asOf" implícito que usa computeNumerology
  // cuando no se le pasa uno explícito (ver packages/core/numerology/compute.ts).
  const currentYear = new Date().getFullYear();

  const result = useMemo<NumerologyResult | null>(() => {
    if (!profile) return null;
    try {
      return computeNumerology(profileToNumerologyInput(profile));
    } catch {
      return null;
    }
  }, [profile]);

  if (!profile || !result) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyWrap}>
          <Enso size={48} />
          <Text style={styles.emptyText}>{t("numerology.emptyMap")}</Text>
        </View>
      </View>
    );
  }

  const { core, karmic, pinnacles, challenges, cycles } = result;
  const coreItems: Array<{ key: CoreKey; trace: ReductionTrace }> = [
    { key: "expression", trace: core.expression },
    { key: "soulUrge", trace: core.soulUrge },
    { key: "personality", trace: core.personality },
    { key: "maturity", trace: core.maturity },
  ];
  const maxIncl = Math.max(1, ...Object.values(karmic.inclusion));

  return (
    // Sin backgroundColor propio ni <Starfield/> local: el radial nocturno + estrellas
    // ya viven en ThemedBackground (capa raíz, Task 2) — esta pantalla queda transparente.
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera del mockup 10: eyebrow + h1 con el nombre interpolado, apilados.
            Sin Enso (solo vive en Hoy) y sin control alguno (numeros.html no trae uno). */}
        <View style={styles.head}>
          <Text style={styles.eyebrow}>{t("numerology.title")}</Text>
          <Text style={styles.h1} maxFontSizeMultiplier={1.2}>
            {t("numerology.headTitle", { name: profile.name })}
          </Text>
        </View>

        {/* HERO — Camino de Vida: fila horizontal (número 64px a la izquierda +
            stack de texto), receta card--tinted. Reemplaza el anillo circular
            vertical de antes. La fórmula de reducción inline se quita: ya vive,
            sin duplicarla, dentro de la hoja de lectura (NumberReading) que se
            abre al tocar la tarjeta. El badge de número maestro se conserva como
            chip discreto junto al eyebrow (el mockup no lo muestra porque su
            ejemplo — 7 — no es maestro, pero es funcionalidad visible hoy que no
            debe perderse silenciosamente cuando SÍ aplica). */}
        <FadeIn delay={0} style={styles.fadeFull}>
          <Pressable onPress={() => setSheet({ positionKey: "lifePath", trace: core.lifePath })}>
            <Card accent style={styles.hero}>
              <Text
                style={[styles.heroN, colorful && { color: numberColor(core.lifePath.value) }]}
                maxFontSizeMultiplier={1.2}
              >
                {core.lifePath.value}
              </Text>
              <View style={styles.heroStack}>
                <View style={styles.heroEyebrowRow}>
                  <Text style={styles.eyebrow}>{labels.lifePath}</Text>
                  {core.lifePath.isMaster && <Chip kind="tag" label={t("numerology.master")} />}
                </View>
                <Text style={styles.heroSub}>{nicknames[core.lifePath.value]}</Text>
                <Text style={styles.heroTxt}>{lens.lifePath}</Text>
              </View>
            </Card>
          </Pressable>
        </FadeIn>

        {/* Núcleo — grid 2×2 estricto (mockup §3): número (32px, exento de la
            escala) + etiqueta-eyebrow + apodo. */}
        <FadeIn delay={60} style={styles.fadeFull}>
          <View style={styles.grid2}>
            {coreItems.map((it) => (
              <Pressable
                key={it.key}
                style={styles.cellPress}
                onPress={() => setSheet({ positionKey: it.key, trace: it.trace })}
              >
                <Card style={styles.cell}>
                  <Text style={[styles.cellN, colorful && { color: numberColor(it.trace.value) }]}>{it.trace.value}</Text>
                  <Text style={styles.cellL}>{labels[it.key]}</Text>
                  <Text style={styles.cellSub}>{nicknames[it.trace.value]}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </FadeIn>

        {/* Año personal — fila destacada SIEMPRE visible (mockup §4), fuera de
            Modo Pro. Antes vivía como 1 de 3 columnas iguales dentro de Pro junto
            a mes/día personal (que se quedan en Pro, ver abajo). */}
        <FadeIn delay={100} style={styles.fadeFull}>
          <Card style={styles.yearRow}>
            <Text style={[styles.yearNum, colorful && { color: numberColor(cycles.personalYear.value) }]}>
              {cycles.personalYear.value}
            </Text>
            <Text style={styles.yearTxt}>
              <Text style={styles.yearLead}>
                {t("numerology.personalYear")} {currentYear}
              </Text>
              {" · "}
              {personalYearVoice[cycles.personalYear.value] ?? ""}
            </Text>
          </Card>
        </FadeIn>

        {/* CTA "lectura completa" (mockup §5): no existe una pantalla nueva de
            "todos tus números" — reutiliza la misma hoja de lectura que abre el
            héroe (Camino de Vida es la lectura central/representativa), sin
            inventar navegación nueva. */}
        <FadeIn delay={140} style={styles.fadeFull}>
          <Pressable onPress={() => setSheet({ positionKey: "lifePath", trace: core.lifePath })}>
            <Card style={styles.linkRow}>
              <Text style={styles.linkText}>{t("numerology.ctaFull")}</Text>
            </Card>
          </Pressable>
        </FadeIn>

        {/* Toggle Modo Pro */}
        <ToggleRow label={t("numerology.pro")} on={pro} onPress={() => setPro(!pro)} style={{ marginTop: space.lg }} />

        {pro && (
          <View style={styles.proBody}>
            {/* Día de Nacimiento: 5ª celda del grid viejo, sin lugar en el grid
                compacto del mockup — reubicada aquí en vez de eliminada. */}
            <SectionCard styles={styles} title={t("numerology.birthdayTitle")}>
              <Pressable
                style={styles.birthdayRow}
                onPress={() => setSheet({ positionKey: "birthday", trace: core.birthday })}
              >
                <Text style={styles.birthdayN}>{core.birthday.value}</Text>
                <Text style={styles.birthdaySub}>{gloss.birthday}</Text>
                <Text style={styles.birthdayChev}>›</Text>
              </Pressable>
            </SectionCard>

            {/* Lecciones y deudas kármicas */}
            <SectionCard styles={styles} title={t("numerology.karmicLessons")}>
              <View style={styles.chips}>
                {karmic.lessons.length ? (
                  karmic.lessons.map((n) => (
                    <View key={n} style={styles.chip}>
                      <Text style={styles.chipText}>{n}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>{t("numerology.none")}</Text>
                )}
              </View>
              {karmic.debts.length > 0 && (
                <>
                  <Text style={styles.cardSub}>{t("numerology.debts")}</Text>
                  <View style={styles.chips}>
                    {karmic.debts.map((n) => (
                      <View key={n} style={[styles.chip, styles.chipWarn]}>
                        <Text style={[styles.chipText, styles.chipWarnText]}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </SectionCard>

            {/* Tabla de inclusión */}
            <SectionCard styles={styles} title={t("numerology.inclusion")}>
              <View style={styles.incl}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                  const c = karmic.inclusion[d] ?? 0;
                  const hot = c === maxIncl && c > 0;
                  const miss = c === 0;
                  return (
                    <View key={d} style={[styles.inclCell, hot && styles.inclHot, miss && styles.inclMiss]}>
                      <Text style={[styles.inclD, hot && styles.inclDHot]}>{d}</Text>
                      <Text style={styles.inclC}>{c === 0 ? "—" : `×${c}`}</Text>
                    </View>
                  );
                })}
              </View>
              {karmic.hiddenPassion.length > 0 && (
                <Text style={styles.muted}>
                  {t("numerology.hiddenPassion")}: {karmic.hiddenPassion.join(", ")}
                </Text>
              )}
            </SectionCard>

            {/* Pináculos y desafíos */}
            <SectionCard styles={styles} title={t("numerology.pinnacles")}>
              <Timeline styles={styles} items={pinnacles.map((p) => ({ value: p.value, age: ageLabel(p.startAge, p.endAge) }))} />
              <Text style={styles.cardSub}>{t("numerology.challenges")}</Text>
              <Timeline styles={styles} items={challenges.map((c) => ({ value: c.value, age: ageLabel(c.startAge, c.endAge) }))} />
            </SectionCard>

            {/* Ciclos del momento — el año personal ya se sacó a la fila
                siempre-visible de arriba; aquí solo quedan mes y día. */}
            <SectionCard styles={styles} title={t("numerology.cycles")}>
              <View style={styles.cycles}>
                <Cyc styles={styles} value={cycles.personalMonth.value} label={t("numerology.personalMonth")} />
                <Cyc styles={styles} value={cycles.personalDay.value} label={t("numerology.personalDay")} />
              </View>
            </SectionCard>
          </View>
        )}
      </ScrollView>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? (labels[sheet.positionKey] ?? "") : ""}
      >
        {sheet && <NumberReading positionKey={sheet.positionKey} trace={sheet.trace} />}
      </BottomSheet>
    </View>
  );
}

/** Tarjeta con título "eyebrow" (LECCIONES/INCLUSIÓN/...) sobre el primitivo <Card>.
 * Renombrada de "Card" a "SectionCard" para no chocar con el primitivo importado
 * (misma convención que carta.tsx). */
function SectionCard({
  styles,
  title,
  children,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {children}
    </Card>
  );
}

function Timeline({
  styles,
  items,
}: {
  styles: ReturnType<typeof makeStyles>;
  items: Array<{ value: number; age: string }>;
}) {
  return (
    <View style={styles.timeline}>
      {items.map((it, k) => (
        <View key={k} style={styles.tcell}>
          <Text style={styles.tN}>{it.value}</Text>
          <Text style={styles.tAge}>{it.age}</Text>
        </View>
      ))}
    </View>
  );
}

function Cyc({
  styles,
  value,
  label,
}: {
  styles: ReturnType<typeof makeStyles>;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.cyc}>
      <Text style={styles.cycN}>{value}</Text>
      <Text style={styles.cycL}>{label}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.xl, alignItems: "center" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg },
    emptyText: { color: t.textDim, fontSize: typeScale.md, fontFamily: fonts.sans },

    // Cabecera: eyebrow + h1, apilados a la izquierda — receta "eyebrow"+"h-serif"
    // del mockup, idéntica a la de carta.tsx (T4).
    head: { width: "100%", gap: 2, marginBottom: space.xl },
    eyebrow: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", fontFamily: fonts.sansSemi },
    h1: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi },

    // <FadeIn> envuelve secciones que ya declaraban width:"100%" (necesario
    // porque `scroll` centra sus hijos con alignItems).
    fadeFull: { width: "100%" },

    // HERO Camino de Vida: fila horizontal, número 64px (hero-exento) a la
    // izquierda + stack de texto a la derecha. Card `accent` aproxima el
    // gradiente dorado de `.card--tinted`.
    hero: { width: "100%", flexDirection: "row", alignItems: "center", gap: 14, minHeight: 150, padding: space.lg },
    heroN: { color: t.accText, fontSize: 64, lineHeight: 64, fontFamily: fonts.serifSemi, flexShrink: 0 },
    heroStack: { flex: 1, gap: 5 },
    heroEyebrowRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    heroSub: { color: t.text, fontSize: typeScale.lg2, fontFamily: fonts.serifItalic },
    heroTxt: { color: t.textDim, fontSize: typeScale.md, lineHeight: 21, fontFamily: fonts.sansMedium },

    // Grid 2×2 núcleo — 2 columnas via flex-wrap (mismo mecanismo probado que la
    // versión anterior, solo con el gap del mockup).
    grid2: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, width: "100%" },
    cellPress: { width: "47%", minWidth: 150 },
    cell: { paddingVertical: space.md, paddingHorizontal: 14, minHeight: 106, justifyContent: "center", gap: 2 },
    cellN: { color: t.accText, fontSize: typeScale.xl3, fontFamily: fonts.serifSemi },
    cellL: { color: t.accText, fontSize: typeScale.sm, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 2, fontFamily: fonts.sansSemi },
    cellSub: { color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sansMedium },

    // Año personal: fila destacada, siempre visible. Número 28px (hero-exento).
    yearRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 0, paddingHorizontal: space.lg },
    yearNum: { color: t.accText, fontSize: 28, lineHeight: 28, fontFamily: fonts.serifSemi, flexShrink: 0 },
    yearTxt: { flex: 1, color: t.textDim, fontSize: typeScale.md, lineHeight: 20, fontFamily: fonts.sansMedium },
    yearLead: { color: t.text, fontFamily: fonts.sansSemi },

    // CTA-fantasma "Ver la lectura completa" — fila tipo link, centrada.
    linkRow: { width: "100%", minHeight: 48, paddingVertical: 0, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center" },
    linkText: { color: t.accText, fontSize: typeScale.md, fontFamily: fonts.sansSemi },

    proBody: { width: "100%", marginTop: space.xl, gap: space.lg },
    // Fondo/borde/radio ahora los da <Card>; queda solo el ancho.
    card: { width: "100%" },
    cardH: {
      color: t.accText,
      fontSize: typeScale.sm,
      letterSpacing: 2.5,
      textTransform: "uppercase",
      marginBottom: space.md,
      fontFamily: fonts.sansSemi,
    },
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

    // Día de Nacimiento (reubicado desde el grid principal): fila tocable, mismo
    // lenguaje que las filas de "posiciones" de carta.tsx.
    birthdayRow: { flexDirection: "row", alignItems: "center", gap: space.md },
    birthdayN: { color: t.accText, fontSize: typeScale.xl2, fontFamily: fonts.serifSemi, width: 30 },
    birthdaySub: { flex: 1, color: t.textDim, fontSize: typeScale.sm, fontFamily: fonts.sans },
    birthdayChev: { color: t.accText, opacity: 0.85, fontSize: typeScale.md, fontFamily: fonts.serifSemi },

    // Chips de dígito kármico: badge circular fijo, no una pill de <Chip> (la data
    // solo trae dígitos sueltos, no el texto descriptivo del mockup web) — local
    // legítimo, ver informe de la tarea.
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    chip: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.accSoft,
      backgroundColor: t.accFaint,
    },
    chipText: { color: t.accText, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    chipWarn: { borderColor: t.warn, backgroundColor: t.warnSoft },
    chipWarnText: { color: t.warn },

    // Celdas de la tabla de inclusión: radio/fondo propios (radius.sm sobre t.panel,
    // no el patrón de <Card>) — mini-estadística, no tarjeta.
    incl: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "space-between" },
    inclCell: {
      width: "30%",
      paddingVertical: space.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.sm,
      backgroundColor: t.panel,
    },
    inclHot: { borderColor: t.acc, backgroundColor: t.accFaint },
    inclMiss: { opacity: 0.45 },
    inclD: { color: t.text, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    inclDHot: { color: t.accText },
    inclC: { color: t.textDim, fontSize: typeScale.sm, marginTop: 2, fontFamily: fonts.sans },

    timeline: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
    tcell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: space.md,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.sm,
      backgroundColor: t.panel,
    },
    tN: { color: t.accText, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    tAge: { color: t.textFaint, fontSize: typeScale.sm, marginTop: 2, fontFamily: fonts.sans },

    cycles: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
    cyc: { flex: 1, alignItems: "center" },
    cycN: { color: t.accText, fontSize: typeScale.xl2, fontFamily: fonts.serif },
    cycL: { color: t.textDim, fontSize: typeScale.sm, marginTop: space.xs, textAlign: "center", fontFamily: fonts.sans },
  });
}
