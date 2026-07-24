"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { PalmFeatures } from "@/lib/palm/schema";
import { getVoiceMode } from "@/lib/voice-mode";
import { resizePalmPhoto } from "../mano/resize-image";
import { loadPalmReading, savePalmReading } from "../mano/storage";
import { CameraCapture } from "../mano/camera-capture";
import { PalmIllustration } from "./palm-illustration";
import styles from "./summary.module.css";

// Tarjeta-resumen de Lectura de mano para el dashboard (pedido de Gio: "una
// ventana para subir la foto de la mano y que sea interpretada") — a
// diferencia de las otras tarjetas-resumen (que solo LEEN una lente ya
// existente), esta SÍ dispara un flujo real: subir una foto → analizarla →
// tejer la lectura, con los MISMOS 2 endpoints y el MISMO storage por
// dispositivo que /mano (aluna.palm.<profileId> — leer/escribir desde acá o
// desde /mano es la MISMA lectura). Versión compacta a propósito ("lo
// esencial"): una sola mano (la dominante, derecha), sin el selector de
// cuántas manos/cuál lado ni la guía de retoma foto-por-foto de /mano — el
// CTA de abajo lleva a la ceremonia completa (las 2 manos, las 6 secciones).
type St =
  | { s: "idle" }
  | { s: "analyzing" }
  | { s: "reading-loading" }
  | { s: "ready"; sintesis: string }
  | { s: "dormant" }
  | { s: "error" };

export function SummaryMano({ profileId }: { profileId: string }) {
  const t = useTranslations();
  const localeRaw = useLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";
  const [st, setSt] = useState<St>({ s: "idle" });
  // Cámara en vivo como opción PRIMARIA (pedido de Gio, mismo patrón que
  // /mano CaptureScreen): "Elegir foto" queda de respaldo/secundaria.
  const [showCamera, setShowCamera] = useState(false);

  // Al montar (o cambiar de perfil), si ya hay una lectura guardada (de acá o
  // de /mano) la muestra directo — sin pedir nada a la red. loadPalmReading ya
  // valida que `sintesis` sea un string no vacío (ver storage.ts), pero el
  // indexado de Record<string,string> sigue tipando `string | undefined` acá
  // (noUncheckedIndexedAccess) — el guard extra deja el narrow explícito.
  useEffect(() => {
    const saved = loadPalmReading(profileId);
    const sintesis = saved?.sections.sintesis;
    setSt(sintesis ? { s: "ready", sintesis } : { s: "idle" });
  }, [profileId]);

  async function handleFile(file: File) {
    setSt({ s: "analyzing" });
    try {
      const image = await resizePalmPhoto(file);
      const res = await fetch("/api/palm-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, hand: "dominante", locale }),
      });
      if (res.status === 413) {
        setSt({ s: "error" });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { available?: boolean; features?: PalmFeatures };
      if (!res.ok || data.available === false) {
        setSt(data.available === false ? { s: "dormant" } : { s: "error" });
        return;
      }
      const feats = data.features;
      if (!feats || feats.image_quality.usable === false) {
        setSt({ s: "error" });
        return;
      }

      setSt({ s: "reading-loading" });
      const readRes = await fetch("/api/palm-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hands: { dominante: feats }, profileId, locale, voiceMode: getVoiceMode() }),
      });
      const readData = (await readRes.json().catch(() => ({}))) as {
        available?: boolean;
        sections?: Record<string, string>;
        hasNatal?: boolean;
      };
      if (!readRes.ok || readData.available === false) {
        setSt(readData.available === false ? { s: "dormant" } : { s: "error" });
        return;
      }
      if (!readData.sections || typeof readData.sections.sintesis !== "string") {
        setSt({ s: "error" });
        return;
      }
      savePalmReading(profileId, {
        sections: readData.sections,
        hasNatal: Boolean(readData.hasNatal),
        fecha: new Date().toISOString(),
        manos: ["dominante"],
      });
      setSt({ s: "ready", sintesis: readData.sections.sintesis });
    } catch {
      setSt({ s: "error" });
    }
  }

  return (
    <section className={`card ${styles.card}`}>
      <h2 className={styles.title}>{t("hoy.summaryManoTitle")}</h2>

      {st.s === "idle" && (
        <>
          {/* Silueta + líneas de la palma (Gio: "algo referente bien lindo") —
              puramente decorativa, solo en el estado idle (antes de subir
              foto); no compite con la cámara/lectura una vez hay algo real
              que mostrar. */}
          <div className={styles.palmArt}>
            <PalmIllustration />
          </div>
          <p className={styles.note}>{t("mano.privacySeal")}</p>
          {showCamera ? (
            <CameraCapture
              onCapture={(file) => {
                setShowCamera(false);
                void handleFile(file);
              }}
              onCancel={() => setShowCamera(false)}
            />
          ) : (
            <div className={styles.uploadChoices}>
              <button type="button" className={styles.uploadBtn} onClick={() => setShowCamera(true)}>
                {t("mano.cameraCta")}
              </button>
              <span className={styles.uploadOr}>{t("mano.cameraOr")}</span>
              <label className={styles.uploadBtnGhost}>
                {t("mano.captureCta")}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className={styles.uploadInput}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {st.s === "analyzing" && <p className={styles.note}>{t("mano.analyzing")}</p>}
      {st.s === "reading-loading" && <p className={styles.note}>{t("mano.readingLoading")}</p>}
      {st.s === "dormant" && <p className={styles.note}>☾ {t("mano.dormantBody")}</p>}
      {st.s === "error" && (
        <>
          <p className={styles.note}>{t("mano.error")}</p>
          <button type="button" className={styles.uploadBtn} onClick={() => setSt({ s: "idle" })}>
            {t("mano.retry")}
          </button>
        </>
      )}
      {st.s === "ready" && <p className={styles.summaryP}>{st.sintesis}</p>}

      <Link href="/mano" className={styles.cta}>
        {t("hoy.summaryManoCta")} →
      </Link>
    </section>
  );
}
