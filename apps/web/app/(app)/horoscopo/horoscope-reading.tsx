"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HoroscopePeriod } from "@/lib/horoscope/western";
import { getVoiceMode } from "@/lib/voice-mode";
import styles from "./horoscopo.module.css";

// Selector de profundidad para la prosa del horóscopo del periodo. "Esencia" es
// la prosa compuesta (instantánea, ya en `essence`); "Profunda"/"Completa" las
// teje Aluna vía /api/horoscope-reading (latente hasta la llave). Reusa las
// etiquetas de numerología (numerology.reading.*), igual que <BodyReadingView>
// en /carta. Espejo COMPACTO de ese patrón: un solo campo de texto ("reading")
// en vez de tres (essence/flow/shadow), así que el parseo parcial del stream es
// una extracción regex de un campo en vez del parser de campos múltiples.
//
// `reqId` descarta resultados de una petición vieja (p.ej. abortada al cambiar
// de signo o de tier a medio vuelo) para que nunca pisen el estado de la
// petición vigente — mismo mecanismo de token que <BodyReadingView>.

type Tier = "esencia" | "profunda" | "completa";

export function HoroscopeReading({
  sign, period, tz, essence,
}: { sign: string; period: HoroscopePeriod; tz: string; essence: string[] }) {
  const t = useTranslations("numerology.reading");
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [gated, setGated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    reqId.current++;
    setTier("esencia"); setText(""); setGated(false);
  }, [sign, period]);

  useEffect(() => {
    if (tier === "esencia") return;
    const mine = ++reqId.current;
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    setBusy(true); setText(""); setGated(false);
    void (async () => {
      try {
        const res = await fetch("/api/horoscope-reading", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sign, period, tz, locale, length: tier, voiceMode: getVoiceMode() }),
          signal: ctrl.signal,
        });
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await res.json()) as { available?: boolean; meaning?: { reading?: string } };
          if (mine !== reqId.current) return;
          if (data.available && data.meaning?.reading) setText(data.meaning.reading);
          else setGated(true);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) { if (mine === reqId.current) setGated(true); return; }
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (mine !== reqId.current) return;
          acc += dec.decode(value, { stream: true });
          const m = acc.match(/"reading"\s*:\s*"((?:[^"\\]|\\.)*)/);
          if (m) {
            // Escape a medio llegar (p.ej. barra final) → esperar el próximo chunk.
            try { setText(JSON.parse(`"${m[1]}"`) as string); } catch { /* chunk parcial */ }
          }
        }
      } catch {
        if (mine === reqId.current) setGated(true);
      } finally {
        if (mine === reqId.current) setBusy(false);
      }
    })();
    return () => ctrl.abort();
  }, [tier, sign, period, tz, locale]);

  const TIERS: Array<{ key: Tier; label: string }> = [
    { key: "esencia", label: t("tierEssence") },
    { key: "profunda", label: t("tierDeep") },
    { key: "completa", label: t("tierComplete") },
  ];

  return (
    <div>
      <div className={styles.periods} role="tablist" aria-label={t("tierEssence")}>
        {TIERS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tier === x.key}
            className={`seg__item ${tier === x.key ? "seg__item--active" : ""}`}
            onClick={() => setTier(x.key)}>{x.label}</button>
        ))}
      </div>
      {tier === "esencia" ? (
        essence.map((p, i) => <p key={i} className={styles.prosePara}>{p}</p>)
      ) : gated ? (
        <p className={styles.noEvents}>{t("gated")}</p>
      ) : (
        <p className={styles.prosePara}>{text || (busy ? t("loading") : "")}</p>
      )}
    </div>
  );
}
