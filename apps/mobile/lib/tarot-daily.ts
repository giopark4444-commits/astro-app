// Lógica pura del umbral de tarot: "¿ya está revelada/guardada la carta del
// día?" — extraída para poder testearla sin RN (patrón de todo lib/ del
// repo). Espeja el fix "servidor-como-verdad" de apps/web/app/(app)/tarot/
// tarot-view.tsx:90-130 — si el diario del GET ya trae una lectura
// spread:"daily" de HOY (comparando la fecha local del created_at contra
// localDate, misma tz), esa es la verdad: revelada+guardada, sin importar lo
// que diga el storage local (que pudo borrarse, o venir de otro dispositivo).
// Solo si el servidor no la tiene se cae al storage local (revelada
// visualmente pero sin confirmar en el servidor pide un reintento del POST).

/** Forma mínima de una fila del diario que esta función necesita — evita
 *  acoplar lib/tarot-daily.ts al tipo completo TarotReadingRow de tarot-api.ts. */
export interface TarotDiaryReadingLike {
  spread: string;
  created_at: string;
}

export interface DailyStorageFlags {
  /** aluna.tarotDailyRevealed.v1:{userId}:{localDate} === "1" */
  revealed: boolean;
  /** aluna.tarotDailySaved.v1:{userId}:{localDate} === "1" */
  saved: boolean;
}

export interface ResolveDailyStateParams {
  /** Lecturas del GET /api/tarot/readings (o vacío si el diario no cargó aún). */
  diario: TarotDiaryReadingLike[];
  storageFlags: DailyStorageFlags;
  /** Fecha local YYYY-MM-DD del cliente hoy (localDateKey(tz)). */
  localDate: string;
  /** Zona horaria del cliente — con la que se relee created_at de cada fila. */
  tz: string;
}

export interface DailyState {
  revealed: boolean;
  saved: boolean;
  /** true cuando está revelada pero el servidor nunca confirmó el guardado
   *  (storage local dice revelada, savedKey no) — el umbral debe reintentar
   *  el POST una vez al montar. */
  needsRetry: boolean;
}

const KEY_PREFIX_REVEALED = "aluna.tarotDailyRevealed.v1";
const KEY_PREFIX_SAVED = "aluna.tarotDailySaved.v1";

export function dailyRevealedKey(userId: string, localDate: string): string {
  return `${KEY_PREFIX_REVEALED}:${userId}:${localDate}`;
}

export function dailySavedKey(userId: string, localDate: string): string {
  return `${KEY_PREFIX_SAVED}:${userId}:${localDate}`;
}

/** Fecha local YYYY-MM-DD de una fecha arbitraria en una tz dada — mismo
 *  patrón que apps/web/app/(app)/tarot/tarot-view.tsx:45-52 (en-CA produce
 *  ese orden sin parsear a mano). */
export function localDateKeyFromDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Fecha local de HOY en una tz dada. */
export function localDateKey(tz: string): string {
  return localDateKeyFromDate(new Date(), tz);
}

/**
 * Resuelve el estado revelado/guardado de la carta del día combinando el
 * diario del servidor (verdad) con las banderas locales (mejor esfuerzo).
 * Pura: sin storage, sin red, sin RN — testeable con arrays/objetos a mano.
 */
export function resolveDailyState(params: ResolveDailyStateParams): DailyState {
  const { diario, storageFlags, localDate, tz } = params;

  const hasTodayDaily = diario.some(
    (r) => r.spread === "daily" && localDateKeyFromDate(new Date(r.created_at), tz) === localDate,
  );
  if (hasTodayDaily) {
    return { revealed: true, saved: true, needsRetry: false };
  }

  if (storageFlags.revealed) {
    return {
      revealed: true,
      saved: storageFlags.saved,
      needsRetry: !storageFlags.saved,
    };
  }

  return { revealed: false, saved: false, needsRetry: false };
}
