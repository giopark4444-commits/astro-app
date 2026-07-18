"use client";
// Panel de chat con Aluna en el detalle de /perfil (maestro-detalle, T2): capa
// delgada sobre el ChatView embebible de /preguntar (PF1). El import cruza la
// frontera de rutas (perfil → preguntar) pero ambos son client components, así
// que no hay problema de frontera RSC. El namespace i18n es `profile` (el que
// ya usa la página de perfil; no existe uno `perfil`).
import { useTranslations } from "next-intl";
import { ChatView } from "../preguntar/chat-view";
import styles from "./perfil.module.css";

export function PerfilChatPanel() {
  const t = useTranslations("profile");
  return (
    <div className={styles.chatPanel}>
      <span className={styles.cardH2}>{t("chatTitle")}</span>
      <ChatView embedded />
    </div>
  );
}
