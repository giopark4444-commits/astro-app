// Colores Wu Xing (五行) — R3: única fuente de verdad, RN-safe. Espejados hoy en
// apps/web/app/(app)/pilares/pilares.module.css (.el_*/.elBg_*, se MANTIENEN como
// clases CSS — CSS no puede importar TS — con comentario apuntando aquí) y en
// apps/mobile/app/(tabs)/pilares.tsx (import directo tras esta tarea, antes EL_COLOR
// local). Comparte las claves fire/earth/water con el zodiaco (constants/colors.ts)
// pero SOLO fire coincide en valor — dominios separados, nunca fusionar (earth Wu Xing
// #d4a85f ≠ earth zodiaco #7fb069; water Wu Xing #7aaae0 ≠ water zodiaco #9b8fd6).
import type { WuXingElement } from "./bazi";

export const WU_XING_COLORS: Record<WuXingElement, string> = {
  wood: "#7fb069",
  fire: "#e0795a",
  earth: "#d4a85f",
  metal: "#b8b6c8",
  water: "#7aaae0",
};
