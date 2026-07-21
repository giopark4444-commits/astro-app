// apps/web/lib/share/caption.ts
// Construye el texto para acompañar la imagen al compartir. Puro: sin I/O, sin
// React, sin next-intl — ningún otro módulo puro del repo importa
// messages/*.json directamente (resolve-insight.ts, por el contrario, duplica
// localmente los términos cortos que necesita), así que este módulo sigue el
// mismo criterio y recibe `cta` ya resuelto por el caller (route/componente),
// que sí puede leer el namespace `share.captionCta.*` de messages/es.json y
// en.json.
import type { ResolvedInsight, ShareLens, ShareLocale } from "./types";

const QUOTE_MAX_CHARS = 140;

/** Comillas angulares en español, comillas rectas dobles en inglés — mismo
 *  criterio tipográfico que el resto de la prosa del repo (content/*-es.ts
 *  usa « » cuando cita, *-en.ts usa " "). */
const QUOTE_MARKS: Record<ShareLocale, readonly [string, string]> = {
  es: ["«", "»"],
  en: ["“", "”"],
};

/** Recorta la quote a ~140 chars en el límite de palabra más cercano (nunca
 *  parte una palabra a la mitad) + "…". Si ya entra, la devuelve intacta. */
function truncateQuote(quote: string): string {
  if (quote.length <= QUOTE_MAX_CHARS) return quote;
  const cut = quote.slice(0, QUOTE_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${trimmed}…`;
}

/** Punto de entrada único: arma el caption completo (quote recortada + CTA
 *  por lente + link con UTM). `cta` es la frase ya resuelta de
 *  `share.captionCta.<lens>` (i18n) — este módulo no la busca, la recibe. */
export function buildCaption(insight: ResolvedInsight, lens: ShareLens, locale: ShareLocale, appUrl: string, cta: string): string {
  const [open, close] = QUOTE_MARKS[locale];
  const quote = truncateQuote(insight.quote);
  return `${open}${quote}${close} — ${cta} ${appUrl}?utm_source=share&utm_medium=card&utm_campaign=${lens}`;
}
