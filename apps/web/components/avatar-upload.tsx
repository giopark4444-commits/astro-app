"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { validateAvatarFile } from "@/lib/avatar";
import styles from "./avatar-upload.module.css";

/** Avatar de la cuenta. La subida va por `/api/avatar` (server-side,
 *  service-role): el path en Storage se deriva de la sesión verificada del
 *  server, nunca de este componente. Nace de la Fase 5 — el servicio de
 *  Storage de este proyecto no resuelve auth.uid() de los tokens ES256, así
 *  que la subida client-side directa daba 403 aunque la RLS fuera correcta.
 *  La foto es pública (bucket public); el cache-bust ?v= fuerza refresco tras
 *  sobrescribir la misma ruta. `userId` ya no se usa para la ruta de Storage
 *  (la decide el server) — se conserva en la interfaz porque el resto del
 *  hero identifica al dueño de la cuenta con él. */
export function AvatarUpload({ initialUrl, fallback }: { userId: string; initialUrl: string | null; fallback: string }) {
  const t = useTranslations("profile");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-elegir el mismo archivo
    if (!file) return;
    const check = validateAvatarFile(file);
    if (!check.ok) { setError(t(check.error === "size" ? "photoTooBig" : "photoBadType")); return; }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      if (!res.ok) throw new Error(String(res.status));
      const { url: publicUrl } = (await res.json()) as { url: string };
      setUrl(`${publicUrl}?v=${Date.now()}`);
    } catch {
      // la validación de formato/tamaño ya pasó arriba → aquí el fallo es de
      // subida (red/servidor), no del archivo: mensaje genérico, no "formato inválido"
      setError(t("photoError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.ring} onClick={() => inputRef.current?.click()} aria-label={t("changePhoto")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.img} src={url} alt="" />
        ) : (
          <span className={styles.fallback}>{fallback}</span>
        )}
        <span className={styles.enso} aria-hidden />
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
      <button type="button" className={styles.changeBtn} onClick={() => inputRef.current?.click()}>
        {busy ? t("uploading") : t("changePhoto")}
      </button>
      {error && <p className={styles.err} role="alert">{error}</p>}
    </div>
  );
}
