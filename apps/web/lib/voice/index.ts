"use client";
import { useEffect, useRef, useState } from "react";
import { browserSpeech } from "./browser-speech";
import type { SpeakHandle, VoiceProvider } from "./types";

export type { VoiceProvider, SpeakHandle, SpeakOptions } from "./types";

/**
 * Proveedor de voz activo. Hoy siempre la voz del navegador. Aquí entrará la
 * lógica de niveles (Free = Kokoro cuando resolvamos el bundler; Plus = Hume),
 * sin tocar a los consumidores.
 */
export function getVoiceProvider(): VoiceProvider {
  return browserSpeech;
}

/**
 * Hook para las cajas de chat: `toggle(id, texto, locale)` lee/detiene un
 * mensaje. `speakingId` es el id del mensaje que suena (para el estado del
 * botón). `supported` se resuelve tras montar (evita desajuste de hidratación).
 */
export function useSpeak() {
  const providerRef = useRef<VoiceProvider>(getVoiceProvider());
  const handleRef = useRef<SpeakHandle | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(providerRef.current.supported());
    return () => handleRef.current?.stop(); // corta la voz al desmontar
  }, []);

  function toggle(id: string, text: string, locale: "es" | "en") {
    if (speakingId === id) {
      handleRef.current?.stop();
      setSpeakingId(null);
      return;
    }
    handleRef.current?.stop();
    setSpeakingId(id);
    handleRef.current = providerRef.current.speak(text, {
      locale,
      onEnd: () => setSpeakingId((cur) => (cur === id ? null : cur)),
      onError: () => setSpeakingId((cur) => (cur === id ? null : cur)),
    });
  }

  return { speakingId, toggle, supported };
}
