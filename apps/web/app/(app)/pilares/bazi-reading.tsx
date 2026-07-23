"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { composeBaziReading, type BaziReading, type PillarSet } from "@aluna/core";
import { getVoiceMode } from "@/lib/voice-mode";
import { readPremiumFlagForRequest } from "@/lib/credits/premium-client";
import styles from "./pilares.module.css";

// Selector de profundidad para "Lectura de tus pilares" (Ba Zi/Saju). "Esencia" es
// la lectura compuesta determinista (composeBaziReading, @aluna/core) — instantánea,
// sin llave. "Profunda"/"Completa" las teje Aluna vía /api/bazi-reading (latente
// hasta la llave). Clon EXACTO del patrón de carta/body-reading.tsx: mismo streaming
// text/plain, mismo caché por tier, mismo manejo de estados — solo cambian los
// campos (la IA devuelve {essence,flow,shadow}; la esencia compuesta trae
// {essence,strength,favorable}, unificados aquí bajo "segundo"/"tercer" bloque con
// etiqueta propia por tier).

const TIER_IDS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIER_IDS)[number];
const TIER_KEY: Record<Tier, string> = { esencia: "Essence", profunda: "Deep", completa: "Complete" };

interface AiReading {
  essence: string;
  flow: string;
  shadow: string;
}

type St =
  | { s: "base" }
  | { s: "loading" }
  | { s: "streaming"; partial: Partial<AiReading> }
  | { s: "ready"; r: AiReading }
  | { s: "unavailable" }
  | { s: "error" };

export function BaziReadingView({
  pillars,
  profileId,
  profileName,
}: {
  pillars: PillarSet;
  profileId: string;
  profileName: string;
}) {
  const t = useTranslations("numerology.reading"); // etiquetas de tier reutilizadas
  const tp = useTranslations("pilares");
  const locale = useLocale() as "es" | "en";
  const [tier, setTier] = useState<Tier>("esencia");
  const [st, setSt] = useState<St>({ s: "base" });
  const cache = useRef<Map<string, AiReading>>(new Map());
  const reqId = useRef(0);

  const base: BaziReading = composeBaziReading(pillars, locale);

  useEffect(() => {
    reqId.current++;
    setTier("esencia");
    setSt({ s: "base" });
    cache.current.clear();
  }, [pillars.day.stem, pillars.day.branch, pillars.month.stem, pillars.year.stem]);

  async function choose(next: Tier) {
    setTier(next);
    const mine = ++reqId.current;
    if (next === "esencia") {
      setSt({ s: "base" });
      return;
    }
    // voiceMode en la clave: ver body-reading (cada modo produce texto distinto).
    const key = `${locale}:${next}:${getVoiceMode()}`;
    const hit = cache.current.get(key);
    if (hit) {
      setSt({ s: "ready", r: hit });
      return;
    }
    setSt({ s: "loading" });
    try {
      const res = await fetch("/api/bazi-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // premium viene del toggle ✨ global del chat, no de UI propia de esta lente.
        body: JSON.stringify({
          profileId,
          profileName,
          length: next,
          locale,
          voiceMode: getVoiceMode(),
          premium: readPremiumFlagForRequest(),
        }),
      });
      const isStream = res.body && res.headers.get("content-type")?.startsWith("text/plain");
      if (!isStream) {
        const data = (await res.json().catch(() => ({}))) as { available?: boolean; meaning?: AiReading };
        if (mine !== reqId.current) return;
        if (!res.ok || !data.available || !data.meaning) {
          setSt({ s: "unavailable" });
          return;
        }
        cache.current.set(key, data.meaning);
        setSt({ s: "ready", r: data.meaning });
        return;
      }
      if (!res.ok) {
        if (mine === reqId.current) setSt({ s: "error" });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const piece = decoder.decode(chunk, { stream: true });
        if (!piece) continue;
        acc += piece;
        if (mine !== reqId.current) return;
        setSt({ s: "streaming", partial: partialFields(acc) });
      }
      if (mine !== reqId.current) return;
      const finalR = parseReading(acc);
      if (finalR) {
        cache.current.set(key, finalR);
        setSt({ s: "ready", r: finalR });
      } else {
        setSt({ s: "unavailable" });
      }
    } catch {
      if (mine === reqId.current) setSt({ s: "error" });
    }
  }

  const essence = st.s === "ready" ? st.r.essence : st.s === "streaming" ? st.partial.essence ?? "" : base.essence;
  const secondLabel = tier === "esencia" ? tp("strengthTitle") : tp("flowH");
  const thirdLabel = tier === "esencia" ? tp("favorTitle") : tp("shadowH");
  const second =
    tier === "esencia"
      ? base.strength
      : st.s === "ready"
        ? st.r.flow
        : st.s === "streaming"
          ? st.partial.flow ?? ""
          : "";
  const third =
    tier === "esencia"
      ? base.favorable
      : st.s === "ready"
        ? st.r.shadow
        : st.s === "streaming"
          ? st.partial.shadow ?? ""
          : "";
  const live = st.s === "streaming";

  return (
    <div className={styles.bodyReading}>
      <div className={styles.ctrlRow} role="tablist" aria-label={t("tierEssenceHint")}>
        {TIER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tier === id}
            className={`chip--control ${tier === id ? "chip--control-on" : ""}`}
            onClick={() => choose(id)}
          >
            {t(`tier${TIER_KEY[id]}`)}
          </button>
        ))}
      </div>
      <p className={styles.tierHint}>{t(`tier${TIER_KEY[tier]}Hint`)}</p>

      {st.s === "loading" && <p className={styles.solar}>{t("loading")}</p>}
      {st.s === "unavailable" && <p className={styles.solar}>☾ {t("gated")}</p>}
      {st.s === "error" && <p className={styles.solar}>{t("error")}</p>}

      <div aria-live={live ? "polite" : undefined} aria-busy={live || undefined}>
        {essence && <p className={styles.brEssence}>{essence}</p>}
        {second && (
          <div className={styles.brBlock}>
            <span className={styles.brH}>{secondLabel}</span>
            <p>{second}</p>
          </div>
        )}
        {third && (
          <div className={styles.brBlock}>
            <span className={styles.brH}>{thirdLabel}</span>
            <p>{third}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function partialFields(text: string): Partial<AiReading> {
  const grab = (field: string): string | undefined => {
    const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, "s");
    const m = re.exec(text);
    if (!m) return undefined;
    return m[1]!.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  };
  const out: Partial<AiReading> = {};
  const essence = grab("essence");
  const flow = grab("flow");
  const shadow = grab("shadow");
  if (essence !== undefined) out.essence = essence;
  if (flow !== undefined) out.flow = flow;
  if (shadow !== undefined) out.shadow = shadow;
  return out;
}

function parseReading(text: string): AiReading | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (typeof o.essence === "string" && typeof o.flow === "string" && typeof o.shadow === "string") {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow };
    }
  } catch {
    /* cae a null */
  }
  return null;
}
