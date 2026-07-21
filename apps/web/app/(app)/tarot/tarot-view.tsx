"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { dailyCard, cardImageUrl, cardBackUrl } from "@aluna/core";
import { TAROT_CARDS_ES } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { BottomSheet } from "@/components/bottom-sheet";
import { ShareButton } from "@/components/share/share-button";
import { useDeckAssets } from "@/lib/tarot/use-deck-assets";
import { useSheetAutoClose } from "@/lib/viewport";
import { Ceremony } from "./ceremony";
import { ManualEntry } from "./manual-entry";
import { TarotInterpretation, tarotSelectionTitle, DIARY_SPREAD_KEY } from "./interpretation-content";
import { isMobileViewport, type TarotSelection } from "./selection";
import styles from "./tarot.module.css";

interface TarotReadingCard {
  cardId: string;
  reversed: boolean;
  position: string;
  jumper?: boolean;
}

interface TarotReadingRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  spread: string;
  question: string | null;
  cards: TarotReadingCard[];
  notes: string | null;
  deck: string;
  created_at: string;
}

type DiaryState =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; readings: TarotReadingRow[]; total: number };

/** Fecha local YYYY-MM-DD del CLIENTE en su tz resuelta (mismo patrón que
 *  horoscopo-view: Intl.DateTimeFormat().resolvedOptions().timeZone), pero
 *  formateada directo a "YYYY-MM-DD" con el locale en-CA (produce ese orden
 *  sin parsear a mano). Es la clave de la semilla determinista del día
 *  (dailyCard, @aluna/core) y de la key de localStorage. */
function localDateKeyFromDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function localDateKey(tz: string): string {
  return localDateKeyFromDate(new Date(), tz);
}

export function TarotView({ userId }: { userId: string }) {
  const t = useTranslations("tarot");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;
  const deckCtx = useDeckAssets();

  // tz/localDate se calculan al MONTAR y quedan stale si la página queda
  // abierta cruzando la medianoche — limitación aceptada a propósito (recargar
  // trae el día nuevo; el cruce en vivo no amerita un ticker).
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);
  const localDate = useMemo(() => localDateKey(tz), [tz]);
  const storageKey = `tarot-daily-${userId}-${localDate}`;
  // Dos llaves separadas a propósito: `storageKey` = "revelada visualmente"
  // (no volver a mostrar el dorso), `savedKey` = "confirmada en el servidor".
  // Si el POST falla, la carta sigue revelada pero savedKey no se marca y el
  // próximo montaje reintenta el guardado una vez en background (review T4).
  const savedKey = `tarot-daily-saved-${userId}-${localDate}`;

  const daily = useMemo(() => dailyCard(userId, localDate, { reversals: true }), [userId, localDate]);
  const dailyContent = cardsDict[daily.card.id]!;

  const [revealed, setRevealed] = useState(false);
  // Ceremonia de tirada: null = nada activo; "three" = la tarjeta Tres cartas
  // fue tocada. La ceremonia en sí (dibujar, componer, guardar) es Task 5 —
  // este componente solo deja el punto de montaje listo.
  const [ceremony, setCeremony] = useState<"three" | null>(null);
  // Modo manual (T3): independiente de la ceremonia digital — su propio rito.
  const [manualOpen, setManualOpen] = useState(false);
  const postedDailyRef = useRef(false);

  const [diary, setDiary] = useState<DiaryState>({ s: "loading" });

  // Maestro-detalle (Task 3, espejo numeros/horoscopo): la selección viva del
  // panel (desktop) y la del sheet (móvil). null = default derivado
  // (`selected ?? {kind:"daily"}`, patrón numeros: sin estado extra para el
  // default). Todo lo tocable del umbral (la carta del día revelada, una lectura
  // del diario, una carta suelta) produce una TarotSelection.
  const [selected, setSelected] = useState<TarotSelection | null>(null);
  const [sheetSel, setSheetSel] = useState<TarotSelection | null>(null);
  useSheetAutoClose(!!sheetSel, () => setSheetSel(null));

  // Router de selección: en móvil abre el bottom-sheet; en desktop escribe el
  // panel derecho. SSR-safe (isMobileViewport → false en servidor).
  const select = (s: TarotSelection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };

  // Reset de la selección: SIN efecto a propósito (resolución 4 del brief). El
  // umbral no depende del perfil activo — recibe `userId` (prop estable) y el
  // diario es user-scoped por sesión (GET /api/tarot/readings, sin parámetro de
  // perfil). La carta del día depende de `userId`+`localDate`, ambos estables
  // durante el montaje. Los objetivos de selección (daily/saved/card) no cambian
  // de identidad en vida del componente; una lectura guardada seleccionada es un
  // snapshot que sigue siendo válido aunque `loadDiary` refresque la lista. No
  // hay, pues, disparador de reset — la selección persiste hasta que el usuario
  // elige otra (mismo criterio que la serie: la selección manda hasta cambiarla).

  const aliveRef = useRef(true);
  // Servidor-como-verdad para el daily (review final, fix Important): el GET
  // del diario ya corre al montar. Si trae una lectura spread:"daily" cuya
  // fecha local (derivada de created_at con la MISMA tz del cliente) es la de
  // HOY, el usuario ya reveló y guardó esta carta -- probablemente en otro
  // dispositivo, o con localStorage vacío/borrado -- y no hay que mostrarla
  // boca abajo de nuevo ni volver a postear un duplicado. Si el GET llega
  // después del render inicial es aceptable que la carta se vea boca abajo un
  // instante y luego se voltee sin animación al confirmarse.
  // Edge case documentado y aceptado: el GET solo devuelve las 7 lecturas más
  // recientes en el plan free (`total` puede ser mayor). Como el daily de hoy
  // sería la más reciente si existe, en la práctica casi siempre viene dentro
  // de esas 7 -- pero un usuario free con 7+ lecturas MÁS RECIENTES que el
  // daily de hoy (p.ej. varias tiradas de tres cartas después) no lo vería
  // aquí y podría postear un duplicado al voltear. Este duplicado en el borde
  // se cierra definitivamente con el índice único parcial de T3 (server-side);
  // esta mitigación de cliente cubre el caso común.
  const loadDiary = useCallback(() => {
    void (async () => {
      try {
        const res = await fetch("/api/tarot/readings", { method: "GET" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { readings: TarotReadingRow[]; total: number };
        if (!aliveRef.current) return;
        setDiary({ s: "ready", readings: data.readings, total: data.total });

        const todayDaily = data.readings.find(
          (r) => r.spread === "daily" && localDateKeyFromDate(new Date(r.created_at), tz) === localDate,
        );
        if (todayDaily) {
          postedDailyRef.current = true;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, "1");
            window.localStorage.setItem(savedKey, "1");
          }
          setRevealed(true);
        }
      } catch {
        if (aliveRef.current) setDiary({ s: "error" });
      }
    })();
  }, [tz, localDate, storageKey, savedKey]);

  useEffect(() => {
    aliveRef.current = true;
    loadDiary();
    return () => {
      aliveRef.current = false;
    };
  }, [loadDiary]);

  const postDaily = useCallback(() => {
    // Guarda el daily en el servidor. `postedDailyRef` evita el doble POST
    // dentro de un mismo montaje; `savedKey` solo se marca cuando el servidor
    // confirmó (res.ok) — un fallo deja la puerta abierta al reintento del
    // próximo montaje, y el catch es silencioso a propósito (el diario es un
    // hábito, no un bloqueo del rito).
    if (postedDailyRef.current) return;
    postedDailyRef.current = true;
    void fetch("/api/tarot/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spread: "daily",
        deck: deckCtx.activeDeck,
        cards: [{ cardId: daily.card.id, reversed: daily.reversed, position: "day" }],
      }),
    })
      .then((res) => {
        if (res.ok) {
          window.localStorage.setItem(savedKey, "1");
          // Fix Minor (review final): el daily recién guardado debe aparecer
          // en el diario sin recargar la página.
          loadDiary();
        }
      })
      .catch(() => {
        /* sin red: reintento en el próximo montaje (revelada sin savedKey) */
      });
  }, [daily, savedKey, loadDiary, deckCtx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "1") {
      setRevealed(true);
      // Revelada pero nunca confirmada por el servidor → reintenta una vez.
      if (window.localStorage.getItem(savedKey) !== "1") postDaily();
    }
  }, [storageKey, savedKey, postDaily]);

  function handleFlip() {
    if (revealed) return;
    setRevealed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1");
    postDaily();
  }

  // La prosa de la carta del día y de las lecturas guardadas la compone ahora
  // el renderizador único (TarotInterpretation, Task 2) — el umbral ya no arma
  // dailyProse/openReadingProse inline.
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  // Con una lectura en curso (ceremonia o modo manual) el panel derecho se
  // oculta y la técnica ocupa todo el ancho: la lectura manda (su split llega
  // en T4). El resto del umbral se conserva montado inline como hoy.
  const readingOpen = ceremony !== null || manualOpen;

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
      </div>

      <div className={`${styles.deskCols} ${readingOpen ? styles.readingActive : ""}`}>
        <div className={styles.leftCol}>
          <section className={styles.dailySection}>
            <h2 className={styles.sectionTitle}>{t("dailyTitle")}</h2>
            <div className={styles.flipScene}>
              <button
                type="button"
                className={`${styles.flipCard} ${revealed ? styles.flipped : ""}`}
                // El flip es ritual (no selección): sin revelar → voltea; ya
                // revelada → tocar la carta enfoca el panel (kind daily). En
                // móvil `select` abre el sheet como hoy abría el suyo el CTA.
                onClick={() => (revealed ? select({ kind: "daily" }) : handleFlip())}
                aria-label={revealed ? dailyContent.name : t("dailyFlipCta")}
              >
                <span className={`${styles.face} ${styles.faceBack}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardBackUrl(deckCtx)} alt={t("dailyFlipCta")} className={styles.cardImg} />
                </span>
                <span className={`${styles.face} ${styles.faceFront}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardImageUrl(daily.card.id, deckCtx)}
                    alt={dailyContent.name}
                    className={`${styles.cardImg} ${daily.reversed ? styles.reversedImg : ""}`}
                  />
                </span>
              </button>

              {revealed && (
                <div className={styles.dailyRevealBody}>
                  <p className={styles.dailyName}>{dailyContent.name}</p>
                  {daily.reversed && <span className={styles.reversedTag}>{t("dailyReversed")}</span>}
                  <p className={styles.dailyKeywords}>
                    {dailyContent.keywords.map((kw) => (
                      <span key={kw} className="chip">
                        {kw}
                      </span>
                    ))}
                  </p>
                  <p className={styles.dailyEssence}>{dailyContent.essence}</p>
                  {/* El CTA lleva a la lectura completa: en móvil abre el sheet;
                      en desktop enfoca el panel (que ya la muestra) — oculto ahí
                      por CSS para no duplicar. */}
                  <button type="button" className={styles.dailyRevealBtn} onClick={() => select({ kind: "daily" })}>
                    {t("dailyReveal")}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className={styles.spreadsSection}>
            <h2 className={styles.sectionTitle}>{t("spreadsTitle")}</h2>
            <div className={styles.spreadsGrid}>
              <button
                type="button"
                className={`card card--interactive card--tight ${styles.spreadCard}`}
                onClick={() => setCeremony("three")}
              >
                <span className={styles.spreadName}>{t("spreadThree")}</span>
                <span className={styles.spreadDesc}>{t("spreadThreeDesc")}</span>
              </button>
              <div
                className={`card card--dashed card--tight ${styles.spreadCard} ${styles.spreadDisabled}`}
                role="button"
                aria-disabled="true"
              >
                <span className={styles.spreadName}>{t("spreadCeltic")}</span>
                <span className="chip">{t("spreadCelticSoon")}</span>
              </div>
              <button
                type="button"
                className={`card card--interactive card--tight ${styles.spreadCard}`}
                onClick={() => setManualOpen(true)}
              >
                <span className={styles.spreadName}>{t("manualEntry")}</span>
                <span className={styles.spreadDesc}>{t("manualEntryDesc")}</span>
              </button>
            </div>
          </section>

          {ceremony === "three" && (
            <Ceremony
              deckCtx={deckCtx}
              onClose={() => {
                setCeremony(null);
                // La lectura pudo guardarse durante la ceremonia: refresca el diario.
                loadDiary();
              }}
            />
          )}

          {manualOpen && (
            <ManualEntry
              deckCtx={deckCtx}
              onClose={() => {
                setManualOpen(false);
                // La lectura pudo guardarse durante el modo manual: refresca el diario.
                loadDiary();
              }}
            />
          )}

          <section className={styles.diarySection}>
            <h2 className={styles.sectionTitle}>{t("diaryTitle")}</h2>
            {diary.s === "loading" ? (
              <div className={`card card--dashed ${styles.diaryEmpty}`}>
                <p>{t("diaryLoading")}</p>
              </div>
            ) : diary.s === "error" ? (
              <div className={`card card--dashed ${styles.diaryEmpty}`}>
                <p>{t("diaryError")}</p>
                <button type="button" className={styles.dailyRevealBtn} onClick={loadDiary}>
                  {t("diaryRetry")}
                </button>
              </div>
            ) : diary.readings.length === 0 ? (
              <div className={`card card--dashed ${styles.diaryEmpty}`}>
                <p>{t("diaryEmpty")}</p>
              </div>
            ) : (
              <>
                <ul className={styles.diaryList}>
                  {diary.readings.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`card card--interactive card--tight ${styles.diaryItem}`}
                        onClick={() => select({ kind: "saved", reading: r })}
                      >
                        <span className={styles.diarySpread}>{t(DIARY_SPREAD_KEY[r.spread] ?? "diarySpreadDaily")}</span>
                        <span className={styles.diaryDate}>{dateFmt.format(new Date(r.created_at))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {diary.total > diary.readings.length && (
                  <p className={styles.freeLimitNote}>
                    {t("freeLimitNote", { count: diary.readings.length, total: diary.total })}
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Panel de interpretación (100% desktop): en móvil lo reemplaza el
            bottom-sheet de abajo. Se oculta cuando hay una lectura en curso
            (ceremonia/manual) — la lectura manda; su split llega en T4. */}
        {!readingOpen && (
          <div className={styles.interpCol}>
            <div className={`card ${styles.interpPanel}`}>
              <div className={styles.titleRow}>
                <span className={styles.cardH2}>{t("interpTitle")}</span>
                {/* Gate por revealed: compartir antes de voltear la carta del
                    día spoilearía el arte/esencia que el panel aún oculta. */}
                {revealed && (
                  <ShareButton params={{ lens: "tarot", cardId: daily.card.id, reversed: daily.reversed }} />
                )}
              </div>
              <TarotInterpretation
                selected={selected ?? { kind: "daily" }}
                revealed={revealed}
                dailyCard={daily}
                deckCtx={deckCtx}
                profileName=""
                onSelect={select}
              />
            </div>
          </div>
        )}
      </div>

      <BottomSheet
        open={!!sheetSel}
        onClose={() => setSheetSel(null)}
        center
        title={sheetSel ? tarotSelectionTitle(sheetSel, t, locale) : ""}
      >
        {sheetSel && (
          <TarotInterpretation
            selected={sheetSel}
            revealed={revealed}
            dailyCard={daily}
            deckCtx={deckCtx}
            profileName=""
            onSelect={select}
          />
        )}
      </BottomSheet>
    </main>
  );
}
