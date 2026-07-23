"use client";
// Panel de chat con Aluna, reusable en el `interpCol` (panel derecho sticky,
// maestro-detalle) de las lentes carta/horóscopo/números/pilares: capa
// delgada sobre el ChatView embebible de /preguntar, mismo patrón que
// perfil/perfil-chat-panel.tsx (T2) — pero al aplicar a 4 lentes distintas
// vive en components/ (compartido) en vez de duplicarse por ruta. Namespace
// i18n propio `chat.lensChatTitle` (perfil ya usa `profile.chatTitle`; el
// namespace `chat` es el que ChatView usa internamente, así que es el natural
// aquí). El ChatView embebido llena el alto que le da el padre y scrollea su
// `.thread` por dentro (ver chat.module.css .wrapEmbedded).
import { useTranslations } from "next-intl";
import { ChatView } from "@/app/(app)/preguntar/chat-view";
import styles from "./lens-chat-panel.module.css";

export function LensChatPanel() {
  const t = useTranslations("chat");
  return (
    <div className={styles.lensChatPanel}>
      <span className={styles.title}>{t("lensChatTitle")}</span>
      <div className={styles.body}>
        <ChatView embedded />
      </div>
    </div>
  );
}
