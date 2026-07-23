"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./dev-model-picker.module.css";

// Selector de modelo de PRUEBA (banco A/B de proveedores) para las ventanas de
// chat. Solo aparece si /api/dev-models responde (development o
// MODEL_PICKER_ENABLED=1); en producción esa ruta da 404 y este componente no
// renderiza nada. La elección se recuerda por superficie (localStorage) y se
// manda a la ruta como body.modelOverride; el header x-aluna-model de la
// respuesta se muestra como "→ respondió …" para saber quién habló de verdad.

export interface DevModelValue {
  provider: string;
  model: string;
}

interface CatalogModel {
  id: string;
  label: string;
}

interface CatalogProvider {
  id: string;
  label: string;
  hasKey: boolean;
  models: CatalogModel[];
}

interface CatalogStatus {
  enabled: boolean;
  providers: CatalogProvider[];
}

// Una sola petición por página aunque haya varios chats montados.
let statusPromise: Promise<CatalogStatus | null> | null = null;
function fetchStatus(): Promise<CatalogStatus | null> {
  if (!statusPromise) {
    statusPromise = fetch("/api/dev-models")
      .then((res) => (res.ok ? (res.json() as Promise<CatalogStatus>) : null))
      .catch(() => null);
  }
  return statusPromise;
}

const AUTO = "auto";
const CUSTOM = "custom";

function storageKey(surface: string): string {
  return `aluna.dev-model.${surface}`;
}

function readStored(surface: string): DevModelValue | null {
  try {
    const raw = window.localStorage.getItem(storageKey(surface));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevModelValue;
    if (typeof parsed?.provider === "string" && typeof parsed?.model === "string") return parsed;
  } catch {
    /* storage roto o JSON viejo: se ignora */
  }
  return null;
}

function writeStored(surface: string, value: DevModelValue | null) {
  try {
    if (value) window.localStorage.setItem(storageKey(surface), JSON.stringify(value));
    else window.localStorage.removeItem(storageKey(surface));
  } catch {
    /* sin storage (Safari privado): la elección vive solo en memoria */
  }
}

export function DevModelPicker({
  surface,
  onChange,
  lastModel,
}: {
  surface: string;
  onChange: (value: DevModelValue | null) => void;
  lastModel?: string | null;
}) {
  const [providers, setProviders] = useState<CatalogProvider[] | null>(null);
  const [selection, setSelection] = useState<string>(AUTO);
  const [customText, setCustomText] = useState<string>("");
  // onChange vive en ref para no re-disparar el efecto de arranque si el padre
  // recrea el callback en cada render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let alive = true;
    void fetchStatus().then((status) => {
      if (!alive || !status?.enabled) return;
      setProviders(status.providers);
      const stored = readStored(surface);
      if (stored) {
        const inCatalog = status.providers.some(
          (p) => p.id === stored.provider && p.models.some((m) => m.id === stored.model),
        );
        setSelection(inCatalog ? `${stored.provider}|${stored.model}` : CUSTOM);
        if (!inCatalog) setCustomText(`${stored.provider}/${stored.model}`);
        onChangeRef.current(stored);
      }
    });
    return () => {
      alive = false;
    };
  }, [surface]);

  if (!providers) return null;

  const apply = (value: DevModelValue | null) => {
    writeStored(surface, value);
    onChange(value);
  };

  const handleSelect = (next: string) => {
    setSelection(next);
    if (next === AUTO) {
      apply(null);
    } else if (next === CUSTOM) {
      // Se aplica al confirmar el texto (enter/blur), no al elegir la opción.
    } else {
      const sep = next.indexOf("|");
      apply({ provider: next.slice(0, sep), model: next.slice(sep + 1) });
    }
  };

  const applyCustom = () => {
    const text = customText.trim();
    const sep = text.indexOf("/");
    if (sep <= 0) return;
    const provider = text.slice(0, sep);
    const model = text.slice(sep + 1);
    if (!providers.some((p) => p.id === provider) || !model) return;
    apply({ provider, model });
  };

  return (
    <div className={styles.row} data-testid="dev-model-picker">
      <span className={styles.tag} title="Selector de modelo (solo pruebas)">
        🧪
      </span>
      <select
        className={styles.select}
        value={selection}
        onChange={(e) => handleSelect(e.target.value)}
        aria-label="Modelo de IA (pruebas)"
      >
        <option value={AUTO}>Auto (default)</option>
        {providers.map((p) => (
          <optgroup key={p.id} label={p.hasKey ? p.label : `${p.label} · sin llave`}>
            {p.models.map((m) => (
              <option key={m.id} value={`${p.id}|${m.id}`} disabled={!p.hasKey}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {selection === CUSTOM ? (
        <input
          className={styles.custom}
          value={customText}
          placeholder="proveedor/modelo (p.ej. hermes/Hermes-4-405B)"
          onChange={(e) => setCustomText(e.target.value)}
          onBlur={applyCustom}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyCustom();
            }
          }}
          aria-label="Modelo custom proveedor/modelo"
        />
      ) : null}
      {lastModel ? <span className={styles.last}>→ {lastModel}</span> : null}
    </div>
  );
}
