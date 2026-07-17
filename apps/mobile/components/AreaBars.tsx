// apps/mobile/components/AreaBars.tsx
// Barras de energía de las 6 áreas de vida (amor/dinero/trabajo/salud/ánimo/suerte),
// cada una expandible al "por qué" (los tránsitos que la mueven). Puerto directo de
// apps/web/components/area-bars.tsx — mismo contrato de props, misma lógica. NUEVO en
// móvil: Hoy-móvil nunca tuvo este componente. Componente CONTROLADO (open/onToggle
// del padre, no state local) para que el expandido sobreviva un refetch, igual que la
// web. A diferencia de la web (que hasta hoy tenía el tono calculado pero invisible,
// solo en aria-expanded/aria-label), acá el tono va SIEMPRE visible junto al label
// desde el día uno — no se replica el bug.
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme-context";
import { fonts, radius, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

export interface BarDriver {
  /** ReactNode (no solo string) para que cada glifo pueda envolverse en
   *  <Meaning/> ("toca y entiende") sin perder el layout — mismo contrato
   *  que BarArea de la web (apps/web/components/area-bars.tsx). */
  glyphs: React.ReactNode;
  text: string;
  favorable: boolean;
}
export interface BarArea {
  key: string;
  label: string;
  score: number;
  tone: "low" | "mixed" | "high";
  toneLabel: string;
  drivers: BarDriver[];
}

export function AreaBars({
  areas,
  calmText,
  open,
  onToggle,
}: {
  areas: BarArea[];
  calmText: string;
  open: string | null;
  onToggle: (key: string) => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.bars}>
      {areas.map((a) => {
        const expanded = open === a.key;
        return (
          <View key={a.key} style={s.bar}>
            <Pressable
              style={s.barHead}
              onPress={() => onToggle(a.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <Text style={s.barLabel}>
                {a.label}
                <Text style={s.barTone}> · {a.toneLabel}</Text>
              </Text>
              <Text style={s.barScore}>{a.score}</Text>
            </Pressable>
            <View style={s.track}>
              <View style={[s.fill, toneStyle(t, a.tone), { width: `${a.score}%` }]} />
            </View>
            {expanded && (
              <View style={s.why}>
                {a.drivers.length === 0 ? (
                  <Text style={s.calm}>{calmText}</Text>
                ) : (
                  a.drivers.map((d, j) => (
                    <View key={j} style={s.driverRow}>
                      <Text style={[s.driverGlyphs, d.favorable ? s.favGlyph : s.tenseGlyph]}>{d.glyphs}</Text>
                      <Text style={s.driverText}>{d.text}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Tono por clima: acento = fluido, acento tenue = mixto, t.warn = en reto. t.warn es
// el mismo campo que carta.tsx usa para aspectos duros (`aspHard: { color: t.warn }`)
// — se reusa acá en vez de un hex suelto, igual que ese precedente. La web mantiene un
// --tone-warm fijo (#e0795a) independiente del tema; móvil no tiene ese campo dedicado
// en ThemeTokens, así que t.warn (ya con esa misma función de "tenso") es el equivalente.
function toneStyle(t: ThemeTokens, tone: "low" | "mixed" | "high") {
  if (tone === "high") return { backgroundColor: t.acc };
  if (tone === "low") return { backgroundColor: t.warn };
  return { backgroundColor: t.accSoft };
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    bars: { gap: space.lg },
    bar: { gap: space.xs },
    barHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    barLabel: { color: t.text, fontFamily: fonts.serif, fontSize: typeScale.md },
    barTone: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.sm, fontStyle: "italic" },
    barScore: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.sm },
    track: { height: 7, borderRadius: radius.pill, backgroundColor: t.panel, overflow: "hidden" },
    fill: { height: "100%", borderRadius: radius.pill },
    why: { gap: space.sm, paddingTop: space.sm },
    driverRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
    driverGlyphs: { color: t.text, fontFamily: fonts.sans, fontSize: typeScale.md },
    // Tone-colors (t.warn/t.acc) sin tocar — mismo esquema semántico low/mixed/
    // high que toneStyle() de arriba, fuera de alcance de T7.
    favGlyph: { color: t.acc },
    tenseGlyph: { color: t.warn },
    driverText: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.sm, flex: 1 },
    calm: { color: t.textDim, fontFamily: fonts.sans, fontSize: typeScale.sm, fontStyle: "italic" },
  });
}
