"use client";
import { useCallback, useEffect, useState } from "react";
import { PRESET_DECKS, type PresetDeckId } from "@aluna/core";

const STORAGE_KEY = "aluna.tarotDeck";
/** Evento custom para sincronizar instancias del hook dentro del mismo tab
 * ("storage" solo dispara en OTRAS tabs, nunca en la que hizo el write). */
const LOCAL_EVENT = "aluna:tarot-deck-changed";

function isPresetDeckId(value: unknown): value is PresetDeckId {
  return typeof value === "string" && (PRESET_DECKS as readonly string[]).includes(value);
}

function readStored(): PresetDeckId {
  if (typeof window === "undefined") return "rws";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isPresetDeckId(raw) ? raw : "rws";
  } catch {
    // localStorage inaccesible (modo privado estricto, cuota, SSR raro): rws.
    return "rws";
  }
}

/**
 * Mazo preset elegido por el usuario (Tarot T5 — selector en Ajustes).
 * Persistencia en localStorage, SIN migración de BD (Gio tiene backlog de
 * migraciones sin aplicar). SSR-safe: el estado arranca en "rws" y solo lee
 * el valor real al montar (useEffect) — evita que el HTML del server
 * (siempre "rws") desincronice con lo que haya en el navegador.
 *
 * Múltiples instancias del hook (p.ej. DeckPicker en Ajustes + useDeckAssets
 * en la vista de tarot, ambas montadas a la vez) se sincronizan vía un evento
 * custom disparado en el mismo write ("storage" nativo solo llega a otras
 * tabs, nunca a la que escribió) — best-effort, no bloqueante si algo falla.
 */
export function usePresetDeck(): { deck: PresetDeckId; setDeck: (deck: PresetDeckId) => void } {
  const [deck, setDeckState] = useState<PresetDeckId>("rws");

  useEffect(() => {
    setDeckState(readStored());
    function onChange() {
      setDeckState(readStored());
    }
    window.addEventListener("storage", onChange);
    window.addEventListener(LOCAL_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(LOCAL_EVENT, onChange);
    };
  }, []);

  const setDeck = useCallback((next: PresetDeckId) => {
    setDeckState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event(LOCAL_EVENT));
    } catch {
      // Sin persistencia (privado/cuota): el estado en memoria de ESTA
      // instancia queda actualizado igual; solo no sobrevive a un reload.
    }
  }, []);

  return { deck, setDeck };
}
