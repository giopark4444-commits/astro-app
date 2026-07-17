import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Text } from "react-native";
import type { GlossaryEntry } from "@aluna/core";
import { BottomSheet } from "../components/BottomSheet";
import { fonts, space, type as typeScale } from "../theme/tokens";

const TEXT_VS = "︎"; // U+FE0E: presentación de texto (no emoji) en los glifos

/**
 * Host ÚNICO de la hoja de significados, montado una vez en la raíz
 * (app/_layout.tsx). <Meaning/> nunca renderiza su propio <BottomSheet/> —
 * RN no permite anidar un <Modal> dentro de un <Text> (a diferencia de la
 * web, donde <Meaning> es un <button> hermano de su <BottomSheet>), y
 * <Meaning> necesita poder vivir DENTRO de un <Text> ya existente (glifos,
 * nombres de signo/aspecto intercalados en una frase). Solución: <Meaning>
 * solo abre/cierra este estado compartido vía contexto; el <BottomSheet>
 * real vive acá, como hermano de <Slot/> en la raíz — nunca anidado en texto.
 */
interface MeaningContextValue {
  open: (entry: GlossaryEntry) => void;
}

const MeaningContext = createContext<MeaningContextValue | null>(null);

export function MeaningProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);
  // `visible` controla la hoja; `entry` NO se limpia al cerrar (solo se
  // reemplaza al abrir la siguiente) para que el contenido siga montado
  // durante la animación de salida — si limpiáramos `entry` en `close`, el
  // título y el cuerpo desaparecerían de golpe antes de que el Modal
  // terminara de desvanecerse (destello en blanco).
  const [visible, setVisible] = useState(false);

  const open = useCallback((e: GlossaryEntry) => { setEntry(e); setVisible(true); }, []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo<MeaningContextValue>(() => ({ open }), [open]);

  return (
    <MeaningContext.Provider value={value}>
      {children}
      <BottomSheet open={visible} onClose={close} title={entry?.title}>
        {entry?.glyph && (
          <Text
            style={{ fontSize: typeScale.xl2, fontFamily: fonts.serif, textAlign: "center", marginBottom: space.sm }}
            accessibilityElementsHidden
          >
            {entry.glyph + TEXT_VS}
          </Text>
        )}
        {entry && (
          <Text style={{ fontFamily: fonts.sans, fontSize: typeScale.md, lineHeight: 22 }}>{entry.body}</Text>
        )}
      </BottomSheet>
    </MeaningContext.Provider>
  );
}

/** Acceso al host de significados. Fuera de <MeaningProvider/> (no debería
 *  pasar: vive en la raíz) degrada a no-op en vez de reventar la pantalla. */
export function useMeaningSheet(): MeaningContextValue {
  const ctx = useContext(MeaningContext);
  return ctx ?? { open: () => {} };
}
