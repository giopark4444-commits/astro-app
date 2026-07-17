"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ajustes.module.css";

/** Botón "Copiar" opcional junto al ID de usuario (brief T2 §3, "si es
 * barato") — feedback local de 1.5s, sin estado en servidor. */
export function CopyIdButton({ value }: { value: string }) {
  const t = useTranslations("settings");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible (permiso/entorno) — falla en silencio, no crítico
    }
  }

  return (
    <button type="button" className={styles.copyBtn} onClick={handleCopy}>
      {copied ? t("copied") : t("copyId")}
    </button>
  );
}
