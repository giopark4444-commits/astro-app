"use client";
// Card "Tus datos" (Fase 1C — importar/exportar la memoria): portabilidad ya
// prometida en la política de privacidad (@aluna/core legal-es/en). Dos
// descargas directas (GET /api/memory/export?format=json|md, el navegador las
// resuelve solo con <a download>, sin JS) y un import (POST /api/memory/import
// con el JSON leído del disco vía FileReader). Client component porque el
// import necesita estado local (progreso/resultado/error) — mismo criterio de
// split que DeckManager en este mismo directorio.
import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ajustes.module.css";

export function MemoryDataCard() {
  const t = useTranslations("settings");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ memories: number; entities: number } | null>(null);
  const [error, setError] = useState(false);

  async function handleImport(file: File) {
    setImporting(true);
    setError(false);
    setResult(null);
    try {
      const text = await file.text();
      const payload: unknown = JSON.parse(text);
      const res = await fetch("/api/memory/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("import_failed");
      const data = (await res.json()) as { imported: { memories: number; entities: number } };
      setResult(data.imported);
    } catch {
      setError(true);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("memoryDataTitle")}</h2>
      <p className={styles.memoriesHint}>{t("memoryDataHint")}</p>

      <div className={styles.memoryDataActions}>
        <a href="/api/memory/export?format=json" download className={styles.memoryDataBtn}>
          {t("memoryExportJson")}
        </a>
        <a href="/api/memory/export?format=md" download className={styles.memoryDataBtn}>
          {t("memoryExportMd")}
        </a>
        <label className={styles.memoryDataBtn}>
          {t("memoryImport")}
          <input
            type="file"
            accept=".json,application/json"
            className={styles.fileInput}
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleImport(file);
            }}
          />
        </label>
      </div>

      {result && (
        <p className={styles.memoriesHint}>
          {t("memoryImportOk", { memories: result.memories, entities: result.entities })}
        </p>
      )}
      {error && <p className={styles.referralError}>{t("memoryImportError")}</p>}
    </section>
  );
}
