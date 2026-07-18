"use client";
// "Pregúntale a tu camino" (Camino de vida T6) — botón flotante en la página
// completa del camino de vida que abre la BottomSheet compartida con la
// conversación. Clon estructural de app/(app)/tarot/reading-chat.tsx: (a)
// apunta a /api/timeline/chat con el profileId, (b) el PRIMER turno lo abre
// la IA sola — al montar mandamos messages:[] y la respuesta (o el
// available:false latente) es lo primero que ve la persona.
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSpeak } from "@/lib/voice";
import { SpeakButton } from "@/components/speak-button";
import { BottomSheet } from "@/components/bottom-sheet";
import styles from "./timeline-chat.module.css";

type Msg = { role: "user" | "assistant"; content: string };
type St = "opening" | "idle" | "loading" | "dormant" | "error";

function TimelineChatBody({ profileId }: { profileId: string }) {
  const t = useTranslations("lifetime");
  const locale = useLocale();
  const { speakingId, toggle, supported } = useSpeak();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [st, setSt] = useState<St>("opening");
  const endRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    // jsdom (tests) no implementa scrollIntoView: guard defensivo.
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, st]);

  async function post(nextMessages: Msg[]) {
    const res = await fetch("/api/timeline/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, profileId, messages: nextMessages }),
    });

    // Latente (sin llave) o error de validación → JSON { available:false }.
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
      }
      setMessages([...nextMessages, { role: "assistant", content: acc }]);
    }
    if (!started) setSt("error");
  }

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    setSt("loading");
    void post([]).catch(() => setSt("error"));
    // Solo al montar: el turno-0 lo dispara la apertura de la sheet, no la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || st === "loading" || st === "opening") return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSt("loading");
    try {
      await post(next);
    } catch {
      setSt("error");
    }
  }

  return (
    <div className={styles.wrap} data-testid="timeline-chat">
      {st === "dormant" ? (
        <div className={`card card--dashed ${styles.dormant}`}>
          <p className={styles.dormantTitle}>{t("chatDormantTitle")}</p>
          <p className={styles.dormantBody}>{t("chatDormantBody")}</p>
        </div>
      ) : (
        <>
          <div className={styles.thread}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.aluna}`}>
                {m.content}
                {m.role === "assistant" && supported && m.content.trim() && (
                  <div>
                    <SpeakButton
                      speaking={speakingId === `lt${i}`}
                      onClick={() => toggle(`lt${i}`, m.content, locale === "en" ? "en" : "es")}
                    />
                  </div>
                )}
              </div>
            ))}
            {(st === "loading" || st === "opening") && <p className={styles.thinking}>{t("chatThinking")}</p>}
            {st === "error" && <p className={styles.thinking}>{t("chatError")}</p>}
            <div ref={endRef} />
          </div>

          <div className={styles.composer}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder={t("chatPlaceholder")}
              aria-label={t("chatPlaceholder")}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => void send()}
              disabled={st === "loading" || st === "opening" || !input.trim()}
            >
              {t("chatSend")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Botón flotante + BottomSheet: vive en la página completa del camino de
 *  vida. Sin profileId (perfil aún no cargado) no se renderiza — nada que
 *  preguntar sin hechos que anclar. */
export function TimelineChatFab({ profileId }: { profileId?: string | undefined }) {
  const t = useTranslations("lifetime");
  const [open, setOpen] = useState(false);
  if (!profileId) return null;

  return (
    <>
      <button type="button" className={styles.fab} onClick={() => setOpen(true)}>
        {t("chatFab")}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("chatTitle")}>
        {open && <TimelineChatBody profileId={profileId} />}
      </BottomSheet>
    </>
  );
}
