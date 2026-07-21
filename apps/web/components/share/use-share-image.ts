"use client";
// apps/web/components/share/use-share-image.ts
// Estado + acciones del modal de compartir: formato/tema/detalle elegidos por
// el usuario, la URL de preview derivada, el caption (mismo builder puro de
// lib/share/caption.ts) y las 3 acciones (compartir nativo, descargar,
// copiar caption) + los enlaces de escritorio de respaldo cuando el
// navegador no soporta compartir archivos.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { buildCaption } from "@/lib/share/caption";
import { SHARE_THEMES, type ShareFormat, type ShareTheme } from "@/lib/share/palette";
import { resolveInsight } from "@/lib/share/resolve-insight";
import type { ShareCardParams, ShareLensParams, ShareLocale } from "@/lib/share/types";

// Mismo fallback que app/(app)/colab/referral-section.tsx y api/billing/*.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aluna.app";

function isShareTheme(value: string): value is ShareTheme {
  return (SHARE_THEMES as readonly string[]).includes(value);
}

/** Espejo exacto de lib/share/validate.ts (los mismos nombres de campo por
 *  lente) — construye la query string que la ruta /api/share-card espera. */
function toQueryString(params: ShareCardParams): string {
  const qs = new URLSearchParams({
    lens: params.lens,
    format: params.format,
    theme: params.theme,
    detail: params.detail ? "1" : "0",
    locale: params.locale,
  });
  switch (params.lens) {
    case "numeros":
      qs.set("number", String(params.number));
      qs.set("labelKey", params.labelKey);
      break;
    case "carta":
      qs.set("body", params.body);
      qs.set("sign", params.sign);
      break;
    case "pilares":
      qs.set("dayStem", params.dayStem);
      break;
    case "tarot":
      qs.set("cardId", params.cardId);
      qs.set("reversed", params.reversed ? "1" : "0");
      if (params.position) qs.set("position", params.position);
      break;
    case "horoscopo":
      qs.set("sign", params.sign);
      break;
  }
  return qs.toString();
}

export function useShareImage(lensParams: ShareLensParams) {
  const locale = useLocale() as ShareLocale;
  const t = useTranslations("share");
  const { theme: appTheme } = useTheme();

  const [format, setFormat] = useState<ShareFormat>("story");
  const [theme, setTheme] = useState<ShareTheme>(() => (isShareTheme(appTheme) ? appTheme : "observatory"));
  const [detail, setDetail] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  // Feature-detect en cliente: navigator.canShare no existe en el server render.
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setCanShareFiles(typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function");
  }, []);

  const params = useMemo<ShareCardParams>(
    () => ({ ...lensParams, format, theme, detail, locale }) as ShareCardParams,
    [lensParams, format, theme, detail, locale],
  );

  const imageUrl = useMemo(() => {
    const qs = toQueryString(params);
    return reloadKey > 0 ? `/api/share-card?${qs}&_r=${reloadKey}` : `/api/share-card?${qs}`;
  }, [params, reloadKey]);

  // Cada vez que la URL de preview cambia (formato/tema/detalle/retry), la
  // vista vuelve a "cargando" hasta que el <img> avise onLoad/onError.
  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [imageUrl]);

  const onImageLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);
  const onImageError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);
  const retryImage = useCallback(() => setReloadKey((k) => k + 1), []);

  const caption = useMemo(() => {
    const insight = resolveInsight(params);
    const cta = t(`captionCta.${params.lens}`);
    return buildCaption(insight, params.lens, locale, APP_URL, cta);
  }, [params, locale, t]);

  const shareLinks = useMemo(() => {
    const encodedCaption = encodeURIComponent(caption);
    const encodedUrl = encodeURIComponent(APP_URL);
    return {
      whatsapp: `https://wa.me/?text=${encodedCaption}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedCaption}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedCaption}`,
    };
  }, [caption]);

  const fetchBlob = useCallback(async () => {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("fetch_failed");
    return res.blob();
  }, [imageUrl]);

  const shareNative = useCallback(async () => {
    try {
      const blob = await fetchBlob();
      const file = new File([blob], `aluna-${params.lens}.jpg`, { type: "image/jpeg" });
      if (!navigator.canShare({ files: [file] })) return;
      await navigator.share({ files: [file], text: caption });
    } catch {
      // el usuario canceló la hoja nativa, o el fetch/compartir falló — no es
      // un error crítico del modal (el usuario sigue teniendo descargar/copiar).
    }
  }, [fetchBlob, caption, params.lens]);

  const download = useCallback(async () => {
    try {
      const blob = await fetchBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aluna-${params.lens}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    }
  }, [fetchBlob, params.lens]);

  const copyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible (permiso/entorno) — falla en silencio, mismo
      // criterio que ajustes/copy-id-button.tsx y colab/referral-section.tsx.
    }
  }, [caption]);

  return {
    format,
    setFormat,
    theme,
    setTheme,
    detail,
    setDetail,
    imageUrl,
    loading,
    error,
    onImageLoad,
    onImageError,
    retryImage,
    caption,
    canShareFiles,
    shareLinks,
    shareNative,
    download,
    copyCaption,
    copied,
  };
}
