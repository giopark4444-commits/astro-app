"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BodyReading } from "@/lib/content/astrology-readings-es";
import styles from "./carta.module.css";

// Selector de profundidad para la lectura de una posición de la carta. "Esencia"
// es la lectura compuesta (instantánea); "Profunda"/"Completa" las teje Aluna vía
// /api/chart-reading (latente hasta la llave). Reusa las etiquetas de numerología.
//
// Con llave, /api/chart-reading transmite el texto (el objeto JSON
// {essence,flow,shadow}) token a token como text/plain. Parseamos los campos sobre
// la marcha para revelarlos con efecto de "escritura"; al cerrar fijamos el objeto
// estructurado. Un HIT de caché vuelve como JSON (instantáneo) y actúa como siempre.

const TIER_IDS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIER_IDS)[number];
const TIER_KEY: Record<Tier, string> = { esencia: "Essence", profunda: "Deep", completa: "Complete" };

const FIELDS = ["essence", "flow", "shadow"] as const;
type PartialReading = Partial<Record<(typeof FIELDS)[number], string>>;

type St =
  | { s: "base" }
  | { s: "loading" }
  | { s: "streaming"; partial: PartialReading }
  | { s: "ready"; r: BodyReading }
  | { s: "unavailable" }
  | { s: "error" };

export function BodyReadingView({
  base,
  body,
  sign,
  house,
  dignity,
  profileName,
}: {
  base: BodyReading;
  body: string;
  sign: string;
  house: number;
  dignity: string | null;
  profileName: string;
}) {
  const t = useTranslations("numerology.reading"); // etiquetas de tier reutilizadas
  const tc = useTranslations("carta"); // flowH / shadowH
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [st, setSt] = useState<St>({ s: "base" });
  const cache = useRef<Map<string, BodyReading>>(new Map());
  // Token de petición: descarta trozos de una transmisión vieja si el usuario
  // cambia de posición o de nivel a media transmisión.
  const reqId = useRef(0);

  useEffect(() => {
    reqId.current++;
    setTier("esencia");
    setSt({ s: "base" });
  }, [body, sign, house]);

  async function choose(next: Tier) {
    setTier(next);
    const mine = ++reqId.current;
    if (next === "esencia") {
      setSt({ s: "base" });
      return;
    }
    const key = `${locale}:${body}:${sign}:${house}:${next}`;
    const hit = cache.current.get(key);
    if (hit) {
      setSt({ s: "ready", r: hit });
      return;
    }
    setSt({ s: "loading" });
    try {
      const res = await fetch("/api/chart-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, sign, house, dignity, profileName, length: next, locale }),
      });

      // Latente (sin llave), HIT de caché o error de validación → JSON. Sin stream:
      // nos comportamos como siempre.
      const isStream = res.body && res.headers.get("content-type")?.startsWith("text/plain");
      if (!isStream) {
        const data = (await res.json().catch(() => ({}))) as { available?: boolean; meaning?: BodyReading };
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

      // Stream de texto: el objeto JSON llega troceado; revelamos los campos vistos.
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
      // Cierre: parseo estricto a {essence,flow,shadow}, la misma forma que cachea el
      // servidor, para terminar con el objeto limpio en vez de un JSON parcial.
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

  // Qué mostrar: el objeto final si está listo; el parcial mientras transmite; la
  // esencia compuesta en cualquier otro caso.
  const shown: BodyReading =
    st.s === "ready" ? st.r : st.s === "streaming" ? fromPartial(st.partial) : base;
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
            className={`${styles.ctrl} ${tier === id ? styles.ctrlOn : ""}`}
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
        {shown.essence && <p className={styles.brEssence}>{shown.essence}</p>}
        {shown.flow && (
          <div className={styles.brBlock}>
            <span className={styles.brH}>{tc("flowH")}</span>
            <p>{shown.flow}</p>
          </div>
        )}
        {shown.shadow && (
          <div className={styles.brBlock}>
            <span className={styles.brH}>{tc("shadowH")}</span>
            <p>{shown.shadow}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Completa una vista parcial a BodyReading (los campos no llegados van vacíos). */
function fromPartial(p: PartialReading): BodyReading {
  return { essence: p.essence ?? "", flow: p.flow ?? "", shadow: p.shadow ?? "" };
}

/** Parseo estricto final: extrae el objeto JSON y valida los tres campos (espeja al servidor). */
function parseReading(text: string): BodyReading | null {
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

/**
 * Extrae, de un JSON (posiblemente incompleto) que va llegando, los valores de
 * texto de los campos vistos hasta ahora. Tolera espacios, escapes (\" \\ \n \t
 * \uXXXX), un valor final aún sin cerrar, y prosa antes del primer "{".
 */
function partialFields(text: string): PartialReading {
  const out: PartialReading = {};
  const s = text;
  const n = s.length;
  let i = 0;
  while (i < n && s[i] !== "{") i++;
  if (i >= n) return out;
  i++; // pasa el {
  const skipWs = () => {
    while (i < n && /\s/.test(s[i]!)) i++;
  };
  const readString = (): { value: string; closed: boolean } => {
    i++; // pasa la comilla de apertura
    let v = "";
    while (i < n) {
      const c = s[i]!;
      if (c === "\\") {
        if (i + 1 >= n) return { value: v, closed: false };
        const e = s[i + 1]!;
        if (e === "n") v += "\n";
        else if (e === "t") v += "\t";
        else if (e === "r") v += "\r";
        else if (e === "b") v += "\b";
        else if (e === "f") v += "\f";
        else if (e === "/") v += "/";
        else if (e === '"') v += '"';
        else if (e === "\\") v += "\\";
        else if (e === "u") {
          if (i + 5 < n) {
            const hex = s.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              v += String.fromCharCode(parseInt(hex, 16));
              i += 6;
              continue;
            }
            v += "\\u";
            i += 2;
            continue;
          }
          return { value: v, closed: false };
        } else v += e;
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        return { value: v, closed: true };
      }
      v += c;
      i++;
    }
    return { value: v, closed: false };
  };
  for (;;) {
    skipWs();
    if (i >= n || s[i] === "}") break;
    if (s[i] === ",") {
      i++;
      continue;
    }
    if (s[i] !== '"') {
      i++;
      continue;
    }
    const k = readString();
    if (!k.closed) break;
    skipWs();
    if (i >= n) break;
    if (s[i] !== ":") continue;
    i++;
    skipWs();
    if (i >= n) break;
    if (s[i] === '"') {
      const val = readString();
      if ((FIELDS as readonly string[]).includes(k.value)) {
        out[k.value as (typeof FIELDS)[number]] = val.value;
      }
      if (!val.closed) break;
    } else {
      while (i < n && s[i] !== "," && s[i] !== "}") i++;
    }
  }
  return out;
}
