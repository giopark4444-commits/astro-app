// apps/mobile/components/HoroscopeReading.tsx
// Selector de profundidad para la prosa del horóscopo del periodo. "Esencia" es la
// prosa compuesta localmente (instantánea, ya armada por content/horoscope.ts, Task
// 3); "Profunda"/"Completa" las teje Aluna vía /api/horoscope-reading (latente hasta
// que haya llave de IA → estado "gated"). Puerto de
// apps/web/app/(app)/horoscopo/horoscope-reading.tsx con UNA simplificación
// deliberada (Global Constraint del plan): la web lee la respuesta en streaming
// (ReadableStream + parseo regex parcial de un campo a medio llegar); acá SIEMPRE
// se parsea la respuesta completa como JSON — mismo camino no-streaming que
// <BodyReadingReader>/chart-reading-api.ts ya usan para /api/chart-reading. No es
// un bug a corregir, es alcance de v1 documentado en el plan.
//
// El token de acceso sale de `useAuth()` adentro del componente (no se fuerza al
// padre a pasarlo) — misma convención que el resto de móvil (BodyReading, etc).
// `reqId` descarta resultados de una petición vieja (p.ej. el usuario cambia de
// signo/periodo o de tier a medio vuelo) para que nunca pisen el estado vigente —
// mismo mecanismo que <BodyReadingReader>.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { HoroscopePeriod } from "../lib/horoscope-api";
import { apiUrl } from "../lib/config";
import { useAuth } from "../lib/auth-context";
import { useT } from "../lib/i18n-context";
import { useTheme } from "../lib/theme-context";
import { Chip } from "./ui";
import { fonts, space, type as typeScale, type ThemeTokens } from "../theme/tokens";

type Tier = "esencia" | "profunda" | "completa";

export function HoroscopeReading({
  sign,
  period,
  tz,
  essence,
}: {
  sign: string;
  period: HoroscopePeriod;
  tz: string;
  essence: string[];
}) {
  const { session } = useAuth();
  const { t, locale } = useT();
  const { t: tk } = useTheme();
  const s = useMemo(() => makeStyles(tk), [tk]);

  const [tier, setTier] = useState<Tier>("esencia");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [gated, setGated] = useState(false);
  const reqId = useRef(0);

  // Nuevo signo/periodo: vuelve a "Esencia" — evita mostrar una lectura profunda
  // que ya no corresponde al periodo abierto (misma reinicialización que la web).
  useEffect(() => {
    reqId.current++;
    setTier("esencia");
    setText("");
    setGated(false);
  }, [sign, period]);

  useEffect(() => {
    if (tier === "esencia") return;
    const mine = ++reqId.current;
    const accessToken = session?.access_token;
    if (!accessToken) {
      setBusy(false);
      setText("");
      setGated(true);
      return;
    }
    let alive = true;
    setBusy(true);
    setText("");
    setGated(false);
    void (async () => {
      try {
        const res = await fetch(`${apiUrl()}/api/horoscope-reading`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ sign, period, tz, locale, length: tier }),
        });
        const data = (await res.json()) as { available?: boolean; meaning?: { reading?: string } };
        if (!alive || mine !== reqId.current) return;
        if (data.available && data.meaning?.reading) setText(data.meaning.reading);
        else setGated(true);
      } catch {
        if (alive && mine === reqId.current) setGated(true);
      } finally {
        if (alive && mine === reqId.current) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tier, sign, period, tz, locale, session?.access_token]);

  const TIERS: Array<{ key: Tier; label: string }> = [
    { key: "esencia", label: t("reading.tierEssence") },
    { key: "profunda", label: t("reading.tierDeep") },
    { key: "completa", label: t("reading.tierComplete") },
  ];

  return (
    <View>
      <View style={s.tiers}>
        {TIERS.map((x) => (
          <Chip key={x.key} kind="control" label={x.label} selected={tier === x.key} onPress={() => setTier(x.key)} />
        ))}
      </View>
      {tier === "esencia" ? (
        essence.map((p, i) => (
          <Text key={i} style={s.para}>
            {p}
          </Text>
        ))
      ) : gated ? (
        <Text style={s.note}>{t("reading.gatedNote")}</Text>
      ) : busy ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={tk.acc} />
          <Text style={s.note}>{t("horoscopo.loading")}</Text>
        </View>
      ) : (
        <Text style={s.para}>{text}</Text>
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    tiers: { flexDirection: "row", gap: space.sm, marginBottom: space.lg, flexWrap: "wrap" },
    para: { color: t.text, fontSize: typeScale.md, lineHeight: 23, fontFamily: fonts.serif, marginBottom: space.sm },
    note: { color: t.textDim, fontSize: typeScale.sm, lineHeight: 19, fontFamily: fonts.serifItalic },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  });
}
