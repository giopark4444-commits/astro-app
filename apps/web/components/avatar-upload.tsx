"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { validateAvatarFile, avatarPath } from "@/lib/avatar";
import type { TablesUpdate } from "@aluna/supabase";
import styles from "./avatar-upload.module.css";

// exactOptionalPropertyTypes hace que postgrest-js infiera el arg de update() como
// `never` (mismo shim que app/onboarding/actions.ts para insert()).
type ProfileUpdate = { update: (v: TablesUpdate<"profiles_user">) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } };

/** Avatar de la cuenta con subida a Storage. La foto es pública (bucket public);
 *  la escritura la restringe la RLS a la carpeta {userId}/. El cache-bust ?v=
 *  fuerza refresco tras sobrescribir la misma ruta. */
export function AvatarUpload({ userId, initialUrl, fallback }: { userId: string; initialUrl: string | null; fallback: string }) {
  const t = useTranslations("profile");
  const supabase = createClient();
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
      const path = avatarPath(userId);
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const busted = `${data.publicUrl}?v=${Date.now()}`;
      const builder = supabase.from("profiles_user") as unknown as ProfileUpdate;
      const { error: dbErr } = await builder.update({ avatar_url: path }).eq("id", userId);
      if (dbErr) throw dbErr;
      setUrl(busted);
    } catch {
      setError(t("photoBadType"));
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
