"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import { useSpeak } from "@/lib/voice";
import { SpeakButton } from "@/components/speak-button";
import { ChatLenses, type TarotCardRef } from "./chat-lenses";
import styles from "./chat.module.css";

type Msg = { role: "user" | "assistant"; content: string };
type St = "idle" | "loading" | "dormant" | "error";

export function ChatView({ embedded = false }: { embedded?: boolean } = {}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { speakingId, toggle, supported } = useSpeak();
  const { active } = useProfiles();
  // Se lee useSearchParams SIEMPRE (los hooks no pueden ser condicionales) e
  // ignoramos su valor cuando embedded — más simple que extraer un
  // subcomponente `PageSeed` y no viola las reglas de hooks.
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  // Precarga del input desde /hoy vía ?q= (mockup 06 §3.3): solo el valor
  // inicial — NO auto-envía la pregunta. En modo embebido (panel de Perfil)
  // no aplica: el chat ahí es general, no llega desde /hoy con una pregunta.
  const [input, setInput] = useState(() => (embedded ? "" : searchParams.get("q") ?? ""));
  const [st, setSt] = useState<St>("idle");
  const endRef = useRef<HTMLDivElement>(null);
  // Palancas de enfoque (Task 3): default = las 3 lentes base encendidas, sin
  // carta de tarot fijada. Viajan en cada POST a /api/chat (CT1 las resuelve).
  const [lenses, setLenses] = useState<string[]>(["astros", "numeros", "pilares"]);
  const [tarotCard, setTarotCard] = useState<TarotCardRef | null>(null);
  // Archivo del hilo (Fase 1B): id del hilo activo. Se aprende del header
  // x-thread-id del primer turno, o se precarga al RETOMAR abajo.
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    // jsdom (tests) no implementa scrollIntoView: guard defensivo (mismo
    // patrón que timeline-chat.tsx y reading-chat.tsx).
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, st]);

  useEffect(() => {
    // Retomar (Fase 1B): al montar, trae el hilo 'chat' más reciente y
    // precarga la conversación — no pisa el ?q= (eso vive en `input`, esto
    // solo toca `messages`/`threadId`). Guard funcional en setMessages: si la
    // persona ya empezó a escribir/enviar antes de que esto resuelva, no le
    // pisamos la conversación en curso. Best-effort total: cualquier fallo
    // (red, 401, sin hilo) deja el chat arrancando vacío, como hoy.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/thread");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { threadId: string | null; messages: Msg[] };
        if (cancelled || !data.threadId || data.messages.length === 0) return;
        const nextMessages = data.messages;
        const nextThreadId = data.threadId;
        setMessages((current) => (current.length === 0 ? nextMessages : current));
        setThreadId((current) => current ?? nextThreadId);
      } catch {
        // best-effort: sin hilo que retomar, se empieza vacío como hoy
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;
  const activeId = active.id;

  async function send() {
    const text = input.trim();
    if (!text || st === "loading") return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSt("loading");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: activeId, locale, messages: next, lenses, tarotCard, threadId }),
      });
      // El primer turno crea el hilo server-side; lo aprendemos del header
      // para que los turnos siguientes lo reenvíen (Fase 1B).
      const returnedThreadId = res.headers.get("x-thread-id");
      if (returnedThreadId) setThreadId(returnedThreadId);

      // Latente (sin llave) o error de validación → JSON { available:false }. Sin
      // stream que consumir: mostramos el estado dormido / de error.
      const isStream = res.body && res.headers.get("content-type")?.startsWith("text/plain");
      if (!isStream) {
        const data = (await res.json().catch(() => ({}))) as { available?: boolean };
        setSt(data.available === false ? "dormant" : "error");
        return;
      }
      if (!res.ok) {
        setSt("error");
        return;
      }

      // Stream de texto: añadimos la burbuja de Aluna vacía y le pegamos los tokens
      // a medida que llegan (efecto de tecleo).
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const piece = decoder.decode(value, { stream: true });
        if (!piece) continue;
        acc += piece;
        if (!started) {
          started = true;
          setSt("idle");
          setMessages([...next, { role: "assistant", content: acc }]);
        } else {
          setMessages([...next, { role: "assistant", content: acc }]);
        }
      }
      if (!started) {
        // El stream no entregó nada (upstream cortó antes del primer byte).
        setSt("error");
      }
    } catch {
      setSt("error");
    }
  }

  return (
    <div className={embedded ? styles.wrapEmbedded : styles.wrap}>
      {!embedded && (
        <>
          <div className={styles.sky} aria-hidden>
            <Starfield />
          </div>
          <div className={styles.head}>
            <span className={styles.eyebrow}>{t("title")}</span>
            <span className={styles.enso} aria-hidden>
              <Icon name="enso" size={22} />
            </span>
          </div>
        </>
      )}

      <div className={styles.lensesSlot}>
        <ChatLenses
          value={{ lenses, tarotCard }}
          onChange={(next) => {
            setLenses(next.lenses);
            setTarotCard(next.tarotCard);
          }}
        />
      </div>

      <div className={styles.thread}>
        {messages.length === 0 && st !== "dormant" && <p className={styles.greeting}>{t("greeting")}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.aluna}`}>
            {m.content}
            {m.role === "assistant" && supported && m.content.trim() && (
              <div>
                <SpeakButton
                  speaking={speakingId === `p${i}`}
                  onClick={() => toggle(`p${i}`, m.content, locale === "en" ? "en" : "es")}
                />
              </div>
            )}
          </div>
        ))}
        {st === "loading" && <p className={styles.thinking}>{t("thinking")}</p>}
        {st === "error" && <p className={styles.thinking}>{t("error")}</p>}
        {st === "dormant" && (
          <div className={`card card--dashed ${styles.dormant}`}>
            <span className={styles.dormantGlyph} aria-hidden>
              ☾
            </span>
            <p className={styles.dormantTitle}>{t("dormantTitle")}</p>
            <p className={styles.dormantBody}>{t("dormantBody")}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.composer}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
        />
        <button className={styles.sendBtn} onClick={() => void send()} disabled={st === "loading" || !input.trim()}>
          {t("send")}
        </button>
      </div>
    </div>
  );
}
