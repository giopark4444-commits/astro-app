"use client";

import { useEffect, useState } from "react";
import styles from "./dev-model-guide.module.css";

// Guía de modelos por rubro (herramienta de PRUEBAS, hermana del picker 🧪).
// Vive en /ajustes y documenta QUÉ modelo conviene fijar en cada parte de la
// app, con el estado en vivo de cada llave (via /api/dev-models — misma ruta
// gateada que el picker: en producción responde 404 y esta tarjeta no
// renderiza nada). Las recomendaciones son datos, no lógica: cuando Gio decida
// los ganadores definitivos, este mapa pasa a ser la config de producción.

interface GuideStatus {
  enabled: boolean;
  providers: Array<{ id: string; hasKey: boolean }>;
}

interface GuideRow {
  rubro: string;
  detalle: string;
  modelo: string;
  /** Proveedor cuya llave habilita la recomendación (estado en vivo). */
  provider: string;
  nota?: string;
}

const GUIDE: GuideRow[] = [
  {
    rubro: "Chat (Pregúntale a Aluna + tirada)",
    detalle: "Lo recurrente y adictivo — aquí NO se ahorra",
    modelo: "GPT-5.6 Luna · sube a Terra si el presupuesto da",
    provider: "openai",
  },
  {
    rubro: "Primera lectura / interpretación profunda",
    detalle: "Una vez por usuario: date el lujo",
    modelo: "GPT-5.6 Terra",
    provider: "openai",
  },
  {
    rubro: "Horóscopo diario + volumen",
    detalle: "Plantillado, alto volumen",
    modelo: "Gemini 3.6 Flash (gratis, 1.500/día)",
    provider: "gemini",
  },
  {
    rubro: "Lectura de mano 👁️ (prototipo)",
    detalle: "Etapa de visión: mirar la foto",
    modelo: "Gemini Flash (gratis)",
    provider: "gemini",
  },
  {
    rubro: "Lectura de mano 👁️ (producción)",
    detalle: "Visión fina de líneas (2576px)",
    modelo: "Claude Sonnet 5",
    provider: "anthropic",
  },
  {
    rubro: "Tarot + lecturas místicas (plan final)",
    detalle: "Máxima inmersión, 1/5 del costo de Terra",
    modelo: "Hermes 4 405B",
    provider: "hermes",
  },
  {
    rubro: "Volumen ultra barato (plan final)",
    detalle: "~$0.001 por lectura",
    modelo: "Hermes 4 70B",
    provider: "hermes",
  },
];

const REGLAS = [
  "Los GRATIS de nube (Groq, OpenRouter, free tier de Gemini) son para PRUEBAS: nunca default de usuarios reales (límites + usan tus datos para entrenar).",
  "Ollama solo existe en tu Mac: desaparece solo al desplegar.",
  "Las llaves van en apps/web/.env.local (local) y en las Environment Variables de Vercel (producción).",
  "El selector 🧪 de cada chat manda sobre esta guía mientras pruebas; en producción no existe.",
];

export function DevModelGuide() {
  const [status, setStatus] = useState<GuideStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/dev-models")
      .then((res) => (res.ok ? (res.json() as Promise<GuideStatus>) : null))
      .catch(() => null)
      .then((s) => {
        if (alive && s?.enabled) setStatus(s);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;

  const hasKey = (id: string) => status.providers.some((p) => p.id === id && p.hasKey);

  return (
    <section className="card" data-testid="dev-model-guide">
      <h2 className={styles.eyebrow}>🧪 Guía de modelos por rubro (pruebas)</h2>
      <p className={styles.intro}>
        Qué modelo fijar en cada parte cuando pasemos el mapa a producción. El chip muestra si su
        llave ya está puesta.
      </p>
      <div className={styles.rows}>
        {GUIDE.map((g) => (
          <div key={g.rubro} className={styles.row}>
            <div className={styles.rubro}>
              <span className={styles.rubroName}>{g.rubro}</span>
              <span className={styles.detalle}>{g.detalle}</span>
            </div>
            <div className={styles.pick}>
              <span className={styles.modelo}>{g.modelo}</span>
              <span className={hasKey(g.provider) ? styles.keyOk : styles.keyMissing}>
                {hasKey(g.provider) ? "🟢 llave lista" : "⚪ falta llave"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <ul className={styles.reglas}>
        {REGLAS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}
