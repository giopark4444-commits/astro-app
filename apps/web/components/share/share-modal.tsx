"use client";
// apps/web/components/share/share-modal.tsx
// Modal de compartir — calco de aluna-share-diseno/index.html §06 ("El modal de
// compartir": .modal/.m-prev/.m-side/.m-seg/.m-dots/.m-btn), pero con los
// tokens del TEMA DE LA APP (var(--acc)/--line/--surface/...): el modal vive
// dentro de la app y respeta su tema activo. Solo la card preview (la imagen
// real que devuelve /api/share-card) muestra el tema elegido para la tarjeta.
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/bottom-sheet";
import { SHARE_FORMATS, SHARE_FORMAT_DIMENSIONS, SHARE_PALETTES, SHARE_THEMES, type ShareFormat } from "@/lib/share/palette";
import type { ShareLensParams } from "@/lib/share/types";
import { useShareImage } from "./use-share-image";
import styles from "./share-modal.module.css";

const FORMAT_LABEL_KEY: Record<ShareFormat, string> = {
  story: "formatStory",
  feed: "formatFeed",
  square: "formatSquare",
};

export function ShareModal({
  open, onClose, params,
}: { open: boolean; onClose: () => void; params: ShareLensParams }) {
  const t = useTranslations("share");
  const share = useShareImage(params);
  const dims = SHARE_FORMAT_DIMENSIONS[share.format];

  return (
    <BottomSheet open={open} onClose={onClose} center wide hideTitle title={t("title")}>
      <div className={styles.body}>
        <div className={styles.prev}>
          <div className={styles.frame} style={{ ["--ar" as string]: dims.w / dims.h }}>
            {share.error ? (
              <div className={styles.errorBox}>
                <p className={styles.errorText}>{t("shareError")}</p>
                <button type="button" className={styles.retryBtn} onClick={share.retryImage}>
                  {t("retry")}
                </button>
              </div>
            ) : (
              <>
                {share.loading && <div className={styles.shimmer} aria-hidden />}
                <img
                  key={share.imageUrl}
                  src={share.imageUrl}
                  alt={t("previewAlt")}
                  className={styles.previewImg}
                  style={{ opacity: share.loading ? 0 : 1 }}
                  onLoad={share.onImageLoad}
                  onError={share.onImageError}
                />
              </>
            )}
          </div>
        </div>

        <div className={styles.side}>
          <h3 className={styles.title}>{t("title")}</h3>

          <div className={styles.field}>
            <span className={styles.label}>{t("format")}</span>
            <div className="seg" role="group" aria-label={t("format")}>
              {SHARE_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`seg__item ${share.format === f ? "seg__item--active" : ""}`}
                  aria-pressed={share.format === f}
                  onClick={() => share.setFormat(f)}
                >
                  {t(FORMAT_LABEL_KEY[f])}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>{t("theme")}</span>
            <div className={styles.dots} role="group" aria-label={t("theme")}>
              {SHARE_THEMES.map((th) => (
                <button
                  key={th}
                  type="button"
                  className={`${styles.dot} ${share.theme === th ? styles.dotOn : ""}`}
                  style={{ background: SHARE_PALETTES[th].bg }}
                  aria-pressed={share.theme === th}
                  aria-label={t(`themeNames.${th}`)}
                  title={t(`themeNames.${th}`)}
                  onClick={() => share.setTheme(th)}
                />
              ))}
            </div>
          </div>

          <button type="button" className={styles.toggle} aria-pressed={share.detail} onClick={() => share.setDetail(!share.detail)}>
            <span>{t("showDetail")}</span>
            <span className={styles.sw} data-on={share.detail || undefined} aria-hidden />
          </button>

          <div className={styles.actions}>
            {share.canShareFiles ? (
              <button type="button" className={styles.btnPri} onClick={() => void share.shareNative()}>
                {t("share")}
              </button>
            ) : (
              <div className={styles.linkRow}>
                <a className={styles.linkBtn} href={share.shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")} WhatsApp`}>
                  WhatsApp
                </a>
                <a className={styles.linkBtn} href={share.shareLinks.telegram} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")} Telegram`}>
                  Telegram
                </a>
                <a className={styles.linkBtn} href={share.shareLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")} X`}>
                  X
                </a>
              </div>
            )}
            <button type="button" className={styles.btnGho} onClick={() => void share.download()}>
              {t("download")}
            </button>
            <button type="button" className={styles.btnGho} onClick={() => void share.copyCaption()}>
              {share.copied ? t("copied") : t("copyCaption")}
            </button>
          </div>

          <p className={styles.note}>{t("privacyNote")}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
