"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { Starfield } from "@/components/starfield";
import { Icon } from "@/components/icon";
import styles from "./chat.module.css";

type Msg = { role: "user" | "assistant"; content: string };
type St = "idle" | "loading" | "dormant" | "error";

export function ChatView() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { active } = useProfiles();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [st, setSt] = useState<St>("idle");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, st]);

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
        body: JSON.stringify({ profileId: activeId, locale, messages: next }),
      });
      const data = (await res.json()) as { available?: boolean; reply?: string };
      if (data.available === false) {
        setSt("dormant");
        return;
      }
      if (!res.ok || !data.reply) {
        setSt("error");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setSt("idle");
    } catch {
      setSt("error");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sky} aria-hidden>
        <Starfield />
      </div>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t("title")}</span>
        <span className={styles.enso} aria-hidden>
          <Icon name="enso" size={22} />
        </span>
      </div>

      <div className={styles.thread}>
        {messages.length === 0 && st !== "dormant" && <p className={styles.greeting}>{t("greeting")}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.aluna}`}>
            {m.content}
          </div>
        ))}
        {st === "loading" && <p className={styles.thinking}>{t("thinking")}</p>}
        {st === "error" && <p className={styles.thinking}>{t("error")}</p>}
        {st === "dormant" && (
          <div className={styles.dormant}>
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
