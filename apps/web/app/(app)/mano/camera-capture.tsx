"use client";
// Cámara en vivo (pedido de Gio: "activa la cámara del celular o del compu/Mac,
// no solo elegir de la galería") — getUserMedia real, reusable desde /mano
// (CaptureScreen) y desde el hub (hoy/summary-mano.tsx). `facingMode:
// "environment"` es solo un HINT: en un celular pide la trasera; en una Mac/PC
// con una sola cámara (webcam frontal), el navegador la ignora sin romper nada
// y usa la que haya. El stream se cierra SIEMPRE al desmontar o cancelar —
// nunca se deja la cámara prendida de fondo.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./camera-capture.module.css";

export function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("mano");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "captura-mano.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <p className={styles.note}>{t("cameraError")}</p>
        <button type="button" className={styles.ghostBtn} onClick={onCancel}>
          {t("cameraCancel")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- feed en vivo de la propia cámara, sin audio ni pista de texto que aplique */}
      <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
      {!ready && <p className={styles.note}>{t("cameraLoading")}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.snapBtn} onClick={snap} disabled={!ready}>
          {t("cameraSnap")}
        </button>
        <button type="button" className={styles.ghostBtn} onClick={onCancel}>
          {t("cameraCancel")}
        </button>
      </div>
    </div>
  );
}
