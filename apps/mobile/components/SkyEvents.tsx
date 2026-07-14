// apps/mobile/components/SkyEvents.tsx
// Lista del cielo del periodo: lunaciones, estaciones (retro/directo) e ingresos
// de signo. Puerto directo de apps/web/app/(app)/horoscopo/sky-events.tsx — misma
// lógica de ramificación por `kind`, mismo `solarHouseOf` de `@aluna/core`, mismas
// etiquetas de casa solar (Task 3, content/horoscope.ts). RN: `View`/`Text` en vez
// de `ul`/`li`; `Intl.DateTimeFormat` funciona igual en RN, sin cambios.
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PLANETS, solarHouseOf } from "@aluna/core";
import { astroLabels } from "../content/astrology";
import { SOLAR_HOUSE_LABELS_ES, SOLAR_HOUSE_LABELS_EN } from "../content/horoscope";
import type { SkyEventJson } from "../lib/horoscope-api";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { fonts, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

const TEXT_VS = "︎"; // presentación de texto (no emoji) en los glifos
const PLANET_GLYPH = Object.fromEntries(PLANETS.map((p) => [p.key, p.glyph + TEXT_VS]));

export function SkyEvents({ events, baseSign, tz }: { events: SkyEventJson[]; baseSign: string; tz: string }) {
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const s = useMemo(() => makeStyles(tk), [tk]);
  const L = astroLabels(locale);
  const HOUSES = locale === "en" ? SOLAR_HOUSE_LABELS_EN : SOLAR_HOUSE_LABELS_ES;
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en" : "es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }),
    [locale, tz],
  );

  if (events.length === 0) {
    return <Text style={s.empty}>{t("horoscopo.noEvents")}</Text>;
  }

  return (
    <View style={s.wrap}>
      {events.map((e, i) => {
        let glyph = "☽" + TEXT_VS;
        let label = "";
        if (e.kind === "lunation") {
          const house = solarHouseOf(baseSign, e.longitude);
          label = `${t(e.phase === "new" ? "horoscopo.newMoon" : "horoscopo.fullMoon")} · ${L.signs[e.sign] ?? ""} · ${HOUSES[house]}`;
          if (e.eclipse) label += ` · ${t(e.eclipse === "solar" ? "horoscopo.eclipseSolar" : "horoscopo.eclipseLunar")}`;
        } else if (e.kind === "station") {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t(e.direction === "retrograde" ? "horoscopo.stationRetro" : "horoscopo.stationDirect", {
            body: L.bodies[e.body] ?? e.body,
          });
        } else if (e.kind === "ingress") {
          glyph = PLANET_GLYPH[e.body] ?? "•";
          label = t("horoscopo.ingress", { body: L.bodies[e.body] ?? e.body, sign: L.signs[e.toSign] ?? e.toSign });
        }
        const last = i === events.length - 1;
        return (
          <View key={i} style={[s.row, last && s.rowLast]}>
            <Text style={s.glyph}>{glyph}</Text>
            <Text style={s.label}>{label}</Text>
            <Text style={s.date}>{fmt.format(new Date(e.atIso))}</Text>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { width: "100%" },
    empty: {
      color: t.textDim,
      fontSize: typeScale.sm,
      fontFamily: fonts.sans,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: space.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      paddingVertical: space.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.accHair,
    },
    rowLast: { borderBottomWidth: 0 },
    glyph: { color: t.acc, fontSize: typeScale.lg, fontFamily: fonts.serif, width: 22, textAlign: "center" },
    label: { flex: 1, color: t.text, fontSize: typeScale.sm, fontFamily: fonts.sans },
    date: { color: t.textDim, fontSize: typeScale.xs, fontFamily: fonts.sans },
  });
}
