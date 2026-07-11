import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { type GeocodeResult, formatPlace, searchPlaces } from "../lib/geocode";
import { useTheme } from "../lib/theme-context";
import { useT } from "../lib/i18n-context";
import { fonts, radius, space, type ThemeTokens } from "../theme/tokens";

/**
 * Autocompletado de lugar con Open-Meteo (sin API key), equivalente del de la web.
 * Debounce 280ms, cancela la petición previa, muestra hasta 6 resultados.
 */
export function PlaceAutocomplete({
  picked,
  onPick,
  placeholder,
}: {
  picked: GeocodeResult | null;
  onPick: (p: GeocodeResult) => void;
  placeholder: string;
}) {
  const { t } = useTheme();
  const { locale } = useT();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [q, setQ] = useState(picked ? formatPlace(picked) : "");
  const [opts, setOpts] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!touched) return;
    if (q.trim().length < 2) {
      setOpts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      searchPlaces(q, ctrl.current.signal, locale).then((res) => {
        setOpts(res);
        setLoading(false);
      });
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, touched, locale]);

  function choose(o: GeocodeResult) {
    onPick(o);
    setQ(formatPlace(o));
    setOpts([]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={(v) => {
            setTouched(true);
            setQ(v);
          }}
          placeholder={placeholder}
          placeholderTextColor={t.textFaint}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={t.acc} style={styles.spin} />}
      </View>

      {opts.length > 0 && (
        <View style={styles.options}>
          {opts.map((o, i) => (
            <Pressable
              key={`${o.name}-${o.latitude}-${i}`}
              style={({ pressed }) => [styles.option, pressed && styles.optionOn, i > 0 && styles.optionDivider]}
              onPress={() => choose(o)}
            >
              <Text style={styles.optName}>{o.name}</Text>
              <Text style={styles.optMeta}>{[o.admin1, o.country].filter(Boolean).join(", ")}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    wrap: { width: "100%" },
    inputRow: { justifyContent: "center" },
    input: {
      backgroundColor: t.panelSoft,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md + 2,
      color: t.text,
      fontSize: 18,
      fontFamily: fonts.sans,
      textAlign: "center",
    },
    spin: { position: "absolute", right: space.md },
    // Superficie tipo Card a mano, NO el primitivo: necesita overflow:"hidden" para
    // recortar los divisores de las filas contra el radio — <Card> no declara overflow
    // (su highlight absoluto lo necesita visible). Local legítimo, ver R3/Task 11.
    options: {
      marginTop: space.sm,
      backgroundColor: t.panel,
      borderWidth: 1,
      borderColor: t.accHair,
      borderRadius: radius.md,
      overflow: "hidden",
    },
    option: { paddingHorizontal: space.lg, paddingVertical: space.md },
    optionOn: { backgroundColor: t.accFaint },
    optionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.accHair },
    optName: { color: t.text, fontSize: 16, fontFamily: fonts.sans },
    optMeta: { color: t.textDim, fontSize: 13, marginTop: 2, fontFamily: fonts.sans },
  });
}
