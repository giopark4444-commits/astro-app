"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NumberMeaning } from "@/lib/content/numerology-es";
import { getVoiceMode } from "@/lib/voice-mode";
import { InterpretationModePicker } from "@/components/interpretation-mode-picker";
import styles from "./numerology-view.module.css";

// Selector de profundidad de la lectura. "Esencia" es la voz escrita a mano
// (instantánea, siempre disponible). "Profunda" y "Completa" piden la lectura
// tejida por Aluna a /api/reading; si aún no hay ANTHROPIC_API_KEY, esa ruta
// responde { available: false } y mostramos la esencia con una nota cálida.
//
// Cuando SÍ hay llave, /api/reading transmite el texto (el objeto JSON
// {essence,flow,shadow,practice}) token a token como text/plain. Aquí parseamos
// los campos sobre la marcha para revelarlos con efecto de "escritura", y al
// cerrar fijamos el objeto estructurado final. Un HIT de caché vuelve como JSON
// (instantáneo) y se comporta como siempre.

const TIER_IDS = ["esencia", "profunda", "completa"] as const;
type Tier = (typeof TIER_IDS)[number];
// Sufijo de la clave i18n por nivel: tier{Suffix} y tier{Suffix}Hint.
const TIER_KEY: Record<Tier, string> = { esencia: "Essence", profunda: "Deep", completa: "Complete" };

const FIELDS = ["essence", "flow", "shadow", "practice"] as const;
// Vista parcial de la lectura mientras llega en streaming (campos opcionales).
type PartialMeaning = Partial<Record<(typeof FIELDS)[number], string>>;

type ReadingState =
  | { status: "base" }
  | { status: "loading" }
  | { status: "streaming"; partial: PartialMeaning }
  | { status: "ready"; meaning: NumberMeaning }
  | { status: "unavailable" }
  | { status: "error" };

export function NumberReading({
  value,
  position,
  calc,
  profileName,
  meaning,
  lens,
}: {
  value: number;
  position: string;
  calc: string;
  profileName: string;
  meaning: NumberMeaning;
  lens?: string | undefined;
}) {
  const t = useTranslations("numerology.reading");
  const locale = useLocale();
  const [tier, setTier] = useState<Tier>("esencia");
  const [state, setState] = useState<ReadingState>({ status: "base" });
  const cache = useRef<Map<string, NumberMeaning>>(new Map());
  // Token de petición: si el usuario cambia de número/nivel a media transmisión,
  // descartamos los trozos de la petición vieja (evita pintar la lectura anterior).
  const reqId = useRef(0);

  // Al abrir otro número, vuelve a la esencia.
  useEffect(() => {
    reqId.current++;
    setTier("esencia");
    setState({ status: "base" });
  }, [value, position]);

  async function choose(next: Tier) {
    setTier(next);
    const mine = ++reqId.current;
    if (next === "esencia") {
      setState({ status: "base" });
      return;
    }
    // voiceMode en la clave: ver body-reading (cada modo produce texto distinto).
    const key = `${locale}:${position}:${value}:${next}:${getVoiceMode()}`;
    const hit = cache.current.get(key);
    if (hit) {
      setState({ status: "ready", meaning: hit });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value, position, length: next, profileName, calc, locale, voiceMode: getVoiceMode() }),
      });

      // Latente (sin llave), HIT de caché o error de validación → JSON. Sin stream
      // que consumir: nos comportamos como siempre.
      const isStream = res.body && res.headers.get("content-type")?.startsWith("text/plain");
      if (!isStream) {
        const data = (await res.json().catch(() => ({}))) as { available?: boolean; meaning?: NumberMeaning };
        if (mine !== reqId.current) return;
        if (!res.ok || !data.available || !data.meaning) {
          setState({ status: "unavailable" });
          return;
        }
        cache.current.set(key, data.meaning);
        setState({ status: "ready", meaning: data.meaning });
        return;
      }
      if (!res.ok) {
        if (mine === reqId.current) setState({ status: "error" });
        return;
      }

      // Stream de texto: el objeto JSON va llegando troceado. Parseamos los campos
      // disponibles en cada trozo y los revelamos (efecto de "escritura").
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const piece = decoder.decode(chunk, { stream: true });
        if (!piece) continue;
        acc += piece;
        if (mine !== reqId.current) return; // el usuario cambió: abandonar
        setState({ status: "streaming", partial: partialFields(acc) });
      }
      if (mine !== reqId.current) return;
      // Cierre: parseo estricto del texto completo a {essence,flow,shadow,practice},
      // la MISMA forma que cachea el servidor. Así el cliente termina con el objeto
      // limpio y estructurado, no con un JSON parcial.
      const finalMeaning = parseMeaning(acc);
      if (finalMeaning) {
        cache.current.set(key, finalMeaning);
        setState({ status: "ready", meaning: finalMeaning });
      } else {
        // El stream no entregó un objeto parseable (cortó antes, o vino vacío):
        // caemos al estado dormido mostrando la esencia escrita a mano.
        setState({ status: "unavailable" });
      }
    } catch {
      if (mine === reqId.current) setState({ status: "error" });
    }
  }

  return (
    <div className={styles.readingWrap}>
      <div className={`seg seg--gradient ${styles.tierRow}`} role="tablist" aria-label={t("tierEssenceHint")}>
        {TIER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tier === id}
            className={`seg__item ${styles.tier} ${tier === id ? "seg__item--active" : ""}`}
            onClick={() => choose(id)}
          >
            {t(`tier${TIER_KEY[id]}`)}
          </button>
        ))}
      </div>
      <p className={styles.tierHint}>{t(`tier${TIER_KEY[tier]}Hint`)}</p>

      {/* Task 7: modo 🌙/📚/🔭 arriba del texto generado. getVoiceMode() ya
          vive en la cache key de `choose` (arriba) — re-disparar la MISMA
          ruta de carga con el tier actual basta para pedir la lectura en el
          tono nuevo (el cache del tier/modo anterior queda intacto). */}
      <div className={styles.modePicker}>
        <InterpretationModePicker onChange={() => choose(tier)} />
      </div>

      {state.status === "loading" && (
        <div className={styles.readingLoading} aria-live="polite">
          <span className={styles.shimmer} />
          <span className={styles.shimmer} />
          <span className={styles.shimmer} />
          <p className={styles.loadingNote}>{t("loading")}</p>
        </div>
      )}

      {state.status === "streaming" && <Reading meaning={fromPartial(state.partial)} lens={lens} live />}

      {state.status === "unavailable" && (
        <div className={styles.gated}>
          <span className={styles.gatedGlyph} aria-hidden>
            ☾
          </span>
          <p className={`card card--dashed ${styles.gatedNote}`}>{t("gated")}</p>
          <Reading meaning={meaning} lens={lens} />
        </div>
      )}

      {state.status === "error" && (
        <div className={styles.gated}>
          <p className={`card card--dashed ${styles.gatedNote}`}>{t("error")}</p>
          <Reading meaning={meaning} lens={lens} />
        </div>
      )}

      {state.status === "base" && <Reading meaning={meaning} lens={lens} />}
      {state.status === "ready" && <Reading meaning={state.meaning} lens={lens} />}
    </div>
  );
}

function Reading({
  meaning,
  lens,
  live,
}: {
  meaning: NumberMeaning;
  lens?: string | undefined;
  live?: boolean;
}) {
  const t = useTranslations("numerology.reading");
  return (
    <div className={styles.reading} aria-live={live ? "polite" : undefined} aria-busy={live || undefined}>
      {lens && <p className={styles.lens}>{lens}</p>}
      {meaning.essence && <p className={styles.essence}>{meaning.essence}</p>}
      {meaning.flow && (
        <div className={styles.block}>
          <span className={styles.blockH}>{t("flowH")}</span>
          <p>{meaning.flow}</p>
        </div>
      )}
      {meaning.shadow && (
        <div className={styles.block}>
          <span className={styles.blockH}>{t("shadowH")}</span>
          <p>{meaning.shadow}</p>
        </div>
      )}
      {meaning.practice && (
        <div className={`${styles.block} ${styles.practiceBlock}`}>
          <span className={styles.blockH}>{t("practiceH")}</span>
          <p>{meaning.practice}</p>
        </div>
      )}
    </div>
  );
}

/** Completa una vista parcial a NumberMeaning (los campos que aún no llegaron van vacíos). */
function fromPartial(p: PartialMeaning): NumberMeaning {
  return {
    essence: p.essence ?? "",
    flow: p.flow ?? "",
    shadow: p.shadow ?? "",
    practice: p.practice ?? "",
  };
}

/** Parseo estricto final: extrae el objeto JSON y valida los cuatro campos (espeja al servidor). */
function parseMeaning(text: string): NumberMeaning | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
      typeof o.essence === "string" &&
      typeof o.flow === "string" &&
      typeof o.shadow === "string" &&
      typeof o.practice === "string"
    ) {
      return { essence: o.essence, flow: o.flow, shadow: o.shadow, practice: o.practice };
    }
  } catch {
    /* cae a null */
  }
  return null;
}

/**
 * Extrae, de un JSON (posiblemente incompleto) que va llegando, los valores de
 * texto de los campos vistos hasta ahora. Tolera espacios, escapes (\" \\ \n \t
 * \uXXXX), un valor final aún sin cerrar, y prosa antes del primer "{". Sirve
 * para revelar los campos a medida que el modelo los escribe.
 */
function partialFields(text: string): PartialMeaning {
  const out: PartialMeaning = {};
  const s = text;
  const n = s.length;
  let i = 0;
  while (i < n && s[i] !== "{") i++;
  if (i >= n) return out;
  i++; // pasa el {
  const skipWs = () => {
    while (i < n && /\s/.test(s[i]!)) i++;
  };
  // Lee una cadena JSON cuyo "i" apunta a la comilla de apertura.
  const readString = (): { value: string; closed: boolean } => {
    i++; // pasa la comilla de apertura
    let v = "";
    while (i < n) {
      const c = s[i]!;
      if (c === "\\") {
        if (i + 1 >= n) return { value: v, closed: false }; // backslash colgante a mitad de stream
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
          return { value: v, closed: false }; // \u incompleto al final del stream
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
    return { value: v, closed: false }; // se acabó el texto: sigue llegando
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
    if (!k.closed) break; // la clave misma sigue llegando
    skipWs();
    if (i >= n) break;
    if (s[i] !== ":") continue;
    i++; // pasa el :
    skipWs();
    if (i >= n) break;
    if (s[i] === '"') {
      const val = readString();
      if ((FIELDS as readonly string[]).includes(k.value)) {
        out[k.value as (typeof FIELDS)[number]] = val.value;
      }
      if (!val.closed) break; // el valor sigue llegando → el resto aún no está
    } else {
      while (i < n && s[i] !== "," && s[i] !== "}") i++;
    }
  }
  return out;
}
